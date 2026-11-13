import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, F, panelStyle} from '../theme';
import {Count, Fade, Glass, SceneFade, SceneHeader, SceneShell} from '../ui';

const S = 52; // px per second

const MetricCard = ({
  y,
  label,
  before,
  after,
  delta,
  p,
}: {
  y: number;
  label: string;
  before: string;
  after: string;
  delta: string;
  p: number;
}) => (
  <div
    style={{
      position: 'absolute',
      left: 1120,
      top: y,
      width: 660,
      height: 112,
      ...panelStyle,
      padding: '16px 22px',
      opacity: p,
      translate: `0 ${(1 - p) * 14}px`,
    }}
  >
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
      }}
    >
      <span style={{fontSize: 17, color: C.soft, letterSpacing: 0.3}}>
        {label}
      </span>
      <span
        style={{
          fontFamily: F.mono,
          fontSize: 13,
          color: C.green,
        }}
      >
        {delta}
      </span>
    </div>
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 12,
        marginTop: 10,
      }}
    >
      <span
        style={{
          fontFamily: F.display,
          fontSize: 32,
          fontWeight: 650,
          color: C.redSoft,
          letterSpacing: -1,
        }}
      >
        {before}
      </span>
      <span style={{fontFamily: F.mono, fontSize: 14, color: C.dim}}>→</span>
      <span
        style={{
          fontFamily: F.display,
          fontSize: 32,
          fontWeight: 650,
          color: C.green,
          letterSpacing: -1,
        }}
      >
        {after}
      </span>
      <span
        style={{
          fontFamily: F.mono,
          fontSize: 10,
          color: C.dim,
          marginLeft: 'auto',
        }}
      >
        秒
      </span>
    </div>
  </div>
);

const mcpRows = [
  {
    name: 'Cloudflare Observability',
    proto: 'stdio · mcp-remote',
    before: 8.14,
    after: 2.61,
    delta: '−67.9%',
  },
  {
    name: 'Cloudflare Bindings',
    proto: 'stdio · mcp-remote',
    before: 6.91,
    after: 2.67,
    delta: '−61.3%',
  },
  {
    name: 'Notion',
    proto: 'stdio · OAuth',
    before: 7.45,
    after: 4.2,
    delta: '−43.7%',
  },
  {
    name: 'Cloudflare Docs',
    proto: 'streamable HTTP',
    before: 2.19,
    after: 2.15,
    delta: '−1.6%',
  },
];

