import {FPS, T} from './estimate.mjs';
import {auditStory} from './story-audit.mjs';

const header = value => String(value).normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g, '');
const aliases = {
  id: ['videoid', 'content', 'contentid', 'id'], title: ['videotitle', 'title', 'contenttitle'],
  views: ['views', 'viewcount'], impressions: ['impressions'],
  ctrPercent: ['impressionsclickthroughrate', 'impressionsclickthroughratepercent', 'clickthroughrate', 'ctr', 'ctrpercent'],
  averageViewSec: ['averageviewduration', 'averageviewdurationseconds', 'averageviewsec'],
  averageViewedPercent: ['averagepercentageviewed', 'averagepercentageviewedpercent', 'averageviewedpercent'],
  watchHours: ['watchtimehours', 'watchhours'], durationSec: ['videoduration', 'videodurationseconds', 'durationsec'],
  elapsedSec: ['elapsedvideotime', 'elapsedvideotimeseconds', 'elapsedseconds', 'elapsedsec', 'timestamp', 'time'],
  elapsedRatio: ['elapsedvideotimeratio', 'elapsedratio'],
  retentionPercent: ['audienceretention', 'audienceretentionpercent', 'retention', 'retentionpercent'],
  retentionRatio: ['audiencewatchratio', 'retentionratio'],
};
const fields = new Map(Object.entries(aliases).flatMap(([field, names]) => names.map(name => [name, field])));

function csvRows(source) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {cell += '"'; index++;}
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && !cell) quoted = true;
    else if (char === ',') {row.push(cell); cell = '';}
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[index + 1] === '\n') index++;
      row.push(cell); if (row.some(value => value.trim())) rows.push(row);
      row = []; cell = '';
    } else cell += char;
  }
  if (quoted) throw new Error('Unterminated quoted CSV field. Re-export the local file from YouTube Studio.');
  row.push(cell); if (row.some(value => value.trim())) rows.push(row);
  return rows;
}

function number(value, duration = false) {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : undefined;
  const raw = String(value ?? '').trim();
  if (!raw || /^(?:n\/?a|null|undefined|—|-|not available)$/i.test(raw)) return undefined;
  if (duration && /^\d+(?::\d{1,2}){1,2}(?:\.\d+)?$/.test(raw)) {
    return raw.split(':').reduce((total, part) => total * 60 + Number(part), 0);
  }
  const cleaned = raw.replace(/[,%\s]/g, '');
  if (!/^\d+(?:\.\d+)?$/.test(cleaned)) return undefined;
  return Number(cleaned);
}

