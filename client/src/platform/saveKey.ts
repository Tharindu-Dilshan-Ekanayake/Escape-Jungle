/**
 * A random key this browser keeps so a signed-out guest's expedition can be
 * continued later (docs/SDK.md allows a guest-only key; it is never an account
 * id: signed-in players save under their verified account on the server).
 */
const STORAGE = "ej_save_key_v1";
const VALID = /^[a-z0-9]{16,40}$/;

export function guestSaveKey(): string | undefined {
  try {
    let key = localStorage.getItem(STORAGE);
    if (!key || !VALID.test(key)) {
      key = Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => (b % 36).toString(36)).join("");
      localStorage.setItem(STORAGE, key);
    }
    return key;
  } catch {
    return undefined; // storage blocked: this guest just can't continue later
  }
}
