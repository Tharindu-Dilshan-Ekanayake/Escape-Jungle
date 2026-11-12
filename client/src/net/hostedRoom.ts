/**
 * Open Rooms Join / friend invites open the game with ?roomId=<colyseus room id>.
 * A bare joinById on a resolved endpoint can land on a different pod than the
 * one holding that room, so the room's pod is looked up first
 * (docs/SDK.md > OPEN ROOMS: GET {playUrl}/v1/dir/<hostingId>/list -> joinUrl).
 */
import { Client, type Room } from "colyseus.js";
import { getBloxityEnv } from "../platform/env";

interface DirRoom {
  id?: string;
  roomId?: string;
  colyseusRoomId?: string;
  joinUrl?: string;
}

const LOOKUP_TIMEOUT_MS = 4_000;

/** The room id from the page URL (Boxity Join button, friend invite), or "". */
export const requestedRoomId = () => new URLSearchParams(location.search).get("roomId") ?? "";

/** joinUrl of the pod that holds `roomId`, or "" when it is not listed. */
async function podOf(hostingId: string, roomId: string): Promise<string> {
  const url = `${getBloxityEnv().playUrl}/v1/dir/${encodeURIComponent(hostingId)}/list`;
  const res = await fetch(url, { signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS) });
  if (!res.ok) return "";
  const body = (await res.json()) as { rooms?: DirRoom[] } | DirRoom[];
  const rooms = Array.isArray(body) ? body : (body.rooms ?? []);
  const hit = rooms.find((r) => (r.colyseusRoomId ?? r.roomId ?? r.id) === roomId);
  return hit?.joinUrl ?? "";
}

/**
 * Join the requested room on its own pod. Resolves with the client that holds
 * the seat (so a reconnect goes back to the same pod); null when the room is
 * gone, full, or unreachable, and the caller falls back to normal matchmaking.
 */
export async function joinRequestedRoom(
  hostingId: string,
  roomId: string,
  options: object,
): Promise<{ room: Room; client: Client; endpoint: string } | null> {
  try {
    const endpoint = await podOf(hostingId, roomId);
    if (!endpoint) return null;
    const client = new Client(endpoint);
    return { room: await client.joinById(roomId, options), client, endpoint };
  } catch {
    return null;
  }
}
