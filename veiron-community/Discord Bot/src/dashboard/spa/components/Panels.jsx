export function OverviewPanel({ summary }) {
  const stats = [
    ["Channels", summary.guild?.channels ?? 0],
    ["Roles", summary.guild?.roles ?? 0],
    ["Members", summary.guild?.members ?? 0],
    ["Cases", summary.counts?.moderationCases ?? 0],
    ["Open Tickets", summary.counts?.openTickets ?? 0],
    ["Automod Events", summary.counts?.automodEvents ?? 0],
    ["Spam Events", summary.counts?.spamEvents ?? 0],
    ["Audit Events", summary.counts?.auditEvents ?? 0],
    ["Scheduled", summary.counts?.scheduledAnnouncements ?? 0]
  ];

  return (
    <section className="view active">
      <div className="stats">
        {stats.map(([label, value]) => (
          <div className="stat" key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function EmbedPanel({ channels, canSend, onSend }) {
  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await onSend({
      channelId: String(form.get("channelId") ?? ""),
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      color: String(form.get("color") ?? "#d4af37")
    });
    event.currentTarget.reset();
  }

  return (
    <Panel title="Send Embed">
      {!canSend && <PermissionNote minimumRole="ADMIN" />}
      <form className="form-grid" onSubmit={handleSubmit}>
        <label htmlFor="embed-channel">Channel</label>
        <select id="embed-channel" name="channelId" disabled={!canSend}>
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>#{channel.name}</option>
          ))}
        </select>
        <label htmlFor="embed-title">Title</label>
        <input id="embed-title" name="title" placeholder="Veiron Update" disabled={!canSend} />
        <label htmlFor="embed-description">Description</label>
        <textarea id="embed-description" name="description" rows="8" placeholder="Draft update text..." disabled={!canSend} />
        <label htmlFor="embed-color">Color</label>
        <input id="embed-color" name="color" defaultValue="#d4af37" disabled={!canSend} />
        <button type="submit" disabled={!canSend}>Send Embed</button>
      </form>
    </Panel>
  );
}

export function TicketsPanel({ tickets, canView }) {
  return (
    <Panel title="Tickets">
      {canView ? (
        <DataList items={tickets} format={(item) => `${item.status} | ${item.userTag} | ${item.topic}`} />
      ) : (
        <PermissionNote minimumRole="MODERATOR" />
      )}
    </Panel>
  );
}

export function ModerationPanel({ cases, canView }) {
  return (
    <Panel title="Moderation Cases">
      {canView ? (
        <DataList items={cases} format={(item) => `${item.type} | ${item.targetTag} | ${item.reason}`} />
      ) : (
        <PermissionNote minimumRole="MODERATOR" />
      )}
    </Panel>
  );
}

export function ProposalsPanel({ proposals }) {
  return (
    <Panel title="Proposals">
      <DataList items={proposals} format={(item) => `${item.status} | ${item.yes}/${item.no} | ${item.title}`} />
    </Panel>
  );
}

export function AutomodPanel({ events, settings = {}, canView, canManage, onSave }) {
  const automod = {
    enabled: true,
    deleteBlockedMessages: true,
    blockDiscordInvites: true,
    blockMassMentions: true,
    maxMentions: 6,
    blockScamKeywords: true,
    scamKeywords: [],
    customRules: [],
    antiRaid: {
      enabled: true,
      joinWindowSeconds: 60,
      maxJoins: 8,
      alertCooldownMinutes: 5
    },
    ...(settings.automod ?? {}),
    antiRaid: {
      enabled: true,
      joinWindowSeconds: 60,
      maxJoins: 8,
      alertCooldownMinutes: 5,
      ...(settings.automod?.antiRaid ?? {})
    }
  };
  const ruleRows = [
    ...(Array.isArray(automod.customRules) ? automod.customRules : []),
    {},
    {},
    {},
    {},
    {}
  ].slice(0, 8);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await onSave({
      enabled: form.get("enabled") === "on",
      deleteBlockedMessages: form.get("deleteBlockedMessages") === "on",
      blockDiscordInvites: form.get("blockDiscordInvites") === "on",
      blockMassMentions: form.get("blockMassMentions") === "on",
      maxMentions: Number(form.get("maxMentions")),
      blockScamKeywords: form.get("blockScamKeywords") === "on",
      scamKeywords: parseTextareaList(form.get("scamKeywords")),
      customRules: ruleRows
        .map((_rule, index) => ({
          id: String(form.get(`ruleId-${index}`) ?? "").trim(),
          label: String(form.get(`ruleLabel-${index}`) ?? "").trim(),
          pattern: String(form.get(`rulePattern-${index}`) ?? "").trim(),
          flags: String(form.get(`ruleFlags-${index}`) ?? "i").trim(),
          reason: String(form.get(`ruleReason-${index}`) ?? "").trim(),
          enabled: form.get(`ruleEnabled-${index}`) === "on"
        }))
        .filter((rule) => rule.id || rule.label || rule.pattern || rule.reason),
      antiRaid: {
        enabled: form.get("antiRaidEnabled") === "on",
        joinWindowSeconds: Number(form.get("joinWindowSeconds")),
        maxJoins: Number(form.get("maxJoins")),
        alertCooldownMinutes: Number(form.get("alertCooldownMinutes"))
      }
    });
  }

  return (
    <Panel title="Automod Events">
      {!canView && <PermissionNote minimumRole="MODERATOR" />}
      {canView && (
        <>
          {!canManage && <PermissionNote minimumRole="ADMIN" />}
          <form className="form-grid automod-settings-form" onSubmit={handleSubmit}>
            <div className="form-section">
              <h3>Live configuration</h3>
              <span className="muted">Saved settings are read at runtime by message and join handlers. No redeploy is needed.</span>
            </div>
            <label className="checkbox-row">
              <input type="checkbox" name="enabled" defaultChecked={automod.enabled !== false} disabled={!canManage} />
              <span>Enable automod</span>
            </label>
            <label className="checkbox-row">
              <input type="checkbox" name="deleteBlockedMessages" defaultChecked={automod.deleteBlockedMessages !== false} disabled={!canManage} />
              <span>Delete blocked messages when possible</span>
            </label>
            <label className="checkbox-row">
              <input type="checkbox" name="blockDiscordInvites" defaultChecked={automod.blockDiscordInvites !== false} disabled={!canManage} />
              <span>Block Discord invite links</span>
            </label>
            <label className="checkbox-row">
              <input type="checkbox" name="blockMassMentions" defaultChecked={automod.blockMassMentions !== false} disabled={!canManage} />
              <span>Block mass mentions</span>
            </label>
            <label htmlFor="automod-max-mentions">Max mentions per message</label>
            <input id="automod-max-mentions" name="maxMentions" type="number" min="2" max="100" defaultValue={automod.maxMentions} disabled={!canManage} />
            <label className="checkbox-row">
              <input type="checkbox" name="blockScamKeywords" defaultChecked={automod.blockScamKeywords !== false} disabled={!canManage} />
              <span>Block scam keyword list</span>
            </label>
            <label htmlFor="automod-keywords">Scam keywords / phrases</label>
            <textarea
              id="automod-keywords"
              name="scamKeywords"
              rows="8"
              defaultValue={(Array.isArray(automod.scamKeywords) ? automod.scamKeywords : []).join("\n")}
              placeholder="seed phrase&#10;private key&#10;claim reward"
              disabled={!canManage}
            />
            <div className="form-section">
              <h3>Custom rules</h3>
              <span className="muted">Regex rules for community-specific scams, spam phrases or unsafe calls to action.</span>
            </div>
            <div className="custom-rule-grid">
              {ruleRows.map((rule, index) => (
                <div className="custom-rule-row" key={`rule-${index}`}>
                  <label htmlFor={`rule-id-${index}`}>Rule ID</label>
                  <input id={`rule-id-${index}`} name={`ruleId-${index}`} defaultValue={rule.id ?? ""} placeholder="fake-airdrop" disabled={!canManage} />
                  <label htmlFor={`rule-label-${index}`}>Label</label>
                  <input id={`rule-label-${index}`} name={`ruleLabel-${index}`} defaultValue={rule.label ?? ""} placeholder="Fake airdrop" disabled={!canManage} />
                  <label htmlFor={`rule-pattern-${index}`}>Regex pattern</label>
                  <input id={`rule-pattern-${index}`} name={`rulePattern-${index}`} defaultValue={rule.pattern ?? ""} placeholder="claim\\s+(free\\s+)?vire" disabled={!canManage} />
                  <label htmlFor={`rule-flags-${index}`}>Flags</label>
                  <input id={`rule-flags-${index}`} name={`ruleFlags-${index}`} maxLength="8" defaultValue={rule.flags ?? "i"} disabled={!canManage} />
                  <label htmlFor={`rule-reason-${index}`}>Reason</label>
                  <input id={`rule-reason-${index}`} name={`ruleReason-${index}`} defaultValue={rule.reason ?? ""} placeholder="Custom scam rule matched" disabled={!canManage} />
                  <label className="checkbox-row">
                    <input type="checkbox" name={`ruleEnabled-${index}`} defaultChecked={rule.enabled !== false} disabled={!canManage} />
                    <span>Active</span>
                  </label>
                </div>
              ))}
            </div>
            <div className="form-section">
              <h3>Anti-raid</h3>
              <span className="muted">Detects abnormal member join rate and alerts staff. It does not auto-ban or lock the server yet.</span>
            </div>
            <label className="checkbox-row">
              <input type="checkbox" name="antiRaidEnabled" defaultChecked={automod.antiRaid.enabled !== false} disabled={!canManage} />
              <span>Enable anti-raid join-rate detection</span>
            </label>
            <label htmlFor="join-window">Join window seconds</label>
            <input id="join-window" name="joinWindowSeconds" type="number" min="10" max="3600" defaultValue={automod.antiRaid.joinWindowSeconds} disabled={!canManage} />
            <label htmlFor="max-joins">Max joins in window</label>
            <input id="max-joins" name="maxJoins" type="number" min="2" max="500" defaultValue={automod.antiRaid.maxJoins} disabled={!canManage} />
            <label htmlFor="alert-cooldown">Alert cooldown minutes</label>
            <input id="alert-cooldown" name="alertCooldownMinutes" type="number" min="1" max="1440" defaultValue={automod.antiRaid.alertCooldownMinutes} disabled={!canManage} />
            <button type="submit" disabled={!canManage}>Save Automod Live Config</button>
          </form>
          <DataList items={events} format={(item) => `${item.userTag ?? item.userId ?? "system"} | ${item.reason} | ${item.matched}`} />
        </>
      )}
    </Panel>
  );
}

