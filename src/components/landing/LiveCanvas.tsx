import { motion, useMotionValue, useSpring, useScroll, useTransform } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * A global, mouse-reactive aurora + spotlight that lives behind the entire page.
 * The whole site "breathes" with the cursor and the scroll position.
 */
export function LiveCanvas() {
  const mx = useMotionValue(typeof window !== "undefined" ? window.innerWidth / 2 : 600);
  const my = useMotionValue(typeof window !== "undefined" ? window.innerHeight / 2 : 400);
  const sx = useSpring(mx, { stiffness: 60, damping: 20, mass: 0.6 });
  const sy = useSpring(my, { stiffness: 60, damping: 20, mass: 0.6 });

  const { scrollY } = useScroll();
  const hueShift = useTransform(scrollY, [0, 4000], [0, 80]);
  const bgY1 = useTransform(scrollY, [0, 3000], [0, -400]);
  const bgY2 = useTransform(scrollY, [0, 3000], [0, 300]);
  const bgY3 = useTransform(scrollY, [0, 3000], [0, -200]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mx.set(e.clientX);
      my.set(e.clientY);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [mx, my]);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
      {/* base aurora layers */}
      <motion.div
        style={{ y: bgY1, filter: useTransform(hueShift, (h) => `hue-rotate(${h}deg)`) }}
        animate={{ scale: [1, 1.15, 1], rotate: [0, 25, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-1/3 -left-1/4 w-[80vw] h-[80vw] rounded-full bg-primary/30 blur-[160px]"
      />
      <motion.div
        style={{ y: bgY2, filter: useTransform(hueShift, (h) => `hue-rotate(${-h}deg)`) }}
        animate={{ scale: [1, 0.85, 1.1, 1], rotate: [0, -30, 0] }}
        transition={{ duration: 34, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 -right-1/4 w-[90vw] h-[90vw] rounded-full bg-accent/25 blur-[180px]"
      />
      <motion.div
        style={{ y: bgY3 }}
        animate={{ scale: [1, 1.25, 1], x: [-100, 100, -100] }}
        transition={{ duration: 40, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[-30%] left-1/4 w-[70vw] h-[70vw] rounded-full bg-primary/20 blur-[180px]"
      />

      {/* MOUSE-FOLLOWING SPOTLIGHT — the page literally lights up under the cursor */}
      <motion.div
        style={{
          x: sx,
          y: sy,
          translateX: "-50%",
          translateY: "-50%",
        }}
        className="absolute w-[45vw] h-[45vw] rounded-full pointer-events-none"
      >
        <div
          className="w-full h-full rounded-full"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--primary) / 0.55) 0%, hsl(var(--primary) / 0.28) 25%, hsl(var(--primary) / 0.12) 50%, transparent 75%)",
            filter: "blur(60px)",
          }}
        />
      </motion.div>

      {/* fine grain noise / grid for texture */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
          maskImage: "radial-gradient(ellipse 100% 80% at 50% 40%, black 20%, transparent 90%)",
          WebkitMaskImage: "radial-gradient(ellipse 100% 80% at 50% 40%, black 20%, transparent 90%)",
        }}
      />

      <FloatingDots />
    </div>
  );
}

function FloatingDots() {
  const [dots, setDots] = useState<Array<{ x: number; y: number; s: number; d: number; del: number }>>([]);
  useEffect(() => {
    setDots(
      Array.from({ length: 45 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        s: Math.random() * 2.5 + 0.8,
        d: Math.random() * 18 + 14,
        del: Math.random() * 12,
      })),
    );
  }, []);
  return (
    <>
      {dots.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-primary"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.s,
            height: p.s,
            boxShadow: "0 0 12px hsl(var(--primary))",
          }}
          animate={{ y: [0, -120, 0], opacity: [0, 0.9, 0] }}
          transition={{ duration: p.d, repeat: Infinity, delay: p.del, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}

/** Custom cursor: a soft glowing ring that grows on interactive elements. */
export function CustomCursor() {
  const mx = useMotionValue(-100);
  const my = useMotionValue(-100);
  const sx = useSpring(mx, { stiffness: 400, damping: 30 });
  const sy = useSpring(my, { stiffness: 400, damping: 30 });
  const tx = useSpring(mx, { stiffness: 120, damping: 18 });
  const ty = useSpring(my, { stiffness: 120, damping: 18 });
  const [hover, setHover] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // disable on touch devices
    if (matchMedia("(pointer: coarse)").matches) return;
    setEnabled(true);
    const onMove = (e: PointerEvent) => {
      mx.set(e.clientX);
      my.set(e.clientY);
      const el = e.target as HTMLElement;
      const interactive = el?.closest('a, button, [role="button"], input, textarea, select, [data-cursor="hover"]');
      setHover(!!interactive);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [mx, my]);

  if (!enabled) return null;
  return (
    <>
      <motion.div
        style={{ x: tx, y: ty, translateX: "-50%", translateY: "-50%" }}
        className="fixed top-0 left-0 w-10 h-10 rounded-full pointer-events-none z-[100]"
        animate={{ scale: hover ? 1.8 : 1, opacity: hover ? 0.6 : 0.35 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        <div
          className="w-full h-full rounded-full"
          style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.6), transparent 70%)", filter: "blur(6px)" }}
        />
      </motion.div>
      <motion.div
        style={{ x: sx, y: sy, translateX: "-50%", translateY: "-50%" }}
        animate={{ scale: hover ? 1.5 : 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="fixed top-0 left-0 w-3 h-3 rounded-full bg-primary pointer-events-none z-[101] mix-blend-difference"
      />
    </>
  );
}

/** Infinite scrolling marquee strip — seamlessly loops with no jump. */
export function Marquee({ items }: { items: string[] }) {
  const group = Array.from({ length: 3 }, () => items).flat();

  return (
    <div className="relative overflow-hidden border-y border-border/40 bg-background/30 backdrop-blur-sm py-8">
      <div className="marquee-track flex w-max whitespace-nowrap will-change-transform">
        {[0, 1].map((copyIndex) => (
          <div key={copyIndex} className="flex shrink-0" aria-hidden={copyIndex === 1}>
            {group.map((t, i) => (
              <span
                key={`${copyIndex}-${i}`}
                className="flex items-center gap-12 pr-12 text-2xl md:text-4xl font-bold shrink-0 text-foreground/70"
              >
                <span className="gradient-text">{t}</span>
                <span className="w-2 h-2 rounded-full gradient-primary shrink-0" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Big kinetic text band — reacts to scroll velocity, drifting across viewport. */
export function ScrollKineticBand({ children }: { children: string }) {
  const { scrollY } = useScroll();
  const x = useTransform(scrollY, [0, 4000], [0, -800]);
  return (
    <div className="overflow-hidden py-6 select-none">
      <motion.div style={{ x }} className="whitespace-nowrap text-[12vw] leading-none font-black tracking-tight gradient-text opacity-20">
        {children} · {children} · {children}
      </motion.div>
    </div>
  );
}
