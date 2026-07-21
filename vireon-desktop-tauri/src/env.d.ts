/// <reference types="vite/client" />

import type { VeironBridge } from "@shared/types";

declare global {
  interface Window {
    veiron: VeironBridge;
  }
}

export {};
