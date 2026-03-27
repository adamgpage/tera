const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_API_URL = "https://api.daily.co/v1";

interface DailyRoom {
  id: string;
  name: string;
  url: string;
  created_at: string;
}

interface DailyToken {
  token: string;
}

async function dailyFetch(path: string, options: RequestInit = {}): Promise<Response> {
  if (!DAILY_API_KEY) {
    throw new Error("DAILY_API_KEY not configured");
  }

  return fetch(`${DAILY_API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${DAILY_API_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

/**
 * Create a Daily.co room for a conversation.
 */
export async function createRoom(conversationId: string): Promise<DailyRoom> {
  const res = await dailyFetch("/rooms", {
    method: "POST",
    body: JSON.stringify({
      name: `tera-${conversationId.slice(0, 8)}`,
      privacy: "private",
      properties: {
        enable_recording: "cloud",
        enable_chat: true,
        enable_screenshare: true,
        max_participants: 2,
        exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
        eject_at_room_exp: true,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create Daily room: ${err}`);
  }

  return res.json();
}

/**
 * Generate a meeting token for a specific user to join a room.
 */
export async function createMeetingToken(roomName: string, userId: string, userName: string): Promise<string> {
  const res = await dailyFetch("/meeting-tokens", {
    method: "POST",
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_id: userId,
        user_name: userName,
        enable_recording: "cloud",
        is_owner: false,
        exp: Math.floor(Date.now() / 1000) + 86400,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create meeting token: ${err}`);
  }

  const data: DailyToken = await res.json();
  return data.token;
}

/**
 * Delete a Daily.co room.
 */
export async function deleteRoom(roomName: string): Promise<void> {
  await dailyFetch(`/rooms/${roomName}`, { method: "DELETE" });
}
