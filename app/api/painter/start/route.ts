import { z } from "zod";
import { getPainterByToken, getBookingById, updateBooking } from "@/lib/airtable";

export const dynamic = "force-dynamic";

const schema = z.object({
  token: z.string().min(1),
  bookingId: z.string().min(1),
  beforePhotoUrls: z.array(z.string().url()).min(1, "At least one before photo required"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
    }

    const { token, bookingId, beforePhotoUrls } = parsed.data;

    const painter = await getPainterByToken(token);
    if (!painter) {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }

    const booking = await getBookingById(bookingId);
    const assignedPainter = booking.fields["Assigned Painter"] as string[] | undefined;
    if (!assignedPainter?.includes(painter.id)) {
      return Response.json({ error: "Not authorized for this booking" }, { status: 403 });
    }

    if (booking.fields["Status"] !== "Scheduled") {
      return Response.json({ error: "Job is not in Scheduled status" }, { status: 409 });
    }

    await updateBooking(bookingId, {
      Status: "In Progress",
      "Job Start Time": new Date().toISOString(),
      "Before Photos": beforePhotoUrls.map((url) => ({ url })),
    });

    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/painter/start]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
