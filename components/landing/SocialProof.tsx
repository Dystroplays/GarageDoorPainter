const TESTIMONIALS = [
  {
    name: "Jennifer M.",
    location: "Haslet, TX",
    text: "Our garage doors looked so faded after 7 years. Blake's team painted them in one day and they look brand new — better than when we first moved in.",
    stars: 5,
  },
  {
    name: "David R.",
    location: "Keller, TX",
    text: "The online booking was so easy. I picked my color, saw what it would look like, and booked in about 5 minutes. Great results and fair price.",
    stars: 5,
  },
  {
    name: "Sarah K.",
    location: "Fort Worth, TX",
    text: "Was skeptical at first but the results speak for themselves. The finished doors look completely transformed — like we got new doors for a fraction of the price.",
    stars: 5,
  },
];

export default function SocialProof() {
  return (
    <section className="bg-bolt-gray-light py-16 sm:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Star rating header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-1 mb-3">
            {[...Array(5)].map((_, i) => (
              <svg key={i} className="w-7 h-7 text-bolt-yellow fill-current" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
          </div>
          <p className="text-2xl font-bold text-bolt-black">
            5.0 out of 5 stars
          </p>
          <p className="text-gray-500 mt-1">Based on Google reviews</p>
        </div>

        {/* Testimonial cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-1 mb-3">
                {[...Array(t.stars)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-bolt-yellow fill-current" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-700 leading-relaxed mb-4 text-sm">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-bolt-yellow flex items-center justify-center font-bold text-black text-sm">
                  {t.name[0]}
                </div>
                <div>
                  <p className="font-semibold text-bolt-black text-sm">{t.name}</p>
                  <p className="text-gray-400 text-xs">{t.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