export function AntiSpamPanel({ events, canView }) {
  return (
    <Panel title="Anti-Spam Events">
      {canView ? (
        <DataList items={events} format={(item) => `${item.userTag} | ${item.messagesInWindow} messages | timeout ${item.timeoutMinutes}m`} />
      ) : (
        <PermissionNote minimumRole="MODERATOR" />
      )}
    </Panel>
  );
}

export function AuditLogPanel({ events = [], canView, channels = [], onSearch }) {
  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await onSearch({
      q: form.get("q"),
      type: form.get("type"),
      source: form.get("source"),
      actorUserId: form.get("actorUserId"),
      targetUserId: form.get("targetUserId"),
      channelId: form.get("channelId"),
      from: form.get("from"),
      to: form.get("to"),
      limit: form.get("limit")
    });
  }

  return (
    <Panel title="Audit Log">
      {canView ? (
        <div className="audit-layout">
          <form className="form-grid audit-filter-form" onSubmit={handleSubmit}>
            <div className="form-section">
              <h3>Search persisted events</h3>
              <span className="muted">Events are saved through the shared DAL and mirror the important actions posted to #mod-log.</span>
            </div>
            <label htmlFor="audit-q">Search text</label>
            <input id="audit-q" name="q" placeholder="case ID, user tag, reason, ticket topic..." />
            <label htmlFor="audit-type">Type</label>
            <select id="audit-type" name="type" defaultValue="">
              <option value="">Any type</option>
              <option value="warn">Warn</option>
              <option value="mute">Mute</option>
              <option value="unmute">Unmute</option>
              <option value="kick">Kick</option>
              <option value="ban">Ban</option>
              <option value="purge">Purge</option>
              <option value="ticket-opened">Ticket opened</option>
              <option value="ticket-closed">Ticket closed</option>
              <option value="automod">Automod</option>
              <option value="anti-spam">Anti-spam</option>
              <option value="announcement-published">Announcement published</option>
              <option value="scheduled-announcement-published">Scheduled announcement</option>
              <option value="proposal-created">Proposal created</option>
            </select>
            <label htmlFor="audit-source">Source</label>
            <select id="audit-source" name="source" defaultValue="">
              <option value="">Any source</option>
              <option value="moderation">Moderation</option>
              <option value="ticket">Ticket</option>
              <option value="automod">Automod</option>
              <option value="anti-spam">Anti-spam</option>
              <option value="announcement">Announcement</option>
              <option value="proposal">Proposal</option>
              <option value="system">System</option>
            </select>
            <label htmlFor="audit-actor">Actor user ID</label>
            <input id="audit-actor" name="actorUserId" placeholder="Moderator/admin Discord ID" />
            <label htmlFor="audit-target">Target user ID</label>
            <input id="audit-target" name="targetUserId" placeholder="Member Discord ID" />
            <label htmlFor="audit-channel">Channel</label>
            <select id="audit-channel" name="channelId" defaultValue="">
              <option value="">Any channel</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>#{channel.name}</option>
              ))}
            </select>
            <label htmlFor="audit-from">From</label>
            <input id="audit-from" name="from" type="datetime-local" />
            <label htmlFor="audit-to">To</label>
            <input id="audit-to" name="to" type="datetime-local" />
            <label htmlFor="audit-limit">Limit</label>
            <input id="audit-limit" name="limit" type="number" min="1" max="500" defaultValue="100" />
            <button type="submit">Search Audit Log</button>
          </form>
          <div className="audit-results">
            {events.length === 0 ? (
              <div className="item">No audit events matched.</div>
            ) : events.map((event) => (
              <div className="audit-event item" key={event.id}>
                <div className="audit-event-header">
                  <strong>{event.title}</strong>
                  <span>{formatDateTime(event.createdAt)}</span>
                </div>
                <span>{event.description || "No description."}</span>
                <div className="audit-meta">
                  <span>{event.type}</span>
                  <span>{event.source}</span>
                  {event.relatedId && <span>Ref: {event.relatedId}</span>}
                  {event.channelId && <span>Channel: {event.channelId}</span>}
                  {event.actorTag && <span>Actor: {event.actorTag}</span>}
                  {event.targetTag && <span>Target: {event.targetTag}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <PermissionNote minimumRole="MODERATOR" />
      )}
    </Panel>
  );
}

