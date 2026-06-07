import { Header } from "@/components/landing/Header";
import { HeroSection } from "@/components/landing/HeroSection";
import { StartConditions } from "@/components/landing/StartConditions";
import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { CashbackSection } from "@/components/landing/CashbackSection";
import { FormatsSection } from "@/components/landing/FormatsSection";
import { StepsSection } from "@/components/landing/StepsSection";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";
import { LiveCanvas, Marquee } from "@/components/landing/LiveCanvas";
import { useLanguage } from "@/contexts/LanguageContext";

const Index = () => {
  const { t } = useLanguage();
  const tryPhrase = t("marquee.tryTwinBid");
  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <LiveCanvas />
      <Header />
      <main>
        <HeroSection />
        <Marquee items={Array(6).fill(tryPhrase)} />
        <StartConditions />
        <BenefitsSection />
        <Marquee items={["Popunder", "Native", "Banner", "In-Page Push", "1M+ Sites", "100+ Networks", "24/7 Support", "Real-Time Bidding"]} />
        <CashbackSection />
        <FormatsSection />
        <StepsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
