import { claude, SONNET } from "@/lib/anthropic";
import { serializeForLLM, type LoadedConversation } from "@/lib/slack";

export const runtime = "nodejs";

type ChatTurn = { role: "user" | "assistant"; content: string };

type ChatRequest = {
  loaded: LoadedConversation;
  history: ChatTurn[];
};

const CHAT_SYSTEM = `You are an analyst answering questions about a Slack export. The full export is provided in the next system block as plain text.

Hard rules:
- Answer only from the export. If something isn't there, say so plainly. Don't guess.
- Quote directly when it sharpens the answer. Use real names from the export.
- Never use em-dashes (use commas, periods, or parentheses). Em-dashes read as AI.
- No sycophantic preamble ("Great question!", "Sure, happy to help"). Open with the answer.
- Don't reference yourself as an AI or say things like "based on the export". Just state what's true.
- Match the user's register. Concise question gets a concise answer.
- For factual questions, lead with the bottom line. Add supporting detail under it.
- For broad questions ("what's going on?"), give 3 to 5 bullets, no preamble.`;

export async function POST(req: Request): Promise<Response> {
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return new Response("Invalid JSON.", { status: 400 });
  }

  if (!body.loaded || !Array.isArray(body.history) || body.history.length === 0) {
    return new Response("Missing loaded conversation or chat history.", { status: 400 });
  }

  const transcript = serializeForLLM(body.loaded);

  const messages = body.history
    .filter((t) => t.role === "user" || t.role === "assistant")
    .map((t) => ({ role: t.role, content: t.content }));

  const stream = await claude().messages.create({
    model: SONNET,
    max_tokens: 4096,
    stream: true,
    thinking: { type: "disabled" },
    output_config: { effort: "medium" },
    system: [
      {
        type: "text",
        text: CHAT_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
      {
        type: "text",
        text: transcript,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "stream error";
        controller.enqueue(encoder.encode(`\n\n[error: ${msg}]`));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
