import { LayoutDashboard, TrendingUp, Eye, ShieldCheck, Brain } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";

const benefitIcons = [LayoutDashboard, TrendingUp, Eye, ShieldCheck, Brain];

export function BenefitsSection() {
  const { t } = useLanguage();

  const benefits = benefitIcons.map((icon, i) => ({
    icon,
    title: t(`benefits.${i + 1}.title`),
    description: t(`benefits.${i + 1}.desc`),
  }));

  return (
    <section id="benefits" className="py-20 relative">
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            {t("benefits.title1")}<span className="gradient-text">TwinBid</span>{t("benefits.title2")}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t("benefits.subtitle")}</p>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.slice(0, 3).map((benefit, index) => (
            <BenefitCard key={index} benefit={benefit} index={index} />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 lg:max-w-[calc(66.666%+0.75rem)] mx-auto">
          {benefits.slice(3).map((benefit, index) => (
            <BenefitCard key={index + 3} benefit={benefit} index={index + 3} />
          ))}
        </div>
      </div>
    </section>
  );
}

function BenefitCard({ benefit, index }: { benefit: { icon: any; title: string; description: string }; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="group glass rounded-2xl p-6 hover-glow transition-shadow duration-300 relative overflow-hidden"
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute -inset-px rounded-2xl" style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.3), transparent 60%)" }} />
      </div>
      <motion.div
        whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
        transition={{ duration: 0.5 }}
        className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center mb-5 group-hover:glow-primary transition-shadow"
      >
        <benefit.icon className="w-7 h-7 text-primary-foreground" />
      </motion.div>
      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-sm font-bold text-muted-foreground mb-4">
        {index + 1}
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-3">{benefit.title}</h3>
      <p className="text-muted-foreground leading-relaxed">{benefit.description}</p>
    </motion.div>
  );
}
