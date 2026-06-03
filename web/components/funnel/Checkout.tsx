"use client";

import { useState, useCallback } from "react";
import Script from "next/script";
import type { DoorConfig, PriceBreakdown } from "@/types";
import { formatCurrency, needsPrimer } from "@/lib/pricing";
import { format, parseISO } from "date-fns";
import { pixelPurchase } from "@/lib/pixel";

interface Props {
  contactId: string;
  customerName: string;
  customerEmail: string;
  doors: DoorConfig[];
  pricing: PriceBreakdown;
  startDate: string;
  endDate: string;
  bookingId: string;
  onComplete: (bookingId: string) => void;
}

export default function Checkout(props: Props) {
  const {
    contactId,
    customerName,
    customerEmail,
    doors,
    pricing,
    startDate,
    endDate,
    bookingId,
    onComplete,
  } = props;

  const [sqCard, setSqCard] = useState<{ tokenize: () => Promise<{ status: string; token?: string; errors?: { message: string }[] }> } | null>(null);
  const [sqReady, setSqReady] = useState(false);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const initSquare = useCallback(async () => {
    const sq = (window as { Square?: { payments: (appId: string, locationId: string) => Promise<{ card: () => Promise<{ attach: (selector: string) => Promise<void>; tokenize: () => Promise<{ status: string; token?: string; errors?: { message: string }[] }> }> }> } }).Square;
    if (!sq) {
      setError("Payment SDK failed to load. Please refresh and try again.");
      return;
    }
    try {
      const payments = await sq.payments(
        process.env.NEXT_PUBLIC_SQUARE_APP_ID!,
        process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID!
      );
      const card = await payments.card();
      await card.attach("#sq-card-container");
      setSqCard(card);
      setSqReady(true);
    } catch (err) {
      console.error("[Square] init failed:", err);
      setError("Failed to initialize payment form. Please refresh and try again.");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sqCard || !sqReady) return;
    if (!agreed) {
      setError("Please agree to the service terms to continue.");
      return;
    }
    if (!phone.trim() || !address.trim()) {
      setError("Please enter your phone number and job site address.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await sqCard.tokenize();
      if (result.status !== "OK" || !result.token) {
        throw new Error(result.errors?.[0]?.message ?? "Card tokenization failed.");
      }

      const res = await fetch("/api/payment/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          contactId,
          customerName,
          customerEmail,
          depositAmount: pricing.depositAmount,
          total: pricing.total,
          balanceAmount: pricing.balanceAmount,
          sourceId: result.token,
          phone,
          address,
          startDate,
          endDate,
          doors: doors.map((d) => ({
            size: d.size,
            colorName: d.selectedColor?.name ?? "",
            swCode: d.selectedColor?.sw_code ?? "",
            primerNeeded: needsPrimer(d),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Payment failed. Please try again.");

      pixelPurchase(pricing.total);
      onComplete(bookingId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isSameDay = startDate === endDate;

  return (
    <section className="bg-white py-16 sm:py-20">
      <Script
        src={
          process.env.NODE_ENV === "production"
            ? "https://web.squarecdn.com/v1/square.js"
            : "https://sandbox.web.squarecdn.com/v1/square.js"
        }
        strategy="afterInteractive"
        onLoad={initSquare}
      />

      <div className="max-w-lg mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="font-display text-4xl sm:text-5xl uppercase text-bolt-black mb-4">
            Secure <span className="text-bolt-yellow">Checkout</span>
          </h2>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order Summary */}
          <div className="bg-bolt-gray-light rounded-2xl p-5">
            <h3 className="font-semibold text-bolt-black text-base mb-4">Order Summary</h3>
            <div className="space-y-2 text-sm">
              {doors.map((d, i) => (
                <div key={d.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded flex-shrink-0 border border-gray-200"
                      style={{ backgroundColor: d.selectedColor?.hex ?? "#999" }}
                    />
                    <span className="text-gray-700">
                      Door {i + 1}: {d.size === "single" ? "Single" : "Double"}-car · {d.selectedColor?.name}
                    </span>
                  </div>
                </div>
              ))}

              <div className="border-t border-gray-200 pt-3 mt-3 space-y-1.5">
                {pricing.lineItems.map((item, i) => (
                  <div key={i} className="flex justify-between">
                    <span className={item.type === "discount" ? "text-green-600" : "text-gray-600"}>
                      {item.label}
                    </span>
                    <span className={item.type === "discount" ? "text-green-600 font-medium" : "text-gray-900"}>
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>{formatCurrency(pricing.total)}</span>
                </div>
                <div className="mt-2 flex justify-between text-xs text-gray-500">
                  <span>Due today (50% deposit)</span>
                  <span className="font-semibold text-bolt-black">{formatCurrency(pricing.depositAmount)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Balance charged at completion</span>
                  <span>{formatCurrency(pricing.balanceAmount)}</span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Scheduled</span>
                  <span className="font-medium text-gray-700">
                    {isSameDay
                      ? format(parseISO(startDate), "EEE, MMM d, yyyy")
                      : `${format(parseISO(startDate), "EEE, MMM d")} – ${format(parseISO(endDate), "EEE, MMM d, yyyy")}`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-bolt-black text-base">Job Site Info</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(817) 555-0100"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-bolt-yellow transition-colors"
                autoComplete="tel"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Job Site Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Oak Street, Haslet, TX 76052"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-bolt-yellow transition-colors"
                autoComplete="street-address"
              />
            </div>
          </div>

          {/* Square payment card */}
          <div className="space-y-3">
            <h3 className="font-semibold text-bolt-black text-base">Payment</h3>
            <div className="border border-gray-200 rounded-xl p-4">
              <div id="sq-card-container" className="min-h-[89px]" />
              {!sqReady && !error && (
                <div className="flex items-center justify-center h-[89px] text-gray-400 text-sm">
                  <svg className="w-4 h-4 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading payment form...
                </div>
              )}
            </div>
          </div>

          {/* Terms */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 rounded border-gray-300 text-bolt-yellow focus:ring-bolt-yellow flex-shrink-0"
            />
            <span className="text-sm text-gray-600">
              I agree to the service terms. The remaining{" "}
              <strong>{formatCurrency(pricing.balanceAmount)}</strong> balance will be
              charged to this card upon job completion. Deposit is non-refundable if
              cancelled within 48 hours of the scheduled date.
            </span>
          </label>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !sqReady}
            className="w-full bg-bolt-yellow hover:bg-bolt-yellow-dark disabled:opacity-60 text-black font-bold text-lg py-4 rounded-xl transition-colors"
          >
            {loading ? "Processing..." : `Pay Deposit ${formatCurrency(pricing.depositAmount)} →`}
          </button>

          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Secured by Square. Your card info never touches our servers.
          </div>
        </form>
      </div>
    </section>
  );
}
