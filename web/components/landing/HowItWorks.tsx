const STEPS = [
  {
    number: "01",
    title: "Configure & Price",
    description:
      "Select your door sizes, choose from over 1,700 Sherwin-Williams colors, and get your exact price — no estimates, no callbacks, no hidden fees.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Preview Your Color",
    description:
      "Upload a photo of your garage and see exactly how your selected color will look — on your actual door. Powered by AI visualization, not guesswork.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Book & We Handle It",
    description:
      "Pick a date that works, pay a 50% deposit to lock it in, and we handle the rest — from paint ordering to cleanup. You pay the balance only after the job is done.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-bolt-black text-white py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="font-display text-4xl sm:text-5xl uppercase text-white mb-4">
            How It <span className="text-bolt-yellow">Works</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            We built a better way to get your garage doors repainted. Three steps. Transparent pricing. Professional results.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connecting line (desktop only) */}
          <div className="hidden md:block absolute top-16 left-1/6 right-1/6 h-px bg-bolt-yellow/30" />

          {STEPS.map((step) => (
            <div key={step.number} className="relative flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="w-16 h-16 rounded-full bg-bolt-yellow flex items-center justify-center text-black mb-0">
                  {step.icon}
                </div>
                <div className="absolute -top-2 -right-2 font-display text-xs bg-bolt-gray-light text-bolt-black rounded-full w-6 h-6 flex items-center justify-center">
                  {step.number}
                </div>
              </div>
              <h3 className="font-display text-2xl uppercase text-white mb-3">{step.title}</h3>
              <p className="text-gray-400 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <a
            href="#get-quote"
            className="inline-flex items-center justify-center gap-2 bg-bolt-yellow hover:bg-bolt-yellow-dark text-black font-bold text-lg px-10 py-4 rounded-full transition-colors"
          >
            Start My Quote
          </a>
        </div>
      </div>
    </section>
  );
}
