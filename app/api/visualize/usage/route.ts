import { getContactVisualizationCount } from "@/lib/airtable";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get("contactId");
  if (!contactId) {
    return Response.json({ used: 0 });
  }
  const used = await getContactVisualizationCount(contactId);
  return Response.json({ used });
}
