import { AS } from "../../config/animals";
import { interact } from "../../game/interact/interact";
import { animals, Kind } from "../../game/animals/animals";
import { remotePlayers } from "../../net/remotePlayers";
import { adventures, ST } from "../../game/adventure/adventures";

type ToScreen = (v: number) => number;

/**
 * Survival layer of the map: food stores, water (barrels + springs), berry
 * bushes with fruit, animals close by and the other party members.
 */
export function drawSurvivalMarkers(ctx: CanvasRenderingContext2D, X: ToScreen, Y: ToScreen, u: number, mini: boolean, now: number) {
  const L = interact.layout;
  if (L) {
    for (const c of L.camps) {
      // Food store: brown crate with a green lid.
      const sx = X(c.store.x);
      const sy = Y(c.store.z);
      ctx.fillStyle = "#8a5a34";
      ctx.strokeStyle = "#2a1a0a";
      ctx.lineWidth = 1.5;
      ctx.fillRect(sx - 5 * u, sy - 4 * u, 10 * u, 8 * u);
      ctx.strokeRect(sx - 5 * u, sy - 4 * u, 10 * u, 8 * u);
      ctx.fillStyle = "#4cc12e";
      ctx.fillRect(sx - 5 * u, sy - 4 * u, 10 * u, 2.5 * u);
      drop(ctx, X(c.water.x), Y(c.water.z), 5 * u);
    }
    for (const s of L.forage.springs) drop(ctx, X(s.x), Y(s.z), 5.5 * u);
    if (!mini) {
      ctx.fillStyle = "#6a4fd0";
      L.forage.berryBushes.forEach((b, i) => {
        if (now < (interact.bushReady[i] ?? 0)) return;
        ctx.beginPath();
        ctx.arc(X(b.x), Y(b.z), 2.5 * u, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }
  // Quest givers: yellow = new adventure, green = ready to hand in, grey = done.
  for (const a of adventures.list) {
    const x = X(a.npc.x);
    const y = Y(a.npc.z);
    ctx.fillStyle = a.state === ST.New ? "#ffd23f" : a.state === ST.Ready ? "#5ee05e" : a.state === ST.Done ? "#b0a890" : "#4fc3f7";
    ctx.strokeStyle = "#2a1a0a";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 6 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#2a1a0a";
    ctx.font = `bold ${9 * u}px Fredoka, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(a.state === ST.Done ? "✓" : a.state === ST.Ready ? "?" : "!", x, y + 0.5);
  }
  // Animals (alive): boars brown, jaguars orange with a dark ring.
  for (const a of animals.list) {
    if (a.state === AS.Dead) continue;
    ctx.fillStyle = a.kind === Kind.Jaguar ? "#ff9a1c" : "#6b4423";
    ctx.strokeStyle = a.kind === Kind.Jaguar ? "#2a0a0a" : "#fff4d6";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(X(a.x), Y(a.z), 3.5 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // Party members: blue arrows (+ name on the full map).
  for (const r of remotePlayers.values()) {
    if (!r.here) continue;
    ctx.save();
    ctx.translate(X(r.x), Y(r.z));
    ctx.rotate(-r.yaw);
    ctx.fillStyle = "#3a8dff";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -8 * u);
    ctx.lineTo(5.5 * u, 5.5 * u);
    ctx.lineTo(0, 2.5 * u);
    ctx.lineTo(-5.5 * u, 5.5 * u);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    if (!mini) {
      ctx.font = "bold 11px Fredoka, sans-serif";
      ctx.textAlign = "center";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#efdcae";
      ctx.strokeText(r.name, X(r.x), Y(r.z) - 12);
      ctx.fillStyle = "#1f4fa0";
      ctx.fillText(r.name, X(r.x), Y(r.z) - 12);
    }
  }
}

function drop(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = "#3fa7d6";
  ctx.strokeStyle = "#0f3a5a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.4);
  ctx.quadraticCurveTo(x + r, y, x, y + r * 0.9);
  ctx.quadraticCurveTo(x - r, y, x, y - r * 1.4);
  ctx.fill();
  ctx.stroke();
}
