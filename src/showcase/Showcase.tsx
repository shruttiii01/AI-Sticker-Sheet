import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowUpRight, BarChart3, Camera, Maximize2, Printer, Sparkles, Wifi, WifiOff } from 'lucide-react';
import { StageBackground } from './StageBackground';
import App from '../App';
import { BrandMark, CountUp, Eyebrow, GOLD, SAFFRON, TiltCard, Words, ease, toggleFullscreen, useHealth } from './ui';

const StickerStage = lazy(() => import('./StickerStage'));
const InsightsWall = lazy(() => import('./InsightsWall'));

type Route = 'hub' | 'stickers' | 'insights' | 'booth';
const ROUTES: Route[] = ['hub', 'stickers', 'insights', 'booth'];
const readRoute = (): Route => {
  const r = window.location.hash.replace(/^#\/?/, '') as Route;
  return ROUTES.includes(r) ? r : 'hub';
};

/* ---------------- Opening title sequence ---------------- */
const Opening: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 5200);
    const skip = () => onDone();
    window.addEventListener('keydown', skip);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', skip);
    };
  }, [onDone]);
  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center bg-[#030817] cursor-pointer"
      onClick={onDone}
      exit={{ opacity: 0, scale: 1.08, filter: 'blur(20px)' }}
      transition={{ duration: 0.9, ease }}
    >
      <div className="text-center">
        <motion.div
          className="mx-auto h-[2px] mb-10"
          style={{ background: `linear-gradient(90deg,transparent,${GOLD},transparent)` }}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 'min(70vw,900px)', opacity: 1 }}
          transition={{ duration: 1.4, ease }}
        />
        <div className="flex justify-center gap-[0.04em] font-display font-bold text-white text-[clamp(72px,15vw,240px)] leading-none">
          {'DYPBSAI'.split('').map((l, i) => (
            <motion.span
              key={i}
              className={i >= 3 ? 'gold-text' : ''}
              initial={{ opacity: 0, y: 80, rotateX: -90, filter: 'blur(16px)' }}
              animate={{ opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)' }}
              transition={{ duration: 1, delay: 0.6 + i * 0.12, ease }}
              style={{ display: 'inline-block', transformPerspective: 600 }}
            >
              {l}
            </motion.span>
          ))}
        </div>
        <motion.p
          initial={{ opacity: 0, letterSpacing: '0.1em' }}
          animate={{ opacity: 1, letterSpacing: '0.45em' }}
          transition={{ duration: 1.6, delay: 1.6, ease }}
          className="mt-6 text-white/80 uppercase text-[clamp(13px,1.6vw,24px)]"
        >
          AI Sticker Studio
        </motion.p>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 2.6 }} className="mt-3 text-white/45 text-[clamp(12px,1.1vw,18px)]">
          Centre of Excellence · Dr. D. Y. Patil B-School, Pune · #DYPBSAICoE
        </motion.p>
        <motion.div
          className="mx-auto h-[2px] mt-10"
          style={{ background: `linear-gradient(90deg,transparent,${SAFFRON},transparent)` }}
          initial={{ width: 0 }}
          animate={{ width: 'min(40vw,520px)' }}
          transition={{ duration: 1.4, delay: 1.2, ease }}
        />
      </div>
      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 0.35 }} transition={{ delay: 3 }} className="absolute bottom-8 text-white text-xs tracking-[0.3em] uppercase">
        Press any key
      </motion.span>
    </motion.div>
  );
};

