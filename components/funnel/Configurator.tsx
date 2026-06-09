"use client";

import type { DoorConfig, DoorSize } from "@/types";
import { calculatePrice, formatCurrency, needsPrimer } from "@/lib/pricing";
import { pixelViewContent } from "@/lib/pixel";

const NEW_DOOR_PRICES: Record<DoorSize, number> = { single: 2499, double: 3499 };

interface Props {
  doors: DoorConfig[];
  onComplete: () => void;
  newDoorUrl?: string;
}

export default function Configurator({ doors, onComplete, newDoorUrl }: Props) {
  const pricing = calculatePrice(doors);

  const replacementTotal = doors.reduce((sum, d) => sum + NEW_DOOR_PRICES[d.size], 0);
  const replacementSavings = replacementTotal - pricing.total;

  function handleNext() {
    pixelViewContent("Configurator Complete");
    onComplete();
  }

  if (doors.length === 0) {
    return (
      <section className="bg-bolt-gray-light py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center text-gray-500">
          <p>Something went wrong — please go back and configure your doors.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-bolt-gray-light py-16 sm:py-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="font-display text-4xl sm:text-5xl uppercase text-bolt-black mb-4">
            Your <span className="text-bolt-yellow">Quote</span>
          </h2>
          <p className="text-gray-500 text-lg">Here&apos;s a summary of what you&apos;ve selected.</p>
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">

          {/* Left — door summary cards (scrolls) */}
          <div className="space-y-4">
            {doors.map((door, i) => (
              <div key={door.id} className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="font-semibold text-bolt-black text-lg mb-4">Door {i + 1}</h3>

                <div className="flex flex-wrap gap-3 mb-4">
                  <span className="inline-flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    {door.size === "single" ? "Single Car · $599" : "Double Car · $799"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1 text-sm text-gray-700">
                    <span className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0" style={{ backgroundColor: door.currentTone === "light" ? "#e0dbd3" : "#444" }} />
                    {door.currentTone === "light" ? "Light door" : "Dark door"}
                  </span>
                </div>

                {door.selectedColor ? (
                  <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-200">
                    <div className="w-10 h-10 rounded-lg shadow-sm flex-shrink-0" style={{ backgroundColor: door.selectedColor.hex }} />
                    <div>
                      <p className="font-semibold text-bolt-black text-sm">{door.selectedColor.name}</p>
                      <p className="text-gray-400 text-xs">{door.selectedColor.sw_code}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No color selected</p>
                )}

                {door.selectedColor && needsPrimer(door) && (
                  <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                    <strong>Primer required (+$99):</strong> Going from a dark door to a lighter color requires a primer coat for proper coverage.
                  </div>
                )}
              </div>
            ))}

            {/* Next button on mobile (below cards, above sticky price) */}
            <div className="lg:hidden">
              <button
                onClick={handleNext}
                disabled={pricing.customQuote}
                className="w-full bg-bolt-yellow hover:bg-bolt-yellow-dark disabled:opacity-70 text-black font-bold text-lg py-4 rounded-xl transition-colors"
              >
                Next: Choose Your Date →
              </button>
            </div>
          </div>

          {/* Right — sticky price summary */}
          <div className="lg:sticky lg:top-6">
            {pricing.customQuote ? (
              <div className="bg-bolt-black rounded-2xl p-6 text-white">
                <p className="font-medium text-lg mb-2">Custom quote needed</p>
                <p className="text-gray-400 text-sm mb-4">For 6+ doors we&apos;ll put together a custom package.</p>
                <a href={`tel:${process.env.NEXT_PUBLIC_CONTACT_PHONE ?? ""}`} className="text-bolt-yellow font-semibold underline text-sm">
                  Call or text Blake →
                </a>
              </div>
            ) : (
              <div className="bg-bolt-black rounded-2xl p-6 text-white">
                <h3 className="font-semibold text-lg mb-4">Price Summary</h3>
                <div className="space-y-2">
                  {pricing.lineItems.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className={item.type === "discount" ? "text-green-400" : "text-gray-300"}>{item.label}</span>
                      <span className={item.type === "discount" ? "text-green-400" : ""}>{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  <div className="border-t border-white/10 pt-3 mt-3">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span className="text-bolt-yellow">{formatCurrency(pricing.total)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-400 mt-1">
                      <span>Due today (50% deposit)</span>
                      <span>{formatCurrency(pricing.depositAmount)}</span>
                    </div>
                  </div>

                  {replacementSavings > 0 && (
                    <div className="border-t border-white/10 pt-3 mt-1 space-y-1">
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>vs. replacing your door{doors.length > 1 ? "s" : ""}</span>
                        <span>~{formatCurrency(replacementTotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-green-400 font-medium">
                        <span>You save by painting</span>
                        <span>~{formatCurrency(replacementSavings)}</span>
                      </div>
                    </div>
                  )}

                  {/* New door quiz link */}
                  <div className="border-t border-white/10 pt-3 mt-1">
                    <p className="text-gray-400 text-xs mb-1">Is your door at the end of its life?</p>
                    <p className="text-gray-600 text-xs mb-2">
                      New single door: from $2,499 &middot; New double: from $3,499
                    </p>
                    {newDoorUrl ? (
                      <a href={newDoorUrl} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-300 text-xs underline transition-colors">
                        Find out if you need a replacement →
                      </a>
                    ) : (
                      <span className="text-gray-600 text-xs">Ask us about door replacement options when you call.</span>
                    )}
                  </div>
                </div>

                {/* CTA — desktop only in sidebar */}
                <button
                  onClick={handleNext}
                  className="hidden lg:flex mt-6 w-full bg-bolt-yellow hover:bg-bolt-yellow-dark text-black font-bold text-lg py-4 rounded-xl transition-colors items-center justify-center"
                >
                  Next: Choose Your Date →
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}
