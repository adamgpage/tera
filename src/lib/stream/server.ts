import { StreamChat } from "stream-chat";

let serverClient: StreamChat | null = null;

export function getStreamServerClient(): StreamChat {
  if (serverClient) return serverClient;

  const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
  const apiSecret = process.env.STREAM_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.warn("Stream Chat credentials not configured — using mock");
    // Return instance that will fail gracefully
    return StreamChat.getInstance("placeholder-key");
  }

  serverClient = StreamChat.getInstance(apiKey, apiSecret);
  return serverClient;
}

export function generateStreamToken(userId: string): string {
  const apiSecret = process.env.STREAM_API_SECRET;
  if (!apiSecret) {
    // Return a mock token for development
    return "mock-token-" + userId;
  }

  const client = getStreamServerClient();
  return client.createToken(userId);
}

export async function createStreamChannel(
  channelId: string,
  members: string[],
  data: { name?: string; conversationId?: string } = {}
) {
  const client = getStreamServerClient();

  const channel = client.channel("messaging", channelId, {
    members,
    created_by_id: members[0],
    ...(data.name ? { name: data.name } : {}),
    ...(data.conversationId ? { conversation_id: data.conversationId } : {}),
  } as Record<string, unknown>);

  await channel.create();
  return channel;
}
