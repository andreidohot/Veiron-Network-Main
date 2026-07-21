import { useEffect, useMemo, useState } from "react";

const NAV_ITEMS = [
  ["overview", "Overview", "core"],
  ["web", "Web Workspace", "core"],
  ["commands", "Command Center", "ops"],
  ["control", "Control Center", "ops"],
  ["operations", "Bot Studio", "ops"],
  ["custom", "Custom Lab", "builder"],
  ["automations", "Automation Studio", "builder"],
  ["modules", "Module Center", "platform"],
  ["embeds", "Embeds", "content"],
  ["tickets", "Tickets", "support"],
  ["moderation", "Moderation", "safety"],
  ["proposals", "Proposals", "community"],
  ["automod", "Automod", "safety"],
  ["spam", "Anti-Spam", "safety"],
  ["audit", "Audit Log", "safety"],
  ["economy", "Economy/Leveling", "community"],
  ["permissions", "Permissions", "security"],
  ["music", "Music", "optional"],
  ["wallet", "Wallet/Payments", "optional"],
  ["blockchain", "Blockchain Status", "optional"],
  ["settings", "Settings", "security"]
];

export function Shell({ route, onRouteChange, auth, status, web, children, onLogin, onLogout }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [navFilter, setNavFilter] = useState("");
  const preferences = web?.preferences ?? {};
  const paletteEnabled = preferences.commandPaletteEnabled !== false;
  const pinnedRoutes = new Set(preferences.pinnedRoutes ?? []);
  const routeMeta = new Map((web?.routes ?? []).map((item) => [item.id, item]));
  const navItems = NAV_ITEMS.map(([key, label, group]) => ({
    key,
    label: routeMeta.get(key)?.label ?? label,
    group: routeMeta.get(key)?.group ?? group,
    available: routeMeta.get(key)?.available ?? true,
    pinned: pinnedRoutes.has(key)
  }));
  const filteredNavItems = navItems.filter((item) => {
    if (!navFilter.trim()) return true;
    const haystack = `${item.label} ${item.key} ${item.group}`.toLowerCase();
    return haystack.includes(navFilter.trim().toLowerCase());
  });

  useEffect(() => {
    const handleKeyDown = (event) => {
      const isPalette = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
      if (isPalette && paletteEnabled) {
        event.preventDefault();
        setPaletteOpen(true);
      }
      if (event.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [paletteEnabled]);

  function navigate(nextRoute) {
    setPaletteOpen(false);
    onRouteChange(nextRoute);
  }

  return (
    <div className={`dashboard-shell density-${preferences.density ?? "comfortable"} ${preferences.compactMode ? "compact-mode" : ""} ${preferences.reduceMotion ? "reduce-motion" : ""}`}>
      <aside className="sidebar">
        <div className="brand">
          <span className="mark">V</span>
          <div>
            <strong>VBOS</strong>
            <small>Operations Studio</small>
          </div>
        </div>
        <button className="palette-trigger" type="button" onClick={() => setPaletteOpen(true)} disabled={!paletteEnabled}>
          <span>Command Palette</span>
          <kbd>Ctrl K</kbd>
        </button>
        <input
          className="nav-filter"
          value={navFilter}
          onChange={(event) => setNavFilter(event.target.value)}
          placeholder="Filter panel..."
          aria-label="Filter dashboard navigation"
        />
        <nav aria-label="Dashboard sections">
          {filteredNavItems.map((item) => (
            <button
              className={`${route === item.key ? "active" : ""} ${item.pinned ? "pinned" : ""}`}
              key={item.key}
              onClick={() => navigate(item.key)}
              type="button"
              disabled={!item.available}
              title={item.available ? item.group : "Role access required"}
            >
              <span>{item.label}</span>
              {item.pinned && <small>pin</small>}
            </button>
          ))}
        </nav>
      </aside>

      <main>
        <header>
          <div>
            <h1>VBOS</h1>
            <p>Single control panel for Discord community operations.</p>
          </div>
          <AuthBar auth={auth} onLogin={onLogin} onLogout={onLogout} />
        </header>

        <section className="notice" role="status">{status}</section>
        {children}
      </main>
      {paletteOpen && paletteEnabled && (
        <CommandPalette
          items={navItems}
          quickActions={web?.quickActions ?? []}
          onClose={() => setPaletteOpen(false)}
          onNavigate={navigate}
        />
      )}
    </div>
  );
}

function CommandPalette({ items, quickActions, onClose, onNavigate }) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const routeMatches = items
      .filter((item) => item.available !== false)
      .filter((item) => !q || `${item.label} ${item.key} ${item.group}`.toLowerCase().includes(q))
      .slice(0, 12)
      .map((item) => ({ id: item.key, label: item.label, group: item.group, route: item.key, type: "route" }));
    const actionMatches = quickActions
      .filter((item) => item.available !== false)
      .filter((item) => !q || `${item.label} ${item.route} ${item.group} ${item.description}`.toLowerCase().includes(q))
      .slice(0, 10)
      .map((item) => ({ ...item, type: "action" }));
    return [...routeMatches, ...actionMatches].slice(0, 16);
  }, [items, query, quickActions]);

  return (
    <div className="palette-backdrop" role="presentation" onClick={onClose}>
      <section className="command-palette" role="dialog" aria-modal="true" aria-label="Command Palette" onClick={(event) => event.stopPropagation()}>
        <div className="palette-head">
          <strong>VBOS Command Palette</strong>
          <button type="button" onClick={onClose}>Close</button>
        </div>
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search panel or quick action..."
        />
        <div className="palette-results">
          {matches.length === 0 && <div className="palette-item muted">No matching panel.</div>}
          {matches.map((item) => (
            <button key={`${item.type}-${item.id}`} type="button" className="palette-item" onClick={() => onNavigate(item.route)}>
              <span>
                <strong>{item.label}</strong>
                <small>{item.type === "action" ? item.description : item.group}</small>
              </span>
              <kbd>#{item.route}</kbd>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function AuthBar({ auth, onLogin, onLogout }) {
  const userLabel = auth.user ? `${auth.user.email} (${auth.user.role})` : "Not logged in";

  async function handleLogin(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await onLogin({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      totpCode: String(form.get("totpCode") ?? "")
    });
    event.currentTarget.reset();
  }

  return (
    <div className="auth-panel">
      <span>{userLabel}</span>
      <form className="auth-box" onSubmit={handleLogin}>
        <input name="email" type="email" placeholder="Email" autoComplete="username" />
        <input name="password" type="password" placeholder="Password" autoComplete="current-password" />
        <input name="totpCode" inputMode="numeric" placeholder="2FA code" autoComplete="one-time-code" />
        <button type="submit">Login</button>
        <button type="button" onClick={onLogout}>Logout</button>
      </form>
    </div>
  );
}
