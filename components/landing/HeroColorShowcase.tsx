"use client";

import { useState } from "react";
import Image from "next/image";

function PhotoPanel({
  src,
  alt,
  label,
  fallbackColor,
  bold = false,
  imgClass = "object-cover",
}: {
  src: string;
  alt: string;
  label: string;
  fallbackColor: string;
  bold?: boolean;
  imgClass?: string;
}) {
  const [hasError, setHasError] = useState(false);

  return (
    <div className="relative w-full h-full">
      {hasError ? (
        <div className="w-full h-full flex items-end" style={{ backgroundColor: fallbackColor }}>
          <div className="w-full bg-black/50 text-white text-xs px-3 py-1.5 backdrop-blur-sm">
            {label}
          </div>
        </div>
      ) : (
        <>
          <Image
            src={src}
            alt={alt}
            fill
            className={imgClass}
            onError={() => setHasError(true)}
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-3 py-1.5 backdrop-blur-sm">
            <span className={bold ? "font-bold" : ""}>{label}</span>
          </div>
        </>
      )}
    </div>
  );
}

export default function HeroColorShowcase() {
  return (
    <div className="flex flex-col h-[768px]">
      {/* Before — top 50% */}
      <div className="relative flex-1 min-h-0">
        <PhotoPanel
          src="/images/hero-before.jpg"
          alt="Garage door before painting — original gray"
          label="Before"
          fallbackColor="#7A7A78"
          imgClass="object-cover object-top"
          bold
        />
      </div>

      {/* After — bottom 50% */}
      <div className="relative flex-1 min-h-0 border-t border-black/30">
        <PhotoPanel
          src="/images/hero-after-carriage.jpg"
          alt="After — SW 6119 - Carriage Door"
          label="SW 6119 - Carriage Door"
          fallbackColor="#4E3D2C"
          imgClass="object-cover object-top"
        />
      </div>

      {/* Callout strip */}
      <div className="flex-shrink-0 bg-[#0a0a0a] border-t border-white/10 flex items-center gap-2 px-4 py-2.5 text-xs text-gray-400">
        <span className="text-bolt-yellow flex-shrink-0">✦</span>
        <span>Generated with our AI color visualizer</span>
        <a
          href="#lead-capture"
          className="ml-auto flex-shrink-0 text-bolt-yellow font-semibold hover:underline"
        >
          Try it on your home →
        </a>
      </div>
    </div>
  );
}
