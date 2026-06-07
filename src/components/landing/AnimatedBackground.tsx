import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export function AnimatedBackground() {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1000], [0, 200]);
  const y2 = useTransform(scrollY, [0, 1000], [0, -200]);
  const rotate = useTransform(scrollY, [0, 2000], [0, 360]);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Animated mesh gradient orbs */}
      <motion.div
        style={{ y: y1 }}
        animate={{ x: [0, 60, -40, 0], scale: [1, 1.15, 0.95, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-20 -left-20 w-[40rem] h-[40rem] rounded-full bg-primary/20 blur-[140px]"
      />
      <motion.div
        style={{ y: y2 }}
        animate={{ x: [0, -80, 50, 0], scale: [1, 0.9, 1.2, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/3 -right-32 w-[44rem] h-[44rem] rounded-full bg-accent/20 blur-[160px]"
      />
      <motion.div
        animate={{ x: [-100, 100, -100], y: [0, -120, 0], scale: [1, 1.3, 1] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-0 left-1/3 w-[38rem] h-[38rem] rounded-full bg-primary/15 blur-[150px]"
      />

      {/* Rotating conic gradient ring */}
      <motion.div
        style={{ rotate }}
        className="absolute top-1/2 left-1/2 w-[120vw] h-[120vw] -translate-x-1/2 -translate-y-1/2 opacity-[0.07]"
      >
        <div
          className="w-full h-full rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0%, hsl(var(--primary)) 25%, transparent 50%, hsl(var(--accent)) 75%, transparent 100%)",
          }}
        />
      </motion.div>

      {/* Grid overlay with mask */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: "70px 70px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, black 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, black 30%, transparent 80%)",
        }}
      />

      <Particles />
    </div>
  );
}

function Particles() {
  const [particles, setParticles] = useState<Array<{ x: number; y: number; size: number; duration: number; delay: number }>>([]);

  useEffect(() => {
    const arr = Array.from({ length: 30 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * 10,
    }));
    setParticles(arr);
  }, []);

  return (
    <>
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-primary/60"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, boxShadow: "0 0 10px hsl(var(--primary))" }}
          animate={{ y: [0, -80, 0], opacity: [0, 1, 0] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}

export function ScrollReveal({ children, delay = 0, y = 30 }: { children: React.ReactNode; delay?: number; y?: number }) {
  const ref = useRef(null);
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
