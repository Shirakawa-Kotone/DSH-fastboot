import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, F, panelStyle} from '../theme';
import {Chip, Dot, Fade, SceneFade, SceneShell} from '../ui';

const Typed = ({
  text,
  start,
  cps = 1.5,
  style,
}: {
  text: string;
  start: number;
  cps?: number;
  style?: React.CSSProperties;
}) => {
  const frame = useCurrentFrame();
  const shown = Math.max(0, Math.floor((frame - start) * cps));
  const visible = text.slice(0, Math.min(text.length, shown));
  return (
    <span style={style}>
      {visible}
      {shown < text.length && shown >= 0 ? (
        <span
          style={{
            display: 'inline-block',
            width: 10,
            height: 22,
            marginLeft: 4,
            background: C.cyan,
            verticalAlign: '-3px',
            opacity: Math.floor(frame / 8) % 2 === 0 ? 0.9 : 0.1,
          }}
        />
      ) : null}
    </span>
  );
};

export const S9Outro = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const card = spring({
    frame: frame - 4,
    fps,
    config: {damping: 200, mass: 0.85, stiffness: 90},
    durationInFrames: 30,
  });
  const done = interpolate(frame, [38, 50], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const brand = spring({
    frame: frame - 70,
    fps,
    config: {damping: 200, mass: 0.8, stiffness: 80},
    durationInFrames: 30,
  });
  const out = interpolate(frame, [224, 240], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <SceneFade duration={240} fadeIn={8} fadeOut={6}>
      <SceneShell>
        <div style={{position: 'absolute', inset: 0, opacity: out}}>
          <Fade delay={8} duration={16}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 150,
                textAlign: 'center',
                fontFamily: F.mono,
                fontSize: 13,
                letterSpacing: 5,
                color: C.muted,
              }}
            >
              INSTALL · ONE COMMAND
            </div>
          </Fade>

          <div
            style={{
              position: 'absolute',
              left: 360,
              top: 230,
              width: 1200,
              height: 206,
              ...panelStyle,
              border: `1px solid ${done > 0.4 ? 'rgba(52,211,153,0.42)' : 'rgba(125,170,240,0.2)'}`,
              boxShadow:
                done > 0.4
                  ? `${panelStyle.boxShadow}, 0 0 50px rgba(52,211,153,0.1)`
                  : panelStyle.boxShadow,
              padding: '24px 34px',
              opacity: card,
              translate: `0 ${(1 - card) * 26}px`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 18,
              }}
            >
              <Dot color="#fb7185" size={9} glow={false} />
              <Dot color="#fbbf24" size={9} glow={false} />
              <Dot color="#34d399" size={9} glow={false} />
              <span
                style={{
                  marginLeft: 10,
                  fontFamily: F.mono,
                  fontSize: 11,
                  letterSpacing: 1.4,
                  color: C.dim,
                }}
              >
                agent tool · plugin_manager
              </span>
            </div>

            <div
              style={{
                fontFamily: F.mono,
                fontSize: 27,
                lineHeight: 1.55,
                color: C.soft,
              }}
            >
              <div>
                <span style={{color: C.green}}>$ </span>
                <Typed text="plugin_manager install_bundle" start={8} cps={3.2} />
              </div>
              <div style={{color: C.cyanSoft, paddingLeft: 26}}>
                <Typed
                  text="@shirakawa-kotone/dsh-fastboot"
                  start={24}
                  cps={3.2}
                />
              </div>
            </div>

            <div
              style={{
                position: 'absolute',
                right: 34,
                bottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                opacity: done,
                translate: `0 ${(1 - done) * 8}px`,
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 18,
                  height: 18,
                  borderRadius: 99,
                  background: 'rgba(52,211,153,0.14)',
                  color: C.green,
                  fontSize: 12,
                }}
              >
                ✓
              </span>
              <span
                style={{
                  fontFamily: F.mono,
                  fontSize: 12,
                  color: C.green,
                  letterSpacing: 1,
                }}
              >
                installed
              </span>
              <span
                style={{
                  fontFamily: F.mono,
                  fontSize: 11,
                  color: C.dim,
                  letterSpacing: 0.8,
                }}
              >
                · restart to apply
              </span>
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 486,
              display: 'flex',
              justifyContent: 'center',
              gap: 12,
            }}
          >
            {[
              {label: 'Host 2.2s', color: C.green},
              {label: '热重载 0.1s', color: C.cyan},
              {label: '零配置', color: C.violet},
            ].map((c, i) => {
              const p = spring({
                frame: frame - (52 + i * 7),
                fps,
                config: {damping: 200, mass: 0.7, stiffness: 120},
                durationInFrames: 22,
              });
              return (
                <Chip
                  key={c.label}
                  color={c.color}
                  filled
                  style={{
                    fontSize: 15,
                    padding: '10px 18px',
                    opacity: p,
                    translate: `0 ${(1 - p) * 12}px`,
                  }}
                >
                  <Dot color={c.color} size={6} />
                  {c.label}
                </Chip>
              );
            })}
          </div>

          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 596,
              textAlign: 'center',
              opacity: brand,
              translate: `0 ${(1 - brand) * 24}px`,
            }}
          >
            <div
              style={{
                fontFamily: F.display,
                fontSize: 108,
                fontWeight: 800,
                letterSpacing: -3,
                lineHeight: 1,
                backgroundImage: `linear-gradient(96deg, ${C.ink} 0%, ${C.cyanSoft} 55%, ${C.violetSoft} 100%)`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                filter: 'drop-shadow(0 12px 40px rgba(34,211,238,0.12))',
              }}
            >
              DSH FASTBOOT
            </div>
            <div
              style={{
                marginTop: 18,
                fontSize: 26,
                color: C.muted,
                letterSpacing: 1,
              }}
            >
              让你的 DSH 启动再快一点。
            </div>
          </div>

          <Fade delay={106} duration={14}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 92,
                textAlign: 'center',
                fontFamily: F.mono,
                fontSize: 11.5,
                letterSpacing: 1.6,
                color: C.dim,
              }}
            >
              MIT · @shirakawa-kotone/dsh-fastboot · npmjs.com
            </div>
          </Fade>
        </div>
      </SceneShell>
    </SceneFade>
  );
};
