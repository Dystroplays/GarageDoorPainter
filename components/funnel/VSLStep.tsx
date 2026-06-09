interface Props {
  onAdvance: () => void;
  phone?: string;
}

const CHECKLIST = [
  "Configure your doors and see your exact price",
  "Pick your Sherwin-Williams color",
  "See it on your actual garage door (AI-powered)",
  "Book a date and lock it in with a 50% deposit",
];

const NEW_DOOR_URL = process.env.NEXT_PUBLIC_NEW_DOOR_URL ?? "#";

export default function VSLStep({ onAdvance, phone }: Props) {
  return (
    <section className="bg-bolt-black text-white py-12 sm:py-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Video placeholder */}
        <div className="relative rounded-2xl overflow-hidden bg-bolt-gray border border-white/10 shadow-2xl aspect-video mb-10">
          {/* Replace contents with an iframe embed, e.g.:
              <iframe
                src="https://www.youtube.com/embed/YOUR_VIDEO_ID?autoplay=1&mute=1"
                allow="autoplay; fullscreen"
                className="w-full h-full"
              />
          */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-gray-800 to-gray-900">
            <div className="w-20 h-20 rounded-full bg-bolt-yellow flex items-center justify-center mb-5">
              <svg className="w-10 h-10 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <p className="text-white font-semibold text-xl mb-2">Watch the Overview</p>
            <p className="text-gray-400 text-sm">3–5 minutes · Replace with your VSL embed URL</p>
          </div>
        </div>

        {/* Two-column layout below video */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-10 items-start">

          {/* Left: checklist + CTA */}
          <div>
            {/* Checklist */}
            <div className="mb-10">
              <p className="text-gray-400 text-sm uppercase tracking-widest mb-5">Here&apos;s what you&apos;re about to do:</p>
              <ul className="space-y-3">
                {CHECKLIST.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-bolt-yellow flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span className="text-white text-lg">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Reassurance */}
            <p className="text-gray-400 text-base mb-10">
              The whole thing takes less than 10 minutes.{" "}
              {phone && (
                <>
                  Questions?{" "}
                  <a href={`tel:${phone}`} className="text-bolt-yellow hover:underline">
                    Text Blake anytime at {phone}
                  </a>
                  .
                </>
              )}
            </p>

            {/* CTA */}
            <button
              onClick={onAdvance}
              className="w-full sm:w-auto bg-bolt-yellow hover:bg-bolt-yellow-dark text-black font-bold text-lg px-12 py-4 rounded-full transition-colors flex items-center justify-center gap-2"
            >
              Start My Quote
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>

            <div className="mt-4 text-center sm:text-left">
              <button
                onClick={onAdvance}
                className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
              >
                Skip video →
              </button>
            </div>
          </div>

          {/* Right: new door upsell */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-bolt-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold text-base leading-snug mb-1">Need a new garage door?</p>
              <p className="text-gray-400 text-sm">Get pricing for a replacement before you paint.</p>
            </div>
            <a
              href={NEW_DOOR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full border border-white/20 hover:border-bolt-yellow hover:text-bolt-yellow text-white text-sm font-semibold py-3 px-4 rounded-full transition-colors"
            >
              Get New Door Pricing →
            </a>
          </div>

        </div>
      </div>
    </section>
  );
}
