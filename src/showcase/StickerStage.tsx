import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Camera,
  Download,
  History,
  Home,
  Maximize2,
  Printer,
  RefreshCw,
  Send,
  Sparkles,
  Upload,
  UserPlus,
  X,
} from 'lucide-react';
import { captureVideoFrameAsSquare, processUploadedImageAsSquare } from '../utils/image';
import {
  A4,
  STICKER_USE_CASES,
  downloadDataUrl,
  packStickers,
  renderPackPageToPng,
  svgToDieCutPng,
  type PlacedSticker,
} from '../utils/stickerPack';
import { BrandMark, Eyebrow, GOLD, SAFFRON, TiltCard, Words, ease, sfx, toggleFullscreen, useHealth } from './ui';

const STYLES = [
  { id: 'Cute caricature', hint: 'Big head, bigger smile' },
  { id: 'Chibi cartoon', hint: 'Tiny body, huge eyes' },
  { id: '3D anime', hint: 'Glossy, cinematic' },
  { id: 'Kawaii pastel', hint: 'Soft, sparkly, sweet' },
  { id: 'Retro style', hint: '70s warmth' },
  { id: 'Comic pop', hint: 'Bold ink, pop-art' },
  { id: 'Flat vector', hint: 'Clean & modern' },
  { id: 'Retro badge', hint: 'Saturday-morning toon' },
] as const;

const VIBES = [
  'Campus life at DY Patil',
  'Future AI leader',
  'Tech / coder life',
  'Coffee & study vibes',
  'Startup founder energy',
  'Fun everyday laptop & phone stickers',
];

interface Idea {
  title: string;
  caption: string;
  pose_and_scene: string;
}
type SlotStatus = 'queued' | 'drawing' | 'done' | 'error';
interface Slot {
  idea: Idea;
  status: SlotStatus;
  svg?: string;
  png?: string;
  error?: string;
  startedAt?: number;
  ms?: number;
}
type Character = Record<string, string>;
type Phase = 'setup' | 'camera' | 'scan' | 'reveal';

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

async function thumbnail(png: string, size = 360): Promise<string> {
  const img = new Image();
  img.src = png;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = c.height = size;
  c.getContext('2d')!.drawImage(img, 0, 0, size, size);
  return c.toDataURL('image/webp', 0.85);
}

function burstAt(el: Element | null, big = false) {
  const r = el?.getBoundingClientRect();
  const origin = r
    ? { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight }
    : { x: 0.5, y: 0.6 };
  void confetti({
    particleCount: big ? 220 : 45,
    spread: big ? 120 : 70,
    startVelocity: big ? 55 : 28,
    scalar: big ? 1.1 : 0.8,
    origin,
    colors: [GOLD, SAFFRON, '#ffffff', '#8fa5d6', '#ffe29a'],
    zIndex: 60,
  });
}

const Elapsed: React.FC<{ since: number }> = ({ since }) => {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((x) => x + 1), 100);
    return () => clearInterval(id);
  }, []);
  return <>{((Date.now() - since) / 1000).toFixed(1)}s</>;
};

