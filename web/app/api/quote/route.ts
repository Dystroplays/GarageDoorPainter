export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { createBooking, getActivePainters } from "@/lib/airtable";

const doorSchema = z.object({
  size: z.enum(["single", "double"]),
  currentTone: z.enum(["light", "dark"]),
  selectedColor: z.object({
    sw_code: z.string(),
    name: z.string(),
    hex: z.string(),
    lrv: z.number(),
    family: z.string(),
  }),
  primerNeeded: z.boolean(),
});

const schema = z.object({
  contactId: z.string(),
  customerName: z.string(),
  customerEmail: z.string().email(),
  doors: z.array(doorSchema).min(1).max(5),
  pricing: z.object({
    subtotal: z.number(),
    discount: z.number(),
    primerCharges: z.number(),
    total: z.number(),
    depositAmount: z.number(),
    balanceAmount: z.number(),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const painters = await getActivePainters();
    const painterId = painters[0]?.id;

    const doorFields: Record<string, unknown> = {};
    data.doors.forEach((d, i) => {
      const n = i + 1;
      doorFields[`Door ${n} Size`] = d.size === "single" ? "Single" : "Double";
      doorFields[`Door ${n} Color SW Code`] = d.selectedColor.sw_code;
      doorFields[`Door ${n} Color Name`] = d.selectedColor.name;
      doorFields[`Door ${n} Primer`] = d.primerNeeded;
    });

    const bookingId = await createBooking({
      Name: `${data.customerName} — Quote`,
      Contact: [data.contactId],
      "Contact Email": data.customerEmail,
      ...doorFields,
      Subtotal: data.pricing.subtotal,
      Discount: data.pricing.discount,
      "Primer Charges": data.pricing.primerCharges,
      "Deposit Paid": false,
      "Balance Charged": false,
      ...(painterId && { "Assigned Painter": [painterId] }),
      Status: "Quote",
    });

    return Response.json({ success: true, bookingId });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Invalid input", details: err.issues }, { status: 400 });
    }
    console.error("[/api/quote]", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
