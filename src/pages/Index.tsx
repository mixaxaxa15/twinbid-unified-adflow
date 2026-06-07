import { Header } from "@/components/landing/Header";
import { HeroSection } from "@/components/landing/HeroSection";
import { StartConditions } from "@/components/landing/StartConditions";
import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { CashbackSection } from "@/components/landing/CashbackSection";
import { FormatsSection } from "@/components/landing/FormatsSection";
import { StepsSection } from "@/components/landing/StepsSection";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";
import { AnimatedBackground } from "@/components/landing/AnimatedBackground";

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative">
      <AnimatedBackground />
      <Header />
      <main>
        <HeroSection />
        <StartConditions />
        <BenefitsSection />
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