/* ======================= SETUP ======================= */
const Setup: React.FC<{
  name: string;
  setName: (v: string) => void;
  style: string;
  setStyle: (v: string) => void;
  vibe: string;
  setVibe: (v: string) => void;
  count: number;
  setCount: (n: number) => void;
  consent: boolean;
  setConsent: (b: boolean) => void;
  wallOptIn: boolean;
  setWallOptIn: (b: boolean) => void;
  onGo: () => void;
  onBackup: () => void;
  backupCount: number;
  claudeOk: boolean | null;
}> = (p) => (
  <div className="min-h-screen flex flex-col justify-center px-[6vw] pt-24 pb-16 max-w-[1500px] mx-auto">
    <Eyebrow>Experience 02 · AI Sticker Studio · Claude</Eyebrow>
    <h1 className="mt-4 font-display font-bold text-white leading-[1.02] text-[clamp(44px,7vw,120px)]">
      <Words text="Smile once." delay={0.15} />
      <br />
      <Words text="Leave with a sticker pack." delay={0.5} gold={['sticker', 'pack']} />
    </h1>
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2 }}
      className="mt-5 text-white/60 text-[clamp(15px,1.5vw,24px)] max-w-[60ch]"
    >
      Claude looks at your photo, invents sticker ideas about you, and hand-draws every single one as vector art, live, in about 30 seconds.
    </motion.p>

    {p.claudeOk === false && (
      <div className="mt-6 flex items-center gap-2 text-amber-200 bg-amber-500/10 border border-amber-400/30 rounded-2xl px-4 py-3 max-w-2xl">
        <AlertTriangle className="w-5 h-5 shrink-0" /> Claude isn't connected (no ANTHROPIC_API_KEY on the server). Use the backup pack to demo.
      </div>
    )}

    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.4, duration: 0.9, ease }}
      className="mt-9 glass rounded-[2rem] p-6 sm:p-8 space-y-6"
    >
      <div className="grid lg:grid-cols-[1fr_1.6fr] gap-6">
        <label className="block text-white/60 text-xs font-bold tracking-widest uppercase">
          First name
          <input
            value={p.name}
            onChange={(e) => p.setName(e.target.value)}
            maxLength={30}
            placeholder="e.g. Priya"
            className="mt-2 w-full rounded-2xl bg-white/10 border border-white/20 px-5 py-4 text-white text-xl font-normal tracking-normal normal-case placeholder-white/30 outline-none focus:border-[#F2B33D] focus:bg-white/15 transition"
          />
        </label>
        <div>
          <p className="text-white/60 text-xs font-bold tracking-widest uppercase">Pack theme</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {VIBES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => p.setVibe(v)}
                className={`rounded-full px-4 py-2.5 text-sm font-semibold border transition cursor-pointer ${
                  p.vibe === v ? 'bg-[#F2B33D] text-[#0b1f4b] border-[#F2B33D]' : 'text-white border-white/25 hover:border-[#F2B33D]'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <p className="text-white/60 text-xs font-bold tracking-widest uppercase">Art style</p>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {STYLES.map((s, i) => (
            <motion.button
              key={s.id}
              type="button"
              onClick={() => p.setStyle(s.id)}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6 + i * 0.04 }}
              whileHover={{ y: -3 }}
              className={`text-left rounded-2xl px-4 py-3 border transition cursor-pointer ${
                p.style === s.id ? 'border-[#F2B33D] bg-[#F2B33D]/15 glow-gold' : 'border-white/15 hover:border-white/40 bg-white/5'
              }`}
            >
              <span className="block font-bold text-white">{s.id}</span>
              <span className="block text-xs text-white/50">{s.hint}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-2 border-t border-white/10">
        <div className="flex items-center gap-2 text-white/70 text-sm">
          Stickers
          {[4, 6].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => p.setCount(n)}
              className={`w-10 h-10 rounded-xl font-bold cursor-pointer ${p.count === n ? 'bg-white text-[#0b1f4b]' : 'border border-white/25 text-white'}`}
            >
              {n}
            </button>
          ))}
        </div>
        <label className="flex items-start gap-2.5 text-sm text-white/80 cursor-pointer max-w-md">
          <input type="checkbox" checked={p.consent} onChange={(e) => p.setConsent(e.target.checked)} className="mt-1 w-4 h-4 accent-[#F2B33D]" />
          The person in the photo agrees to it being sent to Anthropic's Claude API to make their stickers.
        </label>
        <label className="flex items-start gap-2.5 text-sm text-white/80 cursor-pointer max-w-xs">
          <input type="checkbox" checked={p.wallOptIn} onChange={(e) => p.setWallOptIn(e.target.checked)} className="mt-1 w-4 h-4 accent-[#F2B33D]" />
          Show my stickers on the live wall
        </label>
        <div className="ml-auto flex items-center gap-3">
          {p.backupCount > 0 && (
            <button type="button" onClick={p.onBackup} title="Replay the last drawings (B)" className="flex items-center gap-1.5 text-white/45 hover:text-white text-sm cursor-pointer">
              <History className="w-4 h-4" /> Backup pack
            </button>
          )}
          <button
            type="button"
            disabled={!p.consent}
            onClick={p.onGo}
            className="shimmer-btn rounded-2xl px-8 py-4 text-xl font-extrabold text-[#0b1f4b] flex items-center gap-2 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed hover:scale-[1.03] transition"
            style={{ background: `linear-gradient(135deg,${GOLD},#ffd37a)` }}
          >
            <Camera className="w-6 h-6" /> Open camera
          </button>
        </div>
      </div>
    </motion.div>
  </div>
);

/* ======================= CAMERA ======================= */
const CameraView: React.FC<{ name: string; onPhoto: (url: string) => void; onBack: () => void }> = ({ name, onPhoto, onBack }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch {
        setErr('Camera unavailable here. Upload a photo instead.');
      }
    })();
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);

  const snap = useCallback(() => {
    if (!videoRef.current) return;
    sfx('shutter');
    setFlash(true);
    setTimeout(() => setFlash(false), 450);
    try {
      onPhoto(captureVideoFrameAsSquare(videoRef.current, true));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not capture.');
    }
  }, [onPhoto]);

  useEffect(() => {
    if (count === null) return;
    if (count === 0) {
      setCount(null);
      snap();
      return;
    }
    sfx('tick');
    const t = setTimeout(() => setCount((c) => (c === null ? null : c - 1)), 900);
    return () => clearTimeout(t);
  }, [count, snap]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.key === ' ' || e.key === 'Enter') && ready && count === null) {
        e.preventDefault();
        setCount(3);
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [ready, count]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 pt-16 pb-8">
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-white/55 tracking-[0.3em] uppercase text-xs mb-5">
        {name ? `${name}, look here` : 'Look here'} · big smile
      </motion.p>
      <motion.div
        initial={{ scale: 0.85, opacity: 0, rotate: -2 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ duration: 0.8, ease }}
        className="relative w-[min(66vh,88vw)] aspect-square rounded-[2.5rem] overflow-hidden glass"
      >
        <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover -scale-x-100" />
        {!ready && !err && <div className="absolute inset-0 grid place-items-center text-white/50">Starting camera…</div>}
        {err && (
          <div className="absolute inset-0 grid place-items-center text-center p-8">
            <div>
              <Camera className="w-12 h-12 mx-auto text-white/40" />
              <p className="mt-3 text-white/70">{err}</p>
            </div>
          </div>
        )}
        {/* face guide + gold corner brackets */}
        <div className="absolute inset-[18%_22%_16%] rounded-[50%] border-2 border-dashed border-white/35 pointer-events-none" />
        {['top-5 left-5 border-t-4 border-l-4 rounded-tl-2xl', 'top-5 right-5 border-t-4 border-r-4 rounded-tr-2xl', 'bottom-5 left-5 border-b-4 border-l-4 rounded-bl-2xl', 'bottom-5 right-5 border-b-4 border-r-4 rounded-br-2xl'].map((c) => (
          <motion.span
            key={c}
            className={`absolute w-14 h-14 ${c}`}
            style={{ borderColor: GOLD }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        ))}
        <AnimatePresence>
          {count !== null && count > 0 && (
            <motion.div
              key={count}
              initial={{ scale: 2.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ duration: 0.45, ease }}
              className="absolute inset-0 grid place-items-center font-display font-bold text-[clamp(120px,22vh,260px)] text-white"
              style={{ textShadow: `0 0 60px ${GOLD}` }}
            >
              {count}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <AnimatePresence>
        {flash && (
          <motion.div className="fixed inset-0 z-50 bg-white" initial={{ opacity: 1 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.45 }} />
        )}
      </AnimatePresence>

      <div className="mt-7 flex items-center gap-4">
        <button onClick={onBack} className="p-4 rounded-full glass text-white cursor-pointer" title="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          disabled={!ready || count !== null}
          onClick={() => setCount(3)}
          className="w-24 h-24 rounded-full grid place-items-center cursor-pointer disabled:opacity-40 relative"
          style={{ background: `radial-gradient(circle,#fff 52%,${GOLD} 54%,${GOLD} 62%,transparent 64%)` }}
          title="Snap (Space)"
        >
          <motion.span className="absolute inset-0 rounded-full border-2" style={{ borderColor: GOLD }} animate={{ scale: [1, 1.25], opacity: [0.8, 0] }} transition={{ duration: 1.6, repeat: Infinity }} />
          <Camera className="w-8 h-8 text-[#0b1f4b]" />
        </motion.button>
        <button onClick={() => fileRef.current?.click()} className="p-4 rounded-full glass text-white cursor-pointer" title="Upload a photo">
          <Upload className="w-5 h-5" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) onPhoto(await processUploadedImageAsSquare(f));
          }}
        />
      </div>
      <p className="mt-4 text-white/35 text-xs tracking-widest uppercase">Space to snap · 3-second timer</p>
    </div>
  );
};

