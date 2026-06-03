import type { Metadata } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const barlowCondensed = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dfwgaragedoorpainter.com";

export const metadata: Metadata = {
  title: "DFW Garage Door Painter | Bolt Painting",
  description:
    "Get your garage doors professionally repainted by Bolt Painting. Transparent pricing, Sherwin-Williams colors, and instant online booking for DFW homeowners.",
  keywords: "garage door painting, DFW, Haslet, Fort Worth, Bolt Painting, garage door refresh",
  openGraph: {
    title: "DFW Garage Door Painter | Bolt Painting",
    description:
      "Professional garage door repainting for DFW homeowners. Choose your color and book online in minutes — starting at $799.",
    type: "website",
    url: siteUrl,
    images: [{ url: `${siteUrl}/og-image.jpg`, width: 1200, height: 630, alt: "Bolt Painting — DFW Garage Door Refresh" }],
    siteName: "Bolt Painting",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="en" className={`${barlowCondensed.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="min-h-full" suppressHydrationWarning>
        {children}
        {gaMeasurementId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaMeasurementId}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
