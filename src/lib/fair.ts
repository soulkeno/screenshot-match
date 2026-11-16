// Provably fair primitives. Runs identically on the server and in the browser (Web Crypto).
const enc = new TextEncoder();

function toHex(buf: ArrayBuffer | Uint8Array): string {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(input: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", enc.encode(input)));
}

export function randomHex(bytes = 32): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return toHex(a);
}

async function hmac(key: string, msg: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(msg)));
}

/** Floats in [0,1) at cursor positions [start, start+count). 8 floats per HMAC round. */
export async function floats(serverSeed: string, clientSeed: string, nonce: number | string, count: number, start = 0): Promise<number[]> {
  const out: number[] = [];
  const firstRound = Math.floor(start / 8);
  const lastRound = Math.floor((start + count - 1) / 8);
  for (let r = firstRound; r <= lastRound; r++) {
    const bytes = await hmac(serverSeed, `${clientSeed}:${nonce}:${r}`);
    for (let i = 0; i < 8; i++) {
      const idx = r * 8 + i;
      if (idx < start || idx >= start + count) continue;
      const o = i * 4;
      out.push(bytes[o] / 256 + bytes[o + 1] / 256 ** 2 + bytes[o + 2] / 256 ** 3 + bytes[o + 3] / 256 ** 4);
    }
  }
  return out;
}
