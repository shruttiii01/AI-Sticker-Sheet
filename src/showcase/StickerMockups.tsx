import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { ArrowLeft, Bomb, Shuffle, Sparkles, Wind, X } from 'lucide-react';
import { GOLD, ease, sfx } from './ui';

/**
 * "Stick it everywhere": the visitor's freshly drawn stickers slapped onto a laptop, phone, bottle,
 * notebook, mug, tee and skateboard. Everything is live DOM, so stickers can be dragged, re-slapped,
 * sticker-bombed and peeled off. No extra API calls: it only reuses the PNGs already on screen.
 */

export const SAMPLE_STICKERS = ['chai', 'coder', 'gym', 'travel', 'music', 'idea'].map((k) => `/assets/samples/${k}.webp`);

interface Placement {
  id: string;
  src: string;
  x: number; // centre, % of surface width
  y: number; // centre, % of surface height
  w: number; // width, % of surface width
  r: number; // rotation, degrees
}

interface ObjectDef {
  id: string;
  label: string;
  tagline: string;
  bg: string;
  aspect: number; // width / height of the stage box
  size: [number, number]; // sticker width range, % of surface
  base: Omit<Placement, 'id' | 'src'>[];
  Frame: React.FC<{ children: React.ReactNode; surfaceRef: React.RefObject<HTMLDivElement | null> }>;
}

/* ---------------- object frames ---------------- */
const Surface: React.FC<{
  surfaceRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
  style?: React.CSSProperties;
  shade?: string;
  children: React.ReactNode;
}> = ({ surfaceRef, className = '', style, shade, children }) => (
  <div ref={surfaceRef} className={`absolute overflow-hidden ${className}`} style={style}>
    {children}
    {shade && <div className="absolute inset-0 pointer-events-none" style={{ background: shade, mixBlendMode: 'multiply' }} />}
  </div>
);

const CYLINDER =
  'linear-gradient(90deg, rgba(0,0,0,.42) 0%, rgba(0,0,0,.08) 18%, rgba(255,255,255,0) 32%, rgba(255,255,255,0) 50%, rgba(0,0,0,.06) 68%, rgba(0,0,0,.5) 100%)';