/* ======================= SCAN ======================= */
const TRAIT_KEYS: [string, string][] = [
  ['hair_style', 'Hair'],
  ['glasses', 'Eyewear'],
  ['facial_hair', 'Facial hair'],
  ['top_description', 'Outfit'],
  ['accessories', 'Accessories'],
  ['expression', 'Expression'],
];

const ScanView: React.FC<{ photo: string; character: Character | null; ideas: Idea[]; error: string | null; onRetry: () => void; onBack: () => void }> = ({
  photo,
  character,
  ideas,
  error,
  onRetry,
  onBack,
}) => {
  const lines = ['Finding the face', 'Reading hair, eyewear and outfit', 'Matching real colours', 'Inventing sticker ideas about you'];
  const [n, setN] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setN((x) => Math.min(lines.length, x + 1)), 1100);
    return () => clearInterval(id);
  }, []);
  const traits = character
    ? TRAIT_KEYS.map(([k, label]) => [label, character[k]] as const).filter(([, v]) => v && !/^none\b/i.test(v))
    : [];
  return (
    <div className="min-h-screen grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-10 items-center px-[6vw] py-24 max-w-[1500px] mx-auto">
      <div className="relative w-full max-w-[560px] mx-auto aspect-square rounded-[2.5rem] overflow-hidden glass">
        <img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div
          className="absolute inset-0 opacity-30"
          style={{ backgroundImage: 'linear-gradient(rgba(242,179,61,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(242,179,61,.5) 1px,transparent 1px)', backgroundSize: '32px 32px' }}
        />
        {!character && !error && (
          <motion.div
            className="absolute inset-x-0 h-24"
            style={{ background: `linear-gradient(180deg,transparent,rgba(242,179,61,.55),transparent)`, boxShadow: `0 0 40px ${GOLD}` }}
            animate={{ top: ['-15%', '100%'] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', repeatType: 'reverse' }}
          />
        )}
        <motion.div
          className="absolute inset-[16%_20%_14%] rounded-[45%] border-2"
          style={{ borderColor: GOLD }}
          animate={character ? { opacity: 1, scale: 1 } : { opacity: [0.3, 1, 0.3], scale: [0.97, 1.02, 0.97] }}
          transition={{ duration: 1.6, repeat: character ? 0 : Infinity }}
        />
        {character && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute bottom-4 left-4 right-4 glass rounded-2xl px-4 py-2 text-sm text-white">
            <span style={{ color: GOLD }} className="font-bold">
              Locked in ✓
            </span>{' '}
            · {Object.entries(character).filter(([k]) => k.endsWith('_hex')).length} real colours sampled
          </motion.div>
        )}
      </div>

      <div>
        <Eyebrow>Claude is looking at you</Eyebrow>
        {error ? (
          <div className="mt-6 space-y-4">
            <div className="flex gap-3 text-red-200 bg-red-500/10 border border-red-400/30 rounded-2xl p-5 text-lg">
              <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" /> {error}
            </div>
            <div className="flex gap-3">
              <button onClick={onBack} className="px-5 py-3 rounded-xl glass text-white cursor-pointer">
                Retake photo
              </button>
              <button onClick={onRetry} className="px-5 py-3 rounded-xl font-bold text-[#0b1f4b] cursor-pointer" style={{ background: GOLD }}>
                Try again
              </button>
            </div>
          </div>
        ) : !character ? (
          <div className="mt-6 space-y-3">
            {lines.map((l, i) => (
              <motion.div key={l} initial={{ opacity: 0, x: -20 }} animate={i < n ? { opacity: 1, x: 0 } : {}} className="flex items-center gap-3 text-white/85 text-[clamp(16px,1.6vw,24px)]">
                <motion.span
                  className="w-3 h-3 rounded-full"
                  style={{ background: GOLD }}
                  animate={i === n - 1 ? { scale: [1, 1.6, 1], opacity: [1, 0.5, 1] } : {}}
                  transition={{ duration: 0.9, repeat: Infinity }}
                />
                {l}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="mt-5">
            <p className="text-white text-[clamp(18px,1.8vw,30px)] font-display leading-snug">"{character.summary}"</p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              {traits.map(([label, v], i) => (
                <motion.span
                  key={label}
                  initial={{ opacity: 0, scale: 0.6, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.12, type: 'spring', stiffness: 300, damping: 18 }}
                  className="glass rounded-full px-4 py-2 text-sm"
                >
                  <span className="text-white/45">{label} </span>
                  <span className="text-white font-semibold">{v}</span>
                </motion.span>
              ))}
            </div>
            <p className="mt-7 text-white/50 text-xs font-bold tracking-[0.25em] uppercase">Sticker ideas</p>
            <div className="mt-3 grid sm:grid-cols-2 gap-2.5">
              {ideas.map((idea, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.12, ease }}
                  className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3"
                >
                  <p className="font-bold text-white">{idea.title}</p>
                  {idea.caption && <p className="text-sm" style={{ color: GOLD }}>"{idea.caption}"</p>}
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ======================= STICKER CARD ======================= */
const StickerCard: React.FC<{ slot: Slot; index: number; onRedraw: () => void }> = ({ slot, index, onRedraw }) => {
  const ref = useRef<HTMLDivElement>(null);
  const prev = useRef(slot.status);
  useEffect(() => {
    if (prev.current !== 'done' && slot.status === 'done') {
      sfx('pop');
      burstAt(ref.current);
    }
    prev.current = slot.status;
  }, [slot.status]);
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 40, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: index * 0.08, ease, duration: 0.7 }}>
      <TiltCard max={12} className="rounded-[1.75rem] aspect-square">
        <AnimatePresence mode="wait" initial={false}>
          {slot.status === 'done' && slot.png ? (
            <motion.div
              key="done"
              initial={{ rotateY: -180, scale: 0.7, opacity: 0 }}
              animate={{ rotateY: 0, scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 120, damping: 14 }}
              className="absolute inset-0"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <img src={slot.png} alt={slot.idea.title} className="w-full h-full object-contain drop-shadow-[0_25px_35px_rgba(0,0,0,.45)]" />
              {slot.ms && (
                <span className="absolute -top-2 -right-2 text-[11px] font-bold px-2.5 py-1 rounded-full text-[#0b1f4b]" style={{ background: GOLD }}>
                  {(slot.ms / 1000).toFixed(1)}s
                </span>
              )}
              <button
                onClick={onRedraw}
                title="Redraw this sticker"
                className="absolute bottom-2 right-2 p-2 rounded-full glass text-white opacity-0 hover:opacity-100 focus:opacity-100 transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </motion.div>
          ) : slot.status === 'error' ? (
            <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 rounded-[1.75rem] border border-red-400/40 bg-red-500/10 grid place-items-center p-5 text-center">
              <div>
                <p className="text-red-200 text-sm">{slot.error}</p>
                <button onClick={onRedraw} className="mt-3 px-4 py-2 rounded-xl text-sm font-bold text-[#0b1f4b] cursor-pointer" style={{ background: GOLD }}>
                  Redraw
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="wait" exit={{ rotateY: 90, opacity: 0 }} transition={{ duration: 0.25 }} className="absolute inset-0 rounded-[1.75rem] overflow-hidden glass">
              <div className="holo absolute inset-0" />
              <div className="relative h-full flex flex-col items-center justify-center text-center p-5">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}>
                  <Sparkles className="w-9 h-9" style={{ color: GOLD }} />
                </motion.div>
                <p className="mt-3 font-display font-bold text-white text-lg leading-tight">{slot.idea.title}</p>
                {slot.idea.caption && <p className="text-sm text-white/60">"{slot.idea.caption}"</p>}
                <p className="mt-3 text-xs tracking-widest uppercase text-white/50">
                  {slot.status === 'drawing' && slot.startedAt ? (
                    <>
                      Claude is drawing · <span className="tabular-nums" style={{ color: GOLD }}><Elapsed since={slot.startedAt} /></span>
                    </>
                  ) : (
                    'Queued'
                  )}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </TiltCard>
    </motion.div>
  );
};

/* ======================= PRINT ======================= */
const PackSheet: React.FC<{ page: PlacedSticker[]; exact?: boolean }> = ({ page, exact }) => (
  <div
    className="relative bg-white overflow-hidden"
    style={exact ? { width: '210mm', height: '297mm', breakAfter: 'page' } : { width: '100%', aspectRatio: `${A4.w} / ${A4.h}` }}
  >
    {page.map((p, i) => (
      <img
        key={i}
        src={p.src}
        alt=""
        className="absolute"
        style={{
          left: `${(p.xMm / A4.w) * 100}%`,
          top: `${(p.yMm / A4.h) * 100}%`,
          width: `${(p.sizeMm / A4.w) * 100}%`,
          height: `${(p.sizeMm / A4.h) * 100}%`,
          objectFit: 'contain',
        }}
      />
    ))}
  </div>
);

const PrintPanel: React.FC<{ stickers: string[]; name: string; onClose: () => void }> = ({ stickers, name, onClose }) => {
  const [useCaseId, setUseCaseId] = useState('mixed');
  const [copies, setCopies] = useState(1);
  const [printing, setPrinting] = useState<PlacedSticker[][] | null>(null);
  const useCase = STICKER_USE_CASES.find((u) => u.id === useCaseId) ?? STICKER_USE_CASES[0];
  const pages = useMemo(() => packStickers(stickers, useCase, copies), [stickers, useCase, copies]);

  const print = () => {
    setPrinting(pages);
    document.body.classList.add('print-stickers');
    const done = () => {
      document.body.classList.remove('print-stickers');
      setPrinting(null);
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    setTimeout(() => window.print(), 120);
  };
  const download = async () => {
    const safe = (name.trim() || 'dypai').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    for (let i = 0; i < pages.length; i++) downloadDataUrl(await renderPackPageToPng(pages[i]), `${safe}-stickers-page${i + 1}.png`);
  };

  return (
    <motion.div className="fixed inset-0 z-50 bg-[#030817]/80 backdrop-blur-md grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        initial={{ y: 60, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 60, scale: 0.95 }}
        transition={{ ease, duration: 0.5 }}
        onClick={(e) => e.stopPropagation()}
        className="glass rounded-[2rem] p-6 w-full max-w-5xl max-h-[92vh] overflow-auto grid md:grid-cols-[1fr_340px] gap-6"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-white text-3xl">Print your pack</h2>
            <button onClick={onClose} className="p-2 rounded-lg glass text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {STICKER_USE_CASES.map((u) => (
              <button
                key={u.id}
                onClick={() => setUseCaseId(u.id)}
                className={`text-left rounded-2xl px-4 py-3 border cursor-pointer transition ${useCaseId === u.id ? 'border-[#F2B33D] bg-[#F2B33D]/15' : 'border-white/15 hover:border-white/40'}`}
              >
                <span className="block font-bold text-white">{u.label}</span>
                <span className="block text-xs text-white/50">{u.hint}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-white/70 text-sm">
            Copies of each
            {[1, 2, 3].map((n) => (
              <button key={n} onClick={() => setCopies(n)} className={`w-9 h-9 rounded-lg font-bold cursor-pointer ${copies === n ? 'bg-white text-[#0b1f4b]' : 'border border-white/25 text-white'}`}>
                {n}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <button onClick={print} className="shimmer-btn rounded-2xl px-6 py-3.5 font-extrabold text-[#0b1f4b] flex items-center gap-2 cursor-pointer" style={{ background: `linear-gradient(135deg,${GOLD},#ffd37a)` }}>
              <Printer className="w-5 h-5" /> Print {pages.length > 1 ? `${pages.length} pages` : 'A4 sheet'}
            </button>
            <button onClick={() => void download()} className="rounded-2xl px-5 py-3.5 font-semibold text-white glass flex items-center gap-2 cursor-pointer">
              <Download className="w-5 h-5" /> 300 dpi PNG
            </button>
          </div>
          <p className="text-white/45 text-xs">A4 sticker / vinyl paper · scale 100% (Actual size) · margins None.</p>
        </div>
        <div className="space-y-3">
          {pages.map((pg, i) => (
            <motion.div key={`${useCaseId}-${copies}-${i}`} initial={{ opacity: 0, rotate: -3, y: 20 }} animate={{ opacity: 1, rotate: 0, y: 0 }} transition={{ delay: i * 0.1, ease }} className="rounded-lg overflow-hidden shadow-2xl">
              <PackSheet page={pg} />
            </motion.div>
          ))}
        </div>
      </motion.div>
      {printing &&
        createPortal(
          <div className="sticker-print-root">
            {printing.map((pg, i) => (
              <PackSheet key={i} page={pg} exact />
            ))}
          </div>,
          document.body,
        )}
    </motion.div>
  );
};

/* ======================= STAGE ======================= */
export default function StickerStage({ onHome, onInsights }: { onHome: () => void; onInsights: () => void }) {
  const health = useHealth();
  const [phase, setPhase] = useState<Phase>('setup');
  const [name, setName] = useState('');
  const [style, setStyle] = useState<string>('Cute caricature');
  const [vibe, setVibe] = useState(VIBES[0]);
  const [count, setCount] = useState(6);
  const [consent, setConsent] = useState(false);
  const [wallOptIn, setWallOptIn] = useState(true);
  const [photo, setPhoto] = useState<string | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showPrint, setShowPrint] = useState(false);
  const [posted, setPosted] = useState(false);
  const [isBackup, setIsBackup] = useState(false);
  const runId = useRef(0);
  const celebrated = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const updateSlot = (i: number, patch: Partial<Slot>) => setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const drawOne = useCallback(
    async (run: number, i: number, idea: Idea, char: Character, img: string | null) => {
      const startedAt = Date.now();
      updateSlot(i, { status: 'drawing', startedAt, error: undefined });
      try {
        const { svg } = await postJson<{ svg: string; ms: number }>('/api/stickers/draw', { imageDataUrl: img, character: char, idea, style });
        const png = await svgToDieCutPng(svg, 1200, '#DYPAICoE', idea.caption);
        if (run === runId.current) updateSlot(i, { status: 'done', svg, png, ms: Date.now() - startedAt });
      } catch (e) {
        if (run === runId.current) updateSlot(i, { status: 'error', error: e instanceof Error ? e.message : 'Drawing failed' });
      }
    },
    [style],
  );

  const generate = useCallback(
    async (img: string) => {
      const run = ++runId.current;
      celebrated.current = false;
      setPosted(false);
      setIsBackup(false);
      setError(null);
      setCharacter(null);
      setIdeas([]);
      setSlots([]);
      setPhase('scan');
      try {
        const minShow = new Promise((r) => setTimeout(r, 2600));
        const [res] = await Promise.all([postJson<{ character: Character; ideas: Idea[] }>('/api/stickers/analyze', { imageDataUrl: img, count, vibe, name, style }), minShow]);
        if (run !== runId.current) return;
        setCharacter(res.character);
        setIdeas(res.ideas);
        setSlots(res.ideas.map((idea) => ({ idea, status: 'queued' })));
        // Start drawing immediately; give the audience a beat to read the ideas, then cut to the reveal.
        res.ideas.forEach((idea, i) => void drawOne(run, i, idea, res.character, img));
        await new Promise((r) => setTimeout(r, 3800));
        if (run === runId.current) setPhase('reveal');
      } catch (e) {
        if (run === runId.current) setError(e instanceof Error ? e.message : 'Something went wrong.');
      }
    },
    [count, vibe, name, style, drawOne],
  );

  const playBackup = useCallback(async () => {
    const run = ++runId.current;
    celebrated.current = false;
    setPosted(false);
    setIsBackup(true);
    setError(null);
    const { draws } = await fetch('/api/stickers/backup').then((r) => r.json() as Promise<{ draws: { svg: string; idea: Idea; character: Character }[] }>);
    if (!draws.length) return;
    const pick = draws.slice(0, count);
    setPhoto(null);
    setCharacter(pick[0].character);
    setIdeas(pick.map((d) => d.idea));
    setSlots(pick.map((d) => ({ idea: d.idea, status: 'queued' })));
    setPhase('reveal');
    pick.forEach((d, i) => {
      const delay = 1200 + i * 900 + Math.random() * 500;
      setTimeout(() => run === runId.current && updateSlot(i, { status: 'drawing', startedAt: Date.now() }), 300 + i * 150);
      setTimeout(async () => {
        const png = await svgToDieCutPng(d.svg, 1200, '#DYPAICoE', d.idea.caption);
        if (run === runId.current) updateSlot(i, { status: 'done', svg: d.svg, png });
      }, delay);
    });
  }, [count]);

  const done = slots.filter((s) => s.status === 'done' && s.png);
  const allDone = slots.length > 0 && slots.every((s) => s.status === 'done' || s.status === 'error');

  // Grand finale once every sticker has landed.
  useEffect(() => {
    if (phase === 'reveal' && allDone && done.length && !celebrated.current) {
      celebrated.current = true;
      setTimeout(() => {
        sfx('chime');
        burstAt(null, true);
        setTimeout(() => burstAt(null, true), 350);
      }, 400);
    }
  }, [phase, allDone, done.length]);

  const postToWall = useCallback(async () => {
    if (posted || isBackup) return;
    setPosted(true);
    for (const s of done) {
      try {
        await postJson('/api/wall', { img: await thumbnail(s.png!), caption: s.idea.caption, name, style });
      } catch {
        /* wall is best-effort */
      }
    }
  }, [done, name, style, posted, isBackup]);

  useEffect(() => {
    if (allDone && wallOptIn && done.length && !posted && !isBackup) void postToWall();
  }, [allDone, wallOptIn, done.length, posted, isBackup, postToWall]);

  const nextPerson = () => {
    runId.current++;
    setPhoto(null);
    setCharacter(null);
    setIdeas([]);
    setSlots([]);
    setName('');
    setConsent(false);
    setError(null);
    setShowPrint(false);
    setPhase('setup');
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (e.key.toLowerCase() === 'b' && phase === 'setup' && (health?.backupStickers ?? 0) > 0) void playBackup();
      if (e.key.toLowerCase() === 'p' && phase === 'reveal' && done.length) setShowPrint(true);
      if (e.key.toLowerCase() === 'n' && phase === 'reveal') nextPerson();
      if (e.key === 'Escape') setShowPrint(false);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const totalSecs = useMemo(() => {
    const ms = done.map((s) => s.ms ?? 0).filter(Boolean);
    return ms.length ? Math.max(...ms) / 1000 : 0;
  }, [done]);

  return (
    <div className="relative min-h-screen">
      {/* top bar */}
      <div className="fixed top-0 inset-x-0 z-30 flex items-center justify-between px-5 py-3">
        <button onClick={onHome} className="flex items-center gap-2.5 cursor-pointer" title="Showcase home (H)">
          <BrandMark size={36} />
          <span className="font-display font-bold hidden sm:block">
            AI Sticker <span style={{ color: GOLD }}>Studio</span>
          </span>
          {isBackup && <span className="text-[11px] px-2 py-0.5 rounded-full border border-white/30 text-white/60">replay</span>}
        </button>
        <div className="flex gap-1.5">
          {(['setup', 'camera', 'scan', 'reveal'] as Phase[]).map((ph, i) => (
            <span
              key={ph}
              className="h-1.5 rounded-full transition-all duration-500"
              style={{ width: ph === phase ? 30 : 10, background: i <= ['setup', 'camera', 'scan', 'reveal'].indexOf(phase) ? GOLD : 'rgba(255,255,255,.25)' }}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button title="Live wall (2)" onClick={onInsights} className="p-2 rounded-lg glass cursor-pointer">
            <BarChart3 className="w-4 h-4" />
          </button>
          <button title="Fullscreen (F)" onClick={toggleFullscreen} className="p-2 rounded-lg glass cursor-pointer">
            <Maximize2 className="w-4 h-4" />
          </button>
          <button title="Home (H)" onClick={onHome} className="p-2 rounded-lg glass cursor-pointer">
            <Home className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Keyed slide-in only (no exit wait) so fast presenter keys can never freeze a phase change. */}
      <motion.div
          key={phase}
          initial={{ opacity: 0, x: 80, filter: 'blur(14px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.55, ease }}
        >
          {phase === 'setup' && (
            <Setup
              {...{ name, setName, style, setStyle, vibe, setVibe, count, setCount, consent, setConsent, wallOptIn, setWallOptIn }}
              onGo={() => setPhase('camera')}
              onBackup={() => void playBackup()}
              backupCount={health?.backupStickers ?? 0}
              claudeOk={health ? health.claude : null}
            />
          )}
          {phase === 'camera' && (
            <CameraView
              name={name}
              onBack={() => setPhase('setup')}
              onPhoto={(url) => {
                setPhoto(url);
                setTimeout(() => void generate(url), 500);
              }}
            />
          )}
          {phase === 'scan' && photo && (
            <ScanView photo={photo} character={character} ideas={ideas} error={error} onRetry={() => void generate(photo)} onBack={() => setPhase('camera')} />
          )}
          {phase === 'reveal' && (
            <div className="min-h-screen px-[5vw] pt-20 pb-28 max-w-[1800px] mx-auto">
              <div className="flex flex-wrap items-end justify-between gap-6">
                <div>
                  <Eyebrow>{allDone ? 'Your pack is ready' : `Claude is drawing ${slots.length} stickers in parallel`}</Eyebrow>
                  <h1 className="mt-3 font-display font-bold text-white leading-[1.05] text-[clamp(36px,5vw,84px)]">
                    {allDone ? (
                      <Words text={`${name.trim() || 'You'}, meet your sticker pack.`} gold={['sticker', 'pack.']} />
                    ) : (
                      <Words text="Hand-drawn by AI, right now." gold={['right', 'now.']} />
                    )}
                  </h1>
                </div>
                <div className="flex items-center gap-4">
                  {photo && <img src={photo} alt="" className="w-20 h-20 rounded-2xl object-cover border-2" style={{ borderColor: GOLD }} />}
                  <div className="text-right">
                    <div className="font-display font-bold text-5xl text-white tabular-nums">
                      {done.length}
                      <span className="text-white/35">/{slots.length}</span>
                    </div>
                    <div className="text-white/50 text-xs uppercase tracking-widest">
                      {allDone && totalSecs ? `whole pack in ${totalSecs.toFixed(1)}s` : 'stickers drawn'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg,${GOLD},${SAFFRON})` }} animate={{ width: `${(done.length / Math.max(1, slots.length)) * 100}%` }} transition={{ ease, duration: 0.8 }} />
              </div>

              <div
                ref={gridRef}
                className="mt-8 grid gap-6 justify-center"
                style={{
                  // Size stickers off the screen height so they fill a projector without scrolling.
                  gridTemplateColumns: `repeat(${slots.length > 4 ? 3 : Math.max(1, slots.length)}, minmax(0, ${slots.length > 4 ? 30 : 42}vh))`,
                }}
              >
                {slots.map((slot, i) => (
                  <StickerCard
                    key={i}
                    slot={slot}
                    index={i}
                    onRedraw={() => character && void drawOne(runId.current, i, slot.idea, character, photo)}
                  />
                ))}
              </div>
            </div>
          )}
      </motion.div>

      {phase === 'reveal' && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.6, ease, duration: 0.7 }}
          className="fixed bottom-0 inset-x-0 z-30 flex flex-wrap items-center justify-center gap-3 pb-5 pt-10 bg-gradient-to-t from-[#050d26] via-[#050d26]/85 to-transparent"
        >
          <button
            disabled={!done.length}
            onClick={() => setShowPrint(true)}
            className="shimmer-btn rounded-2xl px-7 py-3.5 font-extrabold text-[#0b1f4b] flex items-center gap-2 cursor-pointer disabled:opacity-40"
            style={{ background: `linear-gradient(135deg,${GOLD},#ffd37a)` }}
          >
            <Printer className="w-5 h-5" /> Print stickers <kbd className="text-[10px] opacity-60 border border-current rounded px-1">P</kbd>
          </button>
          {!isBackup && (
            <button
              disabled={!allDone || posted}
              onClick={() => void postToWall()}
              className="rounded-2xl px-5 py-3.5 font-semibold text-white glass flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-5 h-5" /> {posted ? 'On the live wall ✓' : 'Send to live wall'}
            </button>
          )}
          <button onClick={onInsights} className="rounded-2xl px-5 py-3.5 font-semibold text-white glass flex items-center gap-2 cursor-pointer">
            <BarChart3 className="w-5 h-5" /> Insights <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={nextPerson} className="rounded-2xl px-5 py-3.5 font-semibold text-white glass flex items-center gap-2 cursor-pointer">
            <UserPlus className="w-5 h-5" /> Next person <kbd className="text-[10px] opacity-60 border border-current rounded px-1">N</kbd>
          </button>
        </motion.div>
      )}

      <AnimatePresence>{showPrint && <PrintPanel stickers={done.map((s) => s.png!)} name={name} onClose={() => setShowPrint(false)} />}</AnimatePresence>
    </div>
  );
}
