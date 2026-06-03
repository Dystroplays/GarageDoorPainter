import Replicate from "replicate";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Model: set REPLICATE_MODEL in .env.local to a Stable Diffusion inpainting model.
// Format: owner/model:VERSION_HASH (colon separator, not /versions/)
//
// Recommended — go to replicate.com, find the model, copy the full hash from the Versions tab:
//   stability-ai/stable-diffusion-inpainting   (SD 1.5 — reliable, well-tested)
//   Any SDXL inpainting community model        (better quality, search Replicate)
//
// The model MUST accept both "image" and "mask" inputs.
// Mask convention: white = repaint this area, black = leave unchanged.
//
const REPLICATE_MODEL = process.env.REPLICATE_MODEL ?? "";

const bodySchema = z.object({
  imageBase64: z.string().min(100),
  maskBase64: z.string().min(100),
  targetColorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  targetColorLrv: z.number().min(0).max(100).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { imageBase64, maskBase64, targetColorHex, targetColorLrv } = parsed.data;

    if (!process.env.REPLICATE_API_TOKEN) {
      return Response.json({ error: "REPLICATE_API_TOKEN not set in .env.local" }, { status: 500 });
    }

    if (!REPLICATE_MODEL.includes(":")) {
      return Response.json(
        {
          error:
            "Set REPLICATE_MODEL in .env.local to an inpainting model with version hash. " +
            "Format: owner/model:HASH — e.g. stability-ai/stable-diffusion-inpainting:HASH. " +
            "Find the hash at replicate.com under the model's Versions tab.",
        },
        { status: 500 }
      );
    }

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    // Derive RGB from hex for accurate color description.
    // SD models respond better to explicit RGB values than hex strings or color names,
    // which map to vivid training-data equivalents (e.g. "sage green" → vivid lime).
    const r = parseInt(targetColorHex.slice(1, 3), 16);
    const g = parseInt(targetColorHex.slice(3, 5), 16);
    const b = parseInt(targetColorHex.slice(5, 7), 16);

    // Saturation descriptor: prevents model from rendering muted earth tones as vivid
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const satPct = maxC === 0 ? 0 : Math.round(((maxC - minC) / maxC) * 100);
    const satDesc =
      satPct < 15 ? ", muted, barely saturated, not vivid" : satPct < 30 ? ", low saturation, not vivid" : "";

    const lrv = targetColorLrv ?? 50;
    const valDesc =
      lrv < 10 ? ", very dark, near black" : lrv < 25 ? ", dark" : lrv > 70 ? ", very light, near white" : "";

    const replicateInput = {
      image: imageBase64,
      mask: maskBase64,
      prompt: `Garage door painted in a color with exact RGB values (${r}, ${g}, ${b})${satDesc}${valDesc}. Same door panel structure, same hardware, same surrounding house. Photorealistic exterior photo, high quality, smooth paint finish.`,
      negative_prompt:
        "different door style, damaged door, rusty, peeling paint, graffiti, distorted, blurry, low quality, cartoon, illustration, watermark, wrong color, different color",
      num_outputs: 1,
      num_inference_steps: 50,
      guidance_scale: 7.5,
      prompt_strength: 0.8,
    };

    const output = await replicate.run(REPLICATE_MODEL as `${string}/${string}:${string}`, {
      input: replicateInput,
    });

    // Replicate SDK v1.x returns FileOutput objects; String() calls toString() → URL.
    const outputArray = Array.isArray(output) ? output : output ? [output] : [];
    if (outputArray.length === 0) {
      return Response.json({ error: "Model returned no output." }, { status: 500 });
    }

    const imageUrl = String(outputArray[0]);
    if (!imageUrl || imageUrl === "[object Object]") {
      console.error("Unexpected output format:", JSON.stringify(output));
      return Response.json({ error: "Model output was not a URL. Check server logs." }, { status: 500 });
    }

    return Response.json({ imageUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Visualize API error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