const OBJECTS: ObjectDef[] = [
  {
    id: 'laptop',
    label: 'Laptop lid',
    tagline: 'The classic sticker bomb',
    bg: 'linear-gradient(135deg,#ffd166,#ff7b54)',
    aspect: 1.45,
    size: [24, 36],
    base: [
      { x: 24, y: 32, w: 34, r: -8 },
      { x: 72, y: 30, w: 32, r: 9 },
      { x: 48, y: 68, w: 33, r: -3 },
      { x: 80, y: 74, w: 26, r: 12 },
      { x: 18, y: 76, w: 25, r: -14 },
      { x: 50, y: 22, w: 20, r: 18 },
    ],
    Frame: ({ children, surfaceRef }) => (
      <div className="absolute inset-[6%_5%_10%]">
        <div className="absolute inset-0 rounded-[6%/9%] shadow-[0_30px_60px_-20px_rgba(0,0,0,.6)]" style={{ background: 'linear-gradient(160deg,#5b5f6b,#2a2c33)' }} />
        <Surface surfaceRef={surfaceRef} className="inset-0 rounded-[6%/9%]" shade="radial-gradient(120% 80% at 30% 10%, rgba(255,255,255,0) 40%, rgba(0,0,0,.18))">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[7%] aspect-square rounded-full bg-white/10" />
          {children}
        </Surface>
        <div className="absolute -bottom-[5%] left-[-3%] right-[-3%] h-[5%] rounded-b-[40%] bg-gradient-to-b from-[#9aa0ab] to-[#5d626c]" />
      </div>
    ),
  },
  {
    id: 'phone',
    label: 'Phone case',
    tagline: 'Pocket-sized flex',
    bg: 'linear-gradient(135deg,#7b2ff7,#ff2e88)',
    aspect: 0.62,
    size: [40, 62],
    base: [
      { x: 52, y: 52, w: 64, r: -6 },
      { x: 62, y: 82, w: 44, r: 10 },
      { x: 30, y: 78, w: 36, r: -14 },
    ],
    Frame: ({ children, surfaceRef }) => (
      <div className="absolute inset-[4%_14%]">
        <Surface
          surfaceRef={surfaceRef}
          className="inset-0 rounded-[18%/8.5%] shadow-[0_30px_60px_-20px_rgba(0,0,0,.6)]"
          style={{ background: 'linear-gradient(160deg,#fdfdfd,#d9dbe2)' }}
          shade="linear-gradient(100deg, rgba(0,0,0,.12), rgba(255,255,255,0) 30%, rgba(255,255,255,0) 70%, rgba(0,0,0,.15))"
        >
          {children}
          {/* camera bump sits on top: stickers go around it, like on a real case */}
          <div className="absolute z-[70] left-[8%] top-[3.5%] w-[42%] aspect-square rounded-[26%] bg-[#23262e] shadow-[0_6px_14px_rgba(0,0,0,.35)] grid grid-cols-2 gap-[8%] p-[9%]">
            {[0, 1, 2].map((i) => (
              <span key={i} className="rounded-full bg-black border-[3px] border-[#555a66]" />
            ))}
          </div>
        </Surface>
      </div>
    ),
  },
  {
    id: 'bottle',
    label: 'Water bottle',
    tagline: 'Wraps the curve',
    bg: 'linear-gradient(135deg,#50e3c2,#2d7ff9)',
    aspect: 0.62,
    size: [50, 80],
    base: [
      { x: 50, y: 40, w: 78, r: -4 },
      { x: 56, y: 74, w: 56, r: 8 },
    ],
    Frame: ({ children, surfaceRef }) => (
      <div className="absolute inset-[3%_26%_4%]">
        <div className="absolute left-[24%] right-[24%] top-0 h-[13%] rounded-[30%/40%] bg-gradient-to-r from-[#1b1d22] via-[#4a4e58] to-[#1b1d22]" />
        <div className="absolute left-[16%] right-[16%] top-[11%] h-[6%] rounded-t-[50%] bg-gradient-to-r from-[#8b8f99] via-[#e4e6ea] to-[#7c808a]" />
        <Surface
          surfaceRef={surfaceRef}
          className="left-0 right-0 top-[16%] bottom-0 rounded-[40%/12%] shadow-[0_30px_60px_-20px_rgba(0,0,0,.55)]"
          style={{ background: 'linear-gradient(90deg,#ff6f61,#ff8a7a 40%,#ff6f61)' }}
          shade={CYLINDER}
        >
          {children}
          <div className="absolute left-[14%] top-[6%] bottom-[6%] w-[7%] rounded-full bg-white/35 blur-[2px] pointer-events-none" />
        </Surface>
      </div>
    ),
  },
  {
    id: 'notebook',
    label: 'Notebook',
    tagline: 'Every lecture, branded',
    bg: 'linear-gradient(135deg,#ffecb3,#ffb74d)',
    aspect: 0.8,
    size: [30, 52],
    base: [
      { x: 58, y: 30, w: 50, r: 7 },
      { x: 46, y: 62, w: 42, r: -9 },
      { x: 74, y: 80, w: 32, r: 14 },
    ],
    Frame: ({ children, surfaceRef }) => (
      <div className="absolute inset-[5%_14%] rotate-[-3deg]">
        <Surface
          surfaceRef={surfaceRef}
          className="inset-0 rounded-[3%] shadow-[0_30px_60px_-20px_rgba(0,0,0,.55)]"
          style={{ background: 'linear-gradient(135deg,#c89b6d,#a87b4f)' }}
          shade="linear-gradient(90deg, rgba(0,0,0,.25), rgba(0,0,0,0) 14%)"
        >
          {children}
        </Surface>
        <div
          className="absolute left-[-3%] top-[3%] bottom-[3%] w-[9%] pointer-events-none"
          style={{ background: 'repeating-linear-gradient(180deg, transparent 0 6px, #3b3d44 6px 11px, #c9ccd3 11px 15px, transparent 15px 22px)' }}
        />
      </div>
    ),
  },
  {
    id: 'mug',
    label: 'Coffee mug',
    tagline: 'Morning chai, personalised',
    bg: 'linear-gradient(135deg,#fbc2eb,#a18cd1)',
    aspect: 1.1,
    size: [40, 62],
    base: [
      { x: 48, y: 50, w: 58, r: -5 },
      { x: 78, y: 72, w: 32, r: 12 },
    ],
    Frame: ({ children, surfaceRef }) => (
      <div className="absolute inset-[10%_22%_8%_14%]">
        <div className="absolute right-[-26%] top-[22%] w-[38%] h-[46%] rounded-[50%] border-[clamp(8px,3.2vw,26px)] border-[#eceef3] shadow-[0_20px_30px_-15px_rgba(0,0,0,.5)]" />
        <Surface
          surfaceRef={surfaceRef}
          className="inset-0 rounded-[6%_6%_22%_22%/5%_5%_18%_18%] shadow-[0_30px_60px_-20px_rgba(0,0,0,.55)]"
          style={{ background: 'linear-gradient(90deg,#ffffff,#f1f2f6)' }}
          shade={CYLINDER}
        >
          {children}
        </Surface>
        <div className="absolute inset-x-0 top-0 h-[7%] rounded-[50%] bg-gradient-to-b from-[#5a3a22] to-[#2f1d10] border-[3px] border-[#f4f5f8]" />
      </div>
    ),
  },
  {
    id: 'tee',
    label: 'T-shirt',
    tagline: 'Wear your face',
    bg: 'linear-gradient(135deg,#00b8a9,#7df9ff)',
    aspect: 1,
    size: [36, 52],
    base: [{ x: 50, y: 46, w: 48, r: 0 }],
    Frame: ({ children, surfaceRef }) => (
      <div className="absolute inset-[6%]" style={{ filter: 'drop-shadow(0 26px 30px rgba(0,0,0,.35))' }}>
        <Surface
          surfaceRef={surfaceRef}
          className="inset-0"
          style={{
            background: 'linear-gradient(160deg,#1f2a44,#141b2e)',
            clipPath: 'polygon(30% 4%, 40% 8%, 50% 10%, 60% 8%, 70% 4%, 96% 18%, 86% 40%, 76% 34%, 76% 98%, 24% 98%, 24% 34%, 14% 40%, 4% 18%)',
          }}
          shade="radial-gradient(70% 60% at 50% 30%, rgba(255,255,255,0) 40%, rgba(0,0,0,.25))"
        >
          {children}
        </Surface>
      </div>
    ),
  },
  {
    id: 'skate',
    label: 'Skateboard',
    tagline: 'Ollie with your avatar',
    bg: 'linear-gradient(135deg,#f9d423,#ff4e50)',
    aspect: 0.5,
    size: [56, 86],
    base: [
      { x: 50, y: 26, w: 80, r: -8 },
      { x: 50, y: 58, w: 70, r: 6 },
      { x: 52, y: 84, w: 56, r: -12 },
    ],
    Frame: ({ children, surfaceRef }) => (
      <div className="absolute inset-[3%_20%]">
        <Surface
          surfaceRef={surfaceRef}
          className="inset-0 rounded-[50%/14%] shadow-[0_30px_60px_-20px_rgba(0,0,0,.6)]"
          style={{ background: 'repeating-linear-gradient(0deg,#d8a86b 0 14px,#cf9c5d 14px 18px)' }}
          shade="linear-gradient(90deg, rgba(0,0,0,.25), rgba(0,0,0,0) 20%, rgba(0,0,0,0) 80%, rgba(0,0,0,.25))"
        >
          {children}
        </Surface>
      </div>
    ),
  },
];

