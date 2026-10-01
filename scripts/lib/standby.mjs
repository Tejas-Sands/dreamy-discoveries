import fs from 'node:fs';
import path from 'node:path';
import {LIBRARY_DIR, readCatalog} from './catalog.mjs';
import {castMemberById} from './cast.mjs';
import {loadUniverse} from './universe.mjs';

export const STANDBY_FILE = path.join(LIBRARY_DIR, 'standby.json');

export function readStandbyManifest() {
  if (!fs.existsSync(STANDBY_FILE)) return {slugs: [], usage: {}};
  const manifest = JSON.parse(fs.readFileSync(STANDBY_FILE, 'utf8'));
  if (!Array.isArray(manifest.slugs) || manifest.slugs.some(slug => typeof slug !== 'string' || !/^[a-z0-9-]+$/.test(slug)) || new Set(manifest.slugs).size !== manifest.slugs.length) {
    throw new Error('standby manifest needs unique script slugs');
  }
  manifest.usage ??= {};
  return manifest;
}

const releaseUrl = release => typeof release === 'string' ? release : release?.url ?? null;

/** The durable usage marker also works for videos uploaded outside this workflow. */
export function standbyStatus(slug, usage = {}, episodes = [], stories = []) {
  const marker = usage[slug];
  const episode = episodes.find(entry => entry.slug === slug);
  const story = stories.find(entry => (entry.id ?? entry.slug) === slug &&
    (['rendered', 'released'].includes(entry.status) || entry.release));
  if (marker?.status !== 'used' && !episode && !story) return {status: 'available'};
  return {status: 'used', usedAt: marker?.usedAt ?? episode?.renderedAt ?? story?.timeline?.rendered ?? story?.timeline?.released ?? null,
    releaseUrl: marker?.releaseUrl ?? releaseUrl(episode?.release ?? episode?.releaseUrl ?? story?.release),
    runId: marker?.runId ?? episode?.run ?? null};
}

/** Record once; rerenders can add release details without erasing the first-use date. */
export function markStandbyUsed(manifest, slug, details = {}) {
  if (!manifest.slugs.includes(slug)) throw new Error(`Unknown standby slug: ${slug}`);
  manifest.usage ??= {};
  const prior = manifest.usage[slug];
  manifest.usage[slug] = {status: 'used', usedAt: prior?.usedAt ?? details.usedAt ?? new Date().toISOString(),
    releaseUrl: details.releaseUrl || prior?.releaseUrl || null, runId: details.runId || prior?.runId || null};
  return manifest;
}

export function readStandbyInventory() {
  const manifest = readStandbyManifest();
  const entries = manifest.slugs.map(slug => {
    const entry = JSON.parse(fs.readFileSync(path.join(LIBRARY_DIR, 'scripts', `${slug}.json`), 'utf8'));
    if (entry.slug !== slug) throw new Error(`Standby script slug mismatch: ${slug}`);
    return entry;
  });
  return {manifest, entries, episodes: readCatalog().episodes, stories: loadUniverse().stories};
}

/** Never choose an already produced episode, even when delivery was interrupted. */
export function chooseStandby(entries, episodes = [], stories = [], hero = '', usage = {}) {
  const unused = entries.filter(entry => entry.type === 'story' && entry.scenes?.length &&
    standbyStatus(entry.slug, usage, episodes, stories).status === 'available');
  const kind = castMemberById(hero)?.kind ?? hero;
  return unused.find(entry => entry.mainCharacter?.kind === kind) ?? unused[0] ?? null;
}

export function loadStandby(hero) {
  const {manifest, entries, episodes, stories} = readStandbyInventory();
  return chooseStandby(entries, episodes, stories, hero, manifest.usage);
}
