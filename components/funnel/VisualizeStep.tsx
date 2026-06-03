"use client";

import { useEffect, useRef, useState } from "react";
import type { DoorSize, SWColor } from "@/types";
import { getAllColors, getPopularColors, searchColors, hexToHsl } from "@/lib/colors";

const MAX_GENERATIONS = 3;
const POPULAR_COLORS = getPopularColors();
const ALL_COLORS = getAllColors();

// Family display order for the "All Colors" tab
const FAMILY_ORDER = [
  "White", "Gray", "Greige", "Neutral", "Blue", "Teal", "Green",
  "Brown", "Black", "Red", "Orange", "Yellow", "Purple",
];

type PhotoSource =
  | { kind: "stock-light"; src: string }
  | { kind: "stock-dark"; src: string }
  | { kind: "upload"; src: string; file: File };

interface BoxSelection {
  x: number; // 0–1 relative to image display
  y: number;
  w: number;
  h: number;
}

interface GenerationResult {
  status: "loading" | "done" | "error";
  imageUrl?: string;
  errorMsg?: string;
}

interface Props {
  onComplete: (doorType: DoorSize, preferredColor: SWColor | null) => void;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const hue2 = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2(p, q, h + 1 / 3) * 255),
    Math.round(hue2(p, q, h) * 255),
    Math.round(hue2(p, q, h - 1 / 3) * 255),
  ];
}

async function resizeToBase64(src: string | File, maxPx = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = typeof src === "string" ? src : URL.createObjectURL(src);
  });
}

// After the model returns, paste its output only inside the box onto the original,
// then apply an HSL hue+saturation correction to guarantee the exact target color.
// Lightness is preserved from the AI output, maintaining all shadows and panel detail.
async function compositeResult(
  originalBase64: string,
  generatedUrl: string,
  box: BoxSelection,
  targetHex: string
): Promise<string> {
  return new Promise((resolve) => {
    const orig = document.createElement("img");
    const gen = document.createElement("img");
    gen.crossOrigin = "anonymous";

    let origLoaded = false;
    let genLoaded = false;

    function tryComposite() {
      if (!origLoaded || !genLoaded) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = orig.naturalWidth;
        canvas.height = orig.naturalHeight;
        const ctx = canvas.getContext("2d")!;

        // Base: full original (everything outside box is untouched)
        ctx.drawImage(orig, 0, 0);

        // Overlay: generated image, clipped strictly to the box
        const bx = Math.round(box.x * canvas.width);
        const by = Math.round(box.y * canvas.height);
        const bw = Math.round(box.w * canvas.width);
        const bh = Math.round(box.h * canvas.height);
        ctx.save();
        ctx.beginPath();
        ctx.rect(bx, by, bw, bh);
        ctx.clip();
        // Scale generated image to match original dimensions (handles resolution differences)
        ctx.drawImage(gen, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        // HSL correction: replace H+S with the exact target color, and linearly
        // stretch the AI's L distribution into a fixed range centered on the
        // target's L value. This preserves door texture (panel grooves, shadows,
        // highlights) regardless of how far the input and target lightnesses differ.
        //
        // Handles all cases correctly:
        //   • White door → Tricorn Black: dark, with visible panel detail
        //   • Black door → Extra White:  light, with subtle shadow texture
        //   • Any-color door → any target: correct hue and brightness always
        const [tH, tS, tL] = hexToHsl(targetHex);
        const tHn = tH / 360;
        const tSn = tS / 100;
        const tLn = tL / 100;

        // How wide (in L units) the output door lighting range should be.
        // ±0.22 matches real-world semi-gloss door contrast under typical daylight.
        const SPREAD = 0.22;

        const imageData = ctx.getImageData(bx, by, bw, bh);
        const px = imageData.data;

        // Pass 1: mean + variance of AI pixel L values
        let sumL = 0, sumL2 = 0;
        const pixCount = px.length / 4;
        for (let i = 0; i < px.length; i += 4) {
          const [, , l] = rgbToHsl(px[i], px[i + 1], px[i + 2]);
          sumL += l; sumL2 += l * l;
        }
        const meanL = sumL / pixCount;
        const stdL  = Math.sqrt(Math.max(0, sumL2 / pixCount - meanL * meanL));

        // Input range: center on mean, span at least 2σ or 0.20 minimum.
        // Using mean±range (not raw min/max) makes the mapping robust to specular
        // highlights or shadow outliers that would otherwise distort the stretch.
        const inHalf  = Math.max(0.20, 2 * stdL);
        const inLow   = Math.max(0, meanL - inHalf);
        const inHigh  = Math.min(1, meanL + inHalf);
        const inRange = Math.max(0.01, inHigh - inLow);

        // Output range: centered on target L, clamped to [0,1]
        const outLow  = Math.max(0, tLn - SPREAD);
        const outHigh = Math.min(1, tLn + SPREAD);

        // Pass 2: linear stretch + H/S replacement
        for (let i = 0; i < px.length; i += 4) {
          const [, , l] = rgbToHsl(px[i], px[i + 1], px[i + 2]);
          const corrL = Math.min(1, Math.max(0,
            outLow + (l - inLow) / inRange * (outHigh - outLow)
          ));
          const [nr, ng, nb] = hslToRgb(tHn, tSn, corrL);
          px[i] = nr; px[i + 1] = ng; px[i + 2] = nb;
        }
        ctx.putImageData(imageData, bx, by);

        resolve(canvas.toDataURL("image/jpeg", 0.92));
      } catch {
        resolve(generatedUrl); // CORS or canvas taint — fall back to raw URL
      }
    }

    orig.onload = () => { origLoaded = true; tryComposite(); };
    gen.onload  = () => { genLoaded  = true; tryComposite(); };
    orig.onerror = () => resolve(generatedUrl);
    gen.onerror  = () => resolve(generatedUrl); // CORS blocked — show raw result

    orig.src = originalBase64;
    gen.src  = generatedUrl;
  });
}

