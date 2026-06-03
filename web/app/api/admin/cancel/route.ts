import { z } from "zod";
import { requireAdminAuth } from "@/lib/adminAuth";
import { getBookingById, updateBooking, getPainterById } from "@/lib/airtable";
import { sendSMS } from "@/lib/twilio";
import { refundSquareDeposit } from "@/lib/square";

export const dynamic = "force-dynamic";

const schema = z.object({
  bookingId: z.string().min(1),
  reason: z.string().optional(),
});

export async function POST(request: Request) {
  const authResponse = await requireAdminAuth();
  if (authResponse) return authResponse;

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const { bookingId, reason } = parsed.data;

  try {
    const booking = await getBookingById(bookingId);
    const fields = booking.fields;

    let refundIssued = false;

    // Refund deposit if paid and not yet balanced
    const depositPaymentId = fields["Square Deposit Payment ID"] as string | undefined;
    const depositPaid = fields["Deposit Paid"] as boolean | undefined;
    const balanceCharged = fields["Balance Charged"] as boolean | undefined;

    if (depositPaid && depositPaymentId && !balanceCharged) {
      try {
        await refundSquareDeposit(depositPaymentId, reason ?? "Booking cancelled");
        refundIssued = true;
      } catch (e) {
        console.error("[cancel] Square refund failed:", e);
        // Continue cancellation even if refund fails — log it for manual follow-up
      }
    }

    await updateBooking(bookingId, { Status: "Cancelled" });

    const reasonText = reason ? ` Reason: ${reason}.` : "";
    const smsBody = `Bolt Painting: Your garage door job has been cancelled.${reasonText}${refundIssued ? " Your deposit will be refunded within 3–5 business days." : ""} Questions? Call or text us.`;

    // SMS painter
    const painterIds = fields["Assigned Painter"] as string[] | undefined;
    const painterId = painterIds?.[0];
    if (painterId) {
      const painter = await getPainterById(painterId);
      if (painter?.phone) {
        const address = ((fields["Notes"] as string) ?? "").match(/Address:\s*(.+?)(\s*\|.*)?$/)?.[1]?.trim() ?? "";
        sendSMS(painter.phone, `Bolt Painting: Job cancelled${reasonText} Job was at ${address}.`).catch(
          (e) => console.error("[cancel] painter SMS:", e)
        );
      }
    }

    // SMS customer
    const notesField = fields["Notes"] as string | undefined;
    const phoneMatch = notesField?.match(/Phone:\s*([^\s|]+)/);
    const customerPhone = phoneMatch?.[1];
    if (customerPhone) {
      sendSMS(customerPhone, smsBody).catch((e) => console.error("[cancel] customer SMS:", e));
    }

    return Response.json({ success: true, refundIssued });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/admin/cancel]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
