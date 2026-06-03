import { requireAdminAuth } from "@/lib/adminAuth";
import { getActiveBookings, getPainterById } from "@/lib/airtable";

export const dynamic = "force-dynamic";

function parseAddress(notes: string): string {
  return notes?.match(/Address:\s*(.+?)(\s*\|.*)?$/)?.[1]?.trim() ?? "";
}

function parseDoors(fields: Record<string, unknown>) {
  const doors = [];
  for (let i = 1; i <= 5; i++) {
    const size = fields[`Door ${i} Size`] as string | undefined;
    if (!size) break;
    doors.push({
      size,
      colorName: (fields[`Door ${i} Color Name`] as string) ?? "",
      swCode: (fields[`Door ${i} Color SW Code`] as string) ?? "",
      primer: !!(fields[`Door ${i} Primer`]),
    });
  }
  return doors;
}

export async function GET() {
  const authResponse = await requireAdminAuth();
  if (authResponse) return authResponse;

  try {
    const bookings = await getActiveBookings();

    const jobs = await Promise.all(
      bookings.map(async (b) => {
        const f = b.fields;
        const painterIds = f["Assigned Painter"] as string[] | undefined;
        const painterId = painterIds?.[0];
        let painterName = "";
        if (painterId) {
          const painter = await getPainterById(painterId);
          painterName = painter?.name ?? "";
        }
        const notes = (f["Notes"] as string) ?? "";
        return {
          id: b.id,
          customerName: ((f["Name"] as string) ?? "").split("—")[0].trim(),
          address: parseAddress(notes),
          scheduledStart: (f["Scheduled Start"] as string) ?? "",
          scheduledEnd: (f["Scheduled End"] as string) ?? "",
          status: (f["Status"] as string) ?? "",
          swOrderNumber: (f["SW Order Number"] as string) ?? "",
          jobStartTime: (f["Job Start Time"] as string) ?? null,
          painterName,
          depositPaid: !!(f["Deposit Paid"]),
          doors: parseDoors(f),
        };
      })
    );

    return Response.json({ jobs });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/admin/jobs]", message);
    return Response.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}
