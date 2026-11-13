import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {SCENES} from './timeline';
import {C} from './theme';

const BOUNDARIES = SCENES.slice(1).map((s) => s.from);

/** Thin light-line wipe on every scene boundary. */
export const CutFX = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {BOUNDARIES.map((b) => {
        const d = Math.abs(frame - b);
        if (d > 8) return null;
        const p = 1 - d / 8;
        return (
          <div key={b}>
            <div
              style={{
                position: 'absolute',
                top: 540,
                left: 0,
                width: '100%',
                height: 1,
                background: `linear-gradient(90deg, transparent, ${C.cyan}, ${C.violetSoft}, ${C.cyan}, transparent)`,
                opacity: p * 0.85,
                boxShadow: `0 0 22px ${C.cyan}aa`,
                scale: `0 ${1}`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `rgba(190, 230, 255, ${p * 0.035})`,
              }}
            />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
