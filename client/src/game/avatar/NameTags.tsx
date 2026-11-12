import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { ROOM_LIMITS } from "@shared";
import { AVATAR } from "../../config/lobby";
import { bubbles, remotePlayers } from "../../net/remotePlayers";
import { player } from "../player/FirstPersonController";

const MAX_TAGS = ROOM_LIMITS.lobbyMaxClients;
const TAG_HEIGHT = 2.75 * AVATAR.scale;
const MAX_DISTANCE = 35;
const v = new Vector3();

interface Tag {
  root: HTMLDivElement;
  name: HTMLDivElement;
  bubble: HTMLDivElement;
  lastName: string;
  lastBubble: string;
  visible: boolean;
}

/**
 * Name tags + chat bubbles above avatars: a fixed pool of DOM elements
 * positioned by projecting each head every frame (one pass, no React renders,
 * text only rewritten when it changes).
 */
export function NameTags({ showLocalBubble }: { showLocalBubble: boolean }) {
  const size = useThree((s) => s.size);

  const pool = useMemo(() => {
    const container = document.createElement("div");
    container.className = "pointer-events-none fixed inset-0 z-[15] overflow-hidden";
    const tags: Tag[] = [];
    for (let i = 0; i < MAX_TAGS; i++) {
      const root = document.createElement("div");
      root.className = "absolute left-0 top-0 flex flex-col items-center whitespace-nowrap will-change-transform";
      root.style.display = "none";
      const bubble = document.createElement("div");
      bubble.className = "mb-1 max-w-[220px] whitespace-normal rounded-xl bg-white/95 px-3 py-1 text-center font-lobby text-sm font-semibold text-black shadow";
      const name = document.createElement("div");
      name.className = "font-lobby text-outline text-lg font-bold text-white";
      root.append(bubble, name);
      container.append(root);
      tags.push({ root, name, bubble, lastName: "", lastBubble: "\u0000", visible: false });
    }
    return { container, tags };
  }, []);

  useEffect(() => {
    document.body.append(pool.container);
    return () => pool.container.remove();
  }, [pool]);

  useFrame(({ camera }) => {
    const now = performance.now() / 1000;
    let n = 0;
    const place = (x: number, y: number, z: number, name: string, uid: string) => {
      if (n >= MAX_TAGS) return;
      const dx = x - camera.position.x;
      const dz = z - camera.position.z;
      if (dx * dx + dz * dz > MAX_DISTANCE * MAX_DISTANCE) return;
      v.set(x, y + TAG_HEIGHT, z).project(camera);
      if (v.z > 1 || v.z < -1) return; // behind the camera
      const tag = pool.tags[n++];
      const b = bubbles.get(uid);
      const bubbleText = b && b.until > now ? b.text : "";
      if (tag.lastName !== name) {
        tag.name.textContent = name;
        tag.lastName = name;
      }
      if (tag.lastBubble !== bubbleText) {
        tag.bubble.textContent = bubbleText;
        tag.bubble.style.display = bubbleText ? "block" : "none";
        tag.lastBubble = bubbleText;
      }
      const sx = (v.x * 0.5 + 0.5) * size.width;
      const sy = (-v.y * 0.5 + 0.5) * size.height;
      tag.root.style.transform = `translate(-50%, -100%) translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`;
      if (!tag.visible) {
        tag.root.style.display = "flex";
        tag.visible = true;
      }
    };

    for (const r of remotePlayers.values()) if (r.here) place(r.x, 0, r.z, r.name, r.uid);
    if (showLocalBubble) {
      const b = bubbles.get("me");
      if (b && b.until > now) place(player.x, player.y, player.z, "", "me");
    }
    for (let i = n; i < MAX_TAGS; i++) {
      const tag = pool.tags[i];
      if (tag.visible) {
        tag.root.style.display = "none";
        tag.visible = false;
      }
    }
  });

  return null;
}