/* ---------------- layout helpers ---------------- */
let uid = 0;
const nextId = () => `p${++uid}`;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

function baseLayout(obj: ObjectDef, stickers: string[]): Placement[] {
  return obj.base.map((b, i) => ({ ...b, id: nextId(), src: stickers[i % stickers.length] }));
}

function bombLayout(obj: ObjectDef, stickers: string[], n: number): Placement[] {
  const out: Placement[] = [];
  for (let i = 0; i < n; i++) {
    const w = rand(obj.size[0], obj.size[1]) * 0.8;
    out.push({ id: nextId(), src: stickers[Math.floor(Math.random() * stickers.length)], w, x: rand(14, 86), y: rand(12, 88), r: rand(-28, 28) });
  }
  return out;
}

/* ---------------- one object on stage ---------------- */
const StickerLayer: React.FC<{
  items: Placement[];
  surfaceRef: React.RefObject<HTMLDivElement | null>;
  interactive: boolean;
  peeling: boolean;
  onMove?: (id: string) => void;
}> = ({ items, surfaceRef, interactive, peeling, onMove }) => (
  <AnimatePresence>
    {!peeling &&
      items.map((p, i) => (
        <motion.img
          key={p.id}
          src={p.src}
          alt=""
          draggable={false}
          drag={interactive}
          dragConstraints={surfaceRef}
          dragElastic={0.15}
          dragMomentum={false}
          onPointerDown={() => interactive && onMove?.(p.id)}
          whileHover={interactive ? { scale: 1.08, zIndex: 50 } : undefined}
          whileDrag={{ scale: 1.15, rotate: p.r + 6, zIndex: 60, filter: 'drop-shadow(0 18px 18px rgba(0,0,0,.45))' }}
          initial={{ opacity: 0, scale: 2.6, rotate: p.r + 40, y: -60 }}
          animate={{ opacity: 1, scale: 1, rotate: p.r, y: 0 }}
          exit={{ opacity: 0, scale: 1.3, rotate: p.r + rand(-120, 120), x: rand(-400, 400), y: rand(-500, -200), transition: { duration: 0.7, ease } }}
          transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.08 * i }}
          className={`absolute select-none ${interactive ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'}`}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.w}%`,
            translate: '-50% -50%',
            filter: 'drop-shadow(0 6px 6px rgba(0,0,0,.35))',
          }}
        />
      ))}
  </AnimatePresence>
);

const ObjectStage: React.FC<{
  obj: ObjectDef;
  items: Placement[];
  interactive?: boolean;
  peeling?: boolean;
  onMove?: (id: string) => void;
}> = ({ obj, items, interactive = false, peeling = false, onMove }) => {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const { Frame } = obj;
  return (
    <div className="relative w-full" style={{ aspectRatio: String(obj.aspect) }}>
      <Frame surfaceRef={surfaceRef}>
        <StickerLayer items={items} surfaceRef={surfaceRef} interactive={interactive} peeling={peeling} onMove={onMove} />
      </Frame>
    </div>
  );
};

/* ---------------- the room ---------------- */
export const StickerMockups: React.FC<{ stickers: string[]; name?: string; isSample?: boolean; initialFocus?: string | null; onClose: () => void }> = ({
  stickers,
  initialFocus = null,
  name,
  isSample,
  onClose,
}) => {
  const srcs = stickers.length ? stickers : SAMPLE_STICKERS;
  const [layouts, setLayouts] = useState<Record<string, Placement[]>>(() =>
    Object.fromEntries(OBJECTS.map((o) => [o.id, baseLayout(o, shuffle(srcs))])),
  );
  const [focus, setFocus] = useState<string | null>(initialFocus);
  const [peeling, setPeeling] = useState(false);
  const focused = useMemo(() => OBJECTS.find((o) => o.id === focus) ?? null, [focus]);

  // Showroom autopilot: every few seconds one object gets re-slapped, so the wall never sits still.
  useEffect(() => {
    if (focus) return;
    const t = setInterval(() => {
      const o = OBJECTS[Math.floor(Math.random() * OBJECTS.length)];
      setLayouts((L) => ({ ...L, [o.id]: Math.random() < 0.35 ? bombLayout(o, srcs, 4 + Math.floor(Math.random() * 3)) : baseLayout(o, shuffle(srcs)) }));
    }, 2600);
    return () => clearInterval(t);
  }, [focus, srcs]);

  const slap = useCallback(
    (id: string, mode: 'shuffle' | 'bomb') => {
      const o = OBJECTS.find((x) => x.id === id)!;
      setLayouts((L) => ({ ...L, [id]: mode === 'bomb' ? bombLayout(o, srcs, 9 + Math.floor(Math.random() * 5)) : baseLayout(o, shuffle(srcs)) }));
      sfx('pop');
      if (mode === 'bomb') {
        confetti({ particleCount: 140, spread: 100, startVelocity: 45, origin: { y: 0.6 }, colors: ['#ff2e88', '#7b2ff7', GOLD, '#00b8a9', '#ffffff'] });
      }
    },
    [srcs],
  );

  const peel = (id: string) => {
    setPeeling(true);
    sfx('tick');
    setTimeout(() => {
      setPeeling(false);
      slap(id, 'shuffle');
    }, 900);
  };

  // Bring the grabbed sticker to the top of the pile.
  const raise = (objId: string, pid: string) =>
    setLayouts((L) => {
      const arr = L[objId];
      const idx = arr.findIndex((p) => p.id === pid);
      if (idx < 0 || idx === arr.length - 1) return L;
      return { ...L, [objId]: [...arr.slice(0, idx), ...arr.slice(idx + 1), arr[idx]] };
    });

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') (focus ? setFocus(null) : onClose());
      if (focus && e.key.toLowerCase() === 'b') slap(focus, 'bomb');
      if (focus && e.key.toLowerCase() === 's') slap(focus, 'shuffle');
      if (focus && e.key === 'ArrowRight') setFocus(OBJECTS[(OBJECTS.findIndex((o) => o.id === focus) + 1) % OBJECTS.length].id);
      if (focus && e.key === 'ArrowLeft') setFocus(OBJECTS[(OBJECTS.findIndex((o) => o.id === focus) - 1 + OBJECTS.length) % OBJECTS.length].id);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [focus, onClose, slap]);

  const who = name?.trim();
  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-auto bg-[#0a0420]/[0.97] backdrop-blur-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* drifting colour blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {['#ff2e88', '#7b2ff7', '#00b8a9', GOLD].map((c, i) => (
          <motion.div
            key={c}
            className="absolute w-[45vw] h-[45vw] rounded-full blur-[90px] opacity-30"
            style={{ background: c, left: `${[5, 55, 10, 60][i]}%`, top: `${[0, 10, 55, 60][i]}%` }}
            animate={{ x: [0, 60, -40, 0], y: [0, -40, 50, 0] }}
            transition={{ duration: 14 + i * 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>

      <div className="relative max-w-[1700px] mx-auto px-[4vw] pt-6 pb-16">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em]" style={{ color: GOLD }}>
              <Sparkles className="w-4 h-4" /> Sticker room {isSample && <span className="text-white/50 normal-case tracking-normal">· sample stickers</span>}
            </div>
            <h1 className="mt-2 font-display font-bold text-white leading-[1.02] text-[clamp(32px,4.6vw,76px)]">
              {focused ? (
                <>
                  {who ? `${who} on a ` : 'On a '}
                  <span style={{ color: GOLD }}>{focused.label.toLowerCase()}</span>
                </>
              ) : (
                <>
                  Stick {who ? `${who}` : 'it'} <span style={{ color: GOLD }}>everywhere.</span>
                </>
              )}
            </h1>
            <p className="text-white/55 mt-2 text-sm md:text-base">
              {focused ? 'Drag stickers around, sticker-bomb it, or peel them off and slap them back.' : 'Tap any object to play with it. Every sticker here was drawn by AI from one photo.'}
            </p>
          </div>
          <button onClick={onClose} className="p-3 rounded-2xl glass text-white cursor-pointer shrink-0" title="Close (Esc)">
            <X className="w-5 h-5" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {!focused ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ ease, duration: 0.5 }}
              className="mt-8 grid gap-5 grid-cols-2 md:grid-cols-4"
            >
              {OBJECTS.map((o, i) => (
                <motion.button
                  key={o.id}
                  onClick={() => setFocus(o.id)}
                  initial={{ opacity: 0, y: 40, rotate: i % 2 ? 3 : -3 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }}
                  transition={{ delay: 0.06 * i, ease, duration: 0.6 }}
                  whileHover={{ y: -8, rotate: i % 2 ? 1.5 : -1.5 }}
                  className={`group relative rounded-[1.6rem] p-4 text-left cursor-pointer overflow-hidden ${i === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}
                  style={{ background: o.bg }}
                >
                  <div className={`mx-auto ${i === 0 ? 'max-w-[92%]' : 'max-w-[78%]'}`}>
                    <ObjectStage obj={o} items={layouts[o.id]} />
                  </div>
                  <div className="mt-2 flex items-end justify-between">
                    <div>
                      <div className="font-display font-bold text-[#140a2e] text-lg leading-tight">{o.label}</div>
                      <div className="text-[#140a2e]/60 text-xs">{o.tagline}</div>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/80 text-[#140a2e] opacity-0 group-hover:opacity-100 transition">Play</span>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key={focused.id}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ ease, duration: 0.45 }}
              className="mt-6 grid lg:grid-cols-[1fr_300px] gap-6 items-start"
            >
              <div className="rounded-[2rem] p-[3vw] grid place-items-center" style={{ background: focused.bg }}>
                <div className="w-full" style={{ maxWidth: `min(100%, ${Math.round(focused.aspect * 70)}vh)` }}>
                  <ObjectStage obj={focused} items={layouts[focused.id]} interactive peeling={peeling} onMove={(pid) => raise(focused.id, pid)} />
                </div>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => slap(focused.id, 'bomb')}
                  className="shimmer-btn w-full rounded-2xl px-6 py-4 font-extrabold text-white text-lg flex items-center justify-center gap-2 cursor-pointer"
                  style={{ background: 'linear-gradient(135deg,#ff2e88,#7b2ff7)' }}
                >
                  <Bomb className="w-5 h-5" /> Sticker bomb! <kbd className="text-[10px] opacity-70 border border-current rounded px-1">B</kbd>
                </button>
                <button onClick={() => slap(focused.id, 'shuffle')} className="w-full rounded-2xl px-6 py-3.5 font-semibold text-white glass flex items-center justify-center gap-2 cursor-pointer">
                  <Shuffle className="w-5 h-5" /> Re-slap <kbd className="text-[10px] opacity-60 border border-current rounded px-1">S</kbd>
                </button>
                <button onClick={() => peel(focused.id)} className="w-full rounded-2xl px-6 py-3.5 font-semibold text-white glass flex items-center justify-center gap-2 cursor-pointer">
                  <Wind className="w-5 h-5" /> Peel them all off
                </button>
                <button onClick={() => setFocus(null)} className="w-full rounded-2xl px-6 py-3.5 font-semibold text-white/80 border border-white/15 flex items-center justify-center gap-2 cursor-pointer">
                  <ArrowLeft className="w-5 h-5" /> All objects <kbd className="text-[10px] opacity-60 border border-current rounded px-1">Esc</kbd>
                </button>
                <div className="grid grid-cols-4 gap-2 pt-2">
                  {OBJECTS.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => setFocus(o.id)}
                      className={`rounded-xl px-1 py-2 text-[11px] font-bold cursor-pointer transition ${o.id === focused.id ? 'text-[#140a2e]' : 'text-white/70 border border-white/15 hover:border-white/40'}`}
                      style={o.id === focused.id ? { background: GOLD } : undefined}
                    >
                      {o.label.split(' ')[0]}
                    </button>
                  ))}
                </div>
                <p className="text-white/40 text-xs pt-1">Tip: ← → to switch objects. Drag any sticker to move it.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

