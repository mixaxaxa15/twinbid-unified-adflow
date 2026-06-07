import { ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthDialog } from "./AuthDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, useScroll, useTransform, useMotionValue, useSpring, MotionValue } from "framer-motion";
import { useRef, MouseEvent } from "react";

export function HeroSection() {
  const { t } = useLanguage();
  const ref = useRef<HTMLElement>(null);

  // Scroll-driven hero — the whole thing zooms/parallaxes as the user scrolls
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.35]);
  const opacity = useTransform(scrollYProgress, [0, 0.7, 1], [1, 0.6, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const blur = useTransform(scrollYProgress, [0, 1], ["blur(0px)", "blur(8px)"]);

  // Mouse parallax on the entire hero — layers drift inversely to cursor
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const px = useSpring(mx, { stiffness: 80, damping: 20 });
  const py = useSpring(my, { stiffness: 80, damping: 20 });

  const onMove = (e: MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width - 0.5) * 2);
    my.set(((e.clientY - r.top) / r.height - 0.5) * 2);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  const title1 = t("hero.title1");
  const title2 = t("hero.title2");

  return (
    <motion.section
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ scale, opacity, y, filter: blur }}
      className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden will-change-transform"
    >
      {/* Parallax floating shards reacting to mouse */}
      <ParallaxShard x={px} y={py} depth={40} className="top-[20%] left-[10%] w-24 h-24 rounded-3xl gradient-primary opacity-30 blur-2xl" />
      <ParallaxShard x={px} y={py} depth={-60} className="top-[30%] right-[12%] w-32 h-32 rounded-full bg-accent/40 blur-3xl" />
      <ParallaxShard x={px} y={py} depth={30} className="bottom-[20%] left-[18%] w-40 h-40 rounded-full bg-primary/30 blur-3xl" />
      <ParallaxShard x={px} y={py} depth={-30} className="bottom-[25%] right-[20%] w-20 h-20 rounded-2xl gradient-accent opacity-40 blur-xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8"
          >
            <motion.div animate={{ rotate: [0, 20, -20, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
              <Zap className="w-4 h-4 text-primary" />
            </motion.div>
            <span className="text-sm text-muted-foreground">{t("hero.badge")}</span>
          </motion.div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-[0.95] tracking-tight">
            <RevealLine delay={0.1}>
              <span className="text-foreground">{title1}</span>
            </RevealLine>
            <RevealLine delay={0.35}>
              <span className="gradient-text">{title2}</span>
            </RevealLine>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed"
          >
            {t("hero.subtitle")}{" "}
            <span className="text-foreground font-semibold">{t("hero.subtitleSites")}</span>{" "}
            {t("hero.subtitleEnd")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <div className="relative group">
              <motion.div
                className="absolute -inset-1 rounded-xl gradient-accent blur-lg"
                animate={{ opacity: [0.4, 0.85, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
              <AuthDialog
                defaultTab="register"
                trigger={
                  <Button size="lg" className="relative gradient-primary text-primary-foreground hover:opacity-90 text-lg px-8 py-6 h-auto">
                    {t("hero.cta")}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                }
              />
            </div>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 h-auto border-border hover:bg-secondary">
              {t("hero.learnMore")}
            </Button>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.15, delayChildren: 1.1 } } }}
            className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-12 max-w-2xl mx-auto"
          >
            {[
              { v: "1M+", l: t("hero.statSites") },
              { v: "100+", l: t("hero.statNetworks") },
              { v: "24/7", l: t("hero.statSupport"), span: true },
            ].map((s, i) => (
              <motion.div
                key={i}
                variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                className={`text-center ${s.span ? "col-span-2 md:col-span-1" : ""}`}
              >
                <div className="text-3xl md:text-4xl font-bold gradient-text mb-1">{s.v}</div>
                <div className="text-sm text-muted-foreground">{s.l}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}

function ParallaxShard({
  x,
  y,
  depth,
  className,
}: {
  x: MotionValue<number>;
  y: MotionValue<number>;
  depth: number;
  className: string;
}) {
  const tx = useTransform(x, (v) => v * depth);
  const ty = useTransform(y, (v) => v * depth);
  return <motion.div style={{ x: tx, y: ty }} className={`absolute pointer-events-none ${className}`} />;
}

function RevealLine({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <span className="block overflow-hidden">
      <motion.span
        initial={{ y: "110%" }}
        animate={{ y: "0%" }}
        transition={{ duration: 1, delay, ease: [0.22, 1, 0.36, 1] as any }}
        className="inline-block"
      >
        {children}
      </motion.span>
    </span>
  );
}
