"use client";

import { createClient } from "@/lib/supabase/client";
import {
	BUZZER_EVENTS,
	CHANNELS,
	type BuzzFirstPayload,
	type BuzzRequest,
	type BuzzResponse,
	type RoundAbortedPayload,
	type RoundOpenedPayload,
	type RoundResolvedPayload,
	type RoundStealPayload,
	type RoundStatus,
} from "@/lib/types/realtime";
import { useCallback, useEffect, useMemo, useState } from "react";

// LocalStorage key holding the table_id this device has bound itself to.
// Sessionless variant: any device with a valid table_id can buzz for that table.
export const BUZZER_TABLE_ID_KEY = "buzzer_table_id";

interface TableContext {
	id: string;
	name: string;
	number: number;
}

interface FirstBuzzContext {
	tableId: string;
	tableName: string;
	tableNumber: number;
	phase: string;
}

type BuzzerUiState = Extract<
	RoundStatus,
	"idle" | "buzzer_active" | "buzz_received" | "steal_active"
>;

interface UseBuzzerResult {
	isLoading: boolean;
	isSessionValid: boolean;
	error: string | null;
	table: TableContext | null;
	roundId: string | null;
	status: BuzzerUiState;
	canBuzz: boolean;
	isEliminated: boolean;
	firstBuzz: FirstBuzzContext | null;
	buzzPosition: number | null;
	isFirstBuzz: boolean;
	// True from the moment the user clicks the buzzer until the server responds —
	// gives the UI an immediate feedback handle so users don't keep tapping.
	isSending: boolean;
	validateSession: () => Promise<boolean>;
	sendBuzz: () => Promise<BuzzResponse | null>;
}

