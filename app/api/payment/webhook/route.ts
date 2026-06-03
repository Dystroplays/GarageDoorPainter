export const dynamic = 'force-dynamic';
import { NextRequest } from "next/server";
import { WebhooksHelper } from "square";
import { updateBooking } from "@/lib/airtable";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signatureHeader = req.headers.get("x-square-hmacsha256-signature") ?? "";
  const notificationUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/payment/webhook`;

  const isValid = await WebhooksHelper.verifySignature({
    requestBody: body,
    signatureHeader,
    signatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY!,
    notificationUrl,
  });

  if (!isValid) {
    console.error("[webhook] Square signature verification failed");
    return new Response("Invalid signature", { status: 400 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const type = event.type as string | undefined;

  // Square fires payment.updated when a payment's status changes (e.g. COMPLETED, FAILED)
  if (type === "payment.updated") {
    const payment = (event as {
      data?: { object?: { payment?: { id?: string; status?: string; referenceId?: string; note?: string } } };
    }).data?.object?.payment;

    const status = payment?.status;
    const bookingId = payment?.referenceId;
    const paymentId = payment?.id;
    const note = payment?.note ?? "";

    if (status === "COMPLETED" && bookingId && paymentId) {
      // Only act on balance payments — deposits are handled synchronously in create-payment
      if (note.includes("balance")) {
        await updateBooking(bookingId, {
          "Balance Charged": true,
          "Square Balance Payment ID": paymentId,
          Status: "Completed",
        });
      }
      // Deposit COMPLETED webhooks are intentionally ignored here (already set in create-payment)
    }

    if (status === "FAILED") {
      console.error(`[webhook] payment FAILED: Payment ${paymentId}, booking ${bookingId}`);
    }
  }

  return new Response("ok", { status: 200 });
}
