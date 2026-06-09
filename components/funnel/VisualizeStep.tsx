"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import type { CurrentColorTone, DoorConfig, DoorSize, SWColor } from "@/types";
import { getAllColors, getPopularColors, searchColors, hexToHsl } from "@/lib/colors";

const MAX_GENERATIONS = 3;

type CreditTierId = "tier-3" | "tier-10" | "unlimited";
type SquareCardInstance = {
  tokenize: () => Promise<{ status: string; token?: string; errors?: { message: string }[] }>;
  attach: (selector: string) => Promise<void>;
};

const CREDIT_TIERS: { id: CreditTierId; label: string; price: string; note: string }[] = [
  { id: "tier-3", label: "3 Previews", price: "$5", note: "Quick look" },
  { id: "tier-10", label: "10 Previews", price: "$10", note: "Most popular" },
  { id: "unlimited", label: "Unlimited", price: "$20", note: "Try every color" },
];
const POPULAR_COLORS = getPopularColors();
const ALL_COLORS = getAllColors();

const FAMILY_ORDER = [
  "White", "Gray", "Greige", "Neutral", "Blue", "Teal", "Green",
  "Brown", "Black", "Red", "Orange", "Yellow", "Purple",
];

type PhotoSource = { kind: "upload"; src: string; file: File };
type DoorSubStep = "doorCount" | "door_size" | "door_tone" | "door_photo" | "door_color";

interface BoxSelection { x: number; y: number; w: number; h: number; }
interface GenerationResult { status: "loading" | "done" | "error"; imageUrl?: string; errorMsg?: string; }

interface Props {
  onComplete: (doors: DoorConfig[]) => void;
  contactId?: string;
}

// ── Utility functions ────────────────────────────────────────────────────────

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
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = typeof src === "string" ? src : URL.createObjectURL(src);
  });
}

// Paste AI output inside the box onto the original, then apply HSL hue+saturation
// correction to guarantee exact target color while preserving door texture.
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
    let origLoaded = false, genLoaded = false;

    function tryComposite() {
      if (!origLoaded || !genLoaded) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = orig.naturalWidth; canvas.height = orig.naturalHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(orig, 0, 0);
        const bx = Math.round(box.x * canvas.width), by = Math.round(box.y * canvas.height);
        const bw = Math.round(box.w * canvas.width), bh = Math.round(box.h * canvas.height);
        ctx.save(); ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
        ctx.drawImage(gen, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        const [tH, tS, tL] = hexToHsl(targetHex);
        const tHn = tH / 360, tSn = tS / 100, tLn = tL / 100;
        const SPREAD = 0.22;
        const imageData = ctx.getImageData(bx, by, bw, bh);
        const px = imageData.data;
        let sumL = 0, sumL2 = 0;
        const pixCount = px.length / 4;
        for (let i = 0; i < px.length; i += 4) {
          const [, , l] = rgbToHsl(px[i], px[i + 1], px[i + 2]);
          sumL += l; sumL2 += l * l;
        }
        const meanL = sumL / pixCount;
        const stdL = Math.sqrt(Math.max(0, sumL2 / pixCount - meanL * meanL));
        const inHalf = Math.max(0.20, 2 * stdL);
        const inLow = Math.max(0, meanL - inHalf), inHigh = Math.min(1, meanL + inHalf);
        const inRange = Math.max(0.01, inHigh - inLow);
        const outLow = Math.max(0, tLn - SPREAD), outHigh = Math.min(1, tLn + SPREAD);
        for (let i = 0; i < px.length; i += 4) {
          const [, , l] = rgbToHsl(px[i], px[i + 1], px[i + 2]);
          const corrL = Math.min(1, Math.max(0, outLow + (l - inLow) / inRange * (outHigh - outLow)));
          const [nr, ng, nb] = hslToRgb(tHn, tSn, corrL);
          px[i] = nr; px[i + 1] = ng; px[i + 2] = nb;
        }
        ctx.putImageData(imageData, bx, by);
        resolve(canvas.toDataURL("image/jpeg", 0.92));
      } catch {
        resolve(generatedUrl);
      }
    }

    orig.onload = () => { origLoaded = true; tryComposite(); };
    gen.onload = () => { genLoaded = true; tryComposite(); };
    orig.onerror = () => resolve(generatedUrl);
    gen.onerror = () => resolve(generatedUrl);
    orig.src = originalBase64;
    gen.src = generatedUrl;
  });
}

