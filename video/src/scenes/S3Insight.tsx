import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, F, panelStyle} from '../theme';
import {Count, Fade, SceneFade, SceneHeader, SceneShell} from '../ui';

const X0 = 160;
const PPS = 176;
const X = (t: number) => X0 + t * PPS;
const WEB = 1.53 * PPS;
const BW = 1.322 * PPS;
const AW = 200;
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

const names = [
  {name: 'Docs', tag: 'HTTP'},
  {name: 'Bindings', tag: 'stdio'},
  {name: 'Notion', tag: 'stdio'},
  {name: 'Observability', tag: 'stdio'},
  {name: '⋯⋯', tag: '还有更多'},
];

export const S3Insight = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const land = names.map((_, i) =>
    spring({
      frame: frame - (48 + i * 16),
      fps,
      config: {damping: 200, mass: 0.55, stiffness: 190},
      durationInFrames: 18,
    }),
  );
  const landed = land.reduce((a, b) => a + b, 0);
  const beforeTotal = 1.53 + 1.322 * landed;

  const move = interpolate(frame, [222, 274], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });
  const m = names.map(() => move);

  const beforeOpacity = 1 - 0.62 * Math.max(...m);
  const afterIn = interpolate(frame, [222, 254], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const impactOut = interpolate(frame, [214, 240], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const webIn = interpolate(frame, [268, 282], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const labelsIn = interpolate(frame, [262, 284], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const dividerLabel = interpolate(frame, [306, 326], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const divider = interpolate(frame, [228, 268], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const slam =
    frame > 126
      ? 1 + 0.16 * Math.exp(-(frame - 126) / 7) * Math.cos((frame - 126) / 2.2)
      : 1;
  const shake =
    frame > 126
      ? Math.sin((frame - 126) * 2.3) * 9 * Math.exp(-(frame - 126) / 8)
      : 0;
  const flash = interpolate(frame, [126, 134, 154], [0, 0.18, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const wave = interpolate(frame, [126, 166], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const greenWave = interpolate(frame, [348, 388], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const morphGlow = Math.sin(
    Math.PI * Math.min(1, Math.max(0, (frame - 214) / 80)),
  );

  const finishX = X(Math.min(8.14, beforeTotal));

  return (
    <SceneFade duration={480} fadeIn={6} fadeOut={8}>
      <SceneShell>
        <div style={{position: 'absolute', inset: 0, translate: `${shake}px 0`}}>
          <SceneHeader
            index="03"
            kicker="洞察 · 关键路径"
            title={
              <>
                把 MCP 从「后面」<span style={{color: C.cyan}}>挪到旁边</span>。
              </>
            }
            width={1240}
          />

          <Fade delay={12} duration={12}>
            <div
              style={{
                position: 'absolute',
                left: 120,
                top: 228,
                fontSize: 21,
                color: C.muted,
              }}
            >
              串行：Web 就绪后，MCP 才排队；并发：两条线同时起跑。
            </div>
          </Fade>

          {/* ================= BEFORE (stays as ghost) ================= */}
          <div style={{position: 'absolute', inset: 0, opacity: beforeOpacity}}>
            <div
              style={{
                position: 'absolute',
                left: 160,
                top: 280,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span
                style={{
                  fontFamily: F.mono,
                  fontSize: 12,
                  letterSpacing: 2.4,
                  color: C.red,
                }}
              >
                SERIAL
              </span>
              <span style={{fontSize: 20, color: C.redSoft}}>串行</span>
            </div>
            <div
              style={{
                position: 'absolute',
                left: 430,
                top: 284,
                fontFamily: F.mono,
                fontSize: 12,
                letterSpacing: 1.4,
                color: C.redSoft,
              }}
            >
              MCP × {Math.round(landed)} ⋯
            </div>

            <div
              style={{
                position: 'absolute',
                left: 160,
                top: 392,
                width: 1496,
                height: 1,
                background:
                  'linear-gradient(90deg, rgba(251,113,133,0.35), rgba(251,113,133,0.08))',
              }}
            />
            {[0, 2, 4, 6, 8].map((t) => (
              <span
                key={t}
                style={{
                  position: 'absolute',
                  left: X(t) - 6,
                  top: 400,
                  fontFamily: F.mono,
                  fontSize: 9,
                  color: C.dim,
                }}
              >
                {t}s
              </span>
            ))}

            {/* web block */}
            <div
              style={{
                position: 'absolute',
                left: 160,
                top: 350,
                width: WEB,
                height: 84,
                borderRadius: 12,
                border: '1px solid rgba(251,113,133,0.28)',
                background:
                  'linear-gradient(180deg, rgba(251,113,133,0.14), rgba(251,113,133,0.04))',
                padding: '17px 18px',
              }}
            >
              <div style={{fontFamily: F.mono, fontSize: 15, color: C.redSoft}}>
                Web 启动
              </div>
              <div
                style={{
                  fontFamily: F.mono,
                  fontSize: 10,
                  color: C.dim,
                  marginTop: 7,
                  letterSpacing: 1,
                }}
              >
                1.53s · listen
              </div>
            </div>

            {/* ghost slots at the old positions */}
            {names.map((n, i) => (
              <div
                key={n.name}
                style={{
                  position: 'absolute',
                  left: X(1.53) + i * BW,
                  top: 350,
                  width: BW,
                  height: 84,
                  borderRadius: 12,
                  border: '1px dashed rgba(251,113,133,0.28)',
                  opacity: Math.max(0, Math.max(...m) - 0.55) * 1.8,
                  padding: '15px 16px',
                }}
              >
                <div
                  style={{
                    fontFamily: F.mono,
                    fontSize: 15,
                    color: 'rgba(251,113,133,0.4)',
                  }}
                >
                  {n.name}
                </div>
              </div>
            ))}

            {/* before finish */}
            <div
              style={{
                position: 'absolute',
                left: finishX,
                top: 330,
                width: 1,
                height: 150,
                background: `linear-gradient(180deg, ${C.red}00, ${C.red}cc, ${C.red}00)`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: finishX - 240,
                top: 264,
                width: 230,
                textAlign: 'right',
                scale: slam,
              }}
            >
              <div
                style={{
                  fontFamily: F.mono,
                  fontSize: 11,
                  letterSpacing: 2,
                  color: C.redSoft,
                }}
              >
                HOST READY
              </div>
              <div style={{display: 'flex', justifyContent: 'flex-end'}}>
                <span
                  style={{
                    fontFamily: F.display,
                    fontSize: 58,
                    fontWeight: 700,
                    letterSpacing: -2,
                    color: C.red,
                    lineHeight: 1.05,
                    fontVariantNumeric: 'tabular-nums',
                    textShadow: `0 0 ${24 * (slam - 1) * 6}px ${C.red}88`,
                  }}
                >
                  {beforeTotal.toFixed(2)}
                </span>
                <span
                  style={{
                    fontFamily: F.mono,
                    fontSize: 13,
                    color: C.red,
                    opacity: 0.7,
                    marginLeft: 4,
                  }}
                >
                  s
                </span>
              </div>
            </div>

            <div
              style={{
                position: 'absolute',
                left: 430,
                top: 454,
                display: 'flex',
                opacity: Math.max(0, 1 - move * 4),
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 99,
                  background: C.red,
                  boxShadow: `0 0 10px ${C.red}`,
                }}
              />
              <span
                style={{
                  fontFamily: F.mono,
                  fontSize: 13,
                  letterSpacing: 1.2,
                  color: C.redSoft,
                }}
              >
                每一项连接，都会把 Host 就绪再往后推一段
              </span>
            </div>

            {wave < 1 ? (
              <div
                style={{
                  position: 'absolute',
                  left: finishX - 60 - wave * 220,
                  top: 330 - wave * 220,
                  width: 120 + wave * 440,
                  height: 120 + wave * 440,
                  borderRadius: '50%',
                  border: `1px solid ${C.red}`,
                  opacity: (1 - wave) * 0.5,
                }}
              />
            ) : null}
          </div>

          {/* ================= moving cards ================= */}
          {names.map((n, i) => {
            const mi = m[i];
            const width = lerp(BW, AW, mi);
            const height = lerp(84, 56, mi);
            const left = lerp(X(1.53) + i * BW, X0 + i * AW, mi);
            const top = lerp(350, 726, mi);
            const active = mi > 0.5;
            return (
              <div
                key={n.name}
                style={{
                  position: 'absolute',
                  left,
                  top,
                  width,
                  height,
                  borderRadius: 12,
                  border: `1px solid ${
                    active ? 'rgba(34,211,238,0.38)' : 'rgba(251,113,133,0.32)'
                  }`,
                  background: active
                    ? 'linear-gradient(180deg, rgba(34,211,238,0.13), rgba(10,20,35,0.92))'
                    : 'linear-gradient(180deg, rgba(30,22,36,0.92), rgba(12,14,24,0.92))',
                  boxShadow: active
                    ? `0 0 24px rgba(34,211,238,0.12)`
                    : '0 18px 44px rgba(0,0,0,0.3)',
                  opacity: land[i] * (1 - 0.45 * Math.sin(Math.PI * move)),
                  filter: `blur(${Math.sin(Math.PI * move) * 1.2}px)`,
                  padding: active ? '13px 12px' : '15px 16px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      fontFamily: F.mono,
                      fontSize: lerp(17, 13.5, mi),
                      color: active ? C.cyanSoft : C.soft,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {n.name}
                  </span>
                  {!active ? (
                    <span
                      style={{
                        fontFamily: F.mono,
                        fontSize: 10,
                        color: C.red,
                        opacity: 0.9,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      +1.32s
                    </span>
                  ) : null}
                </div>
                <div
                  style={{
                    fontFamily: F.mono,
                    fontSize: 9.5,
                    color: C.dim,
                    marginTop: 6,
                    letterSpacing: 0.8,
                    opacity: 1 - mi,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {n.tag}
                </div>
              </div>
            );
          })}

          {/* before impact panel */}
          <div
            style={{
              position: 'absolute',
              left: 160,
              top: 590,
              width: 880,
              height: 226,
              ...panelStyle,
              border: '1px solid rgba(251,113,133,0.22)',
              padding: '20px 26px',
              opacity: impactOut,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontFamily: F.mono,
                fontSize: 11,
                letterSpacing: 2,
                color: C.redSoft,
              }}
            >
              <span>SERIAL COST · 串行相加</span>
              <span style={{color: C.dim}}>{Math.round(landed)} / 5 ⋯</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 16,
                marginTop: 18,
              }}
            >
              <span
                style={{
                  fontFamily: F.display,
                  fontSize: 38,
                  fontWeight: 700,
                  color: C.cyanSoft,
                  letterSpacing: -1,
                }}
              >
                1.53s
              </span>
              <span style={{fontFamily: F.mono, fontSize: 22, color: C.dim}}>+</span>
              <span
                style={{
                  fontFamily: F.display,
                  fontSize: 38,
                  fontWeight: 700,
                  color: C.red,
                  letterSpacing: -1,
                }}
              >
                {(1.322 * landed).toFixed(2)}s
              </span>
              <span style={{fontFamily: F.mono, fontSize: 22, color: C.dim}}>=</span>
              <span
                style={{
                  fontFamily: F.display,
                  fontSize: 58,
                  fontWeight: 800,
                  color: C.red,
                  letterSpacing: -2,
                  textShadow: '0 0 30px rgba(251,113,133,0.3)',
                }}
              >
                {(1.53 + 1.322 * landed).toFixed(2)}s
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 20,
              }}
            >
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  style={{
                    width: 54,
                    height: 6,
                    borderRadius: 4,
                    background:
                      i < Math.round(landed)
                        ? C.red
                        : 'rgba(251,113,133,0.12)',
                    border:
                      i === 4 ? '1px dashed rgba(251,113,133,0.35)' : 'none',
                    opacity: i < Math.round(landed) ? 0.85 : 0.6,
                  }}
                />
              ))}
              <span
                style={{
                  marginLeft: 10,
                  fontFamily: F.mono,
                  fontSize: 11,
                  letterSpacing: 1,
                  color: C.dim,
                }}
              >
                每个 MCP +1.32s · 还有更多 ⋯
              </span>
            </div>
          </div>

          {/* ================= center divider / morph beam ================= */}
          <div
            style={{
              position: 'absolute',
              left: 160,
              top: 520,
              width: 720,
              height: 1,
              background:
                'repeating-linear-gradient(90deg, rgba(140,180,235,0.22) 0 6px, transparent 6px 14px)',
              opacity: divider,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 1040,
              top: 520,
              width: 720,
              height: 1,
              background:
                'repeating-linear-gradient(90deg, rgba(140,180,235,0.22) 0 6px, transparent 6px 14px)',
              opacity: divider,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 496,
              textAlign: 'center',
              opacity: dividerLabel,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                padding: '7px 16px',
                borderRadius: 999,
                background: 'rgba(6,10,18,0.9)',
                border: `1px solid ${C.cyan}33`,
                fontFamily: F.mono,
                fontSize: 12,
                letterSpacing: 2,
                color: C.cyanSoft,
              }}
            >
              MCP 移出关键路径 ↓
            </span>
          </div>

          {morphGlow > 0.02 ? (
            <div
              style={{
                position: 'absolute',
                left: 858,
                top: 420,
                width: 2,
                height: 300,
                background: `linear-gradient(180deg, transparent, ${C.cyan}, transparent)`,
                opacity: morphGlow * 0.5,
                boxShadow: `0 0 30px ${C.cyan}`,
              }}
            />
          ) : null}

          {/* speed lines during morph */}
          {morphGlow > 0.02
            ? [0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: 160 + ((frame * 14 + i * 97) % 600),
                    top: 380 + i * 68,
                    width: 280,
                    height: 1,
                    background: `linear-gradient(90deg, transparent, ${C.cyan}, transparent)`,
                    opacity: morphGlow * 0.4,
                  }}
                />
              ))
            : null}

          {/* ================= AFTER ================= */}
          <div style={{position: 'absolute', inset: 0, opacity: afterIn}}>
            <div
              style={{
                position: 'absolute',
                left: 160,
                top: 560,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span
                style={{
                  fontFamily: F.mono,
                  fontSize: 12,
                  letterSpacing: 2.4,
                  color: C.green,
                }}
              >
                CONCURRENT
              </span>
              <span style={{fontSize: 20, color: C.greenSoft}}>并发</span>
              <span
                style={{
                  fontFamily: F.mono,
                  fontSize: 10.5,
                  color: C.dim,
                  letterSpacing: 0.8,
                }}
              >
                两条线同时起跑
              </span>
            </div>

            {/* web lane */}
            <div
              style={{
                position: 'absolute',
                left: 160,
                top: 646,
                width: WEB,
                height: 56,
                borderRadius: 10,
                border: '1px solid rgba(34,211,238,0.32)',
                background:
                  'linear-gradient(180deg, rgba(34,211,238,0.11), rgba(10,20,35,0.85))',
                padding: '11px 16px',
                opacity: webIn,
              }}
            >
              <span
                style={{
                  fontFamily: F.mono,
                  fontSize: 14,
                  color: C.cyanSoft,
                }}
              >
                Web 启动 · 1.53s
              </span>
            </div>

            {/* mcp lane baseline */}
            <div
              style={{
                position: 'absolute',
                left: 160,
                top: 782,
                width: 760,
                height: 1,
                background:
                  'linear-gradient(90deg, rgba(34,211,238,0.3), rgba(34,211,238,0.05))',
              }}
            />

            {/* UI flag */}
            <div
              style={{
                position: 'absolute',
                left: X(2.22),
                top: 620,
                width: 1,
                height: 200,
                background: `linear-gradient(180deg, ${C.green}00, ${C.green}dd, ${C.green}00)`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: X(2.22) + 16,
                top: 584,
                opacity: labelsIn,
              }}
            >
              <div
                style={{
                  fontFamily: F.mono,
                  fontSize: 10,
                  letterSpacing: 1.4,
                  color: C.greenSoft,
                }}
              >
                UI 可用
              </div>
              <div
                style={{
                  fontFamily: F.display,
                  fontSize: 34,
                  fontWeight: 700,
                  color: C.green,
                  letterSpacing: -1,
                  lineHeight: 1.1,
                }}
              >
                2.22s
              </div>
            </div>

            {/* tools end */}
            <div
              style={{
                position: 'absolute',
                left: X(4.2),
                top: 700,
                width: 1,
                height: 100,
                background: `linear-gradient(180deg, ${C.cyan}00, ${C.cyan}aa, ${C.cyan}00)`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: X(4.2) + 14,
                top: 686,
                opacity: labelsIn,
              }}
            >
              <div
                style={{
                  fontFamily: F.mono,
                  fontSize: 10,
                  letterSpacing: 1.2,
                  color: C.cyanSoft,
                }}
              >
                工具齐
              </div>
              <div
                style={{
                  fontFamily: F.mono,
                  fontSize: 9,
                  color: C.dim,
                  marginTop: 3,
                }}
              >
                4.20s
              </div>
            </div>

            {greenWave > 0 && greenWave < 1 ? (
              <div
                style={{
                  position: 'absolute',
                  left: X(2.22) - 60 - greenWave * 200,
                  top: 700 - greenWave * 180,
                  width: 120 + greenWave * 400,
                  height: 120 + greenWave * 400,
                  borderRadius: '50%',
                  border: `1px solid ${C.green}`,
                  opacity: (1 - greenWave) * 0.45,
                }}
              />
            ) : null}
          </div>

          {/* after summary panel */}
          <div
            style={{
              position: 'absolute',
              left: 1220,
              top: 610,
              width: 540,
              height: 238,
              ...panelStyle,
              border: '1px solid rgba(52,211,153,0.25)',
              padding: '20px 26px',
              opacity: 0.1 + 0.9 * labelsIn,
            }}
          >
            <div
              style={{
                fontFamily: F.mono,
                fontSize: 11,
                letterSpacing: 2,
                color: C.greenSoft,
              }}
            >
              CONCURRENT RESULT
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                marginTop: 14,
              }}
            >
              <span style={{fontSize: 15, color: C.muted}}>HOST READY</span>
              <span
                style={{
                  fontFamily: F.display,
                  fontSize: 54,
                  fontWeight: 800,
                  color: C.green,
                  letterSpacing: -2,
                }}
              >
                2.22s
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                marginTop: 2,
              }}
            >
              <span style={{fontSize: 15, color: C.muted}}>ALL MCP</span>
              <span
                style={{
                  fontFamily: F.display,
                  fontSize: 30,
                  fontWeight: 700,
                  color: C.cyan,
                  letterSpacing: -1,
                }}
              >
                4.20s
              </span>
            </div>
            <div
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: `1px solid ${C.lineSoft}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: F.mono,
                  fontSize: 11,
                  color: C.dim,
                  letterSpacing: 1,
                }}
              >
                vs 串行 8.14s
              </span>
              <span
                style={{
                  fontFamily: F.display,
                  fontSize: 28,
                  fontWeight: 700,
                  color: C.green,
                }}
              >
                −72.7%
              </span>
            </div>
          </div>

          {/* bottom takeaway */}
          <Fade delay={372} duration={16}>
            <div
              style={{
                position: 'absolute',
                left: 160,
                right: 160,
                bottom: 80,
                display: 'flex',
                alignItems: 'baseline',
                gap: 16,
              }}
            >
              <span
                style={{
                  fontFamily: F.display,
                  fontSize: 30,
                  fontWeight: 700,
                  color: C.redSoft,
                  letterSpacing: -0.6,
                }}
              >
                8.14s
              </span>
              <span style={{fontFamily: F.mono, fontSize: 18, color: C.dim}}>→</span>
              <span
                style={{
                  fontFamily: F.display,
                  fontSize: 44,
                  fontWeight: 800,
                  color: C.green,
                  letterSpacing: -1.5,
                }}
              >
                2.22s
              </span>
              <span
                style={{
                  fontFamily: F.mono,
                  fontSize: 13,
                  color: C.greenSoft,
                  letterSpacing: 1,
                }}
              >
                −72.7%
              </span>
              <span
                style={{
                  marginLeft: 'auto',
                  fontFamily: F.mono,
                  fontSize: 10,
                  color: C.dim,
                  letterSpacing: 1,
                }}
              >
                并发数据 · 后台初始化原型
              </span>
            </div>
          </Fade>
        </div>

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `rgba(251,113,133,${flash})`,
            pointerEvents: 'none',
          }}
        />
      </SceneShell>
    </SceneFade>
  );
};
