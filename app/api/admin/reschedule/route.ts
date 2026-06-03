import { z } from "zod";
import { requireAdminAuth } from "@/lib/adminAuth";
import { getBookingById, updateBooking, getPainterById } from "@/lib/airtable";
import { sendSMS } from "@/lib/twilio";

export const dynamic = "force-dynamic";

const schema = z.object({
  bookingId: z.string().min(1),
  newStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  newEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().optional(),
});

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export async function POST(request: Request) {
  const authResponse = await requireAdminAuth();
  if (authResponse) return authResponse;

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const { bookingId, newStartDate, newEndDate, reason } = parsed.data;

  try {
    const booking = await getBookingById(bookingId);
    const fields = booking.fields;

    await updateBooking(bookingId, {
      "Scheduled Start": newStartDate,
      "Scheduled End": newEndDate,
    });

    const address = ((fields["Notes"] as string) ?? "").match(/Address:\s*(.+?)(\s*\|.*)?$/)?.[1]?.trim() ?? "your job";
    const dateStr = fmtDate(newStartDate);
    const reasonText = reason ? ` (${reason})` : "";
    const smsBody = `Bolt Painting: Job rescheduled to ${dateStr} at ${address}${reasonText}. Questions? Reply to this message.`;

    // SMS painter
    const painterIds = fields["Assigned Painter"] as string[] | undefined;
    const painterId = painterIds?.[0];
    if (painterId) {
      const painter = await getPainterById(painterId);
      if (painter?.phone) {
        sendSMS(painter.phone, smsBody).catch((e) => console.error("[reschedule] painter SMS:", e));
      }
    }

    // SMS customer
    const notesField = fields["Notes"] as string | undefined;
    const phoneMatch = notesField?.match(/Phone:\s*([^\s|]+)/);
    const customerPhone = phoneMatch?.[1];
    if (customerPhone) {
      sendSMS(customerPhone, `Bolt Painting: Your garage door job has been rescheduled to ${dateStr}${reasonText}. Same address. Any questions call or text us.`).catch(
        (e) => console.error("[reschedule] customer SMS:", e)
      );
    }

    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/admin/reschedule]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
