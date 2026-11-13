import {AbsoluteFill, useVideoConfig} from 'remotion';
import {C, F} from '../theme';

const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

export const CoverBackdrop = () => {
  const {width, height} = useVideoConfig();
  const portrait = height > width;
  const wide = width / height > 1.5;

  return (
    <AbsoluteFill style={{backgroundColor: C.bg0, overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(90% 72% at 50% -6%, #12213d 0%, #080e1c 46%, #03050a 100%)',
        }}
      />

      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(120,170,235,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(120,170,235,0.06) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage:
            'radial-gradient(78% 68% at 50% 44%, black 0%, rgba(0,0,0,0.55) 55%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(78% 68% at 50% 44%, black 0%, rgba(0,0,0,0.55) 55%, transparent 100%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          width: width * 0.9,
          height: width * 0.9,
          right: -width * 0.24,
          top: -width * 0.36,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(34,211,238,0.18) 0%, rgba(34,211,238,0.04) 40%, transparent 68%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: width * 0.95,
          height: width * 0.95,
          left: -width * 0.32,
          bottom: -width * 0.46,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(139,92,246,0.16) 0%, rgba(139,92,246,0.04) 42%, transparent 70%)',
        }}
      />

      {/* ghost number on the right */}
      <div
        style={{
          position: 'absolute',
          right: portrait ? -width * 0.2 : width * 0.015,
          top: portrait ? height * 0.34 : height * 0.36,
          fontFamily: F.display,
          fontSize: portrait ? width * 0.72 : height * 0.55,
          fontWeight: 800,
          letterSpacing: -12,
          lineHeight: 1,
          color: 'rgba(52,211,153,0.016)',
          pointerEvents: 'none',
        }}
      >
        2.22
      </div>

      {/* diagonal beam */}
      <div
        style={{
          position: 'absolute',
          left: -width * 0.2,
          top: -height * 0.2,
          width: width * 0.32,
          height: height * 1.4,
          rotate: '18deg',
          background:
            'linear-gradient(90deg, transparent, rgba(125,211,252,0.045), transparent)',
          filter: 'blur(30px)',
          mixBlendMode: 'screen',
        }}
      />

      {wide ? (
        <>
          <div
            style={{
              position: 'absolute',
              left: width * 0.055,
              top: height * 0.42,
              fontFamily: F.mono,
              fontSize: 12,
              letterSpacing: 5,
              color: 'rgba(251,113,133,0.32)',
              transform: 'rotate(-90deg)',
              transformOrigin: 'left top',
            }}
          >
            SERIAL · 8.14s
          </div>
          <div
            style={{
              position: 'absolute',
              right: width * 0.055,
              top: height * 0.42,
              fontFamily: F.mono,
              fontSize: 12,
              letterSpacing: 5,
              color: 'rgba(52,211,153,0.32)',
              transform: 'rotate(90deg)',
              transformOrigin: 'right top',
            }}
          >
            CONCURRENT · 2.22s
          </div>
        </>
      ) : null}

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
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 3px)',
          opacity: 0.4,
          mixBlendMode: 'soft-light',
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(105% 82% at 50% 46%, transparent 38%, rgba(0,2,6,0.62) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};