async function generateMaskFromBase64(imageBase64: string, box: BoxSelection): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(
        Math.round(box.x * canvas.width), Math.round(box.y * canvas.height),
        Math.round(box.w * canvas.width), Math.round(box.h * canvas.height)
      );
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = imageBase64;
  });
}

function getBoxStyle(start: { x: number; y: number }, end: { x: number; y: number }): React.CSSProperties {
  return {
    left: `${Math.min(start.x, end.x) * 100}%`,
    top: `${Math.min(start.y, end.y) * 100}%`,
    width: `${Math.abs(end.x - start.x) * 100}%`,
    height: `${Math.abs(end.y - start.y) * 100}%`,
  };
}

function toRelative(clientX: number, clientY: number, rect: DOMRect): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
    y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
  };
}

// ── Component ────────────────────────────────────────────────────────────────

export default function VisualizeStep({ onComplete, contactId }: Props) {
  // Multi-door orchestration
  const [subStep, setSubStep] = useState<DoorSubStep>("doorCount");
  const [doorCount, setDoorCount] = useState<number | null>(null);
  const [currentDoorIndex, setCurrentDoorIndex] = useState(0);
  const [completedDoors, setCompletedDoors] = useState<DoorConfig[]>([]);
  const [currentDoorSize, setCurrentDoorSize] = useState<DoorSize | null>(null);
  const [currentDoorTone, setCurrentDoorTone] = useState<CurrentColorTone | null>(null);
  const [showCustomQuoteMsg, setShowCustomQuoteMsg] = useState(false);

  // Per-door working state
  const [photo, setPhoto] = useState<PhotoSource | null>(null);
  const [boxSelection, setBoxSelection] = useState<BoxSelection | null>(null);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawEnd, setDrawEnd] = useState<{ x: number; y: number } | null>(null);
  const [generationsUsed, setGenerationsUsed] = useState(0);
  const [bonusGenerations, setBonusGenerations] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<Map<string, GenerationResult>>(new Map());
  const [preferredCode, setPreferredCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"popular" | "all">("popular");
  const [searchQuery, setSearchQuery] = useState("");

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<CreditTierId | null>(null);
  const [sqCard, setSqCard] = useState<SquareCardInstance | null>(null);
  const [sqReady, setSqReady] = useState(false);
  const [sqScriptReady, setSqScriptReady] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  function resetPerDoorState() {
    setPhoto(null);
    setBoxSelection(null);
    setDrawStart(null);
    setDrawEnd(null);
    setResults(new Map());
    setPreferredCode(null);
    setActiveTab("popular");
    setSearchQuery("");
    setCurrentDoorSize(null);
    setCurrentDoorTone(null);
  }

  // Re-sync generation count from server when photo changes
  useEffect(() => {
    setBoxSelection(null);
    setDrawStart(null);
    setDrawEnd(null);
    setResults(new Map());
    setPreferredCode(null);
    if (contactId) {
      fetch(`/api/visualize/usage?contactId=${encodeURIComponent(contactId)}`)
        .then((r) => r.json())
        .then((data) => { if (typeof data.used === "number") setGenerationsUsed(data.used); })
        .catch(() => setGenerationsUsed(0));
    } else {
      setGenerationsUsed(0);
    }
  }, [photo, contactId]);

  const generationsLeft = MAX_GENERATIONS + bonusGenerations - generationsUsed;

  // Square SDK init for payment modal
  useEffect(() => {
    if (!showPaymentModal || !sqScriptReady) return;
    let cancelled = false;
    async function init() {
      const sq = (window as { Square?: { payments: (appId: string, locationId: string) => Promise<{ card: () => Promise<SquareCardInstance> }> } }).Square;
      if (!sq) { if (!cancelled) setPaymentError("Payment SDK failed to load. Please refresh and try again."); return; }
      try {
        const payments = await sq.payments(process.env.NEXT_PUBLIC_SQUARE_APP_ID!, process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID!);
        const card = await payments.card();
        await card.attach("#preview-sq-card-container");
        if (!cancelled) { setSqCard(card); setSqReady(true); }
      } catch (err) {
        console.error("[Square preview] init failed:", err);
        if (!cancelled) setPaymentError("Failed to initialize payment form. Please refresh.");
      }
    }
    init();
    return () => { cancelled = true; };
  }, [showPaymentModal, sqScriptReady]);

  function closeModal() {
    setShowPaymentModal(false); setSelectedTier(null);
    setSqCard(null); setSqReady(false); setPaymentError("");
  }

  async function handleCreditPurchase() {
    if (!sqCard || !sqReady || !selectedTier) return;
    setPaymentLoading(true); setPaymentError("");
    try {
      const result = await sqCard.tokenize();
      if (result.status !== "OK" || !result.token) throw new Error(result.errors?.[0]?.message ?? "Card tokenization failed.");
      const res = await fetch("/api/payment/preview-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: result.token, tier: selectedTier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Payment failed.");
      setBonusGenerations((n) => n + (data.credits as number));
      closeModal();
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Payment failed. Please try again.");
    } finally {
      setPaymentLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto({ kind: "upload", src: URL.createObjectURL(file), file });
  }

  function startDraw(clientX: number, clientY: number) {
    const rect = imageContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pos = toRelative(clientX, clientY, rect);
    setDrawStart(pos); setDrawEnd(pos); setBoxSelection(null);
  }

  function moveDraw(clientX: number, clientY: number) {
    if (!drawStart) return;
    const rect = imageContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDrawEnd(toRelative(clientX, clientY, rect));
  }

  function endDraw() {
    if (!drawStart || !drawEnd) return;
    const x = Math.min(drawStart.x, drawEnd.x), y = Math.min(drawStart.y, drawEnd.y);
    const w = Math.abs(drawEnd.x - drawStart.x), h = Math.abs(drawEnd.y - drawStart.y);
    if (w > 0.05 && h > 0.05) setBoxSelection({ x, y, w, h });
    setDrawStart(null); setDrawEnd(null);
  }

  async function handlePreviewColor(color: SWColor) {
    if (!photo || !boxSelection || generationsLeft <= 0 || isGenerating) return;
    const code = color.sw_code;
    setIsGenerating(true);
    setGenerationsUsed((n) => n + 1);
    setResults((prev) => new Map(prev).set(code, { status: "loading" }));
    try {
      const imageBase64 = await resizeToBase64(photo.file);
      const maskBase64 = await generateMaskFromBase64(imageBase64, boxSelection);
      const res = await fetch("/api/visualize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, maskBase64, targetColorHex: color.hex, targetColorLrv: color.lrv, ...(contactId && { contactId }) }),
      });
      const data = await res.json();
      if (res.status === 429) { setGenerationsUsed(MAX_GENERATIONS); throw new Error("You've used all your free AI previews."); }
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      const composited = await compositeResult(imageBase64, data.imageUrl, boxSelection, color.hex);
      setResults((prev) => new Map(prev).set(code, { status: "done", imageUrl: composited }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      setResults((prev) => new Map(prev).set(code, { status: "error", errorMsg: msg }));
      setGenerationsUsed((n) => n - 1);
    } finally {
      setIsGenerating(false);
    }
  }

  function handleColorCardClick(color: SWColor) {
    if (!photo || !boxSelection) {
      setPreferredCode(color.sw_code);
      return;
    }
    const result = results.get(color.sw_code);
    if (!result && generationsLeft > 0 && !isGenerating) {
      handlePreviewColor(color);
    }
  }

  function advanceFromColorStep(selectedColor: SWColor | null) {
    if (!currentDoorSize || !currentDoorTone) return;
    const completedDoor: DoorConfig = {
      id: Math.random().toString(36).slice(2),
      size: currentDoorSize,
      currentTone: currentDoorTone,
      selectedColor,
    };
    const newCompleted = [...completedDoors, completedDoor];
    if (newCompleted.length === doorCount) {
      onComplete(newCompleted);
    } else {
      setCompletedDoors(newCompleted);
      setCurrentDoorIndex((n) => n + 1);
      resetPerDoorState();
      setSubStep("door_size");
    }
  }

  function renderColorCard(color: SWColor, compact = false) {
    const result = results.get(color.sw_code);
    const isLoading = result?.status === "loading";
    const isDone = result?.status === "done";
    const isError = result?.status === "error";
    const isPreferred = preferredCode === color.sw_code;

    return (
      <button
        key={color.sw_code}
        onClick={() => !isLoading && handleColorCardClick(color)}
        disabled={isLoading}
        title={`${color.name} · ${color.sw_code}`}
        className={`relative rounded-xl text-left transition-all ${compact ? "p-2" : "p-3"} border-2 ${
          isPreferred ? "border-bolt-yellow bg-bolt-yellow/10"
          : isDone ? "border-green-400/60 bg-green-50"
          : isError ? "border-red-300/60 bg-red-50"
          : "border-gray-200 hover:border-bolt-yellow/50 disabled:opacity-50 disabled:cursor-not-allowed"
        }`}
      >
        <div className={`rounded-full border border-black/10 mb-1.5 ${compact ? "w-6 h-6" : "w-8 h-8 mb-2"}`} style={{ backgroundColor: color.hex }} />
        <div className={`font-semibold text-bolt-black leading-tight ${compact ? "text-[10px]" : "text-xs"}`}>{color.name}</div>
        <div className={`text-gray-400 mt-0.5 ${compact ? "text-[9px]" : "text-xs"}`}>{color.sw_code}</div>
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
        {isError && <div className="text-red-500 text-[9px] mt-1 leading-snug">Failed</div>}
      </button>
    );
  }

  const doneResults = [...results.entries()].filter(([, r]) => r.status === "done");
  const searchResults = searchQuery.trim() ? searchColors(searchQuery) : [];
  const colorsByFamily: Record<string, SWColor[]> = {};
  for (const color of ALL_COLORS) {
    if (!colorsByFamily[color.family]) colorsByFamily[color.family] = [];
    colorsByFamily[color.family].push(color);
  }
  const preferredColor = preferredCode ? ALL_COLORS.find((c) => c.sw_code === preferredCode) ?? null : null;

  return (
    <>
      <Script
        src={process.env.NODE_ENV === "production" ? "https://web.squarecdn.com/v1/square.js" : "https://sandbox.web.squarecdn.com/v1/square.js"}
        strategy="afterInteractive"
        onLoad={() => setSqScriptReady(true)}
      />
      <section className="bg-bolt-gray-light py-12 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">

          {/* Header */}
          <div className="text-center mb-10">
            <h2 className="font-display text-4xl sm:text-5xl uppercase text-bolt-black mb-3">
              Preview Your <span className="text-bolt-yellow">Colors</span>
            </h2>
            {subStep === "doorCount" ? (
              <p className="text-gray-500 text-lg">See your door in Sherwin-Williams colors before you commit to anything.</p>
            ) : (
              <p className="text-bolt-yellow font-semibold text-lg">
                Door {currentDoorIndex + 1} of {doorCount}
              </p>
            )}
          </div>

          {/* ── Sub-step: Door Count ── */}
          {subStep === "doorCount" && (
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-bolt-black text-lg mb-4">How many garage doors are we painting?</h3>
              <div className="flex flex-wrap gap-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      setDoorCount(n);
                      setShowCustomQuoteMsg(false);
                      setCurrentDoorIndex(0);
                      setCompletedDoors([]);
                      resetPerDoorState();
                      setSubStep("door_size");
                    }}
                    className="w-14 h-14 rounded-xl font-bold text-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setShowCustomQuoteMsg(true)}
                  className="px-5 h-14 rounded-xl font-medium text-sm bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all"
                >
                  6+ (custom)
                </button>
              </div>
              {showCustomQuoteMsg && (
                <div className="mt-4 p-4 bg-bolt-yellow/10 rounded-xl border border-bolt-yellow/30">
                  <p className="text-bolt-black font-medium">For 6+ doors, we&apos;ll put together a custom package.</p>
                  <a href={`tel:${process.env.NEXT_PUBLIC_CONTACT_PHONE ?? ""}`} className="text-bolt-yellow font-semibold underline text-sm mt-1 block">
                    Call or text Blake →
                  </a>
                </div>
              )}
            </div>
          )}

          {/* ── Sub-step: Door Size ── */}
          {subStep === "door_size" && (
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-bolt-black text-lg mb-4">
                Is door {currentDoorIndex + 1} a single or double car?
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {(["single", "double"] as DoorSize[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => { setCurrentDoorSize(type); setSubStep("door_tone"); }}
                    className="py-5 px-4 rounded-xl border-2 border-gray-200 bg-white text-gray-600 hover:border-bolt-yellow/50 text-center transition-all"
                  >
                    <div className="font-bold text-lg">{type === "single" ? "Single Car" : "Double Car"}</div>
                    <div className="text-sm text-gray-500 mt-1">{type === "single" ? "≤10ft wide · $599" : ">10ft wide · $799"}</div>
                  </button>
                ))}
              </div>
              <button onClick={() => setSubStep("doorCount")} className="mt-4 text-gray-400 hover:text-gray-600 text-sm transition-colors">
                ← Back
              </button>
            </div>
          )}

          {/* ── Sub-step: Door Tone ── */}
          {subStep === "door_tone" && (
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-bolt-black text-lg mb-4">
                What&apos;s the current color of door {currentDoorIndex + 1}?
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {(["light", "dark"] as CurrentColorTone[]).map((tone) => (
                  <button
                    key={tone}
                    onClick={() => { setCurrentDoorTone(tone); setSubStep("door_photo"); }}
                    className="py-5 px-4 rounded-xl border-2 border-gray-200 bg-white text-gray-600 hover:border-bolt-yellow/50 text-center transition-all flex flex-col items-center gap-2"
                  >
                    <span className="w-8 h-8 rounded-full border border-gray-300" style={{ backgroundColor: tone === "light" ? "#e0dbd3" : "#444" }} />
                    <div className="font-bold text-lg">{tone === "light" ? "Light color" : "Dark color"}</div>
                  </button>
                ))}
              </div>
              <button onClick={() => setSubStep("door_size")} className="mt-4 text-gray-400 hover:text-gray-600 text-sm transition-colors">
                ← Back
              </button>
            </div>
          )}

          {/* ── Sub-step: Photo Upload + Box Drawing ── */}
          {subStep === "door_photo" && (
            <>
              {!photo ? (
                <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
                  <h3 className="font-semibold text-bolt-black text-lg mb-1">
                    Upload a photo of door {currentDoorIndex + 1}
                  </h3>
                  <p className="text-gray-500 text-sm mb-5">
                    We&apos;ll preview Sherwin-Williams colors directly on your door using AI.
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 hover:border-bolt-yellow rounded-xl p-10 flex flex-col items-center gap-3 transition-colors group"
                  >
                    <svg className="w-10 h-10 text-gray-400 group-hover:text-bolt-yellow transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span className="font-semibold text-gray-600 group-hover:text-bolt-black transition-colors">Tap to upload your photo</span>
                    <span className="text-xs text-gray-400">JPG or PNG, any size</span>
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  <div className="mt-4 flex justify-between items-center">
                    <button onClick={() => setSubStep("door_tone")} className="text-gray-400 hover:text-gray-600 text-sm transition-colors">
                      ← Back
                    </button>
                    <button onClick={() => setSubStep("door_color")} className="text-gray-400 hover:text-gray-600 text-sm transition-colors">
                      Skip photo — just pick a color →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-bolt-black text-lg">
                        {boxSelection ? "Door area selected ✓" : "Outline your garage door"}
                      </h3>
                      <p className="text-gray-500 text-sm mt-0.5">
                        {boxSelection
                          ? "Tap 'Pick a color' to continue."
                          : "Click and drag a box around your garage door. Only that area will change."}
                      </p>
                    </div>
                    {boxSelection && (
                      <button onClick={() => setBoxSelection(null)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 ml-4">
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
                    onTouchStart={(e) => { if (!boxSelection) { e.preventDefault(); startDraw(e.touches[0].clientX, e.touches[0].clientY); } }}
                    onTouchMove={(e) => { e.preventDefault(); moveDraw(e.touches[0].clientX, e.touches[0].clientY); }}
                    onTouchEnd={endDraw}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.src} alt="Your garage door" className="w-full block rounded-xl" draggable={false} />
                    {drawStart && drawEnd && (
                      <div className="absolute border-2 border-bolt-yellow bg-bolt-yellow/20 pointer-events-none" style={getBoxStyle(drawStart, drawEnd)} />
                    )}
                    {boxSelection && (
                      <div
                        className="absolute border-2 border-bolt-yellow pointer-events-none"
                        style={{
                          left: `${boxSelection.x * 100}%`, top: `${boxSelection.y * 100}%`,
                          width: `${boxSelection.w * 100}%`, height: `${boxSelection.h * 100}%`,
                          boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)",
                        }}
                      >
                        <span className="absolute -top-6 left-0 bg-bolt-yellow text-black text-xs font-semibold px-2 py-0.5 rounded">Door area</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex flex-col sm:flex-row gap-3 items-center">
                    {boxSelection && (
                      <button onClick={() => setSubStep("door_color")} className="flex-1 bg-bolt-yellow hover:bg-bolt-yellow-dark text-black font-bold py-3 rounded-full transition-colors">
                        Pick a color →
                      </button>
                    )}
                    <button
                      onClick={() => { setPhoto(null); setBoxSelection(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="text-gray-400 hover:text-gray-600 text-sm transition-colors"
                    >
                      Use a different photo
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Sub-step: Color Picker ── */}
          {subStep === "door_color" && (
            <>
              <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-bolt-black text-lg">
                    {photo && boxSelection ? "Tap a color to preview it on your door" : "Pick a color for this door"}
                  </h3>
                  {photo && boxSelection && (
                    <span className={`text-sm font-medium px-3 py-1 rounded-full ${isGenerating ? "bg-gray-100 text-gray-500" : generationsLeft > 0 ? "bg-bolt-yellow/10 text-bolt-black" : "bg-gray-100 text-gray-500"}`}>
                      {isGenerating ? "Generating…" : `${generationsLeft} preview${generationsLeft !== 1 ? "s" : ""} remaining`}
                    </span>
                  )}
                </div>

                <div className="relative mb-4">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search all 211 Sherwin-Williams colors…"
                    className="w-full border border-gray-200 rounded-lg pl-9 pr-8 py-2.5 text-sm focus:outline-none focus:border-bolt-yellow transition-colors"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
                  )}
                </div>

                {searchQuery.trim() ? (
                  <div className="max-h-80 overflow-y-auto pr-1">
                    {searchResults.length > 0 ? (
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">{searchResults.map((c) => renderColorCard(c, true))}</div>
                    ) : (
                      <p className="text-center text-gray-400 text-sm py-8">No colors found for &ldquo;{searchQuery}&rdquo;</p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2 mb-4">
                      {(["popular", "all"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === tab ? "bg-bolt-yellow text-black" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                        >
                          {tab === "popular" ? "Popular Colors" : "All Colors"}
                        </button>
                      ))}
                    </div>
                    {activeTab === "popular" && (
                      <div className="grid grid-cols-4 gap-3">{POPULAR_COLORS.map((c) => renderColorCard(c))}</div>
                    )}
                    {activeTab === "all" && (
                      <div className="max-h-80 overflow-y-auto pr-1">
                        {FAMILY_ORDER.map((family) => {
                          const colors = colorsByFamily[family];
                          if (!colors?.length) return null;
                          return (
                            <div key={family} className="mb-4">
                              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 sticky top-0 bg-white py-1">{family}</div>
                              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">{colors.map((c) => renderColorCard(c, true))}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {generationsLeft === 0 && photo && boxSelection && (
                  <div className="mt-4 rounded-xl bg-gray-50 border border-gray-200 p-4">
                    <p className="font-semibold text-bolt-black text-sm text-center mb-3">Want more previews?</p>
                    <div className="grid grid-cols-3 gap-2">
                      {CREDIT_TIERS.map((tier) => (
                        <button key={tier.id} onClick={() => { setSelectedTier(tier.id); setShowPaymentModal(true); }}
                          className="rounded-xl border-2 border-gray-200 hover:border-bolt-yellow/60 bg-white p-3 text-center transition-all">
                          <div className="font-bold text-bolt-black text-sm">{tier.label}</div>
                          <div className="text-bolt-yellow font-semibold text-sm">{tier.price}</div>
                          <div className="text-gray-400 text-xs mt-0.5">{tier.note}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Results gallery */}
              {doneResults.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-bolt-black text-lg mb-4">Your previews</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {doneResults.map(([code, result]) => {
                      const color = ALL_COLORS.find((c) => c.sw_code === code)!;
                      const isPreferred = preferredCode === code;
                      return (
                        <div key={code} className={`bg-white rounded-2xl overflow-hidden border-2 shadow-sm transition-all ${isPreferred ? "border-bolt-yellow" : "border-transparent"}`}>
                          <div className="aspect-video overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={result.imageUrl!} alt={`Door in ${color?.name ?? code}`} className="w-full h-full object-cover" />
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
                              className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${isPreferred ? "bg-bolt-yellow text-black" : "bg-gray-100 text-gray-600 hover:bg-bolt-yellow/20"}`}
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

              {/* Confirm door */}
              <div className="flex flex-col sm:flex-row gap-4 items-center pt-4">
                <button
                  onClick={() => advanceFromColorStep(preferredColor)}
                  disabled={!preferredCode}
                  className="w-full sm:w-auto bg-bolt-yellow hover:bg-bolt-yellow-dark disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-lg px-10 py-4 rounded-full transition-colors flex items-center justify-center gap-2"
                >
                  {preferredColor
                    ? `Use ${preferredColor.name} for Door ${currentDoorIndex + 1}`
                    : `Select a color to continue`}
                  {preferredColor && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  )}
                </button>
                <button onClick={() => advanceFromColorStep(null)} className="text-gray-400 hover:text-gray-600 text-sm transition-colors">
                  Skip color selection →
                </button>
              </div>
              <button onClick={() => setSubStep(photo ? "door_photo" : "door_tone")} className="mt-3 text-gray-400 hover:text-gray-600 text-sm transition-colors">
                ← Back
              </button>
            </>
          )}

        </div>
      </section>

      {/* Payment modal */}
      {showPaymentModal && selectedTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-bolt-black text-lg">Unlock Previews</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-2xl leading-none" aria-label="Close">&times;</button>
            </div>
            <div className="bg-bolt-yellow/10 border border-bolt-yellow/30 rounded-xl p-3 mb-4 flex justify-between items-center">
              <span className="font-medium text-bolt-black">{CREDIT_TIERS.find((t) => t.id === selectedTier)?.label}</span>
              <span className="font-bold text-bolt-black">{CREDIT_TIERS.find((t) => t.id === selectedTier)?.price}</span>
            </div>
            {paymentError && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 mb-4">{paymentError}</div>}
            <div id="preview-sq-card-container" className="mb-4 min-h-[80px]" />
            {!sqReady && !paymentError && <p className="text-gray-400 text-sm text-center mb-4">Loading payment form…</p>}
            <button onClick={handleCreditPurchase} disabled={!sqReady || paymentLoading}
              className="w-full bg-bolt-yellow hover:bg-bolt-yellow-dark disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3 rounded-full transition-colors">
              {paymentLoading ? "Processing…" : `Pay ${CREDIT_TIERS.find((t) => t.id === selectedTier)?.price ?? ""}`}
            </button>
            <button onClick={closeModal} className="w-full text-gray-400 hover:text-gray-600 text-sm mt-3 transition-colors">Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}
