import { put } from "@vercel/blob";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return Response.json({ error: "File must be an image" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const filename = `painter-photos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const blob = await put(filename, file, { access: "public" });

    return Response.json({ url: blob.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/painter/upload]", message);
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}
