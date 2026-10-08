/** Two offline commands: export a writing kit; feed one story or a batch. */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs, ROOT} from './lib/common.mjs';
import {buildStoryKit, importStories} from './lib/story-tools.mjs';

const [command, input] = process.argv.slice(2);
const args = parseArgs();
try {
  if (command === 'brief') {
    const destination = path.resolve(args.out || path.join(ROOT, 'out/story-kit'));
    const kit = buildStoryKit({batch: Number(args.batch ?? 3), target: Number(args.target ?? 50)});
    fs.mkdirSync(destination, {recursive: true});
    const files = {'PROMPT.md': kit.prompt, 'context.json': JSON.stringify(kit.context, null, 2) + '\n',
      'story.schema.json': JSON.stringify(kit.schema, null, 2) + '\n', 'example-story.json': JSON.stringify(kit.example, null, 2) + '\n',
      'README.txt': 'Paste PROMPT.md into your chat. Attach story.schema.json and example-story.json if supported.\nSave the complete JSON response as a file outside this kit.\nPreview: npm run stories:feed -- ./batch.json --dry-run\nImport and queue: npm run stories:feed -- ./batch.json\nRepeat for subsequent batches, refreshing this kit after each import.\nImports are local until committed and pushed with [skip ci]. No LLM, speech or render calls are made by these two commands.\n'};
    for (const [file, content] of Object.entries(files)) fs.writeFileSync(path.join(destination, file), content);
    const counts = kit.context.counts;
    console.log(`[stories] writing kit: ${destination}`);
    console.log(`[stories] ${counts.characters} characters; ${counts.backgrounds} backgrounds; ${counts.usedStories} used stories; ${counts.unusedStories} unused stories; goal ${kit.context.targetStories}`);
    console.log(`[stories] paste ${path.join(destination, 'PROMPT.md')} into your chat`);
  } else if (command === 'feed') {
    if (!input || input.startsWith('--')) throw new Error('supply a JSON file or directory: npm run stories:feed -- ./batch.json');
    const result = importStories(input, {dryRun: !!args['dry-run'], queue: !args['no-queue']});
    console.log(`[stories] ${result.dryRun ? 'dry run: ' : ''}${result.added.length} new; ${result.unchanged.length} unchanged; ${result.queued} ${result.dryRun ? 'would be queued' : 'queued'}`);
    for (const slug of result.added) console.log(`  ${slug}`);
    for (const warning of result.warnings) console.warn(`[stories] ${warning.slug}: advisory story-audit findings; review with node scripts/audit-story.mjs --slug ${warning.slug}`);
    if (result.added.length && !result.dryRun) console.log('[stories] saved in library/scripts and library/standby.json. Commit and push library changes with [skip ci] to make them available to GitHub Actions.');
  } else {
    console.log('npm run stories:brief -- [--batch 3] [--target 50] [--out out/story-kit]\nnpm run stories:feed -- FILE_OR_DIRECTORY [--dry-run] [--no-queue]');
    if (command && command !== '--help') process.exitCode = 1;
  }
} catch (error) {
  console.error(`[stories] ${error.message}`);
  process.exitCode = 1;
}
