import {cancelRender, continueRender, delayRender, staticFile} from 'remotion';
import {getInfo} from '@remotion/google-fonts/Fredoka';

// Exact Fredoka v17 bytes shipped by @remotion/google-fonts 4.0.520, hosted locally.
// Three variable-font subsets cover all five legacy weights and the same glyphs.
export const fontFamily = 'Fredoka';
export const fontsReady: Promise<void> = typeof document === 'undefined' || typeof FontFace === 'undefined'
  ? Promise.resolve()
  : (() => {
    const handle = delayRender('Load local Fredoka fonts');
    return Promise.all(Object.entries(getInfo().unicodeRanges).map(async ([subset, unicodeRange]) => {
      const face = new FontFace(fontFamily, `url("${staticFile(`fonts/fredoka-v17/${subset}.woff2`)}")`, {
        style: 'normal', weight: '300 700', unicodeRange,
      });
      document.fonts.add(await face.load());
    })).then(() => {continueRender(handle);}, error => {cancelRender(error); throw error;});
  })();
