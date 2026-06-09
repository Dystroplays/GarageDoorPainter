import HeroColorShowcase from "./HeroColorShowcase";

const STATS = [
  { value: "$599", label: "Starting price" },
  { value: "100%", label: "Home value ROI" },
  { value: "211", label: "Sherwin-Williams colors" },
  { value: "<10 min", label: "Online booking time" },
];

export default function Hero() {
  const phone = process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "";

  return (
    <section className="bg-bolt-black text-white">
      {/* Top bar — logo left, phone right, no nav links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="font-display text-2xl uppercase tracking-wide">
          ⚡ Bolt <span className="text-bolt-yellow">Painting</span>
        </div>
        {phone && (
          <a
            href={`tel:${phone}`}
            className="flex items-center gap-2 text-white hover:text-bolt-yellow transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            {phone}
          </a>
        )}
      </div>

      {/* Hero content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20">
        <div className="grid lg:grid-cols-[1fr_512px] gap-6 items-stretch">

          {/* Left card */}
          <div className="bg-[#111111] border border-white/10 shadow-2xl rounded-2xl p-8 sm:p-10 flex flex-col justify-center">
            {/* H1 — SEO-weighted badge */}
            <h1 className="inline-block text-bolt-yellow text-xs font-medium uppercase tracking-[0.15em] bg-bolt-yellow/10 border border-bolt-yellow/30 rounded-full px-4 py-1.5 mb-6 self-start">
              DFW Garage Door Painting &amp; Refinishing
            </h1>

            {/* Display headline — NOT the h1 */}
            <p className="font-display text-5xl sm:text-6xl lg:text-7xl uppercase leading-[0.9] tracking-tight mb-6">
              Refresh Your<br />
              <span className="text-bolt-yellow">Garage Doors.</span><br />
              Boost Your<br />
              <span className="text-bolt-yellow">Home&apos;s Value.</span>
            </p>

            <p className="text-gray-300 text-lg leading-relaxed mb-8 max-w-md">
              Studies show garage door improvements can return up to{" "}
              <strong className="text-white">100% on your investment</strong>. Pick your
              Sherwin-Williams color, preview it on your home, and book online —
              starting at <strong className="text-white">$599 per door</strong>.
            </p>

            <div className="flex flex-col gap-3 mb-8">
              <a
                href="#lead-capture"
                className="inline-flex items-center justify-center gap-2 bg-bolt-yellow hover:bg-bolt-yellow-dark text-black font-bold text-lg px-8 py-4 rounded-full transition-colors w-full"
              >
                Get Your Custom Quote
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="inline-flex items-center justify-center gap-2 border border-white/20 hover:border-white/40 text-white px-8 py-4 rounded-full transition-colors text-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Call or Text
                </a>
              )}
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-5 text-sm text-gray-400">
              {["Transparent pricing", "Book in <10 minutes", "Sherwin-Williams colors"].map((badge) => (
                <div key={badge} className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-bolt-yellow flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {badge}
                </div>
              ))}
            </div>
          </div>

          {/* Right — before/after compare */}
          <div className="relative">
            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl h-full">
              <HeroColorShowcase />
            </div>
            <div className="absolute -top-4 -right-4 bg-bolt-yellow rounded-xl p-3 shadow-xl">
              <div className="font-display text-3xl text-black uppercase">$599</div>
              <div className="text-xs text-black/70">Starting price</div>
            </div>
          </div>
        </div>

        {/* Stats bar — single connected panel */}
        <div className="mt-8 bg-[#111111] border border-white/10 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {STATS.map((stat, i) => (
              <div
                key={stat.label}
                className={[
                  "px-6 py-5 text-center",
                  i % 2 === 0 ? "border-r border-white/10" : "",
                  i < 2 ? "border-b border-white/10 lg:border-b-0" : "",
                  i < 3 ? "lg:border-r border-white/10" : "",
                ].join(" ")}
              >
                <div className="font-display text-3xl text-white uppercase mb-1">{stat.value}</div>
                <div className="text-gray-400 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
