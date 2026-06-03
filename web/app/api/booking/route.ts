export const dynamic = 'force-dynamic';
import { NextRequest } from "next/server";
import { z } from "zod";
import { createBooking, updateBooking, updateContactStatus, createPaintOrders, getActivePainters, getBookingById } from "@/lib/airtable";
import { addDays, format, parseISO } from "date-fns";

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
  customerPhone: z.string().default(""),
  customerAddress: z.string().default(""),
  doors: z.array(doorSchema).min(1).max(5),
  pricing: z.object({
    subtotal: z.number(),
    discount: z.number(),
    primerCharges: z.number(),
    total: z.number(),
    depositAmount: z.number(),
    balanceAmount: z.number(),
  }),
  selectedStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const scheduleSchema = z.object({
  bookingId: z.string(),
  contactId: z.string(),
  selectedStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  customerPhone: z.string().default(""),
  customerAddress: z.string().default(""),
});

// Convert an existing Quote booking to Scheduled when the customer picks a date.
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const data = scheduleSchema.parse(body);

    const existing = await getBookingById(data.bookingId);
    const doorCount = [1, 2, 3, 4, 5].filter((n) => existing.fields[`Door ${n} Size`]).length;

    const startDate = parseISO(data.selectedStartDate);
    const endDate = addDays(startDate, Math.max(doorCount - 1, 0));
    const endDateStr = format(endDate, "yyyy-MM-dd");

    const painters = await getActivePainters();
    const painterId = painters[0]?.id;

    await updateBooking(data.bookingId, {
      Name: `${(existing.fields["Name"] as string).replace(" — Quote", "")} — ${data.selectedStartDate}`,
      "Scheduled Start": data.selectedStartDate,
      "Scheduled End": endDateStr,
      Status: "Scheduled",
      Notes: `Phone: ${data.customerPhone} | Address: ${data.customerAddress}`,
      ...(painterId && { "Assigned Painter": [painterId] }),
    });

    await updateContactStatus(data.contactId, "Booked");

    // Build paint orders from existing door fields
    const paintOrders = [1, 2, 3, 4, 5]
      .filter((n) => existing.fields[`Door ${n} Size`])
      .map((n) => ({
        swCode: (existing.fields[`Door ${n} Color SW Code`] as string) ?? "",
        swColorName: (existing.fields[`Door ${n} Color Name`] as string) ?? "",
        gallons: 1,
        primerNeeded: !!(existing.fields[`Door ${n} Primer`]),
        primerGallons: existing.fields[`Door ${n} Primer`] ? 1 : 0,
        painterId,
        jobDate: data.selectedStartDate,
      }));

    await createPaintOrders(data.bookingId, paintOrders);

    return Response.json({ success: true, bookingId: data.bookingId, endDate: endDateStr });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Invalid input", details: err.issues }, { status: 400 });
    }
    console.error("[PATCH /api/booking]", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const startDate = parseISO(data.selectedStartDate);
    const endDate = addDays(startDate, data.doors.length - 1);
    const endDateStr = format(endDate, "yyyy-MM-dd");

    // Auto-assign first active painter for V1
    const painters = await getActivePainters();
    const painterId = painters[0]?.id;

    // Build door fields
    const doorFields: Record<string, unknown> = {};
    data.doors.forEach((d, i) => {
      const n = i + 1;
      doorFields[`Door ${n} Size`] = d.size === "single" ? "Single" : "Double";
      doorFields[`Door ${n} Color SW Code`] = d.selectedColor.sw_code;
      doorFields[`Door ${n} Color Name`] = d.selectedColor.name;
      doorFields[`Door ${n} Primer`] = d.primerNeeded;
    });

    const bookingId = await createBooking({
      Name: `${data.customerName} — ${data.selectedStartDate}`,
      Contact: [data.contactId],
      "Contact Email": data.customerEmail,
      ...doorFields,
      Subtotal: data.pricing.subtotal,
      Discount: data.pricing.discount,
      "Primer Charges": data.pricing.primerCharges,
      "Deposit Paid": false,
      "Balance Charged": false,
      "Scheduled Start": data.selectedStartDate,
      "Scheduled End": endDateStr,
      ...(painterId && { "Assigned Painter": [painterId] }),
      Status: "Scheduled",
      Notes: `Phone: ${data.customerPhone} | Address: ${data.customerAddress}`,
    });

    // Update contact address/phone and status
    await updateContactStatus(data.contactId, "Booked");

    // Create paint order records
    const paintOrders = data.doors.map((d) => ({
      swCode: d.selectedColor.sw_code,
      swColorName: d.selectedColor.name,
      gallons: 1,
      primerNeeded: d.primerNeeded,
      primerGallons: d.primerNeeded ? 1 : 0,
      painterId,
      jobDate: data.selectedStartDate,
    }));
    await createPaintOrders(bookingId, paintOrders);

    return Response.json({ success: true, bookingId, endDate: endDateStr });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Invalid input", details: err.issues }, { status: 400 });
    }
    console.error("[/api/booking]", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
