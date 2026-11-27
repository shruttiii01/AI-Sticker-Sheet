import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, EyeOff, Printer, Smartphone, Sparkles, X } from 'lucide-react';
import { PrintPanel } from './StickerStage';
import StickerMockups, { StickerRoomStrip } from './StickerMockups';
import { Eyebrow, GOLD, ease } from './ui';

/** One person's pack as the wall knows it: their wall stickers, plus the pack id that links to the print archive. */
export interface WallPack {
  key: string;
  packId?: string;
  name: string;
  style: string;
  wallImgs: string[];
  captions: string[];
}

interface ArchiveItem {
  id: string;
  caption: string;
  name: string;
  style: string;
}

/**
 * Opens a sticker from the live wall the way its owner saw it: the whole pack, centre stage,
 * with the sticker room underneath. Uses print-quality art from the archive when it exists.
 */
export default function PackViewer({
  packs,
  index,
  onIndex,
  onClose,
  onRemove,
}: {
  packs: WallPack[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  onRemove: (pack: WallPack) => void;
}) {
  const pack = packs[index];
  const [full, setFull] = useState<{ img: string; caption: string }[] | null>(null);
  const [showPrint, setShowPrint] = useState(false);
  const [room, setRoom] = useState<{ focus: string | null } | null>(null);

  useEffect(() => {
    let alive = true;
    setFull(null);
    if (!pack?.packId) return;
    fetch(`/api/archive?pack=${encodeURIComponent(pack.packId)}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d: { items: ArchiveItem[] }) => {
        if (alive && d.items?.length) setFull(d.items.map((i) => ({ img: `/api/archive/img?id=${i.id}&v=full`, caption: i.caption })));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pack?.packId]);

  // Archive art when available (print quality, every sticker in the pack), else the wall thumbnails.
  const stickers = useMemo(
    () => full ?? (pack ? pack.wallImgs.map((img, i) => ({ img, caption: pack.captions[i] ?? '' })) : []),
    [full, pack],
  );
  const imgs = stickers.map((s) => s.img);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (showPrint || room) return; // the overlays own the keyboard while open
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' && index < packs.length - 1) onIndex(index + 1);
      else if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
      else if (e.key.toLowerCase() === 'p') setShowPrint(true);
      else if (e.key.toLowerCase() === 'm') setRoom({ focus: null });
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [showPrint, room, index, packs.length, onIndex, onClose]);

  if (!pack) return null;
  const cols = stickers.length > 4 ? 3 : Math.max(1, stickers.length);

  return (
    <motion.div className="fixed inset-0 z-40 bg-[#050d26] overflow-hidden flex flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="px-[5vw] pt-6 flex items-start gap-4">
        <div className="mr-auto min-w-0">
          <Eyebrow>From the live wall · {index + 1} of {packs.length}</Eyebrow>
          <h1 className="mt-2 font-display font-bold text-white leading-[1.05] text-[clamp(24px,3.2vw,52px)] truncate">
            {pack.name || 'Guest'}, meet your <span className="gold-text">sticker</span> pack.
          </h1>
        </div>
        <div className="text-right shrink-0">
          <div className="font-display font-bold text-white text-[clamp(28px,3.5vw,56px)] leading-none">{stickers.length}</div>
          <div className="text-white/45 text-[11px] tracking-[0.25em] uppercase mt-1">{pack.style || 'stickers'}</div>
        </div>
        <button
          onClick={() => {
            if (window.confirm(`Remove ${pack.name || 'this'}'s stickers from the live wall? They stay in the print archive.`)) onRemove(pack);
          }}
          title="Remove from the live wall (stays in the print archive)"
          className="p-2.5 rounded-xl glass text-white/50 hover:text-red-300 cursor-pointer shrink-0"
        >
          <EyeOff className="w-5 h-5" />
        </button>
        <button onClick={onClose} title="Back to the wall (Esc)" className="p-2.5 rounded-xl glass text-white cursor-pointer shrink-0">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="mx-[5vw] mt-4 h-1.5 rounded-full" style={{ background: `linear-gradient(90deg,${GOLD},#E8742A)` }} />

      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-5 px-[5vw] pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={pack.key + (full ? '-full' : '')}
            className="grid justify-center gap-5"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, ${stickers.length > 3 ? 20 : 28}vh))` }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ ease, duration: 0.45 }}
          >
            {stickers.map((s, i) => (
              <motion.div
                key={s.img}
                initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ delay: i * 0.08, type: 'spring', stiffness: 180, damping: 16 }}
                whileHover={{ scale: 1.05, rotate: 2 }}
              >
                <img src={s.img} alt={s.caption} className="w-full aspect-square object-contain drop-shadow-[0_16px_30px_rgba(0,0,0,.5)]" />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {imgs.length > 0 && (
          <div className="w-full max-w-[1700px]">
            <p className="text-center text-[11px] font-bold uppercase tracking-[0.3em] mb-3" style={{ color: GOLD }}>
              <Sparkles className="inline w-4 h-4 mr-2 -mt-0.5" />
              Now stick it everywhere <span className="text-white/40 normal-case tracking-normal font-normal">· tap any object to play</span>
            </p>
            <StickerRoomStrip stickers={imgs} onOpen={(id) => setRoom({ focus: id })} />
          </div>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 z-10 flex flex-wrap items-center justify-center gap-2 xl:gap-3 pb-4 pt-8 px-3 bg-gradient-to-t from-[#050d26] via-[#050d26]/85 to-transparent">
        <button
          disabled={index === 0}
          onClick={() => onIndex(index - 1)}
          title="Previous pack (←)"
          className="p-3 rounded-2xl glass text-white cursor-pointer disabled:opacity-30"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowPrint(true)}
          className="shimmer-btn rounded-2xl px-4 py-2.5 text-sm xl:px-7 xl:py-3.5 xl:text-base font-extrabold text-[#0b1f4b] flex items-center gap-2 cursor-pointer"
          style={{ background: `linear-gradient(135deg,${GOLD},#ffd37a)` }}
        >
          <Printer className="w-5 h-5" /> Print stickers
        </button>
        <button
          onClick={() => setRoom({ focus: null })}
          className="shimmer-btn rounded-2xl px-4 py-2.5 text-sm xl:px-7 xl:py-3.5 xl:text-base font-extrabold text-white flex items-center gap-2 cursor-pointer"
          style={{ background: 'linear-gradient(135deg,#ff2e88,#7b2ff7)' }}
        >
          <Smartphone className="w-5 h-5" /> Stick it everywhere
        </button>
        <button onClick={onClose} className="rounded-2xl px-4 py-2.5 text-sm xl:px-5 xl:py-3.5 xl:text-base font-semibold text-white glass cursor-pointer">
          Back to wall
        </button>
        <button
          disabled={index >= packs.length - 1}
          onClick={() => onIndex(index + 1)}
          title="Next pack (→)"
          className="p-3 rounded-2xl glass text-white cursor-pointer disabled:opacity-30"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <AnimatePresence>{showPrint && <PrintPanel stickers={imgs} name={pack.name || 'guest'} onClose={() => setShowPrint(false)} />}</AnimatePresence>
      <AnimatePresence>
        {room && <StickerMockups stickers={imgs} name={pack.name} initialFocus={room.focus} onClose={() => setRoom(null)} />}
      </AnimatePresence>
    </motion.div>
  );
}