export const S7Results = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = (delay: number, stiffness = 90) =>
    spring({
      frame: frame - delay,
      fps,
      config: {damping: 200, mass: 0.9, stiffness},
      durationInFrames: 34,
    });

  const beforeBar = sp(34);
  const afterBar = sp(58, 100);
  const beat = interpolate(frame, [210, 242], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const showA = 1 - beat;
  const showB = beat;

  const baseline = 790;
  const maxY = baseline - 8.5 * S;

  return (
    <SceneFade duration={480} fadeIn={8} fadeOut={10}>
      <SceneShell>
        <SceneHeader
          index="07"
          kicker="实测"
          title={
            <>
              8.14 → 4.37，<span style={{color: C.green}}>少等 3.77 秒</span>。
            </>
          }
          width={1240}
        />

        <Fade delay={18} duration={18}>
          <div
            style={{
              position: 'absolute',
              left: 120,
              top: 228,
              fontFamily: F.mono,
              fontSize: 14,
              letterSpacing: 1.4,
              color: C.muted,
            }}
          >
            4 轮交替 · 暖缓存 · 中位数 · DSH 0.2.2-rc.1 · 单位 秒
          </div>
        </Fade>

        {/* ---------- Beat A ---------- */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: showA,
            translate: `${-beat * 18}px 0`,
          }}
        >
          {/* grid */}
          {[0, 2, 4, 6, 8].map((t) => (
            <div key={t}>
              <div
                style={{
                  position: 'absolute',
                  left: 160,
                  width: 820,
                  top: baseline - t * S,
                  height: 1,
                  background:
                    t === 0 ? 'rgba(150,185,230,0.28)' : 'rgba(130,170,230,0.08)',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  left: 128,
                  top: baseline - t * S - 8,
                  fontFamily: F.mono,
                  fontSize: 11,
                  color: C.dim,
                  width: 24,
                  textAlign: 'right',
                }}
              >
                {t}
              </span>
            </div>
          ))}

          {/* tracks */}
          {[
            {
              x: 250,
              value: 8.14,
              color: C.red,
              label: '关闭 fastboot',
              p: beforeBar,
              delay: 40,
            },
            {
              x: 540,
              value: 4.37,
              color: C.green,
              label: '开启 fastboot',
              p: afterBar,
              delay: 66,
            },
          ].map((b) => (
            <div key={b.label}>
              <div
                style={{
                  position: 'absolute',
                  left: b.x,
                  top: maxY,
                  width: 200,
                  height: 8.5 * S,
                  borderRadius: '10px 10px 0 0',
                  background: 'rgba(255,255,255,0.018)',
                  border: '1px solid rgba(255,255,255,0.03)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: b.x,
                  top: baseline - b.value * S * b.p,
                  width: 200,
                  height: b.value * S * b.p,
                  borderRadius: '10px 10px 0 0',
                  background: `linear-gradient(180deg, ${b.color} 0%, ${b.color}44 100%)`,
                  boxShadow: `0 -8px 36px ${b.color}33`,
                  border: `1px solid ${b.color}66`,
                  borderBottom: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: b.x,
                  top: baseline - b.value * S - 66,
                  width: 200,
                  textAlign: 'center',
                  opacity: b.p,
                }}
              >
                <Count
                  to={b.value}
                  delay={b.delay + 8}
                  duration={34}
                  style={{
                    fontFamily: F.display,
                    fontSize: 46,
                    fontWeight: 700,
                    letterSpacing: -1.5,
                    color: b.color,
                  }}
                />
                <span
                  style={{
                    fontFamily: F.mono,
                    fontSize: 13,
                    color: b.color,
                    opacity: 0.7,
                  }}
                >
                  s
                </span>
              </div>
              <div
                style={{
                  position: 'absolute',
                  left: b.x - 10,
                  top: baseline + 18,
                  width: 220,
                  textAlign: 'center',
                  fontFamily: F.mono,
                  fontSize: 13,
                  letterSpacing: 1.2,
                  color: b.color === C.red ? C.redSoft : C.greenSoft,
                }}
              >
                {b.label}
              </div>
            </div>
          ))}

          {/* delta */}
          <div
            style={{
              position: 'absolute',
              left: 790,
              top: 400,
              opacity: interpolate(frame, [112, 140], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
              translate: `${interpolate(frame, [112, 140], [16, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })}px 0`,
            }}
          >
            <div
              style={{
                fontFamily: F.mono,
                fontSize: 11,
                letterSpacing: 2.4,
                color: C.dim,
                marginBottom: 8,
              }}
            >
              HOST READY
            </div>
            <div
              style={{
                fontFamily: F.display,
                fontSize: 40,
                fontWeight: 700,
                letterSpacing: -1.2,
                color: C.soft,
              }}
            >
              −3.77s
            </div>
            <div
              style={{
                fontFamily: F.display,
                fontSize: 84,
                fontWeight: 800,
                letterSpacing: -4,
                lineHeight: 1.05,
                backgroundImage: `linear-gradient(96deg, ${C.green}, ${C.cyan})`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              −46.3%
            </div>
            <div
              style={{
                fontFamily: F.mono,
                fontSize: 11,
                letterSpacing: 1.4,
                color: C.dim,
                marginTop: 10,
              }}
            >
              中位数 · 4 轮交替
            </div>
          </div>

          <MetricCard
            y={318}
            label="监听 → Host 就绪"
            before="6.62"
            after="2.86"
            delta="−56.8%"
            p={interpolate(frame, [96, 122], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })}
          />
          <MetricCard
            y={448}
            label="全部 MCP 就绪"
            before="8.40"
            after="4.20"
            delta="−50.0%"
            p={interpolate(frame, [110, 136], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })}
          />
          <MetricCard
            y={578}
            label="最快 / 最慢 Host"
            before="5.39–11.86"
            after="3.96–4.77"
            delta="波动收窄"
            p={interpolate(frame, [124, 150], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })}
          />
        </div>

        {/* ---------- Beat B ---------- */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: showB,
            translate: `${(1 - beat) * 24}px 0`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 160,
              top: 286,
              fontFamily: F.mono,
              fontSize: 12,
              letterSpacing: 2,
              color: C.dim,
            }}
          >
            PER-SERVER READINESS · 每个 MCP 的等待
          </div>

          {/* scale ticks */}
          {[0, 2, 4, 6, 8].map((t) => (
            <div key={t}>
              <div
                style={{
                  position: 'absolute',
                  left: 560 + t * 100,
                  top: 312,
                  width: 1,
                  height: 360,
                  background: 'rgba(130,170,230,0.07)',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  left: 560 + t * 100 - 10,
                  top: 286,
                  fontFamily: F.mono,
                  fontSize: 10,
                  color: C.dim,
                }}
              >
                {t}s
              </span>
            </div>
          ))}

          {mcpRows.map((r, i) => {
            const p = sp(246 + i * 16, 100);
            return (
              <div
                key={r.name}
                style={{
                  position: 'absolute',
                  left: 160,
                  top: 336 + i * 112,
                  width: 1600,
                  height: 96,
                  opacity: p,
                  translate: `0 ${(1 - p) * 18}px`,
                  borderBottom: `1px solid ${C.lineSoft}`,
                }}
              >
                <div style={{position: 'absolute', left: 0, top: 8, width: 380}}>
                  <div
                    style={{
                      fontSize: 21,
                      fontWeight: 600,
                      color: C.ink,
                      letterSpacing: 0.2,
                    }}
                  >
                    {r.name}
                  </div>
                  <div
                    style={{
                      fontFamily: F.mono,
                      fontSize: 10.5,
                      color: C.dim,
                      letterSpacing: 1,
                      marginTop: 6,
                    }}
                  >
                    {r.proto}
                  </div>
                </div>

                {/* before bar */}
                <div
                  style={{
                    position: 'absolute',
                    left: 560,
                    top: 24,
                    width: 900,
                    height: 9,
                  }}
                >
                  <div
                    style={{
                      width: (r.before / 9) * 900 * p,
                      height: 9,
                      borderRadius: 6,
                      background: `linear-gradient(90deg, ${C.red}cc, ${C.red}66)`,
                    }}
                  />
                </div>
                {/* after bar */}
                <div
                  style={{
                    position: 'absolute',
                    left: 560,
                    top: 46,
                    width: 900,
                    height: 9,
                  }}
                >
                  <div
                    style={{
                      width: (r.after / 9) * 900 * p,
                      height: 9,
                      borderRadius: 6,
                      background: `linear-gradient(90deg, ${C.green}, ${C.green}66)`,
                    }}
                  />
                </div>

                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 12,
                    width: 250,
                    textAlign: 'right',
                  }}
                >
                  <div
                    style={{
                      fontFamily: F.mono,
                      fontSize: 16,
                      color: C.soft,
                    }}
                  >
                    <span style={{color: C.redSoft}}>{r.before.toFixed(2)}</span>
                    <span style={{color: C.dim}}> → </span>
                    <span style={{color: C.green}}>{r.after.toFixed(2)}</span>
                  </div>
                  <div
                    style={{
                      fontFamily: F.mono,
                      fontSize: 11,
                      color: r.delta === '−1.6%' ? C.dim : C.green,
                      marginTop: 6,
                    }}
                  >
                    {r.delta}
                  </div>
                </div>
              </div>
            );
          })}

          <div
            style={{
              position: 'absolute',
              left: 160,
              top: 812,
              fontFamily: F.mono,
              fontSize: 13,
              letterSpacing: 1.2,
              color: C.muted,
              opacity: showB,
            }}
          >
            HTTP 直连的 Docs 几乎不变；三个 stdio 代理 server 缩短 44–68%。
          </div>
        </div>

        <Fade delay={24} duration={18}>
          <div
            style={{
              position: 'absolute',
              left: 120,
              bottom: 58,
              right: 120,
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: F.mono,
              fontSize: 10.5,
              letterSpacing: 1.2,
              color: C.dim,
            }}
          >
            <span>来源：DSH 启动速度对比.xlsx · Sheet1 主测试</span>
            <span>关闭 fastboot → 开启 fastboot</span>
          </div>
        </Fade>
      </SceneShell>
    </SceneFade>
  );
};
