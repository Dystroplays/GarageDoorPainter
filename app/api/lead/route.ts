export const dynamic = 'force-dynamic';
import { NextRequest } from "next/server";
import { z } from "zod";
import { upsertContact } from "@/lib/airtable";

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  source: z.enum(["Facebook Ad", "Postcard", "Referral", "Organic"]).default("Organic"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, source } = schema.parse(body);

    const contactId = await upsertContact({
      Name: name,
      Email: email,
      Status: "Lead",
      Source: source,
    });

    return Response.json({ success: true, contactId });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Invalid input", details: err.issues }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/lead]", message);
    return Response.json(
      { error: process.env.NODE_ENV === "development" ? message : "Server error" },
      { status: 500 }
    );
  }
}
