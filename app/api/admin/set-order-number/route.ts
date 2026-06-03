import { z } from "zod";
import { requireAdminAuth } from "@/lib/adminAuth";
import { getBookingById, updateBooking, getPainterById } from "@/lib/airtable";
import { sendSMS } from "@/lib/twilio";

export const dynamic = "force-dynamic";

const schema = z.object({
  bookingId: z.string().min(1),
  orderNumber: z.string().min(1),
});

export async function POST(request: Request) {
  const authResponse = await requireAdminAuth();
  if (authResponse) return authResponse;

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const { bookingId, orderNumber } = parsed.data;

  try {
    const booking = await getBookingById(bookingId);
    const fields = booking.fields;

    await updateBooking(bookingId, { "SW Order Number": orderNumber });

    // SMS the assigned painter
    const painterIds = fields["Assigned Painter"] as string[] | undefined;
    const painterId = painterIds?.[0];
    if (painterId) {
      const painter = await getPainterById(painterId);
      if (painter?.phone) {
        const address = ((fields["Notes"] as string) ?? "").match(/Address:\s*(.+?)(\s*\|.*)?$/)?.[1]?.trim() ?? "";
        const startDate = fields["Scheduled Start"] as string | undefined;
        const dateStr = startDate
          ? new Date(startDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
          : "your upcoming job";
        await sendSMS(
          painter.phone,
          `Bolt Painting: Paint order ready! Order #${orderNumber} at Sherwin-Williams. Job at ${address} on ${dateStr}. See your app for details.`
        );
      }
    }

    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/admin/set-order-number]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