/** Normalize local Studio overview or retention rows; omitted values remain absent. */
export function parseStudioExport(source, {format} = {}) {
  const text = String(source).replace(/^\uFEFF/, '').trim();
  if (!text) throw new Error('The local analytics export is empty.');
  let rows;
  if (format === 'json' || (!format && /^[\[{]/.test(text))) {
    const value = JSON.parse(text);
    rows = Array.isArray(value) ? value : ['rows', 'episodes', 'retention'].flatMap(key => Array.isArray(value?.[key]) ? value[key] : []);
    if (!rows.length) throw new Error('JSON export needs an array of rows, or rows/episodes/retention arrays.');
  } else {
    const [columns, ...values] = csvRows(text);
    if (!columns?.some(column => fields.has(header(column)))) throw new Error('No recognized Studio columns. Include Video title/ID, Views, or retention columns.');
    rows = values.map((values, index) => {
      if (values.length !== columns.length) throw new Error(`CSV row ${index + 2} has ${values.length} fields; expected ${columns.length}. Check commas and quotes.`);
      return Object.fromEntries(columns.map((key, columnIndex) => [key, values[columnIndex]]));
    });
  }
  const episodes = [], retention = [], warnings = [];
  for (const [index, row] of rows.entries()) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {warnings.push(`Skipped row ${index + 1}: expected a record.`); continue;}
    const normalized = {};
    for (const [key, value] of Object.entries(row)) {
      const field = fields.get(header(key));
      if (!field) continue;
      const parsed = ['id', 'title'].includes(field) ? String(value ?? '').trim() || undefined : number(value, /Sec$/.test(field));
      if (parsed !== undefined) normalized[field] = parsed;
      else if (String(value ?? '').trim()) warnings.push(`Row ${index + 1}: ${key} is missing or not a usable nonnegative value.`);
    }
    if (/^(?:total|totals|all videos)$/i.test(normalized.id ?? normalized.title ?? '')) continue;
    if (normalized.retentionRatio !== undefined) normalized.retentionPercent = normalized.retentionRatio * 100;
    if (normalized.elapsedRatio !== undefined && normalized.elapsedRatio > 1) {
      warnings.push(`Row ${index + 1}: elapsed video time ratio must be between 0 and 1.`); delete normalized.elapsedRatio;
    }
    if (normalized.retentionPercent !== undefined) {
      const sample = {retentionPercent: normalized.retentionPercent};
      if (normalized.id) sample.videoId = normalized.id;
      for (const field of ['elapsedSec', 'elapsedRatio', 'views']) if (normalized[field] !== undefined) sample[field] = normalized[field];
      if (sample.elapsedSec !== undefined || sample.elapsedRatio !== undefined) retention.push(sample);
      else warnings.push(`Row ${index + 1}: retention has no timestamp or elapsed video time ratio.`);
    } else if (normalized.id || normalized.title || normalized.views !== undefined) {
      delete normalized.retentionRatio; delete normalized.elapsedSec; delete normalized.elapsedRatio;
      episodes.push(normalized);
    }
  }
  return {episodes, retention, warnings};
}

const frames = sec => Math.round(sec * FPS);
function episodeTimeline(script) {
  if (!script) return null;
  let cursor = (script.presentationVersion ?? 0) >= 1 && script.opening === 'hook' ? 0 :
    frames(Math.max(T.INTRO_MIN, T.INTRO_SPEAK_AT + (script.intro?.durationSec ?? 0) + .4 + T.COUNTDOWN));
  const scenes = [];
  let estimated = false;
  for (const [sceneIndex, scene] of (script.scenes ?? []).entries()) {
    const startFrame = cursor;
    const spoken = line => {
      if (!Number.isFinite(line.durationSec)) estimated = true;
      return frames((line.voxPreSec ?? 0) + (line.durationSec ?? T.DEFAULT_LINE) + T.LINE_GAP + (line.voxPostSec ?? 0));
    };
    for (const line of scene.lines ?? []) cursor += spoken(line);
    cursor += frames(scene.holdSec ?? 0) + frames(T.SCENE_PAD);
    if (scene.question) cursor += frames(T.REVEAL);
    scenes.push({sceneIndex, sceneNumber: sceneIndex + 1, kind: scene.kind, startFrame, endFrame: cursor,
      startSec: startFrame / FPS, endSec: cursor / FPS});
  }
  cursor += frames(Math.max(T.END_MIN, .8 + (script.outro?.durationSec ?? 0) + 1.6)) + frames(T.BRAND_OUTRO);
  if (script.intro?.text && !Number.isFinite(script.intro.durationSec) || script.outro?.text && !Number.isFinite(script.outro.durationSec)) estimated = true;
  return {fps: FPS, durationSec: cursor / FPS, timing: estimated ? 'estimated' : 'voice-timed', scenes};
}

const rounded = value => Math.round(value * 100) / 100;
/** A sample threshold is a review guardrail, not a significance test or a recommendation benchmark. */
export function buildEngagementReport({analytics, script, videoId, minViews = 100}) {
  if (!analytics || !Array.isArray(analytics.episodes) || !Array.isArray(analytics.retention)) throw new Error('Pass normalized local analytics from parseStudioExport.');
  if (!Number.isFinite(Number(minViews)) || Number(minViews) < 1) throw new Error('minViews must be a positive number.');
  const episodes = analytics.episodes;
  const matchesScript = row => Boolean(script && (script.videoId && row.id === script.videoId || script.slug && row.id === script.slug || script.title && row.title === script.title));
  let episode = videoId ? episodes.find(row => row.id === videoId) : episodes.find(matchesScript);
  if (videoId && !episode) throw new Error(`Video ${videoId} was not found in the supplied overview export.`);
  if (!episode && episodes.length === 1) episode = episodes[0];
  const timeline = episodeTimeline(script);
  const limitations = ['Retention intervals are observations; they cannot establish the cause of a drop or prove a content change will help.',
    `The ${Number(minViews)}-view threshold is an adjustable review guardrail, not a statistical significance test.`,
    'Metrics apply only to the supplied export and date range. Audience, traffic sources and title/thumbnail changes may differ.'];
  if (!episode && episodes.length > 1) limitations.push('Multiple videos supplied. Select --video-id to associate an episode and its retention.');
  if (episode && script && !matchesScript(episode)) limitations.push('The overview row was paired with the supplied script by request; verify that they describe the same video.');
  if (timeline?.timing === 'estimated') limitations.push('Scene times are estimated because some local voice durations are missing. Generate audio for precise timing.');
  if (!timeline) limitations.push('No script supplied; retention cannot be linked to story scenes.');
  const sample = episode?.views >= Number(minViews) ? {status: 'reviewable', views: episode.views, threshold: Number(minViews), reason: 'Enough supplied views for a cautious descriptive review.'} :
    {status: 'insufficient', ...(episode?.views !== undefined ? {views: episode.views} : {}), threshold: Number(minViews),
      reason: episode?.views === undefined ? 'View count is unknown or not supplied; no content recommendations are justified.' : `Only ${episode.views} views supplied; wait for at least ${Number(minViews)} before reviewing content changes.`};
  const selected = analytics.retention.filter(point => {
    if (point.videoId) return Boolean(episode?.id && point.videoId === episode.id);
    return episodes.length <= 1;
  });
  if (analytics.retention.some(point => !point.videoId) && episodes.length > 1) limitations.push('Unidentified retention rows were excluded because the export contains several videos.');
  const duration = episode?.durationSec ?? timeline?.durationSec;
  const timingMismatch = timeline && episode?.durationSec !== undefined && Math.abs(timeline.durationSec - episode.durationSec) > Math.max(1, episode.durationSec * .02);
  if (timingMismatch) limitations.push(`Exported duration (${rounded(episode.durationSec)}s) and local script duration (${rounded(timeline.durationSec)}s) differ. Scene associations are omitted because these timelines may not match.`);
  const warnings = [...(analytics.warnings ?? [])];
  const timed = selected.flatMap(point => {
    const elapsedSec = point.elapsedSec ?? (duration !== undefined && point.elapsedRatio !== undefined ? point.elapsedRatio * duration : undefined);
    if (elapsedSec === undefined) return [];
    if (!Number.isFinite(elapsedSec) || elapsedSec < 0 || !Number.isFinite(point.retentionPercent) || point.retentionPercent < 0) {
      warnings.push('Excluded retention sample with an invalid time or retention value.'); return [];
    }
    if (duration !== undefined && elapsedSec > duration) {warnings.push(`Excluded ${elapsedSec}s retention sample outside the supplied ${rounded(duration)}s duration.`); return [];}
    return [{...point, elapsedSec}];
  }).sort((left, right) => left.elapsedSec - right.elapsedSec);
  const grouped = new Map();
  for (const point of timed) {
    if (!grouped.has(point.elapsedSec)) grouped.set(point.elapsedSec, []);
    grouped.get(point.elapsedSec).push(point);
  }
  const retention = [...grouped.values()].flatMap(points => {
    if (points.some(point => point.retentionPercent !== points[0].retentionPercent)) {
      warnings.push(`Conflicting duplicate retention samples at ${points[0].elapsedSec}s were excluded; supply one date range and video.`); return [];
    }
    return [points[0]];
  });
  if (selected.some(point => point.elapsedRatio !== undefined) && duration === undefined) limitations.push('Ratio retention rows need a video duration or a supplied script; they were excluded.');
  const observations = [], recommendations = [];
  for (let index = 1; index < retention.length; index++) {
    const before = retention[index - 1], after = retention[index];
    const dropPoints = rounded(before.retentionPercent - after.retentionPercent);
    if (after.elapsedSec <= before.elapsedSec || dropPoints < 10) continue;
    const scenes = !timingMismatch ? timeline?.scenes.filter(scene => scene.startSec < after.elapsedSec && scene.endSec > before.elapsedSec) ?? [] : [];
    const observation = {kind: 'retention-drop', fromSec: before.elapsedSec, toSec: after.elapsedSec, dropPoints, scenes,
      message: `Retention fell ${dropPoints} percentage points from ${rounded(before.elapsedSec)}s to ${rounded(after.elapsedSec)}s (${before.retentionPercent}% to ${after.retentionPercent}%).`};
    observations.push(observation);
    if (sample.status === 'reviewable') recommendations.push({kind: 'review-retention',
      message: `Review ${scenes.length ? scenes.map(scene => `scene ${scene.sceneNumber} (${scene.kind})`).join(', ') : 'the supplied video'} between ${rounded(before.elapsedSec)}s and ${rounded(after.elapsedSec)}s. Compare pacing and clarity against adjacent intervals; this drop does not identify its cause.`,
      evidence: observation});
  }
  if (retention.length < 2) limitations.push('Fewer than two timed retention samples supplied; no retention trend can be reviewed.');
  if (retention.length) limitations.push('Overall views do not establish the number of viewers behind each retention sample. Interval reliability is unknown unless supplied separately.');
  return {version: 1, source: 'local YouTube Studio export', episode: episode ?? null, episodes, sample, timeline, sceneTimingComparable: Boolean(timeline && !timingMismatch), retention, observations, recommendations,
    storyAudit: script?.type === 'story' ? auditStory(script) : null, limitations, warnings};
}

export function engagementReportText(report) {
  const lines = [`Local engagement report: ${report.episode?.title ?? report.episode?.id ?? 'unselected video'}`,
    `Sample: ${report.sample.status}. ${report.sample.reason}`];
  if (report.episode) {
    for (const [field, label] of Object.entries({views: 'Views', impressions: 'Impressions', ctrPercent: 'CTR (%)', averageViewSec: 'Average view duration (seconds)', averageViewedPercent: 'Average viewed (%)', watchHours: 'Watch time (hours)'})) {
      if (report.episode[field] !== undefined) lines.push(`${label}: ${report.episode[field]}`);
    }
  }
  if (report.timeline) lines.push(`Scene timing: ${report.timeline.timing}; full episode ${rounded(report.timeline.durationSec)}s.`);
  for (const item of report.observations) lines.push(`Observation: ${item.message}${item.scenes.length ? ` Scenes: ${item.scenes.map(scene => scene.sceneNumber).join(', ')}.` : ''}`);
  for (const item of report.recommendations) lines.push(`Review: ${item.message}`);
  if (!report.recommendations.length) lines.push('No content recommendations supported by these inputs.');
  lines.push(...report.limitations.map(text => `Limit: ${text}`), ...report.warnings.map(text => `Input warning: ${text}`));
  return lines.join('\n');
}

const escape = text => String(text).replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
export function engagementReportHtml(report) {
  const width = 720, height = 240, pad = 32;
  const maxTime = Math.max(1, ...report.retention.map(point => point.elapsedSec));
  const maxRetention = Math.max(100, ...report.retention.map(point => point.retentionPercent));
  const x = sec => pad + sec / maxTime * (width - 2 * pad);
  const y = percent => height - pad - percent / maxRetention * (height - 2 * pad);
  const points = report.retention.map(point => `${rounded(x(point.elapsedSec))},${rounded(y(point.retentionPercent))}`).join(' ');
  const markers = (report.sceneTimingComparable ? report.timeline?.scenes ?? [] : []).filter(scene => scene.startSec <= maxTime).map(scene => `<line x1="${x(scene.startSec)}" x2="${x(scene.startSec)}" y1="${pad}" y2="${height - pad}" stroke="#d1d5db"/><text x="${x(scene.startSec) + 3}" y="${height - 8}" font-size="10">S${scene.sceneNumber}</text>`).join('');
  const chart = report.retention.length ? `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Audience retention by elapsed video time"><title>Supplied retention samples; vertical lines mark scene starts</title>${markers}<polyline points="${points}" fill="none" stroke="#166534" stroke-width="3"/><text x="8" y="20">${maxRetention}%</text><text x="${width - 80}" y="20">${rounded(maxTime)} seconds</text></svg>` : '';
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Local engagement report</title><style>body{font:16px/1.6 system-ui;margin:32px auto;padding:0 24px;max-width:900px;color:#17251d;background:#f8faf7}h1{font-size:28px}pre{white-space:pre-wrap;font:inherit;background:white;border:1px solid #dce5dd;padding:20px;border-radius:12px}svg{width:100%;background:white;border-radius:12px}</style><h1>${escape(report.episode?.title ?? 'Local engagement report')}</h1>${chart}<pre>${escape(engagementReportText(report))}</pre></html>`;
}
