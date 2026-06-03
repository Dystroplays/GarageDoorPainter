"use client";

import { useState } from "react";
import type { SWColor } from "@/types";
import { allCuratedColors, COLOR_FAMILIES, getColorsByFamily, searchColors } from "@/lib/colors";

interface Props {
  selectedColor: SWColor | null;
  onSelect: (color: SWColor) => void;
  doorLabel?: string;
}

export default function ColorPicker({ selectedColor, onSelect, doorLabel }: Props) {
  const [family, setFamily] = useState<string>("Popular");
  const [query, setQuery] = useState("");

  const displayColors = query.trim()
    ? searchColors(query)
    : getColorsByFamily(family);

  return (
    <div className="space-y-4">
      {doorLabel && (
        <p className="text-sm font-medium text-gray-500">{doorLabel}</p>
      )}

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or SW code..."
          className="w-full border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-bolt-yellow transition-colors"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        )}
      </div>

      {/* Family tabs */}
      {!query && (
        <div className="flex flex-wrap gap-2">
          {COLOR_FAMILIES.map((f) => (
            <button
              key={f}
              onClick={() => setFamily(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                family === f
                  ? "bg-bolt-yellow text-black"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Color grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-72 overflow-y-auto pr-1">
        {displayColors.map((color) => {
          const isSelected = selectedColor?.sw_code === color.sw_code;
          return (
            <button
              key={color.sw_code}
              onClick={() => onSelect(color)}
              title={`${color.name} (${color.sw_code})`}
              className={`relative group flex flex-col items-center gap-1 rounded-lg p-1 transition-all ${
                isSelected
                  ? "ring-2 ring-bolt-yellow ring-offset-1 scale-105"
                  : "hover:scale-105 hover:ring-1 hover:ring-gray-300"
              }`}
            >
              <div
                className="w-full aspect-square rounded-md shadow-sm"
                style={{ backgroundColor: color.hex }}
              />
              {isSelected && (
                <div className="absolute top-1 right-1 w-4 h-4 bg-bolt-yellow rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              <span className="text-[9px] text-gray-500 leading-tight text-center truncate w-full">
                {color.sw_code}
              </span>
            </button>
          );
        })}

        {displayColors.length === 0 && (
          <div className="col-span-6 text-center text-gray-400 py-8 text-sm">
            No colors found for "{query}"
          </div>
        )}
      </div>

      {/* Selected color display */}
      {selectedColor && (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
          <div
            className="w-10 h-10 rounded-lg shadow-sm flex-shrink-0 border border-gray-200"
            style={{ backgroundColor: selectedColor.hex }}
          />
          <div>
            <p className="font-semibold text-bolt-black text-sm">{selectedColor.name}</p>
            <p className="text-gray-500 text-xs">{selectedColor.sw_code} · LRV {selectedColor.lrv}</p>
          </div>
        </div>
      )}
    </div>
  );
}
