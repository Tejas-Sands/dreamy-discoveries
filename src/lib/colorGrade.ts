export type ColorGradeMode = 'original' | 'sunny' | 'vivid' | 'production';

const CHARACTER_GRADES: Record<ColorGradeMode, string> = {
  original: 'none',
  sunny: 'saturate(1.3) contrast(1.12) brightness(0.99)',
  vivid: 'saturate(1.5) contrast(1.18) brightness(0.98)',
  production: 'saturate(1.4) contrast(1.15) brightness(0.985)',
};

const BACKGROUND_GRADES: Record<ColorGradeMode, string> = {
  original: 'none',
  sunny: 'saturate(1.65) contrast(1.12) brightness(0.99)',
  vivid: 'saturate(1.95) contrast(1.18) brightness(0.98)',
  production: 'saturate(1.8) contrast(1.15) brightness(0.985)',
};

export function characterColorGrade(mode: ColorGradeMode = 'production'): string {
  return CHARACTER_GRADES[mode];
}

/** Applied at scene boundaries so cached and live artwork receive the same grade. */
export function backgroundColorGrade(palette: string, mode: ColorGradeMode = 'production'): string {
  // Night scenes need a gentler contrast lift to preserve shadow detail.
  return mode === 'production' && palette === 'night'
    ? 'saturate(1.45) contrast(1.08) brightness(1.01)'
    : BACKGROUND_GRADES[mode];
}
