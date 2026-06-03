"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DoorConfig, DoorSize, PriceBreakdown, SWColor } from "@/types";
import { calculatePrice, needsPrimer } from "@/lib/pricing";
import QuoteHeader from "./QuoteHeader";
import ProgressBar from "./ProgressBar";
import VSLStep from "./VSLStep";
import VisualizeStep from "./VisualizeStep";
import Configurator from "./Configurator";
import Scheduler from "./Scheduler";
import Checkout from "./Checkout";
import Confirmation from "./Confirmation";
import CrewCard from "./CrewCard";

type QuoteStep = "vsl" | "visualize" | "configure" | "schedule" | "checkout" | "confirmed";

interface LeadInfo {
  name: string;
  email: string;
  phone: string;
  contactId: string;
}

interface BookingInfo {
  bookingId: string;
  startDate: string;
  endDate: string;
}

// Proof thumbnails shown above the scheduler step
const RECENT_COLORS = [
  { name: "Iron Ore", hex: "#414543", before: "#C8BCA8" },
  { name: "Naval", hex: "#36475A", before: "#B5A898" },
  { name: "Extra White", hex: "#F1ECE1", before: "#A89880" },
];

function stepToNumber(step: QuoteStep): number {
  const map: Record<QuoteStep, number> = {
    vsl: 2,
    visualize: 3,
    configure: 4,
    schedule: 5,
    checkout: 6,
    confirmed: 6,
  };
  return map[step];
}

export default function QuoteFunnelWrapper() {
  const router = useRouter();
  const [lead, setLead] = useState<LeadInfo | null>(null);
  const [step, setStep] = useState<QuoteStep>("vsl");
  const [doors, setDoors] = useState<DoorConfig[]>([]);
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [initialDoorType, setInitialDoorType] = useState<DoorSize | null>(null);
  const [initialColor, setInitialColor] = useState<SWColor | null>(null);

  const pricing: PriceBreakdown = calculatePrice(doors);
  const phone = process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "";

  const topRef = useRef<HTMLDivElement>(null);

  // Read lead from localStorage on mount; redirect if missing
  useEffect(() => {
    try {
      const raw = localStorage.getItem("bolt_lead");
      if (!raw) throw new Error("no lead");
      const parsed: LeadInfo = JSON.parse(raw);
      if (!parsed.contactId || !parsed.name || !parsed.email) throw new Error("incomplete");
      setLead(parsed);
    } catch {
      router.replace("/#get-quote");
    }
  }, [router]);

  // Scroll to top on step changes
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  async function handleScheduleComplete(startDate: string, endDate: string) {
    if (!lead) return;
    setCreatingBooking(true);
    try {
      const doorsWithPrimer = doors.map((d) => ({ ...d, primerNeeded: needsPrimer(d) }));
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: lead.contactId,
          customerName: lead.name,
          customerEmail: lead.email,
          customerPhone: lead.phone ?? "",
          customerAddress: "",
          doors: doorsWithPrimer,
          pricing: {
            subtotal: pricing.subtotal,
            discount: pricing.discount,
            primerCharges: pricing.primerCharges,
            total: pricing.total,
            depositAmount: pricing.depositAmount,
            balanceAmount: pricing.balanceAmount,
          },
          selectedStartDate: startDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBooking({ bookingId: data.bookingId, startDate, endDate: data.endDate });
      setStep("checkout");
    } catch (err) {
      console.error("Failed to create booking:", err);
      alert("Something went wrong saving your booking. Please try again.");
    } finally {
      setCreatingBooking(false);
    }
  }

  function handlePaymentComplete() {
    localStorage.removeItem("bolt_lead");
    setStep("confirmed");
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-bolt-black flex items-center justify-center">
        <svg className="w-8 h-8 animate-spin text-bolt-yellow" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  const showConfirmation = step === "confirmed";

  return (
    <div className="min-h-screen bg-white" ref={topRef}>
      <QuoteHeader />

      {!showConfirmation && <ProgressBar step={stepToNumber(step)} total={6} />}

      {/* Step 2: VSL */}
      {step === "vsl" && (
        <VSLStep onAdvance={() => setStep("visualize")} phone={phone} />
      )}

      {/* Step 3: AI Visualizer */}
      {step === "visualize" && (
        <VisualizeStep
          onComplete={(doorType, color) => {
            setInitialDoorType(doorType);
            setInitialColor(color);
            setStep("configure");
          }}
        />
      )}

      {/* Proof strip above Configurator */}
      {step === "configure" && (
        <div className="bg-bolt-black border-b border-white/10 py-3">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-gray-400 text-sm text-center">
              <span className="text-bolt-yellow font-semibold">50+</span> DFW homeowners have refreshed their garage doors with Bolt Painting
            </p>
          </div>
        </div>
      )}

      {/* Step 4: Configurator */}
      {step === "configure" && (
        <Configurator
          doors={doors}
          onChange={setDoors}
          onComplete={() => setStep("schedule")}
          initialDoorType={initialDoorType ?? undefined}
          initialColor={initialColor}
        />
      )}

      {/* Proof strip above Scheduler */}
      {step === "schedule" && (
        <div className="bg-bolt-gray-light border-b border-gray-200 py-4">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-3">Recent color choices</p>
            <div className="flex gap-3">
              {RECENT_COLORS.map((c) => (
                <div key={c.name} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200 shadow-sm">
                  <div className="flex rounded overflow-hidden w-8 h-8 flex-shrink-0">
                    <div className="w-1/2 h-full" style={{ backgroundColor: c.before }} />
                    <div className="w-1/2 h-full" style={{ backgroundColor: c.hex }} />
                  </div>
                  <span className="text-gray-600 text-sm font-medium">{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Scheduler */}
      {step === "schedule" && (
        <>
          {creatingBooking ? (
            <div className="bg-white py-24 text-center text-gray-500">
              <svg className="w-8 h-8 animate-spin mx-auto mb-4 text-bolt-yellow" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving your booking...
            </div>
          ) : (
            <Scheduler daysNeeded={doors.length} onComplete={handleScheduleComplete} />
          )}
        </>
      )}

      {/* Testimonial + crew card above Checkout */}
      {step === "checkout" && (
        <>
          <div className="bg-bolt-gray-light border-b border-gray-200 py-5">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex gap-3 items-start">
                <div className="flex gap-0.5 flex-shrink-0 pt-0.5">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-bolt-yellow" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-600 text-sm italic">
                  &ldquo;The color match was perfect. Looks like a brand new door.&rdquo;
                  <span className="not-italic text-gray-400 ml-2">— [Name], [City]</span>
                </p>
              </div>
            </div>
          </div>
          <CrewCard />
        </>
      )}

      {/* Step 6: Checkout */}
      {step === "checkout" && lead && booking && (
        <Checkout
          contactId={lead.contactId}
          customerName={lead.name}
          customerEmail={lead.email}
          doors={doors}
          pricing={pricing}
          startDate={booking.startDate}
          endDate={booking.endDate}
          bookingId={booking.bookingId}
          onComplete={handlePaymentComplete}
        />
      )}

      {/* Confirmation */}
      {step === "confirmed" && lead && booking && (
        <Confirmation
          customerName={lead.name}
          customerEmail={lead.email}
          doors={doors}
          pricing={pricing}
          startDate={booking.startDate}
          endDate={booking.endDate}
          bookingId={booking.bookingId}
        />
      )}
    </div>
  );
}
