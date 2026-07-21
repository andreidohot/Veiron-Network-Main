import type { LanguageId, PageId } from "./pageMeta";

export type { PageId };

const titlesEn: Record<PageId, [string, string]> = {
  overview: ["Overview", "Live chain · wallet · network pulse"],
  wallet: ["Wallet", "Keys on device · balances from gateway"],
  send: ["Send & Receive", "Sign locally · broadcast to VPS"],
  mining: ["Miner", "GPU FiroPoW 0.9.4 · solo or pool"],
  pool: ["Pool", "Live pool network · workers · history · multi-pool"],
  explorer: ["Explorer", "Blocks, txs & addresses from indexer"],
  blocks: ["Blocks", "Canonical tip and recent heights"],
  transactions: ["Transactions", "Confirmed transfer lifecycle"],
  mempool: ["Mempool", "Pending queue on the gateway"],
  node: ["Network", "Peers, fleet & validator view"],
  activity: ["Activity", "Process logs and chain events"],
  rewards: ["Rewards", "Mining rewards from indexed blocks"],
  assets: ["Assets", "Native VIRE ledger surface"],
  settings: ["Settings", "RPC, miner defaults & privacy"]
};

const titlesRo: Record<PageId, [string, string]> = {
  overview: ["Prezentare", "Lanț live · portofel · rețea"],
  wallet: ["Portofel", "Chei pe dispozitiv · solduri din gateway"],
  send: ["Trimite & Primește", "Semnezi local · trimiți la VPS"],
  mining: ["Miner", "GPU FiroPoW 0.9.4 · solo sau pool"],
  pool: ["Pool", "Rețea pool live · workers · istoric · multi-pool"],
  explorer: ["Explorer", "Blocuri, tx și adrese din indexer"],
  blocks: ["Blocuri", "Vârful canonic și înălțimi recente"],
  transactions: ["Tranzacții", "Ciclu de viață transferuri"],
  mempool: ["Mempool", "Coadă pending pe gateway"],
  node: ["Rețea", "Peers, fleet și validatori"],
  activity: ["Activitate", "Loguri și evenimente de lanț"],
  rewards: ["Recompense", "Recompense mining din blocuri indexate"],
  assets: ["Active", "Suprafață ledger VIRE nativ"],
  settings: ["Setări", "RPC, miner și confidențialitate"]
};

export function pageTitle(page: string, language: LanguageId = "en"): [string, string] {
  const map = language === "ro" ? titlesRo : titlesEn;
  return map[page as PageId] ?? titlesEn.overview;
}

export const commandLabels = {
  en: {
    palettePlaceholder: "Jump to page, action, or setting…",
    noResults: "No matching commands",
    pages: "Pages",
    actions: "Actions",
    refresh: "Refresh telemetry",
    toggleTheme: "Toggle dark / light theme",
    openWallet: "Open wallet switcher",
    openSettings: "Open settings",
    startMining: "Go to miner",
    send: "Send VIRE"
  },
  ro: {
    palettePlaceholder: "Navighează la pagină, acțiune sau setare…",
    noResults: "Nicio comandă potrivită",
    pages: "Pagini",
    actions: "Acțiuni",
    refresh: "Reîmprospătează telemetria",
    toggleTheme: "Comută temă dark / light",
    openWallet: "Schimbă portofelul",
    openSettings: "Deschide setările",
    startMining: "Deschide minerul",
    send: "Trimite VIRE"
  }
} as const;
