"use client";

import { format, parseISO } from "date-fns";
import type { PriceBreakdown, DoorConfig } from "@/types";
import { formatCurrency } from "@/lib/pricing";

interface Props {
  customerName: string;
  customerEmail: string;
  doors: DoorConfig[];
  pricing: PriceBreakdown;
  startDate: string;
  endDate: string;
  bookingId: string;
}

export default function Confirmation({
  customerName,
  doors,
  pricing,
  startDate,
  endDate,
  bookingId,
}: Props) {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const isSameDay = startDate === endDate;

  return (
    <section className="bg-bolt-black text-white py-16 sm:py-24">
      <div className="max-w-xl mx-auto px-4 sm:px-6 text-center">
        {/* Success icon */}
        <div className="w-20 h-20 rounded-full bg-bolt-yellow flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className="font-display text-4xl sm:text-5xl uppercase mb-4">
          You're <span className="text-bolt-yellow">Booked!</span>
        </h2>
        <p className="text-gray-300 text-lg mb-8">
          Thanks {customerName}! We've got you on the schedule. Check your email for confirmation.
        </p>

        {/* Booking summary */}
        <div className="bg-bolt-gray rounded-2xl p-6 text-left space-y-4 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm">Booking ID</p>
              <p className="font-mono text-xs text-gray-300 mt-0.5">{bookingId}</p>
            </div>
            <span className="bg-green-500/20 text-green-400 text-xs font-medium px-3 py-1 rounded-full border border-green-500/30">
              Confirmed
            </span>
          </div>

          <div className="border-t border-white/10 pt-4">
            <p className="text-gray-400 text-sm mb-1">Scheduled Date</p>
            <p className="text-white font-semibold">
              {isSameDay
                ? format(start, "EEEE, MMMM d, yyyy")
                : `${format(start, "EEE, MMM d")} – ${format(end, "EEE, MMM d, yyyy")}`}
            </p>
          </div>

          <div className="border-t border-white/10 pt-4">
            <p className="text-gray-400 text-sm mb-2">Your Doors</p>
            {doors.map((door, i) => (
              <div key={door.id} className="flex items-center gap-3 py-1.5">
                <div
                  className="w-6 h-6 rounded flex-shrink-0 border border-white/10"
                  style={{ backgroundColor: door.selectedColor?.hex ?? "#888" }}
                />
                <span className="text-sm text-gray-300">
                  Door {i + 1}: {door.size === "single" ? "Single" : "Double"}-car ·{" "}
                  {door.selectedColor?.name} ({door.selectedColor?.sw_code})
                  {door.selectedColor && pricing.lineItems.some(
                    (l) => l.label.includes(`Door ${i + 1}`) && l.type === "primer"
                  ) && <span className="text-amber-400 ml-1">+ primer</span>}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 pt-4 flex justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total</p>
              <p className="font-bold text-bolt-yellow text-lg">{formatCurrency(pricing.total)}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm">Deposit charged</p>
              <p className="font-bold text-white">{formatCurrency(pricing.depositAmount)}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm">Balance due at completion</p>
              <p className="font-bold text-white">{formatCurrency(pricing.balanceAmount)}</p>
            </div>
          </div>
        </div>

        {/* What to expect */}
        <div className="bg-bolt-gray rounded-2xl p-6 text-left mb-8">
          <h3 className="font-semibold text-white mb-4">What Happens Next</h3>
          <div className="space-y-3">
            {[
              "Check your email — you'll get a booking confirmation shortly.",
              "We'll pick up your Sherwin-Williams paint 2 days before your job.",
              "Our painter arrives on your scheduled date. No need to be home.",
              "Once complete, the remaining balance is charged to your card on file.",
              "You'll receive before & after photos of your job and a Google review request.",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-bolt-yellow text-black text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-gray-300 text-sm">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <a
          href={`tel:${process.env.NEXT_PUBLIC_CONTACT_PHONE ?? ""}`}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          Questions? Call or text us
        </a>
      </div>
    </section>
  );
}
