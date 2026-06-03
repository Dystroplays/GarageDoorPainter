interface Props {
  photo?: string;
  name?: string;
}

export default function CrewCard({ photo, name }: Props) {
  return (
    <div className="bg-white border-b border-gray-100 py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 bg-bolt-gray-light rounded-2xl px-6 py-5 border border-gray-200">
          {/* Painter photo or fallback icon */}
          <div className="w-14 h-14 rounded-full overflow-hidden bg-bolt-yellow flex items-center justify-center flex-shrink-0">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt={name ?? "Bolt Painting crew"} className="w-full h-full object-cover" />
            ) : (
              <span className="font-display text-2xl text-black uppercase">⚡</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-bold text-bolt-black">
              {name ?? "Your Bolt Painting Crew"}
            </p>
            <p className="text-gray-500 text-sm">Your doors are in good hands.</p>
          </div>

          <div className="hidden sm:flex flex-col items-end text-right">
            <div className="flex gap-1 mb-1">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-4 h-4 text-bolt-yellow" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <p className="text-gray-400 text-xs">5+ years serving DFW</p>
          </div>
        </div>
      </div>
    </div>
  );
}
