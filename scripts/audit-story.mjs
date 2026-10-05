/** Read-only audit of spoken narrative evidence; never rewrites a script or calls a model. */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs, ROOT} from './lib/common.mjs';
import {auditStory, storyAuditText} from './lib/story-audit.mjs';

const args = parseArgs();
try {
  if (args.help) console.log('Usage: node scripts/audit-story.mjs --input script.json|--slug existing [--format text|json] [--out report.txt|json]');
  else {
    if (Boolean(args.input) === Boolean(args.slug)) throw new Error('Supply exactly one of --input script.json or --slug existing.');
    let input = args.input;
    if (args.slug) {
      if (!/^[a-z0-9][a-z0-9_-]*$/i.test(args.slug)) throw new Error('slug must be an episode slug without path separators.');
      const permanent = path.join(ROOT, 'library/scripts', `${args.slug}.json`);
      input = fs.existsSync(permanent) ? permanent : path.join(ROOT, 'public/generated', args.slug, 'script.json');
    }
    const script = JSON.parse(fs.readFileSync(input, 'utf8'));
    const report = auditStory(script);
    const format = args.format ?? (args.out ? path.extname(args.out).slice(1) : 'text');
    if (!['text', 'txt', 'md', 'json'].includes(format)) throw new Error('format must be text or json.');
    const output = format === 'json' ? JSON.stringify(report, null, 2) : storyAuditText(report);
    if (args.out) {
      const target = path.resolve(args.out);
      if (target === path.resolve(input) || target.startsWith(path.join(ROOT, 'library') + path.sep)) throw new Error('Audit output must not overwrite the script or write into library/.');
      fs.mkdirSync(path.dirname(target), {recursive: true});
      fs.writeFileSync(target, output + '\n');
      console.log(`Advisory audit written: ${target}`);
    } else console.log(output);
  }
} catch (error) {
  console.error(`[story-audit] ${error.message}`);
  process.exitCode = 1;
}
