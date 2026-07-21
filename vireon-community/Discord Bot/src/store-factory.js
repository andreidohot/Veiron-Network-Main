import { JsonStore } from "./storage.js";

export async function createStore() {
  const driver = process.env.STORAGE_DRIVER ?? "json";

  if (driver === "json") {
    return new JsonStore();
  }

  if (driver === "prisma") {
    const { PrismaStore } = await import("./prisma-store.js");
    return new PrismaStore();
  }

  throw new Error(`Unsupported STORAGE_DRIVER "${driver}". Use "json" or "prisma".`);
}