function getStoredTableId() {
	if (typeof window === "undefined") {
		return null;
	}

	const value = window.localStorage.getItem(BUZZER_TABLE_ID_KEY);
	if (!value) {
		return null;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

export function useBuzzer(): UseBuzzerResult {
	const [isLoading, setIsLoading] = useState(true);
	const [isSessionValid, setIsSessionValid] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [table, setTable] = useState<TableContext | null>(null);

	const [roundId, setRoundId] = useState<string | null>(null);
	const [status, setStatus] = useState<BuzzerUiState>("idle");
	const [isEliminated, setIsEliminated] = useState(false);
	const [firstBuzz, setFirstBuzz] = useState<FirstBuzzContext | null>(null);
	const [buzzPosition, setBuzzPosition] = useState<number | null>(null);
	const [isFirstBuzz, setIsFirstBuzz] = useState(false);
	const [isSending, setIsSending] = useState(false);

	const validateSession = useCallback(async () => {
		// Bootstrap table identity from the persisted table_id (sessionless variant).
		const storedTableId = getStoredTableId();
		if (!storedTableId) {
			setIsSessionValid(false);
			setTable(null);
			setIsLoading(false);
			return false;
		}

		setIsLoading(true);
		setError(null);

		try {
			const response = await fetch(`/api/tables/${storedTableId}`);

			if (!response.ok) {
				setIsSessionValid(false);
				setTable(null);
				setIsLoading(false);
				return false;
			}

			const payload = (await response.json()) as {
				id: string;
				display_name: string;
				table_number: number;
				is_active: boolean;
			};

			if (!payload.id || payload.is_active === false) {
				setIsSessionValid(false);
				setTable(null);
				setIsLoading(false);
				return false;
			}

			setTable({
				id: payload.id,
				name: payload.display_name,
				number: payload.table_number,
			});
			setIsSessionValid(true);

			// Fetch current round state to handle late-join sync
			try {
				const roundRes = await fetch("/api/rounds/current");
				if (roundRes.ok) {
					const roundData = await roundRes.json();
					if (roundData && roundData.id) {
						setRoundId(roundData.id);
						setStatus(roundData.status as BuzzerUiState);
						if (roundData.eliminated_table_ids) {
							setIsEliminated(roundData.eliminated_table_ids.includes(payload.id));
						}
					}
				}
			} catch (e) {
				console.error("Failed to fetch initial round state", e);
			}

			setIsLoading(false);
			return true;
		} catch {
			setError("Unable to look up your table.");
			setIsSessionValid(false);
			setTable(null);
			setIsLoading(false);
			return false;
		}
	}, []);

	useEffect(() => {
		// Defer first validation to avoid setState-in-effect lint violations.
		queueMicrotask(() => {
			void validateSession();
		});
	}, [validateSession]);

	useEffect(() => {
		if (!isSessionValid) {
			return;
		}

		// Buzzer UI state is driven by realtime events from buzzer-room.
		const supabase = createClient();
		console.log("Subscribing to buzzer-room channel...");
		
		const channel = supabase
			.channel(CHANNELS.BUZZER_ROOM, {
				config: {
					broadcast: { self: true },
				},
			})
			.on("broadcast", { event: BUZZER_EVENTS.ROUND_OPENED }, ({ payload }) => {
				console.log("Realtime: ROUND_OPENED", payload);
				const event = payload as RoundOpenedPayload;
				setRoundId(event.round_id);
				setStatus("buzzer_active");
				setIsEliminated(false);
				setFirstBuzz(null);
				setBuzzPosition(null);
				setIsFirstBuzz(false);
			})
			.on("broadcast", { event: BUZZER_EVENTS.BUZZ_FIRST }, ({ payload }) => {
				console.log("Realtime: BUZZ_FIRST", payload);
				const event = payload as BuzzFirstPayload;
				setRoundId(event.round_id);
				setStatus("buzz_received");
				setFirstBuzz({
					tableId: event.table_id,
					tableName: event.table_name,
					tableNumber: event.table_number,
					phase: event.phase,
				});
			})
			.on("broadcast", { event: BUZZER_EVENTS.ROUND_STEAL }, ({ payload }) => {
				console.log("Realtime: ROUND_STEAL", payload);
				const event = payload as RoundStealPayload;
				setRoundId(event.round_id);
				setStatus("steal_active");
				setFirstBuzz(null);
				setBuzzPosition(null);
				setIsFirstBuzz(false);
				setIsEliminated(
					table ? event.eliminated_table_ids.includes(table.id) : false
				);
			})
			.on("broadcast", { event: BUZZER_EVENTS.ROUND_RESOLVED }, ({ payload }) => {
				console.log("Realtime: ROUND_RESOLVED", payload);
				const event = payload as RoundResolvedPayload;
				setRoundId(event.round_id);
				setStatus("idle");
				setIsEliminated(false);
				setFirstBuzz(null);
				setBuzzPosition(null);
				setIsFirstBuzz(false);
			})
			.on("broadcast", { event: BUZZER_EVENTS.ROUND_ABORTED }, ({ payload }) => {
				console.log("Realtime: ROUND_ABORTED", payload);
				const event = payload as RoundAbortedPayload;
				setRoundId(event.round_id);
				setStatus("idle");
				setIsEliminated(false);
				setFirstBuzz(null);
				setBuzzPosition(null);
				setIsFirstBuzz(false);
			})

		channel.subscribe((status) => {
			console.log(`Buzzer-room subscription status: ${status}`);
		});

		return () => {
			console.log("Unsubscribing from buzzer-room channel...");
			void channel.unsubscribe();
		};
	}, [isSessionValid, table]);

	const canBuzz = useMemo(() => {
		if (!isSessionValid || !table || !roundId) {
			return false;
		}

		if (status === "buzzer_active") {
			return true;
		}

		if (status === "steal_active") {
			return !isEliminated;
		}

		return false;
	}, [isSessionValid, table, roundId, status, isEliminated]);

	const sendBuzz = useCallback(async () => {
		if (!canBuzz || !table || !roundId) {
			return null;
		}

		setError(null);
		setIsSending(true);

		const body: BuzzRequest = {
			table_id: table.id,
			round_id: roundId,
		};

		try {
			// Buzz ordering is resolved server-side; client only submits intent.
			const response = await fetch("/api/buzz", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(body),
			});

			if (!response.ok) {
				const errorPayload =
					(await response.json().catch(() => ({}))) as { error?: string };
				setError(errorPayload.error ?? "Failed to send buzz.");
				return null;
			}

			const payload = (await response.json()) as BuzzResponse;
			setBuzzPosition(payload.position);
			setIsFirstBuzz(payload.is_first);
			if (payload.is_first) {
				setStatus("buzz_received");
			}
			return payload;
		} catch {
			setError("Network error while sending buzz.");
			return null;
		} finally {
			setIsSending(false);
		}
	}, [canBuzz, table, roundId]);

	return {
		isLoading,
		isSessionValid,
		error,
		table,
		roundId,
		status,
		canBuzz,
		isEliminated,
		firstBuzz,
		buzzPosition,
		isFirstBuzz,
		isSending,
		validateSession,
		sendBuzz,
	};
}
