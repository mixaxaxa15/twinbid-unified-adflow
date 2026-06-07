import { UserPlus, Target, Wallet, Rocket } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";

const stepIcons = [UserPlus, Target, Wallet, Rocket];

export function StepsSection() {
  const { t } = useLanguage();

  const steps = stepIcons.map((icon, i) => ({
    icon,
    number: String(i + 1).padStart(2, "0"),
    title: t(`steps.${i + 1}.title`),
    description: t(`steps.${i + 1}.desc`),
  }));

  return (
    <section id="steps" className="py-20 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            {t("steps.title1")}<span className="gradient-text">{t("steps.title2")}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t("steps.subtitle")}</p>
        </motion.div>
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <motion.div
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              style={{ transformOrigin: "top" }}
              className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary via-accent to-primary/30 hidden sm:block"
            />
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -60 : 60 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, delay: index * 0.15, ease: "easeOut" }}
                className={`relative flex flex-col sm:flex-row items-start gap-6 mb-12 last:mb-0 ${index % 2 === 0 ? 'sm:flex-row' : 'sm:flex-row-reverse'}`}
              >
                <div className={`flex-1 ${index % 2 === 0 ? 'sm:text-right' : 'sm:text-left'}`}>
                  <motion.div
                    whileHover={{ scale: 1.03, y: -4 }}
                    className={`glass rounded-2xl p-6 hover-glow transition-shadow inline-block ${index % 2 === 0 ? 'sm:ml-auto' : 'sm:mr-auto'}`}
                  >
                    <div className={`flex items-center gap-3 mb-3 ${index % 2 === 0 ? 'sm:flex-row-reverse' : ''}`}>
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <step.icon className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-3xl font-bold gradient-text">{step.number}</span>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </motion.div>
                </div>
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.15 + 0.3, type: "spring" }}
                  className="hidden sm:flex absolute left-8 sm:left-1/2 -translate-x-1/2 w-4 h-4 rounded-full gradient-primary glow-primary"
                >
                  <motion.div
                    animate={{ scale: [1, 2, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                    className="absolute inset-0 rounded-full bg-primary"
                  />
                </motion.div>
                <div className="flex-1 hidden sm:block" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
