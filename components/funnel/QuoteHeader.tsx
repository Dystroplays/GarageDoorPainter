export default function QuoteHeader() {
  const phone = process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "";

  return (
    <header className="bg-bolt-black border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="font-display text-xl uppercase tracking-wide text-white">
          ⚡ Bolt <span className="text-bolt-yellow">Painting</span>
        </div>
        {phone && (
          <div className="flex flex-col items-end">
            <a
              href={`tel:${phone}`}
              className="text-white hover:text-bolt-yellow transition-colors font-medium text-sm"
            >
              {phone}
            </a>
            <span className="text-gray-500 text-xs">Text us anytime</span>
          </div>
        )}
      </div>
    </header>
  );
}
