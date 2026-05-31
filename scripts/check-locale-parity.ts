/**
 * Fails if locales/fr.json and locales/en.json don't expose the identical set
 * of (flattened) keys. Wired as `pnpm check:i18n` — the locale half of the i18n
 * guardrail (the lint rule in eslint.config.mjs is the other half).
 */
import fr from '../locales/fr.json';
import en from '../locales/en.json';

type Json = { [key: string]: unknown };

function flatten(obj: Json, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? flatten(value as Json, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

const frKeys = new Set(flatten(fr as Json));
const enKeys = new Set(flatten(en as Json));

const missingInEn = [...frKeys].filter((k) => !enKeys.has(k));
const missingInFr = [...enKeys].filter((k) => !frKeys.has(k));

if (missingInEn.length || missingInFr.length) {
  if (missingInEn.length) {
    console.error(`Missing in en.json (${missingInEn.length}):`, missingInEn.slice(0, 50));
  }
  if (missingInFr.length) {
    console.error(`Missing in fr.json (${missingInFr.length}):`, missingInFr.slice(0, 50));
  }
  process.exit(1);
}

console.log(`OK — ${frKeys.size} keys aligned across fr/en`);