/* ---------------- inline strip: every object in ONE frame ---------------- */
export const StickerRoomStrip: React.FC<{ stickers: string[]; onOpen: (id: string) => void }> = ({ stickers, onOpen }) => {
  const srcs = stickers.length ? stickers : SAMPLE_STICKERS;
  const [layouts, setLayouts] = useState<Record<string, Placement[]>>(() =>
    Object.fromEntries(OBJECTS.map((o) => [o.id, baseLayout(o, shuffle(srcs))])),
  );
  // A fresh object gets re-slapped every couple of seconds so the wall keeps moving.
  useEffect(() => {
    const t = setInterval(() => {
      const o = OBJECTS[Math.floor(Math.random() * OBJECTS.length)];
      setLayouts((L) => ({ ...L, [o.id]: Math.random() < 0.3 ? bombLayout(o, srcs, 4 + Math.floor(Math.random() * 3)) : baseLayout(o, shuffle(srcs)) }));
    }, 2200);
    return () => clearInterval(t);
  }, [srcs]);

  // Height is the smaller of 36% of the screen and whatever lets all 7 objects fit one row.
  const total = OBJECTS.reduce((n, o) => n + o.aspect, 0);
  const h = `min(36vh, calc((88vw - ${OBJECTS.length * 1.1}rem) / ${total.toFixed(2)}))`;
  return (
    <div className="flex items-end justify-center gap-[1.1rem]">
      {OBJECTS.map((o, i) => (
        <motion.button
          key={o.id}
          onClick={() => onOpen(o.id)}
          title={`${o.label}: tap to play`}
          initial={{ opacity: 0, y: 70, scale: 0.8, rotate: i % 2 ? 4 : -4 }}
          animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
          transition={{ delay: 0.12 * i, type: 'spring', stiffness: 150, damping: 16 }}
          whileHover={{ y: -10, scale: 1.04 }}
          className="group relative rounded-[1.1rem] overflow-hidden cursor-pointer shrink-0"
          style={{ background: o.bg, height: h, aspectRatio: String(o.aspect) }}
        >
          <ObjectStage obj={o} items={layouts[o.id]} />
          <span className="absolute left-0 right-0 bottom-0 px-2 py-1 text-[11px] font-bold text-[#140a2e]/80 text-center bg-gradient-to-t from-white/60 to-transparent opacity-0 group-hover:opacity-100 transition">{o.label}</span>
        </motion.button>
      ))}
    </div>
  );
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default StickerMockups;
