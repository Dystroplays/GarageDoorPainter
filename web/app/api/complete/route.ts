export const dynamic = 'force-dynamic';
import { NextRequest } from "next/server";
import { z } from "zod";
import { getBookingById, updateBooking } from "@/lib/airtable";
import { chargeSquareBalanceOnFile } from "@/lib/square";

const schema = z.object({
  bookingId: z.string(),
  painterToken: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bookingId, painterToken } = schema.parse(body);

    if (painterToken !== process.env.PAINTER_SECRET_TOKEN) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const booking = await getBookingById(bookingId);
    const fields = booking.fields as Record<string, unknown>;

    const cardId = fields["Square Card ID"] as string;
    const balanceRemaining = fields["Balance Remaining"] as number;
    const contactEmail = fields["Contact Email"] as string ?? "";

    if (!cardId || !balanceRemaining) {
      return Response.json({ error: "Missing payment info" }, { status: 400 });
    }

    if (fields["Balance Charged"]) {
      return Response.json({ error: "Balance already charged" }, { status: 409 });
    }

    const paymentId = await chargeSquareBalanceOnFile(
      cardId,
      balanceRemaining,
      bookingId,
      crypto.randomUUID()
    );

    await updateBooking(bookingId, {
      "Balance Charged": true,
      "Square Balance Payment ID": paymentId,
      Status: "Completed",
    });

    return Response.json({ success: true, paymentId });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("[/api/complete]", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
