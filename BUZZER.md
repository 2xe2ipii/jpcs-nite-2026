## Scope

Team Buzzer owns:
- Public join page: src/app/(public)/buzzer/join/page.tsx
- Public buzzer page: src/app/(public)/buzzer/page.tsx
- Buzzer API: src/app/api/buzz/route.ts
- Device register API: src/app/api/devices/register/route.ts
- Device validate API: src/app/api/devices/validate/route.ts
- Buzzer state hook: src/lib/hooks/use-buzzer.ts
- Buzzer UI components: src/components/buzzer/

## Primary User Flow

1. Representative scans QR URL in this format:
   - /buzzer/join?table={table_id}&token={one_time_token}
2. Join page reads table and token from URL.
3. Join page posts to device register API.
4. API validates request and creates a device session token.
5. Client stores session token in localStorage.
6. User is redirected to /buzzer.
7. Buzzer page validates session and subscribes to realtime events.
8. User can buzz only when state allows it.

## Buzzer State Model

UI states used by Team Buzzer:
- idle
- buzzer_active
- buzz_received
- steal_active

Behavior summary:
- idle: waiting screen
- buzzer_active: eligible users can buzz
- buzz_received: buzzes are locked after first winner is resolved
- steal_active: non-eliminated tables can buzz again

## API Responsibilities

### POST /api/devices/register

Purpose:
- Register one representative device for a table.

Current behavior:
- Validates payload shape.
- Validates table existence and active status.
- Prevents multiple active sessions for the same table.
- Returns session_token plus table metadata.

Important note:
- QR token validation is now structured with a validation hook and rollout TODOs.
- A temporary fallback exists until qr token storage is fully deployed.
- Do not consider non-empty token checks as final production security.

### POST /api/devices/validate

Purpose:
- Validate stored device session token when page reloads/reopens.

Behavior:
- Confirms session exists and is active.
- Confirms table exists and is active.
- Updates last_seen_at heartbeat.

### POST /api/buzz

Purpose:
- Receive buzz signals and resolve order server-side.

Behavior:
- Validates session ownership and round state.
- Rejects eliminated tables.
- Inserts buzz signal.
- Resolves position using server_received_at ordering.
- Sets first buzz winner with race-safe conditional update.
- Broadcasts buzz:first event to buzzer-room.

## Realtime Events Consumed by buzzer

From CHANNELS.BUZZER_ROOM:
- round:opened
- buzz:first
- round:steal
- round:resolved
- round:aborted

The hook maps these to client state and controls buzzer availability.

## Session Persistence

Session token key in localStorage:
- buzzer_session_token

Reconnection behavior:
- On /buzzer load, the app validates the saved session token.
- Invalid session redirects user to /buzzer/join.

## Development Utilities

Dev preview tools are available on the public pages via query mode and component controls under:
- src/components/buzzer/join-dev-tools.tsx
- src/components/buzzer/buzzer-dev-tools.tsx

Access:
- /buzzer/join?dev=1
- /buzzer?dev=1

These are for local/testing workflows and should not be treated as event-day control surfaces.

## Known Gaps and Next Work

1. Finalize one-time token storage and strict validation mode.
2. Remove temporary fallback path in register flow.
3. Implement atomic token consume + session creation transaction.
4. Finalize QR generation ownership workflow (open item in SRS).

## Quick Validation Checklist

- Build succeeds: pnpm build
- Join page accepts valid table and token
- Duplicate representative registration is rejected
- Session survives reload and validates correctly
- Buzzer lock/unlock behavior matches round events
- First buzz winner broadcast is reflected in UI
