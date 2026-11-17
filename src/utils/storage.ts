import { DEFAULT_PAPER_CONFIG } from "../constants";
import type { PaperConfig, SavedOutput } from "../types";

const PAPER_STORAGE_KEY = "dyp_aicoe_paper_config_v1";
const DB_NAME = "dyp_aicoe_sticker_booth";
const DB_VERSION = 1;
const STORE_NAME = "outputs";

export function loadPaperConfig(): PaperConfig {
  try {
    const raw = localStorage.getItem(PAPER_STORAGE_KEY);
    if (!raw) return DEFAULT_PAPER_CONFIG;
    const parsed = JSON.parse(raw) as Partial<PaperConfig>;
    return {
      ...DEFAULT_PAPER_CONFIG,
      ...parsed,
    };
  } catch {
    return DEFAULT_PAPER_CONFIG;
  }
}

export function savePaperConfig(config: PaperConfig): void {
  try {
    localStorage.setItem(PAPER_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage write errors in restricted contexts
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
  });
}

export async function getAllOutputs(): Promise<SavedOutput[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = (req.result as SavedOutput[]) ?? [];
        items.sort((a, b) => b.createdAt - a.createdAt);
        resolve(items);
      };
      req.onerror = () => reject(req.error ?? new Error("Failed to load outputs"));
    });
  } catch {
    return [];
  }
}

export async function saveOutputRecord(record: SavedOutput): Promise<void> {
  const db = await openDb();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error("Failed to save output"));
  });
}

export async function deleteOutputRecord(id: string): Promise<void> {
  const db = await openDb();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error("Failed to delete output"));
  });
}

export async function deleteAllOutputs(): Promise<void> {
  const db = await openDb();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error("Failed to clear outputs"));
  });
}
