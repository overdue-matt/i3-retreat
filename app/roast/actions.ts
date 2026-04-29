"use server";

import { roastImage } from "@/lib/gemini";

export type RoastResult =
  | { ok: true; dataUrl: string }
  | { ok: false; error: string };

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB before base64 — Gemini inline limit is 20 MB

export async function roastImageAction(
  base64: string,
  mimeType: string,
): Promise<RoastResult> {
  try {
    if (!base64) return { ok: false, error: "No image provided." };
    if (!mimeType.startsWith("image/")) {
      return { ok: false, error: "That doesn't look like an image." };
    }
    const approxBytes = Math.floor((base64.length * 3) / 4);
    if (approxBytes > MAX_BYTES) {
      return {
        ok: false,
        error: `Image too large (${(approxBytes / 1024 / 1024).toFixed(1)} MB). Keep it under 8 MB.`,
      };
    }

    const out = await roastImage({ base64, mimeType });
    return {
      ok: true,
      dataUrl: `data:${out.mimeType};base64,${out.base64}`,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Roast generation failed.";
    return { ok: false, error: message };
  }
}
