import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, F, gradText, panelStyle, tabular} from '../theme';
import {Count, Fade, Kicker, Reveal, SceneFade, SceneShell} from '../ui';

const valueRows = [
  {label: 'WITHOUT', value: 8.14, color: C.red, width: 100},
  {label: 'WITH FASTBOOT', value: 2.22, color: C.green, width: 27.3},
];

export const S1Intro = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const tracking = interpolate(frame, [18, 54], [34, 18], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const cardIn = spring({
    frame: frame - 54,
    fps,
    config: {damping: 200, mass: 0.85, stiffness: 90},
    durationInFrames: 30,
  });
  const sheen = interpolate(frame, [104, 158], [-30, 130], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const outro = interpolate(frame, [214, 240], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const zoom = interpolate(frame, [0, 240], [1, 1.035]);

  return (
    <SceneFade duration={240} fadeIn={6} fadeOut={8}>
      <SceneShell>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            scale: zoom,
            opacity: outro,
          }}
        >
          {/* left lockup */}
          <div style={{position: 'absolute', left: 120, top: 200, width: 1040}}>
            <Fade delay={4} duration={12}>
              <Kicker style={{fontSize: 16}}>
                DEEPSEEK HARNESS · RUNTIME PLUGIN
              </Kicker>
            </Fade>

            <Reveal delay={10} y={70} durationInFrames={22}>
              <div
                style={{
                  fontFamily: F.display,
                  fontSize: 196,
                  fontWeight: 800,
                  letterSpacing: -10,
                  lineHeight: 0.92,
                  color: C.ink,
                  marginTop: 26,
                  textShadow: '0 20px 80px rgba(0,0,0,0.45)',
                }}
              >
                DSH
              </div>
            </Reveal>

            <Reveal delay={18} y={50} durationInFrames={24}>
              <div
                style={{
                  fontFamily: F.mono,
                  fontSize: 84,
                  fontWeight: 500,
                  letterSpacing: tracking,
                  lineHeight: 1,
                  marginTop: 14,
                  ...gradText(C.cyanSoft, C.violetSoft),
                  textShadow: '0 0 60px rgba(34,211,238,0.25)',
                }}
              >
                FASTBOOT
              </div>
            </Reveal>

            <Reveal delay={34} y={26} durationInFrames={16}>
              <div
                style={{
                  fontSize: 36,
                  color: C.soft,
                  marginTop: 40,
                  letterSpacing: 1,
                  fontWeight: 400,
                }}
              >
                让你的 DSH 启动再快一点
              </div>
            </Reveal>

            <Fade delay={52} duration={14}>
              <div style={{display: 'flex', gap: 10, marginTop: 36}}>
                {['MCP 加速', '局部热重载', '零配置'].map((t, i) => (
                  <span
                    key={t}
                    style={{
                      padding: '9px 16px',
                      borderRadius: 999,
                      border: `1px solid ${
                        [C.cyan, C.violet, C.green][i]
                      }38`,
                      background: `${[C.cyan, C.violet, C.green][i]}0f`,
                      fontFamily: F.mono,
                      fontSize: 14,
                      letterSpacing: 1.6,
                      color: [C.cyanSoft, C.violetSoft, C.greenSoft][i],
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </Fade>

            <Fade delay={66} duration={14}>
              <div
                style={{
                  marginTop: 54,
                  fontFamily: F.mono,
                  fontSize: 13,
                  letterSpacing: 2.5,
                  color: C.dim,
                }}
              >
                DSH 0.2.2-rc.1 · macOS arm64 · 4 轮交替实测
              </div>
            </Fade>
          </div>

          {/* stat card */}
          <div
            style={{
              position: 'absolute',
              left: 1276,
              top: 236,
              width: 524,
              padding: '34px 38px 30px',
              ...panelStyle,
              translate: `${(1 - cardIn) * 90}px 0`,
              opacity: cardIn,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: F.mono,
                  fontSize: 13,
                  letterSpacing: 3,
                  color: C.muted,
                }}
              >
                HOST READY / 中位数
              </span>
              <span
                style={{
                  fontFamily: F.mono,
                  fontSize: 12,
                  letterSpacing: 2,
                  color: C.dim,
                }}
              >
                单位 s
              </span>
            </div>

            <div style={{marginTop: 26}}>
              {valueRows.map((row, i) => (
                <div key={row.label}>
                  {i === 1 ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        margin: '18px 0 14px',
                      }}
                    >
                      <div
                        style={{
                          height: 1,
                          flex: 1,
                          background: C.lineSoft,
                        }}
                      />
                      <span
                        style={{
                          fontFamily: F.mono,
                          fontSize: 12,
                          letterSpacing: 2,
                          color: C.dim,
                        }}
                      >
                        FASTBOOT
                      </span>
                      <div
                        style={{
                          height: 1,
                          flex: 1,
                          background: C.lineSoft,
                        }}
                      />
                    </div>
                  ) : null}
                  <span
                    style={{
                      display: 'block',
                      fontFamily: F.mono,
                      fontSize: 12,
                      letterSpacing: 2.4,
                      color: row.color,
                      opacity: 0.9,
                      marginBottom: 2,
                    }}
                  >
                    {row.label}
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <div style={{display: 'flex', alignItems: 'baseline'}}>
                      <Count
                        to={row.value}
                        delay={62 + i * 12}
                        duration={24}
                        style={{
                          fontFamily: F.display,
                          fontSize: i === 1 ? 92 : 58,
                          fontWeight: 700,
                          letterSpacing: -3,
                          color: row.color,
                          lineHeight: 1,
                        }}
                      />
                      <span
                        style={{
                          fontFamily: F.mono,
                          fontSize: 20,
                          color: row.color,
                          opacity: 0.7,
                          marginLeft: 6,
                        }}
                      >
                        s
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      height: 3,
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: 3,
                      marginTop: 10,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${row.width}%`,
                        background: row.color,
                        opacity: 0.7,
                        boxShadow: `0 0 12px ${row.color}88`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 26,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 12px',
                  borderRadius: 999,
                  background: 'rgba(52,211,153,0.1)',
                  border: '1px solid rgba(52,211,153,0.28)',
                  color: C.green,
                  fontFamily: F.mono,
                  fontSize: 13,
                  letterSpacing: 1,
                }}
              >
                −72.7% 启动耗时
              </span>
              <span
                style={{
                  fontFamily: F.mono,
                  fontSize: 12,
                  color: C.dim,
                  letterSpacing: 1.5,
                }}
              >
                后台初始化
              </span>
            </div>

            <div
              style={{
                marginTop: 20,
                fontFamily: F.mono,
                fontSize: 12,
                color: C.dim,
                letterSpacing: 1.4,
                ...tabular,
              }}
            >
              8.14 → 4.37（仅 fastboot）→ 2.22（全部后台）
            </div>
          </div>

          {/* sheen */}
          <div
            style={{
              position: 'absolute',
              top: 170,
              left: `${sheen}%`,
              width: 240,
              height: 360,
              rotate: '14deg',
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)',
              filter: 'blur(18px)',
              mixBlendMode: 'screen',
              opacity: 0.7,
              pointerEvents: 'none',
            }}
          />
        </div>
      </SceneShell>
    </SceneFade>
  );
};
