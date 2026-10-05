/** Read-only local Studio export review. No keys, network, or library writes. */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs, ROOT} from './lib/common.mjs';
import {parseStudioExport, buildEngagementReport, engagementReportText, engagementReportHtml} from './lib/engagement-report.mjs';

const args = parseArgs();
try {
  if (args.help) {
    console.log('Usage: node scripts/report-analytics.mjs --input studio.csv|json [--retention retention.csv|json] [--script script.json|--slug existing] [--video-id ID] [--min-views 100] [--out report.txt|json|html] [--format text|json|html]');
  } else {
    if (!args.input || args.input === true) throw new Error('Supply --input with a local YouTube Studio CSV or JSON export.');
    if (args.script && args.slug) throw new Error('Use either --script or --slug.');
    let scriptFile = args.script;
    if (args.slug) {
      if (!/^[a-z0-9][a-z0-9_-]*$/i.test(args.slug)) throw new Error('slug must be an episode slug without path separators.');
      const permanent = path.join(ROOT, 'library/scripts', `${args.slug}.json`);
      scriptFile = fs.existsSync(permanent) ? permanent : path.join(ROOT, 'public/generated', args.slug, 'script.json');
    }
    const script = scriptFile ? JSON.parse(fs.readFileSync(scriptFile, 'utf8')) : undefined;
    const analytics = parseStudioExport(fs.readFileSync(args.input, 'utf8'));
    if (args.retention) {
      const additional = parseStudioExport(fs.readFileSync(args.retention, 'utf8'));
      analytics.retention.push(...additional.retention);
      analytics.warnings.push(...additional.warnings);
    }
    const report = buildEngagementReport({analytics, script, videoId: args['video-id'], minViews: args['min-views'] ?? 100});
    const format = args.format ?? (args.out ? path.extname(args.out).slice(1) : 'text');
    const output = format === 'json' ? JSON.stringify(report, null, 2) : format === 'html' ? engagementReportHtml(report) :
      ['text', 'txt', 'md'].includes(format) ? engagementReportText(report) : null;
    if (output === null) throw new Error('format must be text, json, or html.');
    if (args.out) {
      const target = path.resolve(args.out);
      if ([args.input, args.retention, scriptFile].filter(Boolean).some(file => path.resolve(file) === target) || target.startsWith(path.join(ROOT, 'library') + path.sep)) throw new Error('Report output must not overwrite an input or write into library/.');
      fs.mkdirSync(path.dirname(target), {recursive: true});
      fs.writeFileSync(target, output + '\n');
      console.log(`Local report written: ${target}`);
    } else console.log(output);
  }
} catch (error) {
  console.error(`[analytics] ${error.message}`);
  process.exitCode = 1;
}
