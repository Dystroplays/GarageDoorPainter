"use client";

import { useEffect, useRef, useState } from "react";
import type { DoorConfig, PriceBreakdown } from "@/types";
import { calculatePrice, needsPrimer } from "@/lib/pricing";
import LeadCapture from "./LeadCapture";
import Configurator from "./Configurator";
import Scheduler from "./Scheduler";
import Checkout from "./Checkout";
import Confirmation from "./Confirmation";

type Step = "lead" | "configure" | "schedule" | "checkout" | "confirmed";

interface LeadInfo {
  name: string;
  email: string;
  contactId: string;
}

interface BookingInfo {
  bookingId: string;
  startDate: string;
  endDate: string;
}

export default function FunnelWrapper() {
  const [step, setStep] = useState<Step>("lead");
  const [lead, setLead] = useState<LeadInfo | null>(null);
  const [doors, setDoors] = useState<DoorConfig[]>([]);
  const [schedule, setSchedule] = useState<{ startDate: string; endDate: string } | null>(null);
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [quoteBookingId, setQuoteBookingId] = useState<string | null>(null);
  const [creatingBooking, setCreatingBooking] = useState(false);

  const pricing: PriceBreakdown = calculatePrice(doors);

  // Scroll to the active section when step changes
  const sectionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (sectionRef.current && step !== "lead") {
      sectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [step]);

  async function handleConfigureComplete() {
    if (!lead) return;
    setCreatingBooking(true);
    try {
      const doorsWithPrimer = doors.map((d) => ({ ...d, primerNeeded: needsPrimer(d) }));
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: lead.contactId,
          customerName: lead.name,
          customerEmail: lead.email,
          doors: doorsWithPrimer,
          pricing: {
            subtotal: pricing.subtotal,
            discount: pricing.discount,
            primerCharges: pricing.primerCharges,
            total: pricing.total,
            depositAmount: pricing.depositAmount,
            balanceAmount: pricing.balanceAmount,
          },
        }),
      });
      const data = await res.json();
      if (res.ok) setQuoteBookingId(data.bookingId);
    } catch (err) {
      console.warn("Quote creation failed (non-blocking):", err);
    } finally {
      setCreatingBooking(false);
      setStep("schedule");
    }
  }

  async function handleScheduleComplete(startDate: string, endDate: string) {
    if (!lead) return;
    setCreatingBooking(true);

    try {
      if (quoteBookingId) {
        // Convert existing Quote → Scheduled via PATCH
        const res = await fetch("/api/booking", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId: quoteBookingId,
            contactId: lead.contactId,
            selectedStartDate: startDate,
            customerPhone: "",
            customerAddress: "",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setSchedule({ startDate, endDate: data.endDate });
        setBooking({ bookingId: quoteBookingId, startDate, endDate: data.endDate });
      } else {
        // Fallback: create booking directly (original flow)
        const doorsWithPrimer = doors.map((d) => ({ ...d, primerNeeded: needsPrimer(d) }));
        const res = await fetch("/api/booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contactId: lead.contactId,
            customerName: lead.name,
            customerEmail: lead.email,
            customerPhone: "",
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
        setSchedule({ startDate, endDate: data.endDate });
        setBooking({ bookingId: data.bookingId, startDate, endDate: data.endDate });
      }
      setStep("checkout");
    } catch (err) {
      console.error("Failed to create booking:", err);
      alert("Something went wrong saving your booking. Please try again.");
    } finally {
      setCreatingBooking(false);
    }
  }

  function handlePaymentComplete(bookingId: string) {
    setStep("confirmed");
  }

  return (
    <div id="get-quote" ref={sectionRef}>
      {/* Step 1: Lead Capture */}
      {step === "lead" && (
        <LeadCapture
          onComplete={(data) => {
            setLead(data);
            setStep("configure");
          }}
        />
      )}

      {/* Step 2: Configure */}
      {step !== "lead" && step !== "confirmed" && (
        <>
          {step === "configure" && (
            <Configurator
              doors={doors}
              onComplete={handleConfigureComplete}
            />
          )}

          {/* Step 4: Schedule */}
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
                <Scheduler
                  daysNeeded={doors.length}
                  onComplete={handleScheduleComplete}
                />
              )}
            </>
          )}

          {/* Step 5: Checkout */}
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
        </>
      )}

      {/* Step 6: Confirmation */}
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
