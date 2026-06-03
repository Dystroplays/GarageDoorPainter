import { z } from "zod";
import { getPainterByToken, getBookingById, updateBooking } from "@/lib/airtable";
import { chargeSquareBalanceOnFile } from "@/lib/square";
import { sendJobCompletion } from "@/lib/email";
import { sendSMS } from "@/lib/twilio";

export const dynamic = "force-dynamic";

const schema = z.object({
  token: z.string().min(1),
  bookingId: z.string().min(1),
  afterPhotoUrls: z.array(z.string().url()).min(1, "At least one after photo required"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
    }

    const { token, bookingId, afterPhotoUrls } = parsed.data;

    const painter = await getPainterByToken(token);
    if (!painter) {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }

    const booking = await getBookingById(bookingId);
    const fields = booking.fields;

    const assignedPainter = fields["Assigned Painter"] as string[] | undefined;
    if (!assignedPainter?.includes(painter.id)) {
      return Response.json({ error: "Not authorized for this booking" }, { status: 403 });
    }

    if (fields["Status"] !== "In Progress") {
      return Response.json({ error: "Job must be In Progress to complete" }, { status: 409 });
    }

    const cardId = fields["Square Card ID"] as string | undefined;
    const balanceRemaining = fields["Balance Remaining"] as number | undefined;

    if (!cardId) {
      return Response.json({ error: "No card on file for this booking" }, { status: 422 });
    }

    // Charge the balance
    const balanceDollars = balanceRemaining ?? 0;
    let paymentId: string | undefined;
    if (balanceDollars > 0) {
      paymentId = await chargeSquareBalanceOnFile(
        cardId,
        balanceDollars,
        bookingId,
        crypto.randomUUID()
      );
    }

    // Update Airtable
    await updateBooking(bookingId, {
      Status: "Completed",
      "Balance Charged": true,
      "After Photos": afterPhotoUrls.map((url) => ({ url })),
      ...(paymentId && { "Square Balance Payment ID": paymentId }),
    });

    // Send customer completion email (fire-and-forget)
    const customerEmail = fields["Contact Email"] as string | undefined;
    const customerName = (fields["Name"] as string | undefined)?.split("—")[0]?.trim() ?? "Customer";
    if (customerEmail) {
      sendJobCompletion({
        to: customerEmail,
        customerName,
        bookingId,
        afterPhotoUrls,
        balanceAmount: balanceDollars,
      }).catch((e) => console.error("[complete] email failed:", e));
    }

    // SMS customer (fire-and-forget)
    const notesField = fields["Notes"] as string | undefined;
    const phoneMatch = notesField?.match(/Phone:\s*([^\s|]+)/);
    const customerPhone = phoneMatch?.[1];
    if (customerPhone) {
      sendSMS(customerPhone, "Your Bolt Painting garage door refresh is complete! Photos and receipt are on the way to your email. 🎉").catch(
        (e) => console.error("[complete] customer SMS failed:", e)
      );
    }

    return Response.json({ success: true, paymentId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/painter/complete]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
