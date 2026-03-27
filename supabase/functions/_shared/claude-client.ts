import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.39";

let _client: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
    });
  }
  return _client;
}

export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const client = getClaudeClient();
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: options?.maxTokens ?? 1024,
        temperature: options?.temperature ?? 0.3,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });

      const block = response.content[0];
      if (block.type === "text") {
        return block.text;
      }
      throw new Error("Unexpected response type from Claude");
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxRetries - 1) {
        // Exponential backoff: 2s, 4s
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new Error("Claude API call failed after retries");
}
