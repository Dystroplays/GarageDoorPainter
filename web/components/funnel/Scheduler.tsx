"use client";

import { useEffect, useState } from "react";
import { DayPicker } from "react-day-picker";
import { format, parseISO, addDays } from "date-fns";
import "react-day-picker/style.css";

interface Props {
  daysNeeded: number;
  onComplete: (startDate: string, endDate: string) => void;
}

export default function Scheduler({ daysNeeded, onComplete }: Props) {
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchAvailability() {
      setLoading(true);
      try {
        const res = await fetch(`/api/schedule?days=${daysNeeded}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setAvailableDates(data.availableDates.map((d: string) => parseISO(d)));
      } catch {
        setError("Unable to load available dates. Please refresh.");
      } finally {
        setLoading(false);
      }
    }
    fetchAvailability();
  }, [daysNeeded]);

  const endDate = selectedDate ? addDays(selectedDate, daysNeeded - 1) : null;

  const isAvailable = (date: Date) =>
    availableDates.some((d) => d.toDateString() === date.toDateString());

  function handleSelect(date: Date | undefined) {
    setSelectedDate(date);
  }

  function handleConfirm() {
    if (!selectedDate || !endDate) return;
    onComplete(
      format(selectedDate, "yyyy-MM-dd"),
      format(endDate, "yyyy-MM-dd")
    );
  }

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="max-w-xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="font-display text-4xl sm:text-5xl uppercase text-bolt-black mb-4">
            Pick Your <span className="text-bolt-yellow">Date</span>
          </h2>
          <p className="text-gray-500 text-lg">
            Select your preferred start date.{" "}
            {daysNeeded > 1 && (
              <span>
                Your {daysNeeded}-door job takes {daysNeeded} consecutive days.
              </span>
            )}
          </p>
        </div>

        <div className="bg-bolt-gray-light rounded-2xl p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <svg className="w-6 h-6 animate-spin mr-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading availability...
            </div>
          ) : error ? (
            <div className="text-center text-red-500 py-8">{error}</div>
          ) : (
            <div className="flex justify-center">
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={handleSelect}
                disabled={(date) => !isAvailable(date)}
                modifiers={{
                  available: availableDates,
                }}
                modifiersClassNames={{
                  available: "rdp-day-available",
                }}
                showOutsideDays={false}
              />
            </div>
          )}

          {selectedDate && endDate && (
            <div className="mt-4 p-4 bg-bolt-yellow/10 border border-bolt-yellow/30 rounded-xl text-center">
              <p className="font-semibold text-bolt-black">
                {daysNeeded === 1 ? (
                  <>Your job is scheduled for <strong>{format(selectedDate, "EEEE, MMMM d")}</strong></>
                ) : (
                  <>
                    Your {daysNeeded}-door job runs{" "}
                    <strong>{format(selectedDate, "EEE, MMM d")}</strong>
                    {" – "}
                    <strong>{format(endDate, "EEE, MMM d")}</strong>
                  </>
                )}
              </p>
            </div>
          )}

          <p className="text-center text-xs text-gray-400 mt-3">
            Monday–Saturday availability · Sunday not available
          </p>
        </div>

        {selectedDate && (
          <button
            onClick={handleConfirm}
            className="w-full mt-6 bg-bolt-yellow hover:bg-bolt-yellow-dark text-black font-bold text-lg py-4 rounded-xl transition-colors"
          >
            Confirm Date — Next: Checkout →
          </button>
        )}
      </div>
    </section>
  );
}
