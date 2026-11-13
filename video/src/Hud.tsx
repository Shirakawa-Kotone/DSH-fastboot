import {interpolate, useCurrentFrame} from 'remotion';
import {TOTAL_FRAMES} from './timeline';
import {C, F} from './theme';

export const Hud = () => {
  const frame = useCurrentFrame();
  const progress = Math.min(1, Math.max(0, frame / (TOTAL_FRAMES - 1)));
  const visible = interpolate(frame, [30, 70], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: 120,
          bottom: 34,
          right: 120,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          opacity: 0.62 * visible,
          fontFamily: F.mono,
          fontSize: 12,
          letterSpacing: 3,
          color: C.muted,
        }}
      >
        <span>
          DSH <span style={{color: C.dim}}>·</span> FASTBOOT
        </span>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          height: 2,
          width: `${progress * 100}%`,
          background: `linear-gradient(90deg, ${C.cyan}, ${C.violet})`,
          boxShadow: `0 0 14px ${C.cyan}88`,
          opacity: visible,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          height: 1,
          width: '100%',
          background: 'rgba(130,170,230,0.12)',
        }}
      />
    </>
  );
};
