import { StreamChat } from "stream-chat";

let streamClientInstance: StreamChat | null = null;

export function getStreamClient(): StreamChat {
  if (streamClientInstance) return streamClientInstance;

  const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
  if (!apiKey) {
    // Return a mock client for development without keys
    console.warn("NEXT_PUBLIC_STREAM_API_KEY not set — Stream Chat will not function");
    return new StreamChat("placeholder-key");
  }

  streamClientInstance = StreamChat.getInstance(apiKey);
  return streamClientInstance;
}

export async function connectStreamUser(userId: string, token: string, name: string) {
  const client = getStreamClient();

  if (client.userID === userId) return client;

  await client.connectUser(
    { id: userId, name },
    token
  );

  return client;
}

export async function disconnectStreamUser() {
  const client = getStreamClient();
  if (client.userID) {
    await client.disconnectUser();
  }
}
