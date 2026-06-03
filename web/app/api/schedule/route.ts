export const dynamic = 'force-dynamic';
import { NextRequest } from "next/server";
import { getBookedDateRanges, getBlockedDates } from "@/lib/airtable";
import { addDays, format, isSaturday, isSunday, parseISO } from "date-fns";

// Returns available start dates for a job requiring `daysNeeded` consecutive days
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const daysNeeded = Math.max(1, Math.min(5, parseInt(searchParams.get("days") ?? "1")));
  const startOffset = parseInt(searchParams.get("startOffset") ?? "7");
  const endOffset = parseInt(searchParams.get("endOffset") ?? "42");

  try {
    const [bookedRanges, blockedDates] = await Promise.all([
      getBookedDateRanges(),
      getBlockedDates(),
    ]);

    const blockedSet = new Set(blockedDates);

    // Build set of all unavailable dates from existing bookings
    const unavailableDates = new Set<string>();
    for (const range of bookedRanges) {
      if (!range.start || !range.end) continue;
      let current = parseISO(range.start);
      const end = parseISO(range.end);
      while (current <= end) {
        unavailableDates.add(format(current, "yyyy-MM-dd"));
        current = addDays(current, 1);
      }
    }

    const today = new Date();
    const windowStart = addDays(today, startOffset);
    const windowEnd = addDays(today, endOffset);

    const availableStartDates: string[] = [];
    let cursor = windowStart;

    while (cursor <= windowEnd) {
      const dateStr = format(cursor, "yyyy-MM-dd");

      // Skip Sunday (0) only — Saturday is fine
      if (!isSunday(cursor) && !blockedSet.has(dateStr)) {
        // Check if N consecutive days are all available (Mon–Sat only)
        let allClear = true;
        for (let d = 0; d < daysNeeded; d++) {
          const checkDate = addDays(cursor, d);
          const checkStr = format(checkDate, "yyyy-MM-dd");
          if (
            isSunday(checkDate) ||
            unavailableDates.has(checkStr) ||
            blockedSet.has(checkStr)
          ) {
            allClear = false;
            break;
          }
        }
        if (allClear) {
          availableStartDates.push(dateStr);
        }
      }

      cursor = addDays(cursor, 1);
    }

    return Response.json({ availableDates: availableStartDates, daysNeeded });
  } catch (err) {
    console.error("[/api/schedule]", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
