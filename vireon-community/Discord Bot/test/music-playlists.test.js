import { describe, expect, it } from "vitest";
import { JsonStore } from "../src/storage.js";
import {
  addTrackToPlaylist,
  createMusicPlaylist,
  deleteMusicPlaylist,
  getMusicPlaylist,
  listMusicPlaylists,
  normalizePlaylistName,
  normalizePlaylistScope,
  removeTrackFromPlaylist
} from "../src/music-playlists.js";

function createMemoryStore() {
  const collections = new Map();
  return {
    async list(collection) {
      return collections.get(collection) ?? [];
    },
    async add(collection, item) {
      const next = { id: item.id ?? "id", createdAt: item.createdAt ?? new Date().toISOString(), ...item };
      collections.set(collection, [...(collections.get(collection) ?? []), next]);
      return next;
    },
    async update(collection, predicate, updater) {
      let updated = null;
      const next = (collections.get(collection) ?? []).map((item) => {
        if (!predicate(item)) return item;
        updated = { ...item, ...updater(item), updatedAt: new Date().toISOString() };
        return updated;
      });
      collections.set(collection, next);
      return updated;
    }
  };
}

describe("music playlists", () => {
  it("normalizes playlist name and scope", () => {
    expect(normalizePlaylistName(" My Cool Mix!! ")).toBe("my-cool-mix");
    expect(normalizePlaylistScope("SERVER")).toBe("server");
    expect(() => normalizePlaylistScope("global")).toThrow("user or server");
  });

  it("creates user and server playlists separately per guild", async () => {
    const store = createMemoryStore();
    const userPlaylist = await createMusicPlaylist(store, {
      guildId: "guild",
      ownerId: "user-a",
      ownerTag: "User A",
      name: "Favorites"
    });
    const serverPlaylist = await createMusicPlaylist(store, {
      guildId: "guild",
      ownerId: "user-a",
      ownerTag: "User A",
      name: "Favorites",
      scope: "server"
    });

    expect(userPlaylist.id).toBe("guild:user:user-a:favorites");
    expect(serverPlaylist.id).toBe("guild:server:favorites");
    expect(await listMusicPlaylists(store, { guildId: "guild", userId: "user-a", scope: "user" })).toHaveLength(1);
    expect(await listMusicPlaylists(store, { guildId: "guild", userId: "user-b", scope: "user" })).toHaveLength(0);
    expect(await listMusicPlaylists(store, { guildId: "guild", userId: "user-b", scope: "server" })).toHaveLength(1);
  });

  it("adds and removes saved track queries", async () => {
    const store = createMemoryStore();
    const playlist = await createMusicPlaylist(store, {
      guildId: "guild",
      ownerId: "user-a",
      ownerTag: "User A",
      name: "Favorites"
    });

    const withTrack = await addTrackToPlaylist(store, playlist, {
      query: "https://example.com/song",
      title: "Song",
      addedById: "user-a",
      addedByTag: "User A"
    });

    expect(withTrack.tracks).toHaveLength(1);
    expect(withTrack.tracks[0].query).toBe("https://example.com/song");

    const afterRemove = await removeTrackFromPlaylist(store, withTrack, 1);
    expect(afterRemove.tracks).toHaveLength(0);
  });

  it("soft deletes playlists", async () => {
    const store = createMemoryStore();
    const playlist = await createMusicPlaylist(store, {
      guildId: "guild",
      ownerId: "user-a",
      ownerTag: "User A",
      name: "Favorites"
    });

    await deleteMusicPlaylist(store, playlist, { deletedById: "user-a" });
    expect(await getMusicPlaylist(store, {
      guildId: "guild",
      userId: "user-a",
      name: "Favorites"
    })).toBeNull();
  });

  it("uses the generic JsonStore DAL contract", async () => {
    expect(typeof JsonStore.prototype.list).toBe("function");
    expect(typeof JsonStore.prototype.add).toBe("function");
    expect(typeof JsonStore.prototype.update).toBe("function");
  });
});