async function generateMaskFromBase64(imageBase64: string, box: BoxSelection): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      // Black = preserve original pixels
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // White = inpaint this area (the door)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(
        Math.round(box.x * canvas.width),
        Math.round(box.y * canvas.height),
        Math.round(box.w * canvas.width),
        Math.round(box.h * canvas.height)
      );
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = imageBase64;
  });
}

function getBoxStyle(
  start: { x: number; y: number },
  end: { x: number; y: number }
): React.CSSProperties {
  return {
    left: `${Math.min(start.x, end.x) * 100}%`,
    top: `${Math.min(start.y, end.y) * 100}%`,
    width: `${Math.abs(end.x - start.x) * 100}%`,
    height: `${Math.abs(end.y - start.y) * 100}%`,
  };
}

function toRelative(
  clientX: number,
  clientY: number,
  rect: DOMRect
): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
    y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
  };
}

export default function VisualizeStep({ onComplete }: Props) {
  const [doorType, setDoorType] = useState<DoorSize | null>(null);
  const [photo, setPhoto] = useState<PhotoSource | null>(null);
  const [boxSelection, setBoxSelection] = useState<BoxSelection | null>(null);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawEnd, setDrawEnd] = useState<{ x: number; y: number } | null>(null);
  const [generationsUsed, setGenerationsUsed] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<Map<string, GenerationResult>>(new Map());
  const [preferredCode, setPreferredCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"popular" | "all">("popular");
  const [searchQuery, setSearchQuery] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Reset box when photo changes
  useEffect(() => {
    setBoxSelection(null);
    setDrawStart(null);
    setDrawEnd(null);
    setResults(new Map());
    setGenerationsUsed(0);
    setPreferredCode(null);
  }, [photo]);

  const generationsLeft = MAX_GENERATIONS - generationsUsed;
  const preferredColor = preferredCode
    ? ALL_COLORS.find((c) => c.sw_code === preferredCode) ?? null
    : null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto({ kind: "upload", src: URL.createObjectURL(file), file });
  }

  // --- Box drawing ---
  function startDraw(clientX: number, clientY: number) {
    const rect = imageContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pos = toRelative(clientX, clientY, rect);
    setDrawStart(pos);
    setDrawEnd(pos);
    setBoxSelection(null);
  }

  function moveDraw(clientX: number, clientY: number) {
    if (!drawStart) return;
    const rect = imageContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDrawEnd(toRelative(clientX, clientY, rect));
  }

  function endDraw() {
    if (!drawStart || !drawEnd) return;
    const x = Math.min(drawStart.x, drawEnd.x);
    const y = Math.min(drawStart.y, drawEnd.y);
    const w = Math.abs(drawEnd.x - drawStart.x);
    const h = Math.abs(drawEnd.y - drawStart.y);
    if (w > 0.05 && h > 0.05) {
      setBoxSelection({ x, y, w, h });
    }
    setDrawStart(null);
    setDrawEnd(null);
  }

  // --- Generation ---
  async function handlePreviewColor(color: SWColor) {
    if (!photo || !boxSelection || generationsLeft <= 0 || isGenerating) return;
    const code = color.sw_code;

    setIsGenerating(true);
    setGenerationsUsed((n) => n + 1);
    setResults((prev) => new Map(prev).set(code, { status: "loading" }));

    try {
      const src = photo.kind === "upload" ? photo.file : photo.src;
      const imageBase64 = await resizeToBase64(src);
      const maskBase64 = await generateMaskFromBase64(imageBase64, boxSelection);

      const res = await fetch("/api/visualize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          maskBase64,
          targetColorHex: color.hex,
          targetColorLrv: color.lrv,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");

      // Composite: paste model output inside the box, keep original pixels outside.
      const composited = await compositeResult(imageBase64, data.imageUrl, boxSelection, color.hex);
      setResults((prev) =>
        new Map(prev).set(code, { status: "done", imageUrl: composited })
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      setResults((prev) =>
        new Map(prev).set(code, { status: "error", errorMsg: msg })
      );
      setGenerationsUsed((n) => n - 1);
    } finally {
      setIsGenerating(false);
    }
  }

  function renderColorCard(color: SWColor, compact = false) {
    const result = results.get(color.sw_code);
    const isLoading = result?.status === "loading";
    const isDone = result?.status === "done";
    const isError = result?.status === "error";
    const isPreferred = preferredCode === color.sw_code;
    const canGenerate = !isLoading && !isDone && generationsLeft > 0 && !isGenerating;

    return (
      <button
        key={color.sw_code}
        onClick={() => canGenerate && handlePreviewColor(color)}
        disabled={isLoading || (generationsLeft <= 0 && !isDone) || isGenerating}
        title={`${color.name} · ${color.sw_code}`}
        className={`relative rounded-xl text-left transition-all ${
          compact ? "p-2" : "p-3"
        } border-2 ${
          isPreferred
            ? "border-bolt-yellow bg-bolt-yellow/10"
            : isDone
            ? "border-green-400/60 bg-green-50"
            : isError
            ? "border-red-300/60 bg-red-50"
            : "border-gray-200 hover:border-bolt-yellow/50 disabled:opacity-50 disabled:cursor-not-allowed"
        }`}
      >
        <div
          className={`rounded-full border border-black/10 mb-1.5 ${compact ? "w-6 h-6" : "w-8 h-8 mb-2"}`}
          style={{ backgroundColor: color.hex }}
        />
        <div className={`font-semibold text-bolt-black leading-tight ${compact ? "text-[10px]" : "text-xs"}`}>
          {color.name}
        </div>
        <div className={`text-gray-400 mt-0.5 ${compact ? "text-[9px]" : "text-xs"}`}>
          {color.sw_code}
        </div>

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-xl">
            <svg className="w-5 h-5 animate-spin text-bolt-yellow" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
        {isDone && !isPreferred && (
          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-green-400 flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        {isError && (
          <div className="text-red-500 text-[9px] mt-1 leading-snug">
            Failed
          </div>
        )}
      </button>
    );
  }

  const doneResults = [...results.entries()].filter(([, r]) => r.status === "done");
  const searchResults = searchQuery.trim() ? searchColors(searchQuery) : [];

  // Group ALL_COLORS by family for the "all" tab
  const colorsByFamily: Record<string, SWColor[]> = {};
  for (const color of ALL_COLORS) {
    if (!colorsByFamily[color.family]) colorsByFamily[color.family] = [];
    colorsByFamily[color.family].push(color);
  }

  return (
    <section className="bg-bolt-gray-light py-12 sm:py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="font-display text-4xl sm:text-5xl uppercase text-bolt-black mb-3">
            Preview Your <span className="text-bolt-yellow">Colors</span>
          </h2>
          <p className="text-gray-500 text-lg">
            See your door in Sherwin-Williams colors before you commit to anything.
          </p>
        </div>

        {/* Section 1: Door type */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h3 className="font-semibold text-bolt-black text-lg mb-4">
            What type of garage door do you have?
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {(["single", "double"] as DoorSize[]).map((type) => (
              <button
                key={type}
                onClick={() => setDoorType(type)}
                className={`py-5 px-4 rounded-xl border-2 text-center transition-all ${
                  doorType === type
                    ? "border-bolt-yellow bg-bolt-yellow/10 text-bolt-black"
                    : "border-gray-200 bg-white text-gray-600 hover:border-bolt-yellow/50"
                }`}
              >
                <div className="font-bold text-lg capitalize">
                  {type === "single" ? "Single Car" : "Double Car"}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {type === "single" ? "≤10ft wide · $799" : ">10ft wide · $899"}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Photo selection */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h3 className="font-semibold text-bolt-black text-lg mb-4">
            Choose a starting photo — or upload your own
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {/* Stock light */}
            <button
              onClick={() => setPhoto({ kind: "stock-light", src: "/images/stock-door-light.svg" })}
              className={`relative rounded-xl overflow-hidden border-2 aspect-video transition-all ${
                photo?.kind === "stock-light"
                  ? "border-bolt-yellow ring-2 ring-bolt-yellow/30"
                  : "border-gray-200 hover:border-bolt-yellow/50"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/stock-door-light.svg" alt="Light garage door" className="w-full h-full object-cover" />
              <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-xs py-1 text-center">
                Light door
              </div>
            </button>

            {/* Stock dark */}
            <button
              onClick={() => setPhoto({ kind: "stock-dark", src: "/images/stock-door-dark.svg" })}
              className={`relative rounded-xl overflow-hidden border-2 aspect-video transition-all ${
                photo?.kind === "stock-dark"
                  ? "border-bolt-yellow ring-2 ring-bolt-yellow/30"
                  : "border-gray-200 hover:border-bolt-yellow/50"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/stock-door-dark.svg" alt="Dark garage door" className="w-full h-full object-cover" />
              <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-xs py-1 text-center">
                Dark door
              </div>
            </button>

            {/* Upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`relative rounded-xl border-2 aspect-video flex flex-col items-center justify-center transition-all ${
                photo?.kind === "upload"
                  ? "border-bolt-yellow bg-bolt-yellow/5"
                  : "border-dashed border-gray-300 hover:border-bolt-yellow/50 bg-gray-50"
              }`}
            >
              {photo?.kind === "upload" ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.src} alt="Your upload" className="absolute inset-0 w-full h-full object-cover rounded-xl" />
                  <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-xs py-1 text-center rounded-b-xl">
                    Your photo ✓
                  </div>
                </>
              ) : (
                <>
                  <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span className="text-xs text-gray-500 text-center leading-tight px-2">Upload my door</span>
                </>
              )}
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>

        {/* Section 3: Draw box around door */}
        {photo && (
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-bolt-black text-lg">
                  {boxSelection ? "Door area selected ✓" : "Outline your garage door"}
                </h3>
                <p className="text-gray-500 text-sm mt-0.5">
                  {boxSelection
                    ? "Tap a color below to preview it on just the door."
                    : "Click and drag a box around your garage door. Only that area will change."}
                </p>
              </div>
              {boxSelection && (
                <button
                  onClick={() => setBoxSelection(null)}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 ml-4"
                >
                  Redraw →
                </button>
              )}
            </div>

            <div
              ref={imageContainerRef}
              className="relative rounded-xl overflow-hidden select-none"
              style={{ cursor: boxSelection ? "default" : "crosshair", touchAction: "none" }}
              onMouseDown={(e) => { if (!boxSelection) startDraw(e.clientX, e.clientY); }}
              onMouseMove={(e) => moveDraw(e.clientX, e.clientY)}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={(e) => {
                if (!boxSelection) {
                  e.preventDefault();
                  startDraw(e.touches[0].clientX, e.touches[0].clientY);
                }
              }}
              onTouchMove={(e) => {
                e.preventDefault();
                moveDraw(e.touches[0].clientX, e.touches[0].clientY);
              }}
              onTouchEnd={endDraw}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.src}
                alt="Your garage door"
                className="w-full block rounded-xl"
                draggable={false}
              />

              {/* Live preview while drawing */}
              {drawStart && drawEnd && (
                <div
                  className="absolute border-2 border-bolt-yellow bg-bolt-yellow/20 pointer-events-none"
                  style={getBoxStyle(drawStart, drawEnd)}
                />
              )}

              {/* Confirmed selection */}
              {boxSelection && (
                <div
                  className="absolute border-2 border-bolt-yellow pointer-events-none"
                  style={{
                    left: `${boxSelection.x * 100}%`,
                    top: `${boxSelection.y * 100}%`,
                    width: `${boxSelection.w * 100}%`,
                    height: `${boxSelection.h * 100}%`,
                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)",
                  }}
                >
                  <span className="absolute -top-6 left-0 bg-bolt-yellow text-black text-xs font-semibold px-2 py-0.5 rounded">
                    Door area
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section 4: Color picker — two tabs */}
        {photo && boxSelection && (
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-bolt-black text-lg">
                Tap a color to preview it on your door
              </h3>
              <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                isGenerating
                  ? "bg-gray-100 text-gray-500"
                  : generationsLeft > 0
                  ? "bg-bolt-yellow/10 text-bolt-black"
                  : "bg-gray-100 text-gray-500"
              }`}>
                {isGenerating ? "Generating…" : `${generationsLeft} preview${generationsLeft !== 1 ? "s" : ""} remaining`}
              </span>
            </div>

            {/* Tab buttons */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setActiveTab("popular")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeTab === "popular"
                    ? "bg-bolt-yellow text-black"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Popular Colors
              </button>
              <button
                onClick={() => { setActiveTab("all"); setSearchQuery(""); }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeTab === "all"
                    ? "bg-bolt-yellow text-black"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                All Colors
              </button>
            </div>

            {/* Popular tab */}
            {activeTab === "popular" && (
              <div className="grid grid-cols-4 gap-3">
                {POPULAR_COLORS.map((color) => renderColorCard(color))}
              </div>
            )}

            {/* All Colors tab */}
            {activeTab === "all" && (
              <div>
                {/* Search */}
                <div className="relative mb-3">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or SW number…"
                    className="w-full border border-gray-200 rounded-lg pl-9 pr-8 py-2.5 text-sm focus:outline-none focus:border-bolt-yellow transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Search results or family groups */}
                <div className="max-h-80 overflow-y-auto pr-1">
                  {searchQuery.trim() ? (
                    searchResults.length > 0 ? (
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                        {searchResults.map((color) => renderColorCard(color, true))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-400 text-sm py-8">
                        No colors found for &ldquo;{searchQuery}&rdquo;
                      </p>
                    )
                  ) : (
                    FAMILY_ORDER.map((family) => {
                      const colors = colorsByFamily[family];
                      if (!colors?.length) return null;
                      return (
                        <div key={family} className="mb-4">
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 sticky top-0 bg-white py-1">
                            {family}
                          </div>
                          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                            {colors.map((color) => renderColorCard(color, true))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {generationsLeft === 0 && doneResults.length === 0 && (
              <p className="text-gray-400 text-sm mt-3 text-center">
                You&apos;ve used your free previews. Choose a color below or continue to configure.
              </p>
            )}
          </div>
        )}

        {/* Section 5: Results gallery */}
        {doneResults.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-bolt-black text-lg mb-4">Your previews</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {doneResults.map(([code, result]) => {
                const color = ALL_COLORS.find((c) => c.sw_code === code)!;
                const isPreferred = preferredCode === code;
                return (
                  <div
                    key={code}
                    className={`bg-white rounded-2xl overflow-hidden border-2 shadow-sm transition-all ${
                      isPreferred ? "border-bolt-yellow" : "border-transparent"
                    }`}
                  >
                    <div className="aspect-video overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={result.imageUrl!}
                        alt={`Door in ${color?.name ?? code}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full border border-black/10 flex-shrink-0" style={{ backgroundColor: color?.hex }} />
                        <div>
                          <div className="font-semibold text-bolt-black text-sm">{color?.name ?? code}</div>
                          <div className="text-gray-400 text-xs">{code}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => setPreferredCode(isPreferred ? null : code)}
                        className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
                          isPreferred
                            ? "bg-bolt-yellow text-black"
                            : "bg-gray-100 text-gray-600 hover:bg-bolt-yellow/20"
                        }`}
                      >
                        {isPreferred ? "✓ Chosen" : "Choose this"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-col sm:flex-row gap-4 items-center pt-4">
          <button
            onClick={() => {
              if (!doorType) return;
              onComplete(doorType, preferredColor);
            }}
            disabled={!doorType}
            className="w-full sm:w-auto bg-bolt-yellow hover:bg-bolt-yellow-dark disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-lg px-10 py-4 rounded-full transition-colors flex items-center justify-center gap-2"
          >
            {preferredColor ? `Continue with ${preferredColor.name}` : "Continue to Configure"}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
          <button
            onClick={() => onComplete(doorType ?? "single", null)}
            className="text-gray-400 hover:text-gray-600 text-sm transition-colors"
          >
            Skip this step →
          </button>
        </div>

        {!doorType && (
          <p className="text-gray-400 text-sm mt-3 text-center">Select a door type above to continue.</p>
        )}
      </div>
    </section>
  );
}
