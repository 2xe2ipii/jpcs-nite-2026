/**
 * Server-side Realtime broadcast helper.
 *
 * Uses Supabase's REST broadcast endpoint so we don't need to subscribe a
 * channel just to publish a single message from a stateless API route.
 *
 * Channel + event names should always come from src/lib/types/realtime.ts.
 */
export async function broadcast(
  channel: string,
  event: string,
  payload: unknown,
): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`;
  const key = process.env.SUPABASE_SECRET_KEY!;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      apikey: key,
    },
    body: JSON.stringify({
      messages: [
        {
          topic: channel,
          event,
          payload,
          type: "broadcast",
          private: false,
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(
      `[broadcast] failed channel=${channel} event=${event} status=${res.status} body=${text}`,
    );
  }
}
