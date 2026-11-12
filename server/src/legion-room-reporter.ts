import { matchMaker } from "@colyseus/core";

/**
 * Open Rooms (docs/SDK.md > OPEN ROOMS ON THE GAME PAGE): tells the Boxity
 * matchmaker which rooms this pod holds so they show up with a Join button on
 * the game page. Boxity hosting injects the three variables below on every
 * deploy; without them (local dev) this does nothing.
 */
const INTERVAL_MS = 2_000;
const TIMEOUT_MS = 4_000;

export function installRoomReporter(): void {
  const reportUrl = (process.env.MATCHMAKER_REPORT_URL ?? "").replace(/\/+$/, "");
  const token = process.env.BLOXITY_REPORT_TOKEN ?? "";
  const gameId = process.env.BLOXITY_GAME_ID ?? "";
  if (!reportUrl || !token || !gameId) return;

  const podName = process.env.POD_NAME ?? process.env.HOSTNAME ?? "";
  const url = `${reportUrl}/${gameId}/rooms`;

  const tick = async () => {
    try {
      const cached = await matchMaker.query({});
      const rooms = cached.map((r) => ({
        colyseusRoomId: r.roomId,
        name: r.name,
        clients: r.clients,
        maxClients: r.maxClients,
        locked: !!r.locked,
        private: !!r.private,
        started: !!(r.metadata as { started?: boolean } | undefined)?.started,
        metadata: r.metadata ?? {},
      }));
      const players = rooms.reduce((n, r) => n + r.clients, 0);
      await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ podName, players, rooms }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      /* the list is best effort: the next tick tries again */
    }
  };

  void tick();
  setInterval(() => void tick(), INTERVAL_MS).unref();
}
