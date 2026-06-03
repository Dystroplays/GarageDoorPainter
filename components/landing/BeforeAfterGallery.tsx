"use client";

import { useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";

const ReactCompareSlider = dynamic(
  () => import("react-compare-slider").then((m) => m.ReactCompareSlider),
  { ssr: false }
);

const EXAMPLES = [
  {
    id: 1,
    label: "White to Tricorn Black",
    beforeColor: "#E0DACE",
    afterColor: "#2B2B2C",
    beforeLabel: "Original White",
    afterLabel: "SW 6258 - Tricorn Black",
    beforeSrc: "/images/gallery/before-white-door.jpg",
    afterSrc: "/images/gallery/after-sw6258-tricorn-black.jpg",
  },
  {
    id: 2,
    label: "Gray to Gauntlet Gray",
    beforeColor: "#AEAAA5",
    afterColor: "#8B8680",
    beforeLabel: "Faded Gray",
    afterLabel: "SW 7019 - Gauntlet Gray",
    beforeSrc: "/images/gallery/before-gray-door.jpg",
    afterSrc: "/images/gallery/after-sw7019-gauntlet-gray.jpg",
  },
  {
    id: 3,
    label: "Beige to Natural Choice",
    beforeColor: "#C8BDA8",
    afterColor: "#E5DDD0",
    beforeLabel: "Original Beige",
    afterLabel: "SW 7011 - Natural Choice",
    beforeSrc: "/images/gallery/before-beige-door.jpg",
    afterSrc: "/images/gallery/after-sw7011-natural-choice.jpg",
  },
  {
    id: 4,
    label: "Beige to Carriage Door",
    beforeColor: "#C8BDA8",
    afterColor: "#4E3D2C",
    beforeLabel: "Original Beige",
    afterLabel: "SW 6119 - Carriage Door",
    beforeSrc: "/images/gallery/before-beige-door.jpg",
    afterSrc: "/images/gallery/after-sw6119-carriage-door.jpg",
  },
];

function ColorPlaceholder({ color, label }: { color: string; label: string }) {
  return (
    <div
      className="w-full h-full min-h-[200px] flex items-end"
      style={{ backgroundColor: color }}
    >
      <div className="bg-black/40 text-white text-xs px-3 py-2 w-full backdrop-blur-sm">
        {label}
      </div>
    </div>
  );
}

function ImageSlide({ src, fallbackColor, label }: { src: string; fallbackColor: string; label: string }) {
  const [hasError, setHasError] = useState(false);
  if (hasError) {
    return <ColorPlaceholder color={fallbackColor} label={label} />;
  }
  return (
    <div className="relative w-full h-full min-h-[200px]">
      <Image
        src={src}
        alt={label}
        fill
        className="object-cover"
        onError={() => setHasError(true)}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
      />
      <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-xs px-3 py-2 backdrop-blur-sm">
        {label}
      </div>
    </div>
  );
}

export default function BeforeAfterGallery() {
  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl sm:text-5xl uppercase text-bolt-black mb-4">
            See The <span className="text-bolt-yellow">Difference</span>
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Drag the slider to see popular color transformations for DFW garage doors.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {EXAMPLES.map((example) => (
            <div key={example.id} className="rounded-xl overflow-hidden shadow-md border border-gray-100">
              <div className="h-48">
                <ReactCompareSlider
                  style={{ height: "100%" }}
                  itemOne={
                    <ImageSlide src={example.beforeSrc} fallbackColor={example.beforeColor} label={example.beforeLabel} />
                  }
                  itemTwo={
                    <ImageSlide src={example.afterSrc} fallbackColor={example.afterColor} label={example.afterLabel} />
                  }
                />
              </div>
              <div className="px-3 py-2 bg-gray-50 text-xs text-gray-500 text-center">
                {example.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
