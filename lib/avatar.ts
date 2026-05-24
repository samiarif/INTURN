/**
 * Visual avatars for organizations and people.
 *
 * We don't have logo uploads end-to-end yet, so listings render a colored
 * "mark" tile with 2 initials. Color is deterministic from a seed (org.id
 * or user.id) so it stays stable across renders without DB writes.
 */

/** First letter of the first two words; falls back to first two chars. */
export function initialsFrom(name: string | null | undefined, fallback = '??'): string {
  if (!name) return fallback;
  const trimmed = name.trim();
  if (!trimmed) return fallback;
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  // Single word: first two letters (or pad).
  return (trimmed.slice(0, 2) || fallback).toUpperCase();
}

/**
 * Six-tone palette pulled from the design mocks (warm / cool spread).
 * Each entry uses tokens where possible, with literal hex for the warm
 * accent backgrounds that don't exist in our token set yet.
 *
 * Hardcoded backgrounds are intentional — these are decorative tints, and
 * the foreground text uses high-contrast hex pairs that read on both
 * light and dark mode. (The mark sits on its own colored square, not
 * directly on surface, so it stays legible either way.)
 */
const PALETTE = [
  { bg: '#F3EEFF', fg: '#5B21B6', border: '#DDCCFF' }, // violet
  { bg: '#DBEAFE', fg: '#1E40AF', border: '#BFDBFE' }, // blue
  { bg: '#DCFCE7', fg: '#15803D', border: '#BBF7D0' }, // green
  { bg: '#FCE7F3', fg: '#BE185D', border: '#FBCFE8' }, // pink
  { bg: '#FED7AA', fg: '#9A3412', border: '#FECACA' }, // orange
  { bg: '#CFFAFE', fg: '#0E7490', border: '#A5F3FC' }, // cyan
] as const;

/** Quick djb2-style string hash → small non-negative int. */
function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return h >>> 0;
}

export type OrgMarkTone = {
  bg: string;
  fg: string;
  border: string;
};

/** Deterministic color picked from PALETTE for any string seed. */
export function toneFromSeed(seed: string | null | undefined): OrgMarkTone {
  if (!seed) return PALETTE[0];
  return PALETTE[hashStr(seed) % PALETTE.length];
}

/** Convenience: build everything the card needs in one call. */
export function orgMark(name: string | null | undefined, seed: string | null | undefined) {
  return {
    initials: initialsFrom(name),
    tone: toneFromSeed(seed ?? name ?? ''),
  };
}
