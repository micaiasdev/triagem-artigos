import { promises as fs } from "node:fs";
import path from "node:path";
import type { AppState } from "./types";

// Diretório de dados configurável (no Docker é montado como volume).
export const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
export const PDF_DIR = path.join(DATA_DIR, "pdfs");
const STATE_FILE = path.join(DATA_DIR, "state.json");
const TMP_FILE = path.join(DATA_DIR, "state.json.tmp");

// Fila para serializar gravações (single-user, mas evita corridas entre requisições).
let writeQueue: Promise<unknown> = Promise.resolve();

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function writeAtomic(state: AppState): Promise<void> {
  await ensureDir();
  const payload = JSON.stringify(state, null, 2);
  await fs.writeFile(TMP_FILE, payload, "utf8");
  await fs.rename(TMP_FILE, STATE_FILE);
}

export async function loadState(): Promise<AppState | null> {
  try {
    const raw = await fs.readFile(STATE_FILE, "utf8");
    const state = JSON.parse(raw) as AppState;
    // Migração: garante campos adicionados depois (favorite, full-text).
    for (const a of state.articles) {
      if (typeof a.favorite !== "boolean") a.favorite = false;
      if (typeof a.fullTextDecision !== "string") a.fullTextDecision = "pending";
      if (!Array.isArray(a.fullTextCriteriaCodes)) a.fullTextCriteriaCodes = [];
      if (typeof a.fullTextJustification !== "string") a.fullTextJustification = "";
      if (typeof a.fullTextLink !== "string") a.fullTextLink = "";
      if (typeof a.pdfName !== "string") a.pdfName = "";
    }
    return state;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function saveState(state: AppState): Promise<void> {
  const run = writeQueue.then(() => writeAtomic(state));
  writeQueue = run.catch(() => {});
  return run;
}

export async function clearState(): Promise<void> {
  const run = writeQueue.then(() => fs.rm(STATE_FILE, { force: true }));
  writeQueue = run.catch(() => {});
  await run;
}

/**
 * Carrega o estado, aplica um mutador e persiste — tudo serializado pela fila.
 * Retorna o estado atualizado, ou null se ainda não existe dataset.
 */
export async function updateState(
  mutator: (state: AppState) => void
): Promise<AppState | null> {
  const run = writeQueue.then(async () => {
    const state = await loadState();
    if (!state) return null;
    mutator(state);
    state.updatedAt = new Date().toISOString();
    await writeAtomic(state);
    return state;
  });
  writeQueue = run.catch(() => {});
  return run;
}
