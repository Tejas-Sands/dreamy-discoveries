/** Remotion's JPEG frames carry full-range BT.601 YCbCr, even for HD output. */
function jpegColorMatrix({type, args}) {
  const input = args.indexOf('-i');
  const jpeg = args.some((arg, i) => i < input && ['-vcodec', '-c:v'].includes(arg) && args[i + 1] === 'mjpeg');
  const filter = args.indexOf('-vf');
  if (type !== 'pre-stitcher' || !jpeg || filter < 0 || args[filter + 1] !== 'zscale=matrix=709:matrixin=709:range=limited') return args;
  const corrected = [...args];
  corrected[filter + 1] = 'zscale=matrix=709:matrixin=470bg:rangein=full:range=limited:primariesin=709:primaries=709:transferin=709:transfer=709';
  return corrected;
}

// Keep CLI, programmatic previews and production chunks on the same HD profile.
export const VIDEO_ENCODING = Object.freeze({colorSpace: 'bt709', pixelFormat: 'yuv420p', ffmpegOverride: jpegColorMatrix});
export const VIDEO_ENCODING_FLAGS = [`--color-space=${VIDEO_ENCODING.colorSpace}`, `--pixel-format=${VIDEO_ENCODING.pixelFormat}`];