/* ---------------- Live counters ---------------- */
interface MiniInsights {
  counters: { stickerSessions: number; stickersDrawn: number; wallPosts: number };
  drawMedianMs: number;
}
function useMiniInsights() {
  const [d, setD] = useState<MiniInsights | null>(null);
  useEffect(() => {
    let alive = true;
    const pull = () =>
      fetch('/api/insights')
        .then((r) => r.json())
        .then((x) => alive && setD(x))
        .catch(() => {});
    pull();
    const id = setInterval(pull, 4000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  return d;
}

/* ---------------- Card previews (pure motion, no assets) ---------------- */
const StickerPreview: React.FC = () => (
  <div className="relative h-[18vh] min-h-36 w-full flex items-center justify-center">
    {[
      { r: -14, x: -110, c: '#fde08a', d: 0 },
      { r: 6, x: -10, c: '#ffffff', d: 0.15 },
      { r: 16, x: 95, c: '#bccbeb', d: 0.3 },
    ].map((s, i) => (
      <motion.div
        key={i}
        className="absolute w-[13vh] h-[13vh] min-w-24 min-h-24 rounded-3xl border-[6px] border-white shadow-2xl grid place-items-center"
        style={{ background: s.c, x: s.x }}
        initial={{ rotate: s.r, y: 0 }}
        animate={{ y: [0, -12, 0], rotate: [s.r, s.r + 4, s.r] }}
        transition={{ duration: 3, delay: s.d, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="w-1/2 h-1/2 rounded-full bg-[#0b1f4b]/85 relative">
          <span className="absolute left-[28%] top-[38%] w-[12%] h-[12%] rounded-full bg-white" />
          <span className="absolute right-[28%] top-[38%] w-[12%] h-[12%] rounded-full bg-white" />
          <span className="absolute left-1/2 -translate-x-1/2 bottom-[22%] w-[34%] h-[16%] rounded-b-full border-b-[3px] border-white" />
        </div>
      </motion.div>
    ))}
    <motion.span
      className="absolute -bottom-1 right-3 text-[11px] font-bold tracking-widest uppercase"
      style={{ color: GOLD }}
      animate={{ opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 2.4, repeat: Infinity }}
    >
      drawn by Gemini · live
    </motion.span>
  </div>
);

const WallPreview: React.FC<{ n: number; secs: number }> = ({ n, secs }) => (
  <div className="relative h-[18vh] min-h-36 w-full grid grid-cols-6 gap-2 content-center">
    {Array.from({ length: 12 }).map((_, i) => (
      <motion.div
        key={i}
        className="aspect-square rounded-xl border border-white/15"
        style={{ background: i < n ? `linear-gradient(135deg,${GOLD}55,${SAFFRON}33)` : 'rgba(255,255,255,.05)' }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2.6, delay: i * 0.15, repeat: Infinity }}
      />
    ))}
    {secs > 0 && (
      <span className="absolute -bottom-1 right-3 text-[11px] font-bold tracking-widest uppercase" style={{ color: GOLD }}>
        median draw {secs.toFixed(1)}s
      </span>
    )}
  </div>
);

/* ---------------- Hub ---------------- */
const Hub: React.FC<{ go: (r: Route) => void }> = ({ go }) => {
  const health = useHealth();
  const mini = useMiniInsights();
  const c = mini?.counters;
  const cards = [
    {
      key: '1',
      route: 'stickers' as Route,
      icon: Camera,
      eyebrow: 'Step in · AI Sticker Studio',
      title: 'Smile at the camera.',
      gold: 'Become a sticker.',
      body: 'Gemini studies your photo, invents a sticker pack about you and hand-draws every one, ready to print for your laptop, phone or bottle.',
      preview: <StickerPreview />,
      cta: 'Start',
    },
    {
      key: '2',
      route: 'insights' as Route,
      icon: BarChart3,
      eyebrow: 'Watch live · Sticker Wall',
      title: 'The room, live.',
      gold: 'Every sticker.',
      body: 'Audience stickers fly onto the wall as they are drawn, with live counts, favourite styles and Claude\'s draw times.',
      preview: <WallPreview n={Math.min(12, c?.wallPosts ?? 0)} secs={(mini?.drawMedianMs ?? 0) / 1000} />,
      cta: 'Open wall',
    },
  ];
  return (
    <div className="min-h-screen flex flex-col px-[5vw] pt-6 pb-4 max-w-[1600px] mx-auto">
      <header className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <BrandMark size={46} />
          <div>
            <div className="text-white font-display font-bold text-xl leading-tight">
              DYPBSAI <span style={{ color: GOLD }}>AI Sticker Studio</span>
            </div>
            <div className="text-white/50 text-sm">Centre of Excellence · Dr. D. Y. Patil B-School, Pune</div>
          </div>
        </motion.div>
        <div className="flex items-center gap-2">
          {health && (
            <span className={`hidden md:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full glass ${health.claude ? 'text-emerald-300' : 'text-red-300'}`}>
              {health.claude ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {health.claude ? `Gemini connected · ${health.model}` : 'Gemini key missing'}
            </span>
          )}
          <button onClick={toggleFullscreen} title="Fullscreen (F)" className="p-2.5 rounded-xl glass text-white cursor-pointer">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="mt-[4vh]">
        <Eyebrow delay={0.2}>Live on stage · drawn by Gemini</Eyebrow>
        <h1 className="mt-4 font-display font-bold text-white leading-[1.02] text-[clamp(40px,5.6vw,104px)]">
          <Words text="One smile. One AI." delay={0.3} />
          <br />
          <Words text="A sticker pack in 30 seconds." delay={0.8} gold={['sticker', 'pack']} />
        </h1>
      </div>

      <div className="mt-[4vh] grid lg:grid-cols-[1.25fr_1fr] gap-6">
        {cards.map((card, i) => (
          <motion.div key={card.route} initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 1.3 + i * 0.15, ease }}>
            <TiltCard onClick={() => go(card.route)} className="glass rounded-[2rem] p-7 group h-full overflow-hidden">
              <div className="absolute -inset-px rounded-[2rem] opacity-0 group-hover:opacity-100 transition duration-500 glow-gold pointer-events-none" />
              <div className="flex items-start justify-between gap-4" style={{ transform: 'translateZ(40px)' }}>
                <div>
                  <p className="text-[11px] font-bold tracking-[0.25em] uppercase text-white/50">{card.eyebrow}</p>
                  <h2 className="mt-3 font-display font-bold text-white text-[clamp(28px,2.8vw,46px)] leading-tight">
                    {card.title}
                    <br />
                    <span className="gold-text">{card.gold}</span>
                  </h2>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="w-14 h-14 rounded-2xl grid place-items-center text-[#0b1f4b] group-hover:rotate-12 transition" style={{ background: GOLD }}>
                    <card.icon className="w-7 h-7" />
                  </span>
                  <kbd className="text-[11px] text-white/40 border border-white/20 rounded px-1.5">{card.key}</kbd>
                </div>
              </div>
              <div className="my-5" style={{ transform: 'translateZ(25px)' }}>
                {card.preview}
              </div>
              <div className="flex items-end justify-between gap-4" style={{ transform: 'translateZ(30px)' }}>
                <p className="text-white/65 text-[clamp(14px,1.1vw,18px)] max-w-[48ch]">{card.body}</p>
                <span className="shrink-0 flex items-center gap-1.5 font-bold group-hover:gap-3 transition-all" style={{ color: GOLD }}>
                  {card.cta} <ArrowUpRight className="w-5 h-5" />
                </span>
              </div>
            </TiltCard>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 1.7, ease }}
        className="mt-6 glass rounded-[2rem] px-7 py-4 flex flex-wrap items-center gap-x-10 gap-y-3"
      >
        <span className="flex items-center gap-2.5 text-white/60 text-xs font-bold uppercase tracking-[0.25em]">
          <span className="relative flex w-2.5 h-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
            <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-red-500" />
          </span>
          Live in this room
        </span>
        {[
          ['People captured', c?.stickerSessions ?? 0],
          ['Stickers drawn by Gemini', c?.stickersDrawn ?? 0],
          ['On the live wall', c?.wallPosts ?? 0],
        ].map(([label, n]) => (
          <div key={label as string} className="flex items-baseline gap-3">
            <span className="font-display font-bold text-3xl text-white tabular-nums">
              <CountUp to={n as number} />
            </span>
            <span className="text-white/50 text-xs uppercase tracking-widest">{label}</span>
          </div>
        ))}
        <button onClick={() => go('booth')} className="ml-auto flex items-center gap-1.5 text-white/45 hover:text-white text-sm cursor-pointer">
          <Printer className="w-4 h-4" /> Classic booth & paper tools
        </button>
      </motion.div>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }} className="mt-auto pt-6 text-center text-white/35 text-xs tracking-widest uppercase">
        <Sparkles className="inline w-3.5 h-3.5 mr-1.5 -mt-0.5" style={{ color: GOLD }} />
        Presenter keys · 1 Sticker Studio · 2 Live wall · H Home · F Fullscreen
      </motion.p>
    </div>
  );
};

/* ---------------- Shell / router ---------------- */
export default function Showcase() {
  const [route, setRoute] = useState<Route>(readRoute);
  const [opening, setOpening] = useState(() => readRoute() === 'hub' && !sessionStorage.getItem('dypai-opened'));

  useEffect(() => {
    const onHash = () => setRoute(readRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = useCallback((r: Route) => {
    window.location.hash = r === 'hub' ? '' : `/${r}`;
    window.scrollTo({ top: 0 });
  }, []);

  // Global presenter shortcuts (ignored while typing, and inside the classic booth).
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey || route === 'booth') return;
      const key = e.key.toLowerCase();
      if (key === 'h') go('hub');
      else if (route === 'hub' && key === '1') go('stickers');
      else if (route !== 'stickers' && key === '2') go('insights');
      else if (key === 'f') toggleFullscreen();
      else if (key === 'o' && route === 'hub') setOpening(true);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [route, go]);

  const finishOpening = useCallback(() => {
    sessionStorage.setItem('dypai-opened', '1');
    setOpening(false);
  }, []);

  if (route === 'booth') {
    return (
      <>
        <App />
        <button
          onClick={() => go('hub')}
          className="print:hidden fixed bottom-5 left-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#0b1f4b] text-white text-sm font-semibold shadow-xl cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to showcase
        </button>
      </>
    );
  }

  return (
    <div className="showcase relative min-h-screen text-white overflow-x-hidden">
      <StageBackground intensity={route === 'hub' ? 1 : 0.7} />
      <div className="relative z-10">
        {/* Keyed fade-in only (no exit wait): rapid presenter key presses can never leave a page stuck mid-transition. */}
        <motion.div
            key={route}
            initial={{ opacity: 0, filter: 'blur(12px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.5, ease }}
          >
            <Suspense fallback={<div className="min-h-screen" />}>
              {route === 'hub' && <Hub go={go} />}
              {route === 'stickers' && <StickerStage onHome={() => go('hub')} onInsights={() => go('insights')} />}
              {route === 'insights' && <InsightsWall onHome={() => go('hub')} />}
            </Suspense>
        </motion.div>
      </div>
      <AnimatePresence>{opening && <Opening onDone={finishOpening} />}</AnimatePresence>
    </div>
  );
}
