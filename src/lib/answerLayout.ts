const fallbackMeasure = (text: string, size: number) => [...text].reduce((width, c) => width +
  (/\s/.test(c) ? .36 : /[ilIjtfr.,!:'’]/.test(c) ? .45 : /[MW@%]/.test(c) ? 1.1 : /[^\x00-\x7f]/.test(c) ? 1.15 : .82) * size, 0);

/** Fit complete bounded answer labels; long tokens split at grapheme boundaries. */
export function fitAnswerText(text: string, {hasEmoji = false, measure = fallbackMeasure}:
  {hasEmoji?: boolean; measure?: (text: string, size: number) => number} = {}) {
  const emojiSize = hasEmoji ? text.length > 90 ? 80 : text.length > 55 ? 140 : 230 : 0;
  const maximum = text.length > 10 ? 88 : text.length > 6 ? 110 : 140;
  const wrap = (size: number) => {
    const lines: string[] = [];
    let line = '';
    for (const word of text.trim().split(/\s+/).filter(Boolean)) {
      if (line && measure(`${line} ${word}`, size) <= 640) {line += ` ${word}`; continue;}
      if (line) {lines.push(line); line = '';}
      for (const {segment} of new Intl.Segmenter(undefined, {granularity: 'grapheme'}).segment(word)) {
        if (line && measure(line + segment, size) > 640) {lines.push(line); line = '';}
        line += segment;
      }
    }
    if (line) lines.push(line);
    return lines;
  };
  let fontSize = maximum, lines = wrap(fontSize);
  while (fontSize > 36 && lines.length * fontSize * 1.08 + emojiSize + 64 > 520) {
    fontSize -= 2; lines = wrap(fontSize);
  }
  return {fontSize, emojiSize, lines, width: Math.min(720, Math.max(180, 68 + Math.max(0, ...lines.map(line => measure(line, fontSize)))))};
}
