import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_DATA_DIR = path.resolve(process.cwd(), "data");

export class JsonStore {
  constructor({ dataDir = process.env.BOT_DATA_DIR ?? DEFAULT_DATA_DIR } = {}) {
    this.dataDir = dataDir;
  }

  async list(collection) {
    const data = await this.readCollection(collection);
    return data.items ?? [];
  }

  async add(collection, item) {
    const data = await this.readCollection(collection);
    const nextItem = {
      id: item.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: item.createdAt ?? new Date().toISOString(),
      ...item
    };

    data.items = [...(data.items ?? []), nextItem];
    await this.writeCollection(collection, data);
    return nextItem;
  }

  async update(collection, predicate, updater) {
    const data = await this.readCollection(collection);
    let updatedItem = null;

    data.items = (data.items ?? []).map((item) => {
      if (!predicate(item)) return item;
      updatedItem = {
        ...item,
        ...updater(item),
        updatedAt: new Date().toISOString()
      };
      return updatedItem;
    });

    await this.writeCollection(collection, data);
    return updatedItem;
  }

  async getSingleton(collection, defaults = {}) {
    const data = await this.readCollection(collection);
    return { ...defaults, ...(data.value ?? {}) };
  }

  async setSingleton(collection, value) {
    const nextValue = {
      ...value,
      updatedAt: new Date().toISOString()
    };

    await this.writeCollection(collection, { value: nextValue });
    return nextValue;
  }

  async healthCheck() {
    await mkdir(this.dataDir, { recursive: true });
    return {
      ok: true,
      status: "ready",
      driver: "json",
      dataDir: this.dataDir
    };
  }

  async readCollection(collection) {
    await mkdir(this.dataDir, { recursive: true });

    try {
      const raw = await readFile(this.collectionPath(collection), "utf8");
      return JSON.parse(raw);
    } catch (error) {
      if (error.code === "ENOENT") {
        return { items: [] };
      }

      throw error;
    }
  }

  async writeCollection(collection, data) {
    await mkdir(this.dataDir, { recursive: true });
    await writeFile(this.collectionPath(collection), `${JSON.stringify(data, null, 2)}\n`, "utf8");
  }

  collectionPath(collection) {
    return path.join(this.dataDir, `${collection}.json`);
  }
}
