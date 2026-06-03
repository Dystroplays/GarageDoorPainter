"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";

const ReactCompareSlider = dynamic(
  () => import("react-compare-slider").then((m) => m.ReactCompareSlider),
  { ssr: false }
);

function SlidePanel({ src, alt, onError }: { src: string; alt: string; onError: () => void }) {
  return (
    <div className="relative w-full h-full">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        onError={onError}
        sizes="(max-width: 1280px) 50vw, 700px"
      />
    </div>
  );
}

function CameraPlaceholder() {
  return (
    <div className="w-full h-full min-h-[380px] flex flex-col items-center justify-center text-gray-500 p-8 bg-[#111111]">
      <svg className="w-16 h-16 mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <p className="font-semibold text-gray-400 text-lg mb-1">Before / After</p>
      <p className="text-sm text-center text-gray-500">
        Add hero-before.jpg + hero-after.jpg to /public/images/
      </p>
    </div>
  );
}

export default function HeroCompare() {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return <CameraPlaceholder />;
  }

  return (
    <div className="relative w-full h-full min-h-[380px]">
      <ReactCompareSlider
        style={{ height: "100%", width: "100%", minHeight: "380px" }}
        itemOne={
          <SlidePanel
            src="/images/hero-before.jpg"
            alt="Before — faded garage door"
            onError={() => setHasError(true)}
          />
        }
        itemTwo={
          <SlidePanel
            src="/images/hero-after.jpg"
            alt="After — freshly painted garage door"
            onError={() => setHasError(true)}
          />
        }
      />
      <div className="absolute bottom-4 left-4 right-4 flex justify-between pointer-events-none z-10">
        <span className="bg-black/60 text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm">Before</span>
        <span className="bg-bolt-yellow text-black text-xs font-semibold px-3 py-1.5 rounded-full">After</span>
      </div>
    </div>
  );
}
