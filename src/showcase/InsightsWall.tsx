import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Home, Lightbulb, Maximize2, RotateCcw } from 'lucide-react';
import { BrandMark, CountUp, GOLD, SAFFRON, ease, sfx, toggleFullscreen } from './ui';

type Tally = Record<string, number>;
interface Insights {
  startedAt: number;
  counters: { stickerSessions: number; stickersDrawn: number; stickerErrors: number; wallPosts: number };
  styles: Tally;
  vibes: Tally;
  captions: { caption: string; title: string; style: string; at: number }[];
  drawMedianMs: number;
  analyzeMedianMs: number;
  perMinute: number[];
  now: number;
}
interface WallItem {
  id: string;
  img: string;
  caption: string;
  name: string;
  style: string;
  at: number;
}

const ranked = (t: Tally, n = 5) =>
  Object.entries(t)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
const total = (t: Tally) => Object.values(t).reduce((a, b) => a + b, 0);
const pct = (v: number, t: number) => (t ? Math.round((v / t) * 100) : 0);

/** Plain-English observations computed from what the room actually did. */
function buildInsights(d: Insights): string[] {
  const out: string[] = [];
  const c = d.counters;
  const [topStyle] = ranked(d.styles, 1);
  if (topStyle) out.push(`"${topStyle[0]}" is this room's favourite sticker style, chosen by ${pct(topStyle[1], total(d.styles))}% of people.`);
  if (d.drawMedianMs) out.push(`Claude hand-draws a complete sticker in ${(d.drawMedianMs / 1000).toFixed(0)} seconds, typically. A human illustrator needs about an hour.`);
  if (c.stickersDrawn) out.push(`${c.stickersDrawn} original illustrations so far: roughly ${c.stickersDrawn} hours of human design work, done live.`);
  const [topVibe] = ranked(d.vibes, 1);
  if (topVibe) out.push(`"${topVibe[0]}" is the pack theme this room picks most (${pct(topVibe[1], total(d.vibes))}%).`);
  if (c.stickerSessions > 1) out.push(`${c.stickerSessions} people have become stickers so far. Who's next?`);
  if (c.stickersDrawn && c.wallPosts) out.push(`${pct(Math.min(c.wallPosts, c.stickersDrawn), c.stickersDrawn)}% of stickers were proudly sent to the live wall.`);
  const recent = d.perMinute.slice(-5).reduce((a, b) => a + b, 0);
  if (recent > 3) out.push(`${recent} AI actions in the last 5 minutes. The room is warming up.`);
  if (!out.length) out.push('Waiting for the first volunteer. Every sticker drawn in this room shows up here live.');
  return out;
}

const Kpi: React.FC<{ label: string; value: number; decimals?: number; suffix?: string; i: number; accent?: boolean }> = ({ label, value, decimals, suffix, i, accent }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.15 + i * 0.08, ease, duration: 0.7 }}
    className={`glass rounded-3xl px-5 py-4 ${accent ? 'glow-gold' : ''}`}
  >
    <div className={`font-display font-bold tabular-nums text-[clamp(34px,3.6vw,64px)] leading-none ${accent ? 'gold-text' : 'text-white'}`}>
      <CountUp to={value} decimals={decimals} suffix={suffix} />
    </div>
    <div className="mt-2 text-white/50 text-[11px] uppercase tracking-[0.2em]">{label}</div>
  </motion.div>
);

