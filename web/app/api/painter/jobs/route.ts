import { getPainterByToken, getPainterJobs } from "@/lib/airtable";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 401 });
  }

  try {
    const painter = await getPainterByToken(token);
    if (!painter) {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }

    const jobs = await getPainterJobs(painter.id);

    return Response.json({
      painter: { id: painter.id, name: painter.name },
      jobs: jobs.map((j) => ({
        id: j.id,
        fields: j.fields,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/painter/jobs]", message);
    return Response.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}
