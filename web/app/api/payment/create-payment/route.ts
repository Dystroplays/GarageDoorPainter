export const dynamic = 'force-dynamic';
import { NextRequest } from "next/server";
import { z } from "zod";
import { SquareError } from "square";
import { createSquareCustomerAndChargeDeposit } from "@/lib/square";
import { updateBooking, updateContact, getBookingById, getPainterById } from "@/lib/airtable";
import { sendBookingConfirmation } from "@/lib/email";
import { sendSMS } from "@/lib/twilio";

const doorEmailSchema = z.object({
  size: z.enum(["single", "double"]),
  colorName: z.string(),
  swCode: z.string(),
  primerNeeded: z.boolean(),
});

const schema = z.object({
  bookingId: z.string(),
  contactId: z.string(),
  customerName: z.string(),
  customerEmail: z.string().email(),
  depositAmount: z.number().positive(),
  total: z.number().positive(),
  balanceAmount: z.number().nonnegative(),
  sourceId: z.string(),
  phone: z.string().default(""),
  address: z.string().default(""),
  startDate: z.string(),
  endDate: z.string(),
  doors: z.array(doorEmailSchema),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      bookingId,
      contactId,
      customerName,
      customerEmail,
      depositAmount,
      total,
      balanceAmount,
      sourceId,
      phone,
      address,
      startDate,
      endDate,
      doors,
    } = schema.parse(body);

    const { customerId, cardId, paymentId } =
      await createSquareCustomerAndChargeDeposit(
        customerEmail,
        customerName,
        sourceId,
        depositAmount,
        bookingId
      );

    await updateBooking(bookingId, {
      "Square Customer ID": customerId,
      "Square Deposit Payment ID": paymentId,
      "Square Card ID": cardId,
      "Deposit Paid": true,
      Notes: `Phone: ${phone} | Address: ${address}`,
    });

    if (phone || address) {
      await updateContact(contactId, {
        ...(phone && { Phone: phone }),
        ...(address && { Address: address }),
      });
    }

    // SMS the assigned painter (fire-and-forget)
    getBookingById(bookingId)
      .then(async (booking) => {
        const painterIds = booking.fields["Assigned Painter"] as string[] | undefined;
        const painterId = painterIds?.[0];
        if (!painterId) return;
        const painter = await getPainterById(painterId);
        if (!painter?.phone) return;
        const dateStr = new Date(startDate + "T00:00:00").toLocaleDateString("en-US", {
          weekday: "short", month: "short", day: "numeric",
        });
        await sendSMS(
          painter.phone,
          `Bolt Painting: New job booked! ${customerName} at ${address || "address TBD"} on ${dateStr}. Check your app for details.`
        );
      })
      .catch((e) => console.error("[create-payment] painter SMS failed:", e));

    // Fire-and-forget — don't let email failure block payment success response
    sendBookingConfirmation({
      to: customerEmail,
      customerName,
      bookingId,
      startDate,
      endDate,
      doors,
      total,
      depositAmount,
      balanceAmount,
    }).catch((e) => console.error("[email] confirmation send failed:", e));

    return Response.json({ success: true, paymentId });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    if (err instanceof SquareError) {
      const details = err.errors.map((e) => `${e.code}: ${e.detail ?? e.category}`).join("; ");
      console.error("[/api/payment/create-payment] Square error", err.statusCode, details);
      const msg = process.env.NODE_ENV === "development" ? `Square ${err.statusCode}: ${details}` : "Server error";
      return Response.json({ error: msg }, { status: 500 });
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/payment/create-payment]", message);
    return Response.json(
      { error: process.env.NODE_ENV === "development" ? message : "Server error" },
      { status: 500 }
    );
  }
}