const Bars: React.FC<{ title: string; data: [string, number][]; empty: string }> = ({ title, data, empty }) => {
  const max = Math.max(1, ...data.map((d) => d[1]));
  return (
    <div className="glass rounded-3xl p-5">
      <p className="text-white/50 text-[11px] font-bold uppercase tracking-[0.25em]">{title}</p>
      <div className="mt-4 space-y-3">
        {data.length === 0 && <p className="text-white/35 text-sm">{empty}</p>}
        {data.map(([k, v], i) => (
          <div key={k}>
            <div className="flex justify-between text-sm">
              <span className="text-white truncate pr-3">{k}</span>
              <span className="text-white/60 tabular-nums">{v}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: i === 0 ? `linear-gradient(90deg,${GOLD},${SAFFRON})` : 'rgba(143,165,214,.7)' }}
                initial={{ width: 0 }}
                animate={{ width: `${(v / max) * 100}%` }}
                transition={{ ease, duration: 1 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function InsightsWall({ onHome }: { onHome: () => void }) {
  const [d, setD] = useState<Insights | null>(null);
  const [wall, setWall] = useState<WallItem[]>([]);
  const [tip, setTip] = useState(0);
  const lastWall = useRef(0);

  useEffect(() => {
    let alive = true;
    const pull = async () => {
      try {
        const [ins, w] = await Promise.all([fetch('/api/insights').then((r) => r.json()), fetch(`/api/wall?since=${lastWall.current}`).then((r) => r.json())]);
        if (!alive) return;
        setD(ins);
        if (w.items.length) {
          if (lastWall.current) sfx('pop');
          lastWall.current = Math.max(...w.items.map((i: WallItem) => i.at));
          setWall((prev) => [...w.items, ...prev].slice(0, 30));
        }
      } catch {
        /* keep last good frame on screen */
      }
    };
    void pull();
    const id = setInterval(pull, 3000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const tips = useMemo(() => (d ? buildInsights(d) : []), [d]);
  useEffect(() => {
    const id = setInterval(() => setTip((t) => t + 1), 6500);
    return () => clearInterval(id);
  }, []);

  const reset = async () => {
    if (!window.confirm('Reset all live insights and clear the sticker wall?')) return;
    await fetch('/api/insights/reset', { method: 'POST' });
    lastWall.current = 0;
    setWall([]);
  };

  const c = d?.counters;
  const maxMin = Math.max(1, ...(d?.perMinute ?? [1]));
  const ticker = [
    ...(d?.captions ?? []).map((x) => `✦ "${x.caption || x.title}" · ${x.style}`),
  ];

  return (
    <div className="min-h-screen px-[4vw] pt-6 pb-24 max-w-[1700px] mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandMark size={42} />
          <div>
            <div className="flex items-center gap-2.5">
              <span className="relative flex w-3 h-3">
                <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
                <span className="relative inline-flex w-3 h-3 rounded-full bg-red-500" />
              </span>
              <h1 className="font-display font-bold text-white text-[clamp(22px,2.4vw,40px)] leading-none">
                Live Sticker Insights <span className="gold-text">#DYPAICoE</span>
              </h1>
            </div>
            <p className="text-white/45 text-sm mt-1">Every sticker this room creates, as it happens</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void reset()} title="Reset insights" className="p-2.5 rounded-xl glass text-white/60 cursor-pointer">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={toggleFullscreen} title="Fullscreen (F)" className="p-2.5 rounded-xl glass text-white cursor-pointer">
            <Maximize2 className="w-4 h-4" />
          </button>
          <button onClick={onHome} title="Home (H)" className="p-2.5 rounded-xl glass text-white cursor-pointer">
            <Home className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
        <Kpi i={0} label="People captured" value={c?.stickerSessions ?? 0} />
        <Kpi i={1} label="Design hours saved" value={c?.stickersDrawn ?? 0} />
        <Kpi i={2} label="Stickers drawn by Claude" value={c?.stickersDrawn ?? 0} accent />
        <Kpi i={3} label="Median draw time (s)" value={(d?.drawMedianMs ?? 0) / 1000} decimals={1} />
        <Kpi i={4} label="On the live wall" value={c?.wallPosts ?? 0} />
      </div>

      {/* insight of the moment */}
      <div className="mt-5 glass rounded-3xl px-6 py-5 flex items-center gap-4 min-h-[92px] overflow-hidden">
        <span className="w-12 h-12 rounded-2xl grid place-items-center shrink-0 text-[#0b1f4b]" style={{ background: GOLD }}>
          <Lightbulb className="w-6 h-6" />
        </span>
        <AnimatePresence mode="wait">
          <motion.p
            key={tips.length ? tip % tips.length : -1}
            initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -20, filter: 'blur(8px)' }}
            transition={{ duration: 0.6, ease }}
            className="font-display text-white text-[clamp(18px,2vw,32px)] leading-snug"
          >
            {tips.length ? tips[tip % tips.length] : 'Connecting to the room…'}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="mt-5 grid lg:grid-cols-[1.25fr_1fr] gap-5">
        {/* live wall */}
        <div className="glass rounded-3xl p-5 min-h-[56vh]">
          <div className="flex items-center justify-between">
            <p className="text-white/50 text-[11px] font-bold uppercase tracking-[0.25em]">The live sticker wall</p>
            <p className="text-white/35 text-xs">{wall.length} shown · opt-in only</p>
          </div>
          {wall.length === 0 ? (
            <div className="h-[340px] grid place-items-center text-center text-white/40">
              <div>
                <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2.4, repeat: Infinity }} className="text-5xl">
                  ✦
                </motion.div>
                <p className="mt-3">Stickers from the audience will fly in here.</p>
              </div>
            </div>
          ) : (
            <div className={`mt-4 grid gap-4 ${wall.length > 15 ? 'grid-cols-4 xl:grid-cols-6' : 'grid-cols-3 xl:grid-cols-5'}`}>
              <AnimatePresence initial={false}>
                {wall.map((w) => (
                  <motion.div
                    key={w.id}
                    layout
                    initial={{ opacity: 0, scale: 0.2, rotate: -25, y: -60 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 16 }}
                    whileHover={{ scale: 1.12, rotate: 3, zIndex: 10 }}
                    className="relative"
                    title={`${w.name || 'Guest'} · ${w.caption}`}
                  >
                    <img src={w.img} alt={w.caption} className="w-full aspect-square object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,.45)]" />
                    {w.name && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] px-2 rounded-full bg-[#0b1f4b] text-white/80 whitespace-nowrap">{w.name}</span>}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="grid gap-5">
          {/* activity pulse */}
          <div className="glass rounded-3xl p-5">
            <p className="text-white/50 text-[11px] font-bold uppercase tracking-[0.25em]">AI activity · last 30 minutes</p>
            <div className="mt-4 h-[18vh] flex items-end gap-[3px]">
              {(d?.perMinute ?? Array(30).fill(0)).map((v, i) => (
                <motion.div
                  key={i}
                  className="flex-1 rounded-t"
                  style={{ background: i >= 27 ? GOLD : 'rgba(143,165,214,.55)' }}
                  initial={{ height: 2 }}
                  animate={{ height: `${Math.max(3, (v / maxMin) * 100)}%` }}
                  transition={{ ease, duration: 0.8, delay: i * 0.01 }}
                />
              ))}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <Bars title="Favourite sticker styles" data={ranked(d?.styles ?? {})} empty="No stickers yet" />
            <Bars title="Pack themes chosen" data={ranked(d?.vibes ?? {})} empty="No stickers yet" />
          </div>
        </div>
      </div>

      {/* ticker */}
      {ticker.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-30 py-3 bg-[#050d26]/90 border-t border-white/10 overflow-hidden">
          <div className="marquee gap-12 text-white/70 text-sm whitespace-nowrap">
            {[...ticker, ...ticker].map((t, i) => (
              <span key={i} className="px-6">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
