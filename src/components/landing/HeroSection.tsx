import { ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthDialog } from "./AuthDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, useMotionValue, useSpring, useTransform, useScroll } from "framer-motion";
import { useRef, MouseEvent } from "react";

export function HeroSection() {
  const { t } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 600], [0, 150]);
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 600], [1, 0.92]);

  // 3D tilt on mouse move
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 120, damping: 18 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-8, 8]), { stiffness: 120, damping: 18 });

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  const title1 = t("hero.title1");
  const title2 = t("hero.title2");
  const words1 = title1.split(" ");
  const words2 = title2.split(" ");

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
  };
  const word: any = {
    hidden: { opacity: 0, y: 40, filter: "blur(12px)" },
    show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
      <motion.div
        style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
        className="container mx-auto px-4 relative z-10"
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
      >
        <motion.div
          style={{ rotateX, rotateY, transformPerspective: 1200 }}
          className="max-w-4xl mx-auto text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8"
          >
            <motion.div
              animate={{ rotate: [0, 20, -20, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Zap className="w-4 h-4 text-primary" />
            </motion.div>
            <span className="text-sm text-muted-foreground">{t("hero.badge")}</span>
          </motion.div>

          <motion.h1
            variants={container}
            initial="hidden"
            animate="show"
            className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
          >
            <span className="text-foreground inline-block">
              {words1.map((w, i) => (
                <motion.span key={`a-${i}`} variants={word} className="inline-block mr-[0.25em]">
                  {w}
                </motion.span>
              ))}
            </span>
            <span className="gradient-text inline-block">
              {words2.map((w, i) => (
                <motion.span
                  key={`b-${i}`}
                  variants={word}
                  className="inline-block mr-[0.25em]"
                  style={{ backgroundSize: "200% 200%" }}
                >
                  {w}
                </motion.span>
              ))}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed"
          >
            {t("hero.subtitle")}{" "}
            <span className="text-foreground font-semibold">{t("hero.subtitleSites")}</span>{" "}
            {t("hero.subtitleEnd")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="relative group">
              <motion.div
                className="absolute -inset-1 rounded-xl gradient-accent opacity-60 blur-lg"
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
              <AuthDialog
                defaultTab="register"
                trigger={
                  <Button size="lg" className="relative gradient-primary text-primary-foreground hover:opacity-90 glow-primary text-lg px-8 py-6 h-auto">
                    {t("hero.cta")}
                    <motion.span
                      animate={{ x: [0, 6, 0] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                      className="inline-flex"
                    >
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </motion.span>
                  </Button>
                }
              />
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 h-auto border-border hover:bg-secondary">
                {t("hero.learnMore")}
              </Button>
            </motion.div>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.15, delayChildren: 1.2 } } }}
            className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-12 max-w-2xl mx-auto"
          >
            {[
              { v: "1M+", l: t("hero.statSites") },
              { v: "100+", l: t("hero.statNetworks") },
              { v: "24/7", l: t("hero.statSupport"), span: true },
            ].map((s, i) => (
              <motion.div
                key={i}
                variants={{ hidden: { opacity: 0, y: 20, scale: 0.9 }, show: { opacity: 1, y: 0, scale: 1 } }}
                whileHover={{ y: -6, scale: 1.05 }}
                className={`text-center ${s.span ? "col-span-2 md:col-span-1" : ""}`}
              >
                <div className="text-3xl md:text-4xl font-bold gradient-text mb-1">{s.v}</div>
                <div className="text-sm text-muted-foreground">{s.l}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 items-center justify-center hidden scroll-indicator"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2"
        >
          <motion.div
            animate={{ y: [0, 10, 0], opacity: [1, 0, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="w-1 h-2 bg-primary rounded-full"
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