export function EconomyPanel({ settings, roles = [], canManage, onSave, onSaveEconomy }) {
  const xp = {
    enabled: true,
    messageXp: 15,
    messageCooldownSeconds: 60,
    voiceXpPerMinute: 5,
    minVoiceSessionSeconds: 60,
    levelCurve: "quadratic",
    levelBaseXp: 100,
    levelGrowthFactor: 1.35,
    maxLevel: 1000,
    roleRewards: [],
    ...(settings.xp ?? {})
  };
  const economy = {
    enabled: true,
    currencyName: "Shards",
    currencySymbol: "SHD",
    transferEnabled: true,
    minTransferAmount: 1,
    maxTransferAmount: 10000,
    starterBalance: 0,
    dailyAmount: 100,
    dailyCooldownHours: 24,
    workMinAmount: 15,
    workMaxAmount: 75,
    workCooldownMinutes: 60,
    shopEnabled: true,
    shopItems: [],
    showNotVireDisclaimer: true,
    ...(settings.economy ?? {})
  };
  const shopRows = [
    ...(Array.isArray(economy.shopItems) ? economy.shopItems : []),
    {},
    {},
    {},
    {},
    {}
  ].slice(0, 5);
  const rewardRows = [
    ...(Array.isArray(xp.roleRewards) ? xp.roleRewards : []),
    {},
    {},
    {},
    {},
    {},
    {},
    {},
    {},
    {},
    {},
    {}
  ].slice(0, 10);
  const previewLevels = [1, 2, 3, 4, 5, 10].map((level) => ({
    level,
    xp: calculatePreviewXpForLevel(level, xp)
  }));

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await onSave({
      enabled: form.get("enabled") === "on",
      messageXp: Number(form.get("messageXp")),
      messageCooldownSeconds: Number(form.get("messageCooldownSeconds")),
      voiceXpPerMinute: Number(form.get("voiceXpPerMinute")),
      minVoiceSessionSeconds: Number(form.get("minVoiceSessionSeconds")),
      levelCurve: String(form.get("levelCurve") ?? "quadratic"),
      levelBaseXp: Number(form.get("levelBaseXp")),
      levelGrowthFactor: Number(form.get("levelGrowthFactor")),
      maxLevel: Number(form.get("maxLevel")),
      roleRewards: rewardRows
        .map((_row, index) => {
          const roleId = String(form.get(`rewardRoleId-${index}`) ?? "").trim();
          const role = roles.find((item) => item.id === roleId);
          return {
            level: Number(form.get(`rewardLevel-${index}`)),
            roleId,
            roleName: role?.name ?? ""
          };
        })
        .filter((reward) => reward.level > 0 && reward.roleId)
    });
  }

  async function handleEconomySubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await onSaveEconomy({
      enabled: form.get("economyEnabled") === "on",
      currencyName: String(form.get("currencyName") ?? "Shards"),
      currencySymbol: String(form.get("currencySymbol") ?? "SHD"),
      transferEnabled: form.get("transferEnabled") === "on",
      minTransferAmount: Number(form.get("minTransferAmount")),
      maxTransferAmount: Number(form.get("maxTransferAmount")),
      starterBalance: Number(form.get("starterBalance")),
      dailyAmount: Number(form.get("dailyAmount")),
      dailyCooldownHours: Number(form.get("dailyCooldownHours")),
      workMinAmount: Number(form.get("workMinAmount")),
      workMaxAmount: Number(form.get("workMaxAmount")),
      workCooldownMinutes: Number(form.get("workCooldownMinutes")),
      shopEnabled: form.get("shopEnabled") === "on",
      shopItems: shopRows
        .map((_row, index) => {
          const roleId = String(form.get(`shopRoleId-${index}`) ?? "").trim();
          const role = roles.find((item) => item.id === roleId);
          const name = String(form.get(`shopName-${index}`) ?? "").trim();
          return {
            id: String(form.get(`shopId-${index}`) ?? "").trim(),
            name,
            description: String(form.get(`shopDescription-${index}`) ?? "").trim(),
            price: Number(form.get(`shopPrice-${index}`)),
            roleId,
            roleName: role?.name ?? name,
            active: form.get(`shopActive-${index}`) === "on"
          };
        })
        .filter((item) => item.id && item.roleId && item.price > 0),
      showNotVireDisclaimer: form.get("showNotVireDisclaimer") === "on"
    });
  }

  return (
    <Panel title="Economy / Leveling">
      {!canManage && <PermissionNote minimumRole="ADMIN" />}
      <form className="form-grid xp-settings-form" onSubmit={handleEconomySubmit}>
        <div className="form-section">
          <h3>Server-only currency</h3>
          <span className="muted">This is a social points system for minigames and community rewards. It is separate from VIRE.</span>
        </div>
        <label className="checkbox-row">
          <input type="checkbox" name="economyEnabled" defaultChecked={economy.enabled !== false} disabled={!canManage} />
          <span>Enable social currency</span>
        </label>
        <label htmlFor="currency-name">Currency name</label>
        <input id="currency-name" name="currencyName" maxLength="32" defaultValue={economy.currencyName} disabled={!canManage} />
        <label htmlFor="currency-symbol">Currency symbol</label>
        <input id="currency-symbol" name="currencySymbol" maxLength="8" defaultValue={economy.currencySymbol} disabled={!canManage} />
        <label htmlFor="starter-balance">Starter balance</label>
        <input id="starter-balance" name="starterBalance" type="number" min="0" defaultValue={economy.starterBalance} disabled={!canManage} />
        <label htmlFor="daily-amount">Daily reward</label>
        <input id="daily-amount" name="dailyAmount" type="number" min="1" defaultValue={economy.dailyAmount} disabled={!canManage} />
        <label htmlFor="daily-cooldown">Daily cooldown hours</label>
        <input id="daily-cooldown" name="dailyCooldownHours" type="number" min="1" defaultValue={economy.dailyCooldownHours} disabled={!canManage} />
        <label htmlFor="work-min">Work min reward</label>
        <input id="work-min" name="workMinAmount" type="number" min="1" defaultValue={economy.workMinAmount} disabled={!canManage} />
        <label htmlFor="work-max">Work max reward</label>
        <input id="work-max" name="workMaxAmount" type="number" min="1" defaultValue={economy.workMaxAmount} disabled={!canManage} />
        <label htmlFor="work-cooldown">Work cooldown minutes</label>
        <input id="work-cooldown" name="workCooldownMinutes" type="number" min="1" defaultValue={economy.workCooldownMinutes} disabled={!canManage} />
        <label className="checkbox-row">
          <input type="checkbox" name="transferEnabled" defaultChecked={economy.transferEnabled !== false} disabled={!canManage} />
          <span>Allow member transfers</span>
        </label>
        <label htmlFor="min-transfer">Minimum transfer</label>
        <input id="min-transfer" name="minTransferAmount" type="number" min="1" defaultValue={economy.minTransferAmount} disabled={!canManage} />
        <label htmlFor="max-transfer">Maximum transfer</label>
        <input id="max-transfer" name="maxTransferAmount" type="number" min="1" defaultValue={economy.maxTransferAmount} disabled={!canManage} />
        <label className="checkbox-row">
          <input type="checkbox" name="showNotVireDisclaimer" defaultChecked={economy.showNotVireDisclaimer !== false} disabled={!canManage} />
          <span>Show “not VIRE” disclaimer in bot responses</span>
        </label>
        <div className="form-section">
          <h3>Cosmetic role shop</h3>
          <span className="muted">Members can spend Shards on configured cosmetic Discord roles.</span>
        </div>
        <label className="checkbox-row">
          <input type="checkbox" name="shopEnabled" defaultChecked={economy.shopEnabled !== false} disabled={!canManage} />
          <span>Enable cosmetic shop</span>
        </label>
        <div className="shop-grid">
          {shopRows.map((item, index) => (
            <div className="shop-row" key={`shop-${index}`}>
              <label htmlFor={`shop-id-${index}`}>Item ID</label>
              <input id={`shop-id-${index}`} name={`shopId-${index}`} maxLength="40" defaultValue={item.id ?? ""} placeholder="gold-name" disabled={!canManage} />
              <label htmlFor={`shop-name-${index}`}>Name</label>
              <input id={`shop-name-${index}`} name={`shopName-${index}`} maxLength="60" defaultValue={item.name ?? ""} placeholder="Gold Name" disabled={!canManage} />
              <label htmlFor={`shop-price-${index}`}>Price</label>
              <input id={`shop-price-${index}`} name={`shopPrice-${index}`} type="number" min="1" defaultValue={item.price ?? ""} disabled={!canManage} />
              <label htmlFor={`shop-role-${index}`}>Role</label>
              <select id={`shop-role-${index}`} name={`shopRoleId-${index}`} defaultValue={item.roleId ?? ""} disabled={!canManage || roles.length === 0}>
                <option value="">No cosmetic role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
              <label htmlFor={`shop-description-${index}`}>Description</label>
              <input id={`shop-description-${index}`} name={`shopDescription-${index}`} maxLength="120" defaultValue={item.description ?? ""} placeholder="Cosmetic role reward" disabled={!canManage} />
              <label className="checkbox-row">
                <input type="checkbox" name={`shopActive-${index}`} defaultChecked={item.active !== false} disabled={!canManage} />
                <span>Active</span>
              </label>
            </div>
          ))}
        </div>
        <button type="submit" disabled={!canManage}>Save Economy Settings</button>
      </form>
      <form className="form-grid xp-settings-form" onSubmit={handleSubmit}>
        <div className="form-section">
          <h3>XP engine</h3>
          <span className="muted">XP, level curve, voice rewards and level-based Discord roles.</span>
        </div>
        <label className="checkbox-row">
          <input type="checkbox" name="enabled" defaultChecked={xp.enabled !== false} disabled={!canManage} />
          <span>Enable XP engine</span>
        </label>
        <label htmlFor="xp-message">Message XP</label>
        <input id="xp-message" name="messageXp" type="number" min="0" defaultValue={xp.messageXp} disabled={!canManage} />
        <label htmlFor="xp-cooldown">Message cooldown seconds</label>
        <input id="xp-cooldown" name="messageCooldownSeconds" type="number" min="0" defaultValue={xp.messageCooldownSeconds} disabled={!canManage} />
        <label htmlFor="xp-voice">Voice XP per minute</label>
        <input id="xp-voice" name="voiceXpPerMinute" type="number" min="0" defaultValue={xp.voiceXpPerMinute} disabled={!canManage} />
        <label htmlFor="xp-min-voice">Minimum voice session seconds</label>
        <input id="xp-min-voice" name="minVoiceSessionSeconds" type="number" min="0" defaultValue={xp.minVoiceSessionSeconds} disabled={!canManage} />
        <label htmlFor="xp-curve">Level curve</label>
        <select id="xp-curve" name="levelCurve" defaultValue={xp.levelCurve} disabled={!canManage}>
          <option value="linear">Linear</option>
          <option value="quadratic">Quadratic</option>
          <option value="exponential">Exponential</option>
        </select>
        <label htmlFor="xp-base">Base XP</label>
        <input id="xp-base" name="levelBaseXp" type="number" min="1" defaultValue={xp.levelBaseXp} disabled={!canManage} />
        <label htmlFor="xp-growth">Exponential growth factor</label>
        <input id="xp-growth" name="levelGrowthFactor" type="number" min="1.01" max="10" step="0.01" defaultValue={xp.levelGrowthFactor} disabled={!canManage} />
        <label htmlFor="xp-max-level">Max level</label>
        <input id="xp-max-level" name="maxLevel" type="number" min="1" defaultValue={xp.maxLevel} disabled={!canManage} />
        <div className="form-section">
          <h3>Level role rewards</h3>
          <span className="muted">Assign a Discord role automatically when a member reaches a configured level.</span>
        </div>
        <div className="reward-grid">
          {rewardRows.map((reward, index) => (
            <div className="reward-row" key={`reward-${index}`}>
              <label htmlFor={`reward-level-${index}`}>Level</label>
              <input
                id={`reward-level-${index}`}
                name={`rewardLevel-${index}`}
                type="number"
                min="1"
                defaultValue={reward.level ?? ""}
                disabled={!canManage}
              />
              <label htmlFor={`reward-role-${index}`}>Role</label>
              <select
                id={`reward-role-${index}`}
                name={`rewardRoleId-${index}`}
                defaultValue={reward.roleId ?? ""}
                disabled={!canManage || roles.length === 0}
              >
                <option value="">No reward role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
        {roles.length === 0 && (
          <div className="item muted">Discord roles are loaded when the admin API can reach the configured guild.</div>
        )}
        <button type="submit" disabled={!canManage}>Save XP Settings</button>
      </form>
      <div className="placeholder-grid xp-preview">
        {previewLevels.map((item) => (
          <div className="item" key={item.level}>
            <strong>Level {item.level}</strong>
            <span>{item.xp.toLocaleString()} total XP</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function PermissionControllerPanel({ policies = {}, roles = [], canManage, onSave }) {
  const normalized = {
    allowAdministrator: policies.allowAdministrator !== false,
    allowManageGuild: policies.allowManageGuild !== false,
    setupAllowedUserIds: Array.isArray(policies.setupAllowedUserIds) ? policies.setupAllowedUserIds : [],
    managerRoleIds: Array.isArray(policies.managerRoleIds) ? policies.managerRoleIds : [],
    managerRoleNames: Array.isArray(policies.managerRoleNames) ? policies.managerRoleNames : ["Founder", "Core Team", "Admin"]
  };
  const selectedRoleIds = new Set(normalized.managerRoleIds);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await onSave({
      allowAdministrator: form.get("allowAdministrator") === "on",
      allowManageGuild: form.get("allowManageGuild") === "on",
      setupAllowedUserIds: parseTextareaList(form.get("setupAllowedUserIds")),
      managerRoleNames: parseTextareaList(form.get("managerRoleNames")),
      managerRoleIds: form.getAll("managerRoleIds").map(String)
    });
  }

  return (
    <Panel title="Permission Controller">
      {!canManage && <PermissionNote minimumRole="ADMIN" />}
      <div className="permission-layout">
        <form className="form-grid permission-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>Global manager rules</h3>
            <span className="muted">Controls who can manage bot modules, embeds, tags, triggers, server playlists, XP rewards and similar admin workflows.</span>
          </div>
          <label className="checkbox-row">
            <input type="checkbox" name="allowAdministrator" defaultChecked={normalized.allowAdministrator} disabled={!canManage} />
            <span>Discord Administrator can manage the community bot</span>
          </label>
          <label className="checkbox-row">
            <input type="checkbox" name="allowManageGuild" defaultChecked={normalized.allowManageGuild} disabled={!canManage} />
            <span>Discord Manage Server permission can manage the community bot</span>
          </label>
          <label htmlFor="setup-user-ids">Setup allowed user IDs</label>
          <textarea
            id="setup-user-ids"
            name="setupAllowedUserIds"
            rows="4"
            defaultValue={normalized.setupAllowedUserIds.join("\n")}
            placeholder="Discord user IDs, one per line"
            disabled={!canManage}
          />
          <label htmlFor="manager-role-names">Manager role names fallback</label>
          <textarea
            id="manager-role-names"
            name="managerRoleNames"
            rows="4"
            defaultValue={normalized.managerRoleNames.join("\n")}
            placeholder="Founder&#10;Core Team&#10;Admin"
            disabled={!canManage}
          />
          <div className="form-section">
            <h3>Discord role access</h3>
            <span className="muted">Selected roles can manage protected community bot features even if their names change later.</span>
          </div>
          <div className="role-picker">
            {roles.length === 0 ? (
              <div className="item muted">No Discord roles loaded yet.</div>
            ) : roles.map((role) => (
              <label className="role-option" key={role.id}>
                <input
                  type="checkbox"
                  name="managerRoleIds"
                  value={role.id}
                  defaultChecked={selectedRoleIds.has(role.id)}
                  disabled={!canManage}
                />
                <span>
                  <strong>{role.name}</strong>
                  <small>Position {role.position}</small>
                </span>
              </label>
            ))}
          </div>
          <button type="submit" disabled={!canManage}>Save Permission Controller</button>
        </form>
        <div className="permission-summary">
          <div className="item">
            <strong>Setup command</strong>
            <span>Allowed user IDs + Administrator when enabled.</span>
          </div>
          <div className="item">
            <strong>Community bot management</strong>
            <span>Allowed user IDs, selected roles, fallback role names, Administrator and Manage Server when enabled.</span>
          </div>
          <div className="item">
            <strong>Dashboard RBAC</strong>
            <span>API route roles still apply separately: VIEWER, MODERATOR, ADMIN and SUPER_ADMIN.</span>
          </div>
          <div className="item">
            <strong>Selected roles</strong>
            <span>{normalized.managerRoleIds.length} role ID rule{normalized.managerRoleIds.length === 1 ? "" : "s"} active.</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}

export function RoadmapPanel({ title, phase, status, description, items }) {
  return (
    <Panel title={title}>
      <div className="roadmap-panel">
        <div className="item">
          <strong>{status}</strong>
          <span>{description}</span>
        </div>
        <div className="placeholder-grid">
          <div className="item">
            <strong>Target phase</strong>
            <span>{phase}</span>
          </div>
          {items.map((item) => (
            <div className="item" key={item.title}>
              <strong>{item.title}</strong>
              <span>{item.description}</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

export function BlockchainPanel({ status, onRefresh }) {
  if (!status) {
    return (
      <Panel title="Blockchain Status">
        <div className="item muted">Blockchain status has not loaded yet.</div>
        <button type="button" onClick={onRefresh}>Refresh Blockchain Status</button>
      </Panel>
    );
  }

  const metrics = status.metrics ?? {};
  const network = status.network ?? {};
  const history = Array.isArray(status.history) ? status.history : [];
  const statItems = [
    ["RPC Status", status.status ?? "unknown"],
    ["Mode", status.mode ?? "unknown"],
    ["Uptime", formatPercent(metrics.uptimePercent)],
    ["Latency", formatMs(metrics.latestLatencyMs)],
    ["Block Height", formatNumber(metrics.latestBlockHeight)],
    ["Active Nodes", formatNumber(metrics.activeNodes)],
    ["Hash Rate", formatHashRate(metrics.hashRate)],
    ["Circulating Supply", formatSupply(metrics.circulatingSupply)]
  ];

  return (
    <Panel title="Blockchain Status">
      <div className="blockchain-layout">
        {status.alert && (
          <div className={`chain-alert ${status.alert.severity === "critical" ? "critical" : "warning"}`}>
            <strong>{status.alert.title}</strong>
            <span>{status.alert.message}</span>
            {status.alert.downSince && <span>Down since: {formatDateTime(status.alert.downSince)}</span>}
          </div>
        )}
        <div className="blockchain-toolbar">
          <span className="muted">Last updated: {formatDateTime(status.updatedAt)}</span>
          <button type="button" onClick={onRefresh}>Refresh</button>
        </div>
        <div className="stats blockchain-stats">
          {statItems.map(([label, value]) => (
            <div className="stat" key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div className="placeholder-grid">
          <div className="item">
            <strong>Source</strong>
            <span>{network.source ?? "Unavailable"}</span>
          </div>
          <div className="item">
            <strong>Network</strong>
            <span>{network.network ?? "Unavailable"}</span>
          </div>
          <div className="item">
            <strong>Latest Hash</strong>
            <span>{network.latestBlockHash ?? "Unavailable"}</span>
          </div>
          <div className="item">
            <strong>Samples</strong>
            <span>{metrics.sampleCount ?? history.length} monitoring sample(s)</span>
          </div>
        </div>
        <div className="chart-grid">
          <SparklineChart title="Block Height" items={history} valueKey="blockHeight" formatValue={formatNumber} />
          <SparklineChart title="RPC Latency" items={history} valueKey="latencyMs" formatValue={formatMs} />
        </div>
      </div>
    </Panel>
  );
}

export function SettingsPanel({ settings, onTotpSetup, onTotpConfirm, onTotpDisable, pwa }) {
  async function handleConfirm(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await onTotpConfirm(String(form.get("code") ?? ""));
    event.currentTarget.reset();
  }

  async function handleDisable(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await onTotpDisable(String(form.get("code") ?? ""));
    event.currentTarget.reset();
  }

  return (
    <Panel title="Settings">
      <div className="settings-grid">
        <div className="totp-box">
          <h3>PWA</h3>
          <div className="item">
            <strong>Install status</strong>
            <span>{pwa.canInstall ? "Install prompt available." : "Install prompt unavailable or app already installed."}</span>
            <button type="button" onClick={pwa.onInstall} disabled={!pwa.canInstall}>Install on device</button>
          </div>
          <div className="item">
            <strong>Web push</strong>
            <span>Supported: {String(pwa.pushState.supported)}</span>
            <span>Server enabled: {String(pwa.pushState.enabled)}</span>
            <span>Permission: {pwa.pushState.permission}</span>
            <span>Subscribed: {String(pwa.pushState.subscribed)}</span>
            <div className="inline-actions">
              <button type="button" onClick={pwa.onSubscribePush} disabled={!pwa.pushState.supported || pwa.pushState.subscribed}>Subscribe</button>
              <button type="button" onClick={pwa.onUnsubscribePush} disabled={!pwa.pushState.supported || !pwa.pushState.subscribed}>Unsubscribe</button>
              <button type="button" onClick={pwa.onSendTestPush} disabled={!pwa.canSendTestPush || !pwa.pushState.subscribed}>Send test</button>
            </div>
          </div>
          <h3>Two-factor authentication</h3>
          <button type="button" onClick={onTotpSetup}>Setup 2FA</button>
          <form className="inline-form" onSubmit={handleConfirm}>
            <input name="code" inputMode="numeric" placeholder="2FA code" autoComplete="one-time-code" />
            <button type="submit">Confirm 2FA</button>
          </form>
          <form className="inline-form" onSubmit={handleDisable}>
            <input name="code" inputMode="numeric" placeholder="2FA code" autoComplete="one-time-code" />
            <button type="submit">Disable 2FA</button>
          </form>
        </div>
        <pre>{JSON.stringify(settings, null, 2)}</pre>
      </div>
    </Panel>
  );
}

export function TotpResult({ result }) {
  if (!result) return null;
  return (
    <section className="notice">
      <strong>{result.title}</strong>
      {result.lines.map((line, index) => (
        <span className="block-line" key={`${line}-${index}`}>{line}</span>
      ))}
    </section>
  );
}

function Panel({ title, children }) {
  return (
    <section className="view active">
      <div className="panel">
        <h2>{title}</h2>
        {children}
      </div>
    </section>
  );
}

function DataList({ items = [], format }) {
  const visible = items.slice(-30).reverse();
  if (visible.length === 0) {
    return <div className="item">No data yet.</div>;
  }

  return (
    <div className="list">
      {visible.map((item) => (
        <div className="item" key={item.id}>
          <strong>{item.id}</strong>
          <span>{format(item)}</span>
        </div>
      ))}
    </div>
  );
}

function PermissionNote({ minimumRole }) {
  return <div className="item muted">Requires minimum role: {minimumRole}.</div>;
}

function SparklineChart({ title, items, valueKey, formatValue }) {
  const points = items
    .map((item) => ({
      value: Number(item?.[valueKey]),
      label: item?.createdAt
    }))
    .filter((item) => Number.isFinite(item.value));
  const width = 420;
  const height = 160;
  const latest = points.at(-1)?.value ?? null;

  return (
    <div className="chart-card">
      <div className="chart-header">
        <strong>{title}</strong>
        <span>{latest == null ? "No data" : formatValue(latest)}</span>
      </div>
      {points.length < 2 ? (
        <div className="chart-empty">Need at least two samples for a graph.</div>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title} chart`}>
          <path className="chart-grid-line" d={`M0 ${height - 24} H${width}`} />
          <path className="chart-line" d={buildSparklinePath(points, width, height)} />
          {points.map((point, index) => {
            const [cx, cy] = pointToSvg(point.value, index, points, width, height);
            return <circle key={`${point.label}-${index}`} cx={cx} cy={cy} r="3" />;
          })}
        </svg>
      )}
    </div>
  );
}

function buildSparklinePath(points, width, height) {
  return points.map((point, index) => {
    const [x, y] = pointToSvg(point.value, index, points, width, height);
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ");
}

function pointToSvg(value, index, points, width, height) {
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padding = 18;
  const x = points.length === 1
    ? width / 2
    : padding + (index / (points.length - 1)) * (width - padding * 2);
  const y = height - padding - ((value - min) / range) * (height - padding * 2);
  return [x, y];
}

function formatDateTime(value) {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function formatNumber(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Unavailable";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Unavailable";
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)}%`;
}

function formatMs(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Unavailable";
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)} ms`;
}

function formatSupply(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Unavailable";
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)} VIRE`;
}

function formatHashRate(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Unavailable";
  const units = ["H/s", "KH/s", "MH/s", "GH/s", "TH/s", "PH/s"];
  let rate = value;
  let unitIndex = 0;
  while (rate >= 1000 && unitIndex < units.length - 1) {
    rate /= 1000;
    unitIndex += 1;
  }
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(rate)} ${units[unitIndex]}`;
}

function parseTextareaList(value) {
  return String(value ?? "")
    .split(/[\n,]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function calculatePreviewXpForLevel(level, xp) {
  const base = Math.max(1, Number(xp.levelBaseXp) || 100);
  const targetLevel = Math.max(0, Number(level) || 0);

  if (xp.levelCurve === "linear") {
    return Math.floor(base * targetLevel);
  }

  if (xp.levelCurve === "exponential") {
    const growth = Math.max(1.01, Number(xp.levelGrowthFactor) || 1.35);
    return Math.floor(base * ((growth ** targetLevel - 1) / (growth - 1)));
  }

  return Math.floor(base * targetLevel * targetLevel);
}
