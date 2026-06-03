import Hero from "@/components/landing/Hero";
import BeforeAfterGallery from "@/components/landing/BeforeAfterGallery";
import SocialProof from "@/components/landing/SocialProof";
import HowItWorks from "@/components/landing/HowItWorks";
import About from "@/components/landing/About";
import Footer from "@/components/landing/Footer";
import LandingLeadCapture from "@/components/landing/LandingLeadCapture";
import PixelProvider from "@/components/PixelProvider";

export default function HomePage() {
  return (
    <>
      <PixelProvider />

      {/* ── Landing Sections ── */}
      <Hero />
      <SocialProof />
      <HowItWorks />
      <BeforeAfterGallery />
      <About />

      {/* ── Lead Capture — submits to Airtable, redirects to /quote ── */}
      <div id="lead-capture">
        <LandingLeadCapture />
      </div>

      <Footer />
    </>
  );
}
