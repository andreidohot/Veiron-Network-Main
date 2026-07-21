import { Maximize2, Minus, X } from "lucide-react";
import { VeironLogo } from "../brand/VeironLogo";

export function TitleBar() {
  const platform = window.veiron.app.platform;
  const product =
    platform === "linux"
      ? "Veiron Linux"
      : platform === "windows"
        ? "Veiron Control Center"
        : "Veiron";

  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="titlebar-brand" data-tauri-drag-region>
        <VeironLogo size="xs" alt="" />
        <strong>{product}</strong>
        <small>Mainnet Candidate</small>
      </div>
      <div className="window-actions">
        <button type="button" aria-label="Minimize" onClick={() => void window.veiron.app.minimize()}>
          <Minus size={15} />
        </button>
        <button type="button" aria-label="Maximize" onClick={() => void window.veiron.app.maximize()}>
          <Maximize2 size={14} />
        </button>
        <button type="button" aria-label="Close" onClick={() => void window.veiron.app.close()}>
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
