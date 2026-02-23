import { HeroSection } from "./components/hero-section";
import { LogoCarousel } from "./components/logo-carousel";
import { PlatformTabs } from "./components/platform-tabs";
import { ResultsGrid } from "./components/results-grid";
import { ValueCards } from "./components/value-cards";
import { PersonaColumns } from "./components/persona-columns";
import { FaqAccordion } from "./components/faq-accordion";
import { CtaSection } from "./components/cta-section";

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <LogoCarousel />
      <PlatformTabs />
      <ResultsGrid />
      <ValueCards />
      <PersonaColumns />
      <FaqAccordion />
      <CtaSection />
    </>
  );
}
