// FNV-1a 32-bit hash. Deterministic, fast, no allocations.
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

const REDACT_MIN = 4;
const REDACT_MAX = 9;

export function getRedactionLength(userId: string): number {
  const range = REDACT_MAX - REDACT_MIN + 1;
  return REDACT_MIN + (hashString(userId) % range);
}

export type IdenticonSeed = {
  cells: boolean[];
  hue: number;
};

// 5x5 horizontally-mirrored identicon (3 cols × 5 rows = 15 bits of pattern).
// The hue rotates around oklch hue (0-360).
export function getIdenticonSeed(userId: string): IdenticonSeed {
  const hash = hashString(userId);
  const hue = hash % 360;
  const cells: boolean[] = [];
  let bits = hash;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      cells.push((bits & 1) === 1);
      bits = bits >>> 1;
    }
  }
  return { cells, hue };
}
