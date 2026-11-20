import React, { useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'motion/react';

export const GOLD = '#F2B33D';
export const SAFFRON = '#E8742A';
export const NAVY = '#0b1f4b';
export const ease = [0.22, 1, 0.36, 1] as const;

/** Number that glides to its new value whenever it changes. */
export const CountUp: React.FC<{ to: number; dur?: number; decimals?: number; suffix?: string; prefix?: string }> = ({
  to,
  dur = 1.2,
  decimals = 0,
  suffix = '',
  prefix = '',
}) => {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const c = animate(from.current, to, {
      duration: dur,
      ease,
      onUpdate: (x) => {
        from.current = x;
        setV(x);
      },
    });
    return () => c.stop();
  }, [to, dur]);
  return (
    <>
      {prefix}
      {v.toFixed(decimals)}
      {suffix}
    </>
  );
};

/** Word-by-word blur-up reveal; words listed in `gold` get the animated gold sheen. */
export const Words: React.FC<{ text: string; className?: string; delay?: number; gold?: string[]; stagger?: number }> = ({
  text,
  className = '',
  delay = 0,
  gold = [],
  stagger = 0.07,
}) => (
  <span className={className}>
    {text.split(' ').map((w, i) => (
      <React.Fragment key={i}>
        {i > 0 ? ' ' : ''}
        <motion.span
          className={`inline-block ${gold.includes(w.replace(/[.,!?]/g, '').toLowerCase()) ? 'gold-text' : ''}`}
          initial={{ opacity: 0, y: 30, filter: 'blur(12px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.75, delay: delay + i * stagger, ease }}
        >
          {w}
        </motion.span>
      </React.Fragment>
    ))}
  </span>
);

export const Eyebrow: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => (
  <motion.p
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.6, delay, ease }}
    className="text-[clamp(11px,1vw,15px)] font-bold tracking-[0.3em] uppercase"
    style={{ color: GOLD }}
  >
    {children}
  </motion.p>
);

/** Card that tilts toward the cursor in 3D with a moving glare highlight. */
export const TiltCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  max?: number;
  style?: React.CSSProperties;
}> = ({ children, className = '', onClick, max = 10, style }) => {
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx = useSpring(px, { stiffness: 180, damping: 18 });
  const sy = useSpring(py, { stiffness: 180, damping: 18 });
  const rotateY = useTransform(sx, [0, 1], [-max, max]);
  const rotateX = useTransform(sy, [0, 1], [max, -max]);
  const gx = useTransform(sx, [0, 1], ['0%', '100%']);
  const gy = useTransform(sy, [0, 1], ['0%', '100%']);
  const glare = useMotionTemplate`radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,.22), transparent 55%)`;
  return (
    <motion.div
      ref={ref}
      onClick={onClick}
      onMouseMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
      }}
      onMouseLeave={() => {
        px.set(0.5);
        py.set(0.5);
      }}
      style={{ rotateX, rotateY, transformPerspective: 1100, transformStyle: 'preserve-3d', ...style }}
      whileTap={onClick ? { scale: 0.985 } : undefined}
      className={`relative ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
      <motion.div className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ background: glare }} />
    </motion.div>
  );
};

export const BrandMark: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <div
    className="grid place-items-center font-display font-bold text-[#0b1f4b] shrink-0"
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.3,
      fontSize: size * 0.42,
      background: `linear-gradient(135deg,${GOLD},${SAFFRON})`,
      boxShadow: '0 10px 40px -10px rgba(242,179,61,.6)',
    }}
  >
    DY
  </div>
);

export interface ShowcaseHealth {
  claude: boolean;
  model: string;
  geminiModel?: string | null;
  gemini: boolean;
  backupStickers: number;
}
export function useHealth() {
  const [h, setH] = useState<ShowcaseHealth | null>(null);
  useEffect(() => {
    fetch('/api/showcase/health')
      .then((r) => r.json())
      .then(setH)
      .catch(() => setH(null));
  }, []);
  return h;
}

export function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen?.();
}

/** Tiny WebAudio shutter + chime so camera and reveals feel physical (no assets needed). */
let audioCtx: AudioContext | null = null;
export function sfx(kind: 'tick' | 'shutter' | 'pop' | 'chime') {
  try {
    audioCtx ??= new AudioContext();
    const ctx = audioCtx;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.connect(ctx.destination);
    if (kind === 'shutter') {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      g.gain.value = 0.5;
      src.connect(g);
      src.start(t);
      return;
    }
    const o = ctx.createOscillator();
    o.connect(g);
    const notes = { tick: [880, 0.05, 0.06], pop: [660, 0.12, 0.08], chime: [523.25, 0.6, 0.1] } as const;
    const [f, dur, vol] = notes[kind];
    o.type = kind === 'chime' ? 'sine' : 'triangle';
    o.frequency.setValueAtTime(f, t);
    if (kind === 'pop') o.frequency.exponentialRampToValueAtTime(f * 2, t + dur);
    if (kind === 'chime') {
      o.frequency.setValueAtTime(523.25, t);
      o.frequency.setValueAtTime(659.25, t + 0.12);
      o.frequency.setValueAtTime(783.99, t + 0.24);
    }
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch {
    /* audio is a nice-to-have */
  }
}
