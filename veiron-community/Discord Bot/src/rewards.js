import { createVeironEmbed } from "./embed-factory.js";

export const WALLET_LINKS_COLLECTION = "wallet-links";

const ACTIVE_WALLET_LINK_STATUSES = new Set(["active", "linked", "verified", "custodial"]);

export function registerRewardsHandlers({ store, chainClient }) {
  return async function handleRewardsCommand(interaction) {
    if (!interaction.isChatInputCommand() || interaction.commandName !== "rewards") return false;

    await handleRewards(interaction, { store, chainClient });
    return true;
  };
}

export async function handleRewards(interaction, { store, chainClient }) {
  const target = interaction.options.getUser("user", false) ?? interaction.user;
  await interaction.deferReply({ ephemeral: true });

  const walletLink = await getWalletLinkForUser(store, {
    guildId: interaction.guildId,
    userId: target.id
  });

  if (!walletLink) {
    await interaction.editReply({
      embeds: [
        createVeironEmbed({
          title: "Veiron Rewards",
          description: [
            target.id === interaction.user.id
              ? "No verified wallet is linked to your Discord account yet."
              : `No verified wallet is linked for **${target.username}** yet.`,
            "",
            "Rewards require the Phase 6 Discord ↔ wallet link flow before mining, staking or node rewards can be queried.",
            "Once `/register` / wallet linking is available, this command will read the linked address automatically."
          ].join("\n"),
          color: 0x8b1e24,
          footer: "Veiron Rewards | Wallet link required"
        })
      ]
    });
    return;
  }

  const rewards = await chainClient.getRewardsForAddress(walletLink.address);

  await interaction.editReply({
    embeds: [
      createVeironEmbed({
        title: "Veiron Rewards",
        description: buildRewardsDescription({ rewards, walletLink, target }),
        color: rewards.ok ? 0xd4af37 : 0x8b1e24,
        fields: [
          { name: "Wallet", value: formatAddress(walletLink.address), inline: false },
          { name: "Mining", value: formatRewardAmount(rewards.miningRewards, rewards.currency), inline: true },
          { name: "Staking", value: formatRewardAmount(rewards.stakingRewards, rewards.currency), inline: true },
          { name: "Node", value: formatRewardAmount(rewards.nodeRewards, rewards.currency), inline: true },
          { name: "Claimable", value: formatRewardAmount(rewards.claimableRewards, rewards.currency), inline: true },
          { name: "Pending", value: formatRewardAmount(rewards.pendingRewards, rewards.currency), inline: true },
          { name: "Paid", value: formatRewardAmount(rewards.paidRewards, rewards.currency), inline: true },
          { name: "Total", value: formatRewardAmount(rewards.totalRewards, rewards.currency), inline: true },
          { name: "Status", value: formatStatusValue(rewards.rawStatus ?? rewards.status), inline: true },
          { name: "Source", value: formatStatusValue(rewards.source), inline: true }
        ],
        footer: rewards.mock ? "Veiron Rewards | Mock adapter" : "Veiron Rewards"
      })
    ]
  });
}

export async function getWalletLinkForUser(store, { guildId, userId }) {
  const links = await store.list(WALLET_LINKS_COLLECTION);
  return links
    .map(normalizeWalletLink)
    .filter((link) => link.guildId === guildId && link.userId === userId)
    .filter((link) => link.address && ACTIVE_WALLET_LINK_STATUSES.has(link.status))
    .sort(compareWalletLinks)[0] ?? null;
}

export function normalizeWalletLink(link = {}) {
  return {
    ...link,
    id: link.id ?? walletLinkId(link.guildId, link.userId, link.address),
    guildId: String(link.guildId ?? ""),
    userId: String(link.userId ?? ""),
    address: String(link.address ?? link.walletAddress ?? "").trim(),
    status: String(link.status ?? "verified").trim().toLowerCase(),
    linkedAt: link.linkedAt ?? link.createdAt ?? null,
    verifiedAt: link.verifiedAt ?? null,
    updatedAt: link.updatedAt ?? null
  };
}

export function walletLinkId(guildId, userId, address) {
  return `${guildId}:${userId}:${String(address ?? "").trim().toLowerCase()}`;
}

export function buildRewardsDescription({ rewards, walletLink, target }) {
  const owner = target?.id ? `<@${target.id}>` : walletLink.userId;

  if (rewards.ok && rewards.mock) {
    return [
      `Rewards for ${owner}.`,
      "Mock adapter active. These mining/staking/node reward values are simulated until a real Veiron RPC endpoint exists."
    ].join("\n");
  }

  if (rewards.ok) {
    return `Rewards for ${owner}, read from the configured Veiron chain adapter.`;
  }

  return [
    `Rewards for ${owner} could not be loaded.`,
    rewards.message ?? rewards.error ?? "Check the Veiron chain rewards endpoint configuration."
  ].join("\n");
}

export function formatRewardAmount(value, currency = "VIRE") {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Unavailable";
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 8 }).format(value)} ${currency || "VIRE"}`;
}

export function formatAddress(address) {
  const value = String(address ?? "").trim();
  if (!value) return "Unavailable";
  if (value.length <= 24) return `\`${value}\``;
  return `\`${value.slice(0, 12)}...${value.slice(-10)}\``;
}

function formatStatusValue(value) {
  if (value == null || value === "") return "Unavailable";
  return String(value).slice(0, 1024);
}

function compareWalletLinks(a, b) {
  return Date.parse(b.verifiedAt ?? b.updatedAt ?? b.linkedAt ?? 0)
    - Date.parse(a.verifiedAt ?? a.updatedAt ?? a.linkedAt ?? 0);
}
