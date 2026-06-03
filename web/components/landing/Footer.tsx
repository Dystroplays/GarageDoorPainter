export default function Footer() {
  const phone = process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "";

  return (
    <footer className="bg-bolt-black text-white py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          {/* Brand */}
          <div>
            <div className="font-display text-2xl uppercase text-white tracking-wide">
              ⚡ Bolt <span className="text-bolt-yellow">Painting</span>
            </div>
            <p className="text-gray-500 text-sm mt-1">A Bolt Painting Service</p>
          </div>

          {/* Contact */}
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">Serving the Dallas–Fort Worth metro area</p>
            {phone && (
              <div>
                <a href={`tel:${phone}`} className="text-bolt-yellow hover:underline font-semibold">
                  {phone}
                </a>
                <p className="text-gray-500 text-xs mt-0.5">Call or Text Blake</p>
              </div>
            )}
          </div>

          {/* Links */}
          <div className="flex flex-col items-start md:items-end gap-2 text-sm text-gray-400">
            <div className="flex gap-4">
              <a href="#get-quote" className="hover:text-white transition-colors">Get a Quote</a>
              <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
            <span className="text-gray-600">© {new Date().getFullYear()} Bolt Painting LLC</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
