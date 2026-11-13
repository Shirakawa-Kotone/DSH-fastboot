import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C} from './theme';

const PARTICLES = Array.from({length: 38}, (_, i) => ({
  x: (i * 137.508 + 11) % 100,
  y: (i * 61.803 + 7) % 100,
  size: 1 + (i % 3) * 0.7,
  speed: 0.12 + (i % 6) * 0.035,
  phase: i * 0.73,
}));

const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

export const Backdrop = () => {
  const frame = useCurrentFrame();
  const driftX = Math.sin(frame / 210) * 34;
  const driftY = Math.cos(frame / 260) * 22;

  return (
    <AbsoluteFill style={{backgroundColor: C.bg0, overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(105% 78% at 50% -8%, #101c34 0%, #080e1c 46%, #04060b 100%)',
        }}
      />

      {/* technical grid */}
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(120,170,235,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(120,170,235,0.055) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage:
            'radial-gradient(85% 70% at 50% 42%, black 0%, rgba(0,0,0,0.55) 55%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(85% 70% at 50% 42%, black 0%, rgba(0,0,0,0.55) 55%, transparent 100%)',
          opacity: 0.9,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(130,180,245,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(130,180,245,0.05) 1px, transparent 1px)',
          backgroundSize: '320px 320px',
          maskImage:
            'radial-gradient(70% 60% at 50% 45%, black 0%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(70% 60% at 50% 45%, black 0%, transparent 100%)',
        }}
      />

      {/* glows */}
      <div
        style={{
          position: 'absolute',
          width: 1100,
          height: 1100,
          right: -320 + driftX,
          top: -460 + driftY,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(34,211,238,0.17) 0%, rgba(34,211,238,0.05) 38%, transparent 68%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 1200,
          height: 1200,
          left: -420 - driftX * 0.6,
          bottom: -620 - driftY,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(139,92,246,0.15) 0%, rgba(139,92,246,0.04) 42%, transparent 70%)',
        }}
      />

      {/* particles */}
      {PARTICLES.map((p, i) => {
        const twinkle =
          0.12 + 0.3 * (0.5 + 0.5 * Math.sin(frame / 19 + p.phase));
        const y = p.y - ((frame * p.speed * 0.03) % 6);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${p.x}%`,
              top: `${y}%`,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              background: i % 7 === 0 ? C.violetSoft : C.cyanSoft,
              opacity: twinkle,
              boxShadow: `0 0 ${p.size * 5}px ${i % 7 === 0 ? C.violet : C.cyan}`,
            }}
          />
        );
      })}

      {/* moving beam */}
      <div
        style={{
          position: 'absolute',
          left: `${((frame * 1.7) % 2400) - 500}px`,
          top: -220,
          width: 420,
          height: 1500,
          rotate: '16deg',
          background:
            'linear-gradient(90deg, transparent, rgba(125,211,252,0.055), transparent)',
          filter: 'blur(26px)',
          mixBlendMode: 'screen',
          opacity: 0.7,
        }}
      />

      {/* scan line */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: `${((frame * 7.5) % 1320) - 120}px`,
          height: 130,
          background:
            'linear-gradient(180deg, transparent, rgba(34,211,238,0.035), transparent)',
          mixBlendMode: 'screen',
        }}
      />

      {/* texture */}
      <AbsoluteFill
        style={{
          backgroundImage: NOISE,
          opacity: 0.045,
          mixBlendMode: 'overlay',
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.032) 0px, rgba(255,255,255,0.032) 1px, transparent 1px, transparent 3px)',
          opacity: 0.45,
          mixBlendMode: 'soft-light',
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(115% 85% at 50% 46%, transparent 38%, rgba(1,3,7,0.62) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};
