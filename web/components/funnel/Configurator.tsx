"use client";

import { useEffect, useRef, useState } from "react";
import type { DoorConfig, DoorSize, CurrentColorTone, SWColor } from "@/types";
import { calculatePrice, formatCurrency, needsPrimer } from "@/lib/pricing";
import ColorPicker from "./ColorPicker";
import { pixelViewContent } from "@/lib/pixel";

interface Props {
  doors: DoorConfig[];
  onChange: (doors: DoorConfig[]) => void;
  onComplete: () => void;
  initialDoorType?: DoorSize;
  initialColor?: SWColor | null;
  isCreatingQuote?: boolean;
}

function generateId() {
  return Math.random().toString(36).slice(2);
}

function createDoor(): DoorConfig {
  return {
    id: generateId(),
    size: "single",
    currentTone: "light",
    selectedColor: null,
  };
}

export default function Configurator({ doors, onChange, onComplete, initialDoorType, initialColor, isCreatingQuote }: Props) {
  const [activeDoorColorPicker, setActiveDoorColorPicker] = useState<number | null>(null);
  const pricing = calculatePrice(doors);
  const seededRef = useRef(false);

  // Pre-fill door 1 from the visualizer step on first mount only
  useEffect(() => {
    if (seededRef.current || doors.length > 0) return;
    if (!initialDoorType) return;
    seededRef.current = true;
    onChange([{
      id: Math.random().toString(36).slice(2),
      size: initialDoorType,
      currentTone: "light",
      selectedColor: initialColor ?? null,
    }]);
  }, [initialDoorType, initialColor, doors.length, onChange]);

  function setDoorCount(count: number) {
    if (count >= 6) return; // handled by custom quote
    const current = [...doors];
    while (current.length < count) current.push(createDoor());
    while (current.length > count) current.pop();
    onChange(current);
  }

  function updateDoor(index: number, updates: Partial<DoorConfig>) {
    const updated = doors.map((d, i) => (i === index ? { ...d, ...updates } : d));
    onChange(updated);
  }

  const allColorsSelected = doors.length > 0 && doors.every((d) => d.selectedColor !== null);

  function handleNext() {
    if (allColorsSelected) {
      pixelViewContent("Configurator Complete");
      onComplete();
    }
  }

  return (
    <section className="bg-bolt-gray-light py-16 sm:py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="font-display text-4xl sm:text-5xl uppercase text-bolt-black mb-4">
            Configure Your <span className="text-bolt-yellow">Doors</span>
          </h2>
          <p className="text-gray-500 text-lg">Select your doors and pick a color for each.</p>
        </div>

        <div className="space-y-8">
          {/* Door count */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-bolt-black text-lg mb-4">How many garage doors do you have?</h3>
            <div className="flex flex-wrap gap-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setDoorCount(n)}
                  className={`w-14 h-14 rounded-xl font-bold text-xl transition-all ${
                    doors.length === n
                      ? "bg-bolt-yellow text-black scale-110 shadow-md"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => onChange([])}
                className="px-5 h-14 rounded-xl font-medium text-sm bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all"
              >
                6+ (custom)
              </button>
            </div>

            {pricing.customQuote && (
              <div className="mt-4 p-4 bg-bolt-yellow/10 rounded-xl border border-bolt-yellow/30">
                <p className="text-bolt-black font-medium">
                  For 6+ doors, we'll put together a custom package.
                </p>
                <a
                  href={`tel:${process.env.NEXT_PUBLIC_CONTACT_PHONE ?? ""}`}
                  className="text-bolt-yellow font-semibold underline text-sm mt-1 block"
                >
                  Call or text Blake →
                </a>
              </div>
            )}
          </div>

          {/* Per-door configuration */}
          {doors.map((door, i) => (
            <div key={door.id} className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
              <h3 className="font-semibold text-bolt-black text-lg">Door {i + 1}</h3>

              {/* Size */}
              <div>
                <p className="text-sm text-gray-500 mb-2">Door size</p>
                <div className="flex gap-3">
                  {(["single", "double"] as DoorSize[]).map((size) => (
                    <button
                      key={size}
                      onClick={() => updateDoor(i, { size })}
                      className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                        door.size === size
                          ? "border-bolt-yellow bg-bolt-yellow/10 text-bolt-black"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {size === "single" ? "Single Car" : "Double Car"}
                      <span className="block text-xs font-normal mt-0.5 text-gray-400">
                        {size === "single" ? "≤10ft wide · $799" : ">10ft wide · $899"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Current color tone */}
              <div>
                <p className="text-sm text-gray-500 mb-2">Current door color</p>
                <div className="flex gap-3">
                  {(["light", "dark"] as CurrentColorTone[]).map((tone) => (
                    <button
                      key={tone}
                      onClick={() => updateDoor(i, { currentTone: tone })}
                      className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                        door.currentTone === tone
                          ? "border-bolt-yellow bg-bolt-yellow/10 text-bolt-black"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      <span
                        className="w-5 h-5 rounded-full border border-gray-300 flex-shrink-0"
                        style={{ backgroundColor: tone === "light" ? "#e0dbd3" : "#444" }}
                      />
                      {tone === "light" ? "Light color" : "Dark color"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Primer warning */}
              {door.selectedColor && needsPrimer(door) && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                  <strong>Primer required (+$99):</strong> Your door is currently a dark color.
                  Going to a lighter shade requires a coat of primer for proper coverage and
                  durability.
                </div>
              )}

              {/* Color picker */}
              <div>
                <p className="text-sm text-gray-500 mb-2">Select a color</p>
                {activeDoorColorPicker === i ? (
                  <div className="border border-gray-200 rounded-xl p-4">
                    <ColorPicker
                      selectedColor={door.selectedColor}
                      onSelect={(color) => {
                        updateDoor(i, { selectedColor: color });
                        setActiveDoorColorPicker(null);
                      }}
                    />
                  </div>
                ) : door.selectedColor ? (
                  <button
                    onClick={() => setActiveDoorColorPicker(i)}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 hover:border-bolt-yellow transition-colors w-full text-left"
                  >
                    <div
                      className="w-10 h-10 rounded-lg shadow-sm flex-shrink-0"
                      style={{ backgroundColor: door.selectedColor.hex }}
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-bolt-black text-sm">{door.selectedColor.name}</p>
                      <p className="text-gray-400 text-xs">{door.selectedColor.sw_code}</p>
                    </div>
                    <span className="text-bolt-yellow text-xs font-medium">Change</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveDoorColorPicker(i)}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-bolt-yellow hover:text-bolt-yellow transition-colors text-sm font-medium"
                  >
                    + Choose a color
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Price summary */}
          {doors.length > 0 && !pricing.customQuote && (
            <div className="bg-bolt-black rounded-2xl p-6 text-white">
              <h3 className="font-semibold text-lg mb-4">Price Summary</h3>
              <div className="space-y-2">
                {pricing.lineItems.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className={item.type === "discount" ? "text-green-400" : "text-gray-300"}>
                      {item.label}
                    </span>
                    <span className={item.type === "discount" ? "text-green-400" : ""}>
                      {formatCurrency(item.amount)}
                    </span>
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
              </div>
            </div>
          )}

          {/* Next step */}
          {allColorsSelected && (
            <button
              onClick={handleNext}
              disabled={isCreatingQuote}
              className="w-full bg-bolt-yellow hover:bg-bolt-yellow-dark disabled:opacity-70 text-black font-bold text-lg py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {isCreatingQuote ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving quote…
                </>
              ) : (
                "Next: Choose Your Date →"
              )}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
