import { KeyRound, ShieldCheck, X } from "lucide-react";

interface RecoveryPhraseImportProps {
  open: boolean;
  walletName: string;
  busy: boolean;
  onClose(): void;
  /** Opens the native OS dialog — phrase never enters React. */
  onImport(walletName: string): Promise<void>;
}

/**
 * Confirms native import only. Recovery phrase is collected by the Rust keystore
 * helper OS dialog (A-H08) — not by this WebView component.
 */
export function RecoveryPhraseImport({
  open,
  walletName,
  busy,
  onClose,
  onImport
}: RecoveryPhraseImportProps) {
  if (!open) return null;

  const close = () => {
    if (busy) return;
    onClose();
  };

  const submit = async () => {
    if (!walletName.trim()) return;
    try {
      await onImport(walletName.trim());
      onClose();
    } catch {
      // Parent surfaces the error notice.
    }
  };

  return (
    <div
      className="secret-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section className="secret-modal" role="dialog" aria-modal="true" aria-labelledby="recovery-import-title">
        <header>
          <span className="secret-modal-icon">
            <KeyRound size={22} />
          </span>
          <div>
            <small>Secure wallet recovery</small>
            <h2 id="recovery-import-title">Import 24-word wallet</h2>
          </div>
          <button className="icon-button" aria-label="Close import dialog" disabled={busy} onClick={close}>
            <X size={18} />
          </button>
        </header>
        <p className="muted">
          The recovery phrase is entered in a <strong>native OS dialog</strong> owned by the keystore
          helper. It never passes through this window, React state, or logs.
        </p>
        <div className="secret-warning">
          <ShieldCheck size={18} />
          <span>
            Wallet name: <b>{walletName.trim() || "Unnamed wallet"}</b>. Only continue on a trusted
            device.
          </span>
        </div>
        <footer>
          <button className="button" disabled={busy} onClick={close}>
            Cancel
          </button>
          <button
            className="button primary"
            disabled={busy || !walletName.trim()}
            onClick={() => void submit()}
          >
            {busy ? "Waiting for native dialog..." : "Open secure import"}
          </button>
        </footer>
      </section>
    </div>
  );
}
