/** Browse/sync the standby bank, or explicitly mark a manually produced story used.
 * node scripts/standby.mjs list [--json]
 * node scripts/standby.mjs sync [--dry-run]
 * node scripts/standby.mjs used --slug S [--release URL] [--run ID] [--dry-run]
 * Completed releases are synced by make-video.yml; permanent scripts stay intact.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from './lib/common.mjs';
import {LIBRARY_DIR} from './lib/catalog.mjs';
import {castMembers, castMemberByKind} from './lib/cast.mjs';
import {readStandbyInventory, standbyStatus, markStandbyUsed, STANDBY_FILE} from './lib/standby.mjs';

const names = script => [...new Set(script.scenes.flatMap(scene => [scene.character, scene.secondCharacter]).filter(Boolean))]
  .map(kind => castMemberByKind(kind)?.name ?? kind);
const settings = script => [...new Set(script.scenes.map(scene => scene.background))];
const cell = value => String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const label = status => status.status === 'used' ? `Used${status.usedAt ? ` · ${status.usedAt.slice(0, 10)}` : ''}` : 'Available';

function storyPage(script, status) {
  const content = [`# ${script.title}`, '', `**Status:** ${label(status)}`, '',
    `**Hero:** ${script.mainCharacter.name}`, '', `**Featured cast:** ${names(script).join(', ')}`, '',
    `**Setting:** ${settings(script).join(', ')}`, '', `**Target length:** ${script.targetMinutes ?? 5.5} minutes (final length follows voice timing)`, '',
    `**Moral:** ${script.moral}`, '', script.standby?.summary ?? script.moral, '',
    `[Production script](../scripts/${script.slug}.json) · [All standby stories](../STANDBY.md)`, '',
    `To produce this story, run **Make video** with **slug** = \`${script.slug}\`.`, ''];
  if (status.releaseUrl) content.push(`[Completed video release](${status.releaseUrl.replace(/\)/g, '%29')})`, '');
  if (script.standby) {
    content.push('## Story beats', '');
    for (const [field, title] of [['heroGoal', 'Goal'], ['firstAttempt', 'First attempt'], ['secondAttempt', 'Different second attempt'],
      ['consequence', 'Consequence'], ['repair', 'Repair'], ['ending', 'Ending']]) {
      if (script.standby[field]) content.push(`- **${title}:** ${script.standby[field]}`);
    }
    content.push('');
  }
  content.push('## Read the story', '');
  if (script.intro?.text) content.push(`**${script.mainCharacter.name}:** ${script.intro.text}`, '');
  for (const [index, scene] of script.scenes.entries()) {
    content.push(`### ${index + 1}. ${scene.kind === 'moral' ? 'Moral chant' : scene.kind === 'question' ? 'Child choice' : scene.kind === 'lesson' ? 'Repair' : 'Story'} · ${scene.background}`, '');
    const lines = scene.lines.filter(line => line.role !== 'praise');
    const praise = scene.lines.filter(line => line.role === 'praise');
    const spoken = line => {
      const kind = line.speaker === 'friend' ? scene.secondCharacter : scene.character;
      const speaker = line.speaker === 'narrator' ? 'Narrator' : castMemberByKind(kind)?.name ?? script.mainCharacter.name;
      content.push(`**${speaker}:** ${line.text}`, '');
    };
    lines.forEach(spoken);
    if (scene.question) content.push('*Pause for the child to answer.*', '', `**Answer reveal:** ${scene.question.answer.text}`, '');
    praise.forEach(spoken);
  }
  if (script.outro?.text) content.push(`**${script.mainCharacter.name}:** ${script.outro.text}`, '');
  content.push('*This readable copy is generated from the permanent production script. Update it with `node scripts/standby.mjs sync`.*', '');
  return content.join('\n');
}

function bankPage(rows) {
  const available = rows.filter(row => row.status.status === 'available').length;
  const content = ['# Sunny Meadow standby story bank', '',
    `**${rows.length} stories · ${available} available · ${rows.length - available} used**`, '',
    'Complete scripts for preschool moral-story episodes. Each includes dialogue, narration, two child choices, a visible repair and a moral chant.', '',
    'Choose a story below to read it. In GitHub Actions, run **Make video** and paste its **slug** into the slug input; script generation needs no API call.', '',
    'Completed episodes are automatically marked **Used** after a durable video release. Used stories remain readable and can be rerendered by slug; automatic standby selection skips them.', '',
    'View current status locally with `node scripts/standby.mjs list`. Refresh this index with `node scripts/standby.mjs sync`. To record a video made outside the workflow:', '',
    '```bash', 'node scripts/standby.mjs used --slug <story-slug> --release <video-url>', '```', '',
    '[Usage ledger and selection manifest](standby.json)', ''];
  for (const member of castMembers()) {
    const group = rows.filter(row => row.script.mainCharacter.kind === member.kind);
    if (!group.length) continue;
    content.push(`## ${member.name}`, '', '| Read story | Co-star | Setting | Moral | Status |', '| --- | --- | --- | --- | --- |');
    for (const {script, status} of group) {
      const friends = names(script).filter(name => name !== script.mainCharacter.name).join(', ');
      content.push(`| [${cell(script.title)}](standby/${script.slug}.md) | ${cell(friends)} | ${cell(settings(script).join(', '))} | ${cell(script.moral)} | ${label(status)} |`);
    }
    content.push('');
  }
  return content.join('\n');
}

function writeChanged(file, content) {
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return;
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, content);
}

function main() {
  const command = process.argv[2] ?? 'list';
  const args = parseArgs();
  if (!['list', 'sync', 'used'].includes(command)) {
    console.log('Usage: standby.mjs list [--json] | sync [--dry-run] | used --slug S [--release URL] [--run ID] [--dry-run]');
    if (command !== '--help') process.exitCode = 1;
    return;
  }
  const {manifest, entries, episodes, stories} = readStandbyInventory();
  if (command === 'used') {
    if (!args.slug) throw new Error('used requires --slug');
    markStandbyUsed(manifest, String(args.slug), {releaseUrl: args.release, runId: args.run});
  }
  if (command !== 'list') {
    for (const script of entries) {
      const status = standbyStatus(script.slug, manifest.usage, episodes, stories);
      if (status.status === 'used') markStandbyUsed(manifest, script.slug, status);
    }
  }
  const rows = entries.map(script => ({script, status: standbyStatus(script.slug, manifest.usage, episodes, stories)}));
  if (command !== 'list' && !args['dry-run']) {
    writeChanged(STANDBY_FILE, JSON.stringify(manifest, null, 2) + '\n');
    writeChanged(path.join(LIBRARY_DIR, 'STANDBY.md'), bankPage(rows));
    for (const row of rows) writeChanged(path.join(LIBRARY_DIR, 'standby', `${row.script.slug}.md`), storyPage(row.script, row.status));
  }
  const available = rows.filter(row => row.status.status === 'available').length;
  if (args.json) {
    console.log(JSON.stringify({total: rows.length, available, used: rows.length - available,
      stories: rows.map(({script, status}) => ({slug: script.slug, title: script.title, hero: script.mainCharacter.name,
        cast: names(script), settings: settings(script), moral: script.moral, ...status}))}, null, 2));
  } else {
    console.log(`[standby] ${rows.length} stories; ${available} available; ${rows.length - available} used${args['dry-run'] ? ' (dry run)' : ''}`);
    if (command === 'list') for (const {script, status} of rows) console.log(`${label(status).padEnd(19)} ${script.slug} — ${script.title}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (err) { console.error(`[standby] ${err.message}`); process.exitCode = 1; }
}
