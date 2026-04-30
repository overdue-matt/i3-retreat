// Thin wrapper around Gemini 2.5 Flash Image ("Nano Banana") for image edits.
// Uses the REST API directly so we don't need an extra SDK dependency.

const NANO_BANANA = "gemini-2.5-flash-image";
const ENDPOINT = (model: string, key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

export type ImagePayload = {
  /** Raw base64 (no data URL prefix). */
  base64: string;
  /** e.g. "image/png", "image/jpeg". */
  mimeType: string;
};

type RestPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } }
  | { inlineData: { mimeType: string; data: string } };

type RestResponse = {
  candidates?: Array<{
    content?: { parts?: RestPart[] };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
};

function getKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is missing from .env.");
  return key;
}

const ROAST_PROMPT = `"Roast my screenshot, Overlay this with clear and crazy roast scribble, red ink, doodles, remarks, and comments."`;

/**
 * Send an image to Nano Banana with the roast prompt and return the annotated image.
 */
export async function roastImage(input: ImagePayload): Promise<ImagePayload> {
  const res = await fetch(ENDPOINT(NANO_BANANA, getKey()), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: ROAST_PROMPT },
            {
              inline_data: {
                mime_type: input.mimeType,
                data: input.base64,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Nano Banana error ${res.status}: ${body.slice(0, 400) || res.statusText}`,
    );
  }

  const json = (await res.json()) as RestResponse;

  if (json.error?.message) throw new Error(json.error.message);
  if (json.promptFeedback?.blockReason) {
    throw new Error(
      `Image rejected by safety filter (${json.promptFeedback.blockReason}). Try a different image.`,
    );
  }

  const parts = json.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if ("inline_data" in part && part.inline_data?.data) {
      return {
        base64: part.inline_data.data,
        mimeType: part.inline_data.mime_type || "image/png",
      };
    }
    if ("inlineData" in part && part.inlineData?.data) {
      return {
        base64: part.inlineData.data,
        mimeType: part.inlineData.mimeType || "image/png",
      };
    }
  }

  throw new Error(
    "Nano Banana didn't return an image. The model may have refused to roast this one. Try another image.",
  );
}

/**
 * Generate an image from a text prompt using Nano Banana.
 */
export async function generateImage(prompt: string): Promise<ImagePayload> {
  const fullPrompt = `Generate a clean, professional image for a social media post. ${prompt}. Style: modern, clean, suitable for Twitter/X. No text overlays.`;

  const res = await fetch(ENDPOINT(NANO_BANANA, getKey()), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: fullPrompt }],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Nano Banana error ${res.status}: ${body.slice(0, 400) || res.statusText}`,
    );
  }

  const json = (await res.json()) as RestResponse;

  if (json.error?.message) throw new Error(json.error.message);
  if (json.promptFeedback?.blockReason) {
    throw new Error(
      `Image generation rejected by safety filter (${json.promptFeedback.blockReason}).`,
    );
  }

  const parts = json.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if ("inline_data" in part && part.inline_data?.data) {
      return {
        base64: part.inline_data.data,
        mimeType: part.inline_data.mime_type || "image/png",
      };
    }
    if ("inlineData" in part && part.inlineData?.data) {
      return {
        base64: part.inlineData.data,
        mimeType: part.inlineData.mimeType || "image/png",
      };
    }
  }

  throw new Error("Nano Banana didn't return an image for the prompt.");
}
