export async function buildHealthStatus({ client, store, musicManager, chainClient }) {
  const [database, lavalink, chain] = await Promise.all([
    checkComponent(() => store.healthCheck(), "database"),
    checkComponent(() => musicManager.healthCheck(), "lavalink"),
    checkComponent(() => chainClient.healthCheck(), "chain")
  ]);

  const botReady = client.isReady();
  const ok = botReady && database.ok && lavalink.ok && chain.ok;

  return {
    ok,
    status: ok ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    bot: {
      ok: botReady,
      status: botReady ? "ready" : "not_ready",
      tag: client.user?.tag ?? null,
      guilds: client.guilds?.cache?.size ?? 0,
      ping: client.ws?.ping ?? null
    },
    database,
    lavalink,
    chain
  };
}

async function checkComponent(check, name) {
  try {
    return await check();
  } catch (error) {
    return {
      ok: false,
      status: "error",
      component: name,
      error: error.message
    };
  }
}
