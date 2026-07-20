import { describe, expect, it } from "vitest";
import { formatLeaderboardLines, getGuildXpProfiles, getUserRank } from "../src/rank-commands.js";
import { renderRankCard } from "../src/rank-card.js";

describe("rank commands", () => {
  it("sorts guild XP profiles and calculates user rank", async () => {
    const store = createRankStore([
      { guildId: "guild-1", userId: "u1", userTag: "Alpha#0001", xp: 50, level: 0 },
      { guildId: "guild-1", userId: "u2", userTag: "Bravo#0001", xp: 250, level: 2 },
      { guildId: "guild-2", userId: "u3", userTag: "Other#0001", xp: 900, level: 9 },
      { guildId: "guild-1", userId: "u4", userTag: "Delta#0001", xp: 250, level: 2 }
    ]);

    const profiles = await getGuildXpProfiles(store, "guild-1");

    expect(profiles.map((profile) => profile.userId)).toEqual(["u2", "u4", "u1"]);
    expect(getUserRank(profiles, "u4")).toBe(2);
    expect(getUserRank(profiles, "missing")).toBe(4);
  });

  it("formats leaderboard rows", () => {
    const lines = formatLeaderboardLines([
      { userTag: "Bravo#0001", xp: 250, level: 2 },
      { userTag: "Delta#0001", xp: 120, level: 1 }
    ]);

    expect(lines).toEqual([
      "**#01** Bravo#0001 | Level 2 | 250 XP",
      "**#02** Delta#0001 | Level 1 | 120 XP"
    ]);
  });

  it("can format leaderboard levels from the active XP curve", () => {
    const lines = formatLeaderboardLines([
      { userTag: "Bravo#0001", xp: 450, level: 0 }
    ], {
      levelCurve: "linear",
      levelBaseXp: 100,
      maxLevel: 100
    });

    expect(lines[0]).toBe("**#01** Bravo#0001 | Level 4 | 450 XP");
  });

  it("renders a PNG rank card", async () => {
    const buffer = await renderRankCard({
      user: {
        id: "u1",
        tag: "Alpha#0001",
        displayName: "Alpha Tester",
        avatarUrl: null
      },
      profile: {
        level: 4,
        xp: 1720
      },
      rank: 3,
      progress: {
        level: 4,
        xp: 1720,
        currentLevelXp: 1600,
        nextLevelXp: 2500,
        xpIntoLevel: 120,
        xpNeededForNextLevel: 780,
        percentToNextLevel: 13
      }
    });

    expect(buffer.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(buffer.length).toBeGreaterThan(10000);
  });
});

function createRankStore(items) {
  return {
    async list(collection) {
      if (collection !== "xp-profiles") return [];
      return items;
    }
  };
}
