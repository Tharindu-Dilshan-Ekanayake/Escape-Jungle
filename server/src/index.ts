import { createServer } from "node:http";
import express from "express";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { LobbyRoom } from "./rooms/LobbyRoom.js";
import { ROOM_NAMES } from "./shared/index.js";
import { bloxityEnv } from "./platform/env.js";
import { installRoomReporter } from "./legion-room-reporter.js";

const PORT = Number(process.env.PORT ?? 2567);

const app = express();
app.use(express.json());
// Boxity requires a fast /health endpoint.
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const httpServer = createServer(app);
const gameServer = new Server({ transport: new WebSocketTransport({ server: httpServer }) });

// One room type: the lobby hub; parties run the jungle inside the same room.
gameServer.define(ROOM_NAMES.lobby, LobbyRoom);

gameServer.listen(PORT).then(() => {
  console.log(`[server] listening on :${PORT} (env=${bloxityEnv.env})`);
  installRoomReporter(); // no-op outside a Boxity deployment
});
