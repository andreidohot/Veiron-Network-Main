export async function createLedgerPrismaClient() {
  let clientModule;

  try {
    clientModule = await import("./generated/ledger-client/index.js");
  } catch (error) {
    throw new Error(`Ledger Prisma client is not generated. Run \`npm run prisma:generate:ledger\` before using ledger storage. ${error.message}`);
  }

  if (!clientModule.PrismaClient) {
    throw new Error("Ledger Prisma client did not export PrismaClient.");
  }

  return new clientModule.PrismaClient();
}
