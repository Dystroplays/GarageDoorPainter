import Image from "next/image";

export default function About() {
  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Photo placeholder */}
          <div className="relative">
            <div className="relative rounded-2xl bg-gray-100 aspect-square overflow-hidden">
              <Image
                src="/blake-family.jpg"
                alt="Blake and family, owner of Bolt Painting"
                fill
                className="object-cover object-top"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-2xl bg-bolt-yellow flex items-center justify-center shadow-lg">
              <div className="text-center">
                <div className="font-display text-3xl text-black uppercase leading-none">5+</div>
                <div className="text-xs text-black/70 mt-1">Years of experience</div>
              </div>
            </div>
          </div>

          {/* Right: Story */}
          <div>
            <div className="inline-block bg-bolt-yellow/10 text-bolt-yellow text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
              About Bolt Painting
            </div>
            <h2 className="font-display text-4xl sm:text-5xl uppercase text-bolt-black leading-tight mb-6">
              Built by Painters.{" "}
              <span className="text-bolt-yellow">Designed for Homeowners.</span>
            </h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                I&apos;m Blake, the owner of Bolt Painting. We&apos;ve been serving DFW homeowners for over five years — and garage doors have always been one of our specialties.
              </p>
              <p>
                Here&apos;s what we kept hearing: homeowners wanted their faded garage doors repainted, but every painter made it complicated. Phone calls, in-home estimates, vague quotes, weeks of back-and-forth. For a job that takes a day.
              </p>
              <p>
                So we streamlined it. You pick your doors, choose your Sherwin-Williams color, see the price instantly, and book a date — all online, in under ten minutes. We show up with professional-grade materials, prep and paint your doors, and you pay the balance when you&apos;re happy with the result.
              </p>
              <p>
                No surprises. No runaround. Just a fresh set of garage doors.
              </p>
            </div>
            <div className="mt-8 flex items-center gap-4">
              <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                <Image
                  src="/blake-family.jpg"
                  alt="Blake"
                  fill
                  className="object-cover object-top"
                  sizes="48px"
                />
              </div>
              <div>
                <p className="font-bold text-bolt-black">Blake</p>
                <p className="text-gray-500 text-sm">Owner, Bolt Painting</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
