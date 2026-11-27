import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckSquare, Printer, RefreshCw, Square, Trash2, X } from 'lucide-react';
import { PrintPanel } from './StickerStage';
import { GOLD, ease } from './ui';

interface ArchiveItem {
  id: string;
  packId: string;
  packAt: number;
  at: number;
  name: string;
  caption: string;
  style: string;
}
interface Pack {
  packId: string;
  packAt: number;
  name: string;
  style: string;
  items: ArchiveItem[];
}

const thumbUrl = (id: string) => `/api/archive/img?id=${id}&v=thumb`;
const fullUrl = (id: string) => `/api/archive/img?id=${id}&v=full`;

/** Every sticker ever made at the booth, grouped by person, ready to reprint. */
export default function PrintArchive({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<ArchiveItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [printing, setPrinting] = useState<{ ids: string[]; name: string } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await fetch('/api/archive');
      if (!r.ok) throw new Error(`Archive unavailable (${r.status})`);
      setItems(((await r.json()) as { items: ArchiveItem[] }).items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Archive unavailable');
      setItems([]);
    }
  }, []);
  useEffect(() => void load(), [load]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (printing) setPrinting(null);
      else onClose();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [printing, onClose]);

  const packs = useMemo(() => {
    const map = new Map<string, Pack>();
    for (const it of items ?? []) {
      const p = map.get(it.packId) ?? { packId: it.packId, packAt: it.packAt, name: it.name, style: it.style, items: [] };
      p.items.push(it);
      map.set(it.packId, p);
    }
    const q = query.trim().toLowerCase();
    return [...map.values()]
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.items.some((i) => i.caption.toLowerCase().includes(q)))
      .sort((a, b) => b.packAt - a.packAt);
  }, [items, query]);

  const toggle = (ids: string[], on?: boolean) =>
    setSel((prev) => {
      const next = new Set(prev);
      const turnOn = on ?? ids.some((id) => !next.has(id));
      ids.forEach((id) => (turnOn ? next.add(id) : next.delete(id)));
      return next;
    });

  const visibleIds = packs.flatMap((p) => p.items.map((i) => i.id));
  const allOn = visibleIds.length > 0 && visibleIds.every((id) => sel.has(id));

  const removePack = async (p: Pack) => {
    if (!window.confirm(`Delete ${p.name || 'this'}'s ${p.items.length} sticker(s) from the archive? This cannot be undone.`)) return;
    await fetch(`/api/archive?pack=${encodeURIComponent(p.packId)}`, { method: 'DELETE' });
    setSel((prev) => {
      const next = new Set(prev);
      p.items.forEach((i) => next.delete(i.id));
      return next;
    });
    void load();
  };

  const printIds = (ids: string[], name: string) => ids.length && setPrinting({ ids, name });
  const selectedIds = (items ?? []).filter((i) => sel.has(i.id)).map((i) => i.id);
  const fmt = (t: number) => new Date(t).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div className="fixed inset-0 z-40 bg-[#030817] flex flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="px-[4vw] pt-6 pb-4 flex flex-wrap items-center gap-3 border-b border-white/10">
        <div className="mr-auto">
          <h2 className="font-display font-bold text-white text-3xl">Print archive</h2>
          <p className="text-white/45 text-sm">
            {items === null ? 'Loading…' : `${items.length} stickers from ${new Set(items.map((i) => i.packId)).size} people · saved at print quality`}
          </p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or caption"
          className="rounded-xl bg-white/10 border border-white/15 px-4 py-2.5 text-white placeholder:text-white/35 outline-none focus:border-[#F2B33D] w-56"
        />
        <button onClick={() => toggle(visibleIds, !allOn)} className="rounded-xl px-4 py-2.5 glass text-white text-sm flex items-center gap-2 cursor-pointer">
          {allOn ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />} {allOn ? 'Clear' : 'Select all'}
        </button>
        <button onClick={() => void load()} title="Refresh" className="p-2.5 rounded-xl glass text-white cursor-pointer">
          <RefreshCw className="w-4 h-4" />
        </button>
        <button
          disabled={!selectedIds.length}
          onClick={() => printIds(selectedIds, 'archive')}
          className="rounded-xl px-5 py-2.5 font-extrabold text-[#0b1f4b] flex items-center gap-2 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
          style={{ background: `linear-gradient(135deg,${GOLD},#ffd37a)` }}
        >
          <Printer className="w-4 h-4" /> Print selected ({selectedIds.length})
        </button>
        <button onClick={onClose} title="Close (Esc)" className="p-2.5 rounded-xl glass text-white cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto px-[4vw] py-6 space-y-4">
        {error && <p className="text-red-300">{error}</p>}
        {items !== null && !packs.length && !error && <p className="text-white/50">No stickers saved yet. Every finished pack lands here automatically.</p>}
        {packs.map((p, pi) => {
          const ids = p.items.map((i) => i.id);
          const packOn = ids.every((id) => sel.has(id));
          return (
            <motion.div
              key={p.packId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(pi, 12) * 0.03, ease }}
              className="glass rounded-2xl p-4"
            >
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <button onClick={() => toggle(ids)} className="text-white cursor-pointer" title="Select this person's stickers">
                  {packOn ? <CheckSquare className="w-5 h-5" style={{ color: GOLD }} /> : <Square className="w-5 h-5 text-white/50" />}
                </button>
                <span className="font-bold text-white text-lg">{p.name || 'Guest'}</span>
                <span className="text-white/40 text-sm">
                  {fmt(p.packAt)} · {p.style} · {p.items.length} sticker{p.items.length === 1 ? '' : 's'}
                </span>
                <div className="ml-auto flex gap-2">
                  <button onClick={() => printIds(ids, p.name || 'guest')} className="rounded-lg px-3 py-1.5 glass text-white text-sm flex items-center gap-1.5 cursor-pointer">
                    <Printer className="w-4 h-4" /> Print pack
                  </button>
                  <button onClick={() => void removePack(p)} title="Delete from archive" className="p-2 rounded-lg glass text-white/50 hover:text-red-300 cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {p.items.map((it) => {
                  const on = sel.has(it.id);
                  return (
                    <button
                      key={it.id}
                      onClick={() => toggle([it.id])}
                      title={it.caption}
                      className={`relative w-28 rounded-xl p-1.5 bg-white/5 border-2 cursor-pointer transition ${on ? 'border-[#F2B33D] bg-[#F2B33D]/15' : 'border-transparent hover:border-white/30'}`}
                    >
                      <img src={thumbUrl(it.id)} alt={it.caption} loading="lazy" className="w-full aspect-square object-contain" />
                      <span className="block truncate text-[11px] text-white/60 mt-1">{it.caption}</span>
                      {on && <CheckSquare className="absolute top-2 right-2 w-4 h-4" style={{ color: GOLD }} />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {printing && <PrintPanel stickers={printing.ids.map(fullUrl)} name={printing.name} onClose={() => setPrinting(null)} />}
      </AnimatePresence>
    </motion.div>
  );
}
