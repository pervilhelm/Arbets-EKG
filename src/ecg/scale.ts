// Standard ECG paper: 25 mm/s and 10 mm/mV.
export const PAPER_SPEED_MM_PER_S = 25;
export const GAIN_MM_PER_MV = 10;

/** Horizontal distance in px for a duration in seconds. */
export function timeToX(sec: number, pxPerMm: number): number {
  return sec * PAPER_SPEED_MM_PER_S * pxPerMm;
}

/** Vertical distance in px (positive is upwards) for a voltage in mV. */
export function mvToY(mv: number, pxPerMm: number): number {
  return mv * GAIN_MM_PER_MV * pxPerMm;
}
