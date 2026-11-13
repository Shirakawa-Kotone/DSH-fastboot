import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, F, panelStyle} from '../theme';
import {
  CodeCard,
  CodeLine,
  Count,
  Dot,
  Fade,
  FN,
  Glass,
  KW,
  PUNC,
  PLAIN,
  SceneFade,
  SceneHeader,
  SceneShell,
  Tok,
} from '../ui';

const X0 = 160;
const W = 1600;
const MAX_T = 8.6;
const X = (t: number) => X0 + (t / MAX_T) * W;

const servers = [
  {
    name: 'Cloudflare Docs',
    proto: 'streamable HTTP',
    time: 2.19,
    pct: 26.9,
    color: C.cyan,
    note: '直连，不拖后腿',
  },
  {
    name: 'Cloudflare Bindings',
    proto: 'stdio · mcp-remote',
    time: 6.91,
    pct: 84.9,
    color: C.amber,
    note: 'npx 启动',
  },
  {
    name: 'Notion',
    proto: 'stdio · OAuth',
    time: 7.45,
    pct: 91.5,
    color: C.red,
    note: 'OAuth 发现',
  },
  {
    name: 'Cloudflare Observability',
    proto: 'stdio · mcp-remote',
    time: 8.14,
    pct: 100,
    color: C.red,
    note: '最后就绪',
  },
];

const terminalLines = [
  {text: '$ dsh web --profile web', color: C.soft},
  {text: '[listen ] 1.53s  http://127.0.0.1:3080', color: C.cyanSoft},
  {text: '[mcp    ] npx -y mcp-remote …notion', color: C.amber},
  {text: '[mcp    ] npx -y mcp-remote …observability', color: C.amber},
  {text: '[mcp    ] waiting for tools/list …', color: C.red},
];

export const S2Problem = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const line = spring({
    frame: frame - 34,
    fps,
    config: {damping: 200, mass: 0.8, stiffness: 80},
    durationInFrames: 34,
  });
  const gap = interpolate(frame, [66, 104], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const pulse = 0.55 + 0.45 * Math.sin(frame / 8);
  const hostGlow = interpolate(frame, [270, 320], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const cursorOn = Math.floor(frame / 15) % 2 === 0;

  return (
    <SceneFade duration={420} fadeIn={8} fadeOut={10}>
      <SceneShell>
        <SceneHeader
          index="02"
          kicker="问题"
          title={
            <>
              启动，被 <span style={{color: C.red}}>MCP</span> 拖住了。
            </>
          }
          width={980}
        />

        <Fade delay={18} duration={18}>
          <div
            style={{
              position: 'absolute',
              left: 120,
              top: 228,
              fontSize: 22,
              color: C.muted,
              letterSpacing: 0.6,
            }}
          >
            一次启动，四个 MCP；最慢的那个决定 Host 何时就绪。
          </div>
        </Fade>

        {/* code card */}
        <div
          style={{
            position: 'absolute',
            left: 1338,
            top: 84,
            width: 462,
            opacity: interpolate(frame, [86, 110], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
            translate: `0 ${interpolate(frame, [86, 110], [14, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })}px`,
          }}
        >
          <CodeCard
            title="@deepseek-ai/dsh-mcp-client"
            accent={C.red}
            fontSize={16}
          >
            <CodeLine n={1}>
              <KW>async</KW> <FN>apply</FN>
              <PUNC>(</PUNC>
              <PLAIN>ctx</PLAIN>
              <PUNC>) {'{'}</PUNC>
            </CodeLine>
            <CodeLine n={2} highlight>
              <PLAIN>  </PLAIN>
              <KW>await</KW> <PLAIN>connection.ready</PLAIN>
              <Tok c={C.red}>  // ← 阻塞</Tok>
            </CodeLine>
            <CodeLine n={3}>
              <PLAIN>  </PLAIN>
              <KW>await</KW> <FN>syncTools</FN>
              <PUNC>()</PUNC>
            </CodeLine>
            <CodeLine n={4}>
              <PUNC>{'}'}</PUNC>
            </CodeLine>
          </CodeCard>
        </div>

        {/* timeline */}
        <div style={{position: 'absolute', left: 120, top: 392, width: 1680}}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              marginBottom: 26,
              opacity: interpolate(frame, [20, 44], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          >
            <span
              style={{
                fontFamily: F.mono,
                fontSize: 12,
                letterSpacing: 2.6,
                color: C.dim,
              }}
            >
              BOOT TIMELINE · 单位 秒
            </span>
            <span
              style={{
                fontFamily: F.mono,
                fontSize: 12,
                letterSpacing: 2,
                color: C.dim,
              }}
            >
              DSH 0.2.2-rc.1
            </span>
          </div>

          <div style={{position: 'relative', height: 150}}>
            {/* base line */}
            <div
              style={{
                position: 'absolute',
                left: 40,
                right: 40,
                top: 64,
                height: 1,
                background: 'rgba(150,190,240,0.2)',
              }}
            />
            {/* progress line */}
            <div
              style={{
                position: 'absolute',
                left: 40,
                top: 63,
                height: 2,
                width: (W + 80) * line,
                background: `linear-gradient(90deg, ${C.cyan}, ${C.cyan}66)`,
                boxShadow: `0 0 10px ${C.cyan}55`,
              }}
            />

            {/* red wait band */}
            <div
              style={{
                position: 'absolute',
                left: X(1.53) - X0 + 40,
                top: 60,
                width: (X(8.14) - X(1.53)) * gap,
                height: 8,
                background:
                  'repeating-linear-gradient(115deg, rgba(251,113,133,0.55) 0 6px, rgba(251,113,133,0.12) 6px 13px)',
                borderRadius: 4,
                opacity: gap,
              }}
            />

            {/* nodes */}
            {[
              {t: 0, label: '进程启动', sub: '0.00s', color: C.soft, dy: -1},
              {t: 1.53, label: 'Web 监听', sub: '1.53s', color: C.cyan, dy: -1},
              {
                t: 8.14,
                label: 'Host 就绪',
                sub: '8.14s',
                color: C.red,
                dy: -1,
              },
            ].map((n, i) => {
              const appear = interpolate(
                frame,
                [44 + i * 16, 60 + i * 16],
                [0, 1],
                {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
              );
              const isHost = i === 2;
              return (
                <div
                  key={n.label}
                  style={{
                    position: 'absolute',
                    left: X(n.t) - X0 + 40,
                    top: 64,
                    opacity: appear,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: -6,
                      top: -5,
                      width: 11,
                      height: 11,
                      borderRadius: 99,
                      background: n.color,
                      boxShadow: `0 0 14px ${n.color}`,
                      scale: isHost ? 1 + hostGlow * 0.55 : 1,
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 20,
                      left: isHost ? 'auto' : 0,
                      right: isHost ? 0 : 'auto',
                      textAlign: isHost ? 'right' : 'left',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: F.mono,
                        fontSize: 11,
                        letterSpacing: 2,
                        color: n.color,
                        opacity: 0.85,
                      }}
                    >
                      {n.label.toUpperCase()}
                    </div>
                    <div
                      style={{
                        fontFamily: F.display,
                        fontSize: isHost ? 38 : 30,
                        fontWeight: 650,
                        color: isHost ? C.red : C.ink,
                        letterSpacing: -0.8,
                        marginTop: 2,
                        textShadow: isHost
                          ? `0 0 ${26 * hostGlow}px ${C.red}88`
                          : undefined,
                      }}
                    >
                      {n.sub}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* gap label */}
            <div
              style={{
                position: 'absolute',
                left: X(1.53) - X0 + 40,
                width: X(8.14) - X(1.53),
                top: 88,
                textAlign: 'center',
                opacity: gap,
              }}
            >
              <span
                style={{
                  fontFamily: F.mono,
                  fontSize: 14,
                  letterSpacing: 1.6,
                  color: C.redSoft,
                  background: 'rgba(251,113,133,0.08)',
                  border: '1px solid rgba(251,113,133,0.18)',
                  padding: '6px 12px',
                  borderRadius: 6,
                  opacity: 0.7 + pulse * 0.3,
                }}
              >
                每一项都在拖慢启动 · 6.62s
              </span>
            </div>
          </div>
        </div>

        {/* MCP cards */}
        {servers.map((s, i) => {
          const p = spring({
            frame: frame - (96 + i * 16),
            fps,
            config: {damping: 200, mass: 0.7, stiffness: 110},
            durationInFrames: 26,
          });
          const col = i % 2;
          const row = Math.floor(i / 2);
          const isLast = i === 3;
          return (
            <div
              key={s.name}
              style={{
                position: 'absolute',
                left: 290 + col * 680,
                top: 596 + row * 112,
                width: 660,
                height: 98,
                padding: '16px 22px',
                ...panelStyle,
                border: `1px solid ${
                  isLast ? 'rgba(251,113,133,0.34)' : C.line
                }`,
                opacity: p,
                translate: `0 ${(1 - p) * 22}px`,
                boxShadow: isLast
                  ? `${panelStyle.boxShadow}, 0 0 34px rgba(251,113,133,0.08)`
                  : panelStyle.boxShadow,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                  <Dot color={s.color} size={7} />
                  <span
                    style={{
                      fontSize: 21,
                      fontWeight: 600,
                      color: C.ink,
                      letterSpacing: 0.2,
                    }}
                  >
                    {s.name}
                  </span>
                  <span
                    style={{
                      fontFamily: F.mono,
                      fontSize: 11,
                      color: C.dim,
                      letterSpacing: 0.8,
                      marginLeft: 2,
                    }}
                  >
                    {s.proto}
                  </span>
                </div>
                <div style={{display: 'flex', alignItems: 'baseline', gap: 2}}>
                  <Count
                    to={s.time}
                    delay={130 + i * 22}
                    duration={26}
                    style={{
                      fontFamily: F.display,
                      fontSize: 32,
                      fontWeight: 650,
                      color: isLast ? C.red : C.soft,
                      letterSpacing: -1,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: F.mono,
                      fontSize: 12,
                      color: isLast ? C.red : C.muted,
                    }}
                  >
                    s
                  </span>
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginTop: 12,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: 3,
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${s.pct * p}%`,
                      background: s.color,
                      opacity: 0.75,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontFamily: F.mono,
                    fontSize: 11,
                    color: C.dim,
                    letterSpacing: 0.6,
                  }}
                >
                  {s.note}
                </span>
                {i === 2 ? (
                  <span
                    style={{
                      fontFamily: F.mono,
                      fontSize: 10,
                      color: C.red,
                      border: '1px solid rgba(251,113,133,0.3)',
                      padding: '2px 6px',
                      borderRadius: 4,
                      opacity: interpolate(
                        frame,
                        [210 + i * 18, 218 + i * 18, 270 + i * 18, 278 + i * 18],
                        [0, 1, 1, 0],
                        {
                          extrapolateLeft: 'clamp',
                          extrapolateRight: 'clamp',
                        },
                      ),
                    }}
                  >
                    retry
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}

        {/* equation */}
        <div
          style={{
            position: 'absolute',
            left: 120,
            top: 294,
            display: 'flex',
            alignItems: 'baseline',
            gap: 14,
            opacity: interpolate(frame, [330, 354], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          <span
            style={{
              fontFamily: F.mono,
              fontSize: 13,
              letterSpacing: 2.4,
              color: C.dim,
            }}
          >
            HOST READY =
          </span>
          <span
            style={{
              fontFamily: F.mono,
              fontSize: 30,
              color: C.soft,
              letterSpacing: -0.5,
            }}
          >
            max(
          </span>
          <span
            style={{
              fontFamily: F.mono,
              fontSize: 30,
              color: C.cyanSoft,
            }}
          >
            插件 apply
          </span>
          <span
            style={{
              fontFamily: F.mono,
              fontSize: 30,
              color: C.soft,
            }}
          >
            )
          </span>
          <span
            style={{
              fontFamily: F.mono,
              fontSize: 30,
              color: C.dim,
            }}
          >
            =
          </span>
          <span
            style={{
              fontFamily: F.display,
              fontSize: 44,
              fontWeight: 700,
              color: C.red,
              letterSpacing: -1.5,
              textShadow: '0 0 30px rgba(251,113,133,0.35)',
            }}
          >
            8.14s
          </span>
        </div>
        <div
          style={{
            position: 'absolute',
            left: 120,
            top: 350,
            height: 1,
            width: 620 * interpolate(frame, [330, 390], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
            background: `linear-gradient(90deg, ${C.red}aa, transparent)`,
          }}
        />

        {/* more servers ellipsis */}
        <Fade delay={214} duration={14}>
          <div
            style={{
              position: 'absolute',
              left: 1656,
              top: 752,
              width: 90,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontFamily: F.mono,
                fontSize: 34,
                color: C.dim,
                lineHeight: 1,
              }}
            >
              ⋯
            </div>
            <div
              style={{
                fontFamily: F.mono,
                fontSize: 9,
                color: C.dim,
                marginTop: 7,
                letterSpacing: 1,
              }}
            >
              更多 MCP
            </div>
          </div>
        </Fade>

        {/* terminal */}
        <div
          style={{
            position: 'absolute',
            left: 120,
            top: 834,
            width: 1180,
            height: 176,
            ...panelStyle,
            padding: '16px 22px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <Dot color="#fb7185" size={8} glow={false} />
            <Dot color="#fbbf24" size={8} glow={false} />
            <Dot color="#34d399" size={8} glow={false} />
            <span
              style={{
                marginLeft: 8,
                fontFamily: F.mono,
                fontSize: 11,
                color: C.dim,
                letterSpacing: 1.4,
              }}
            >
              boot.log
            </span>
          </div>
          {terminalLines.map((l, i) => {
            const o = interpolate(
              frame,
              [196 + i * 13, 203 + i * 13],
              [0, 1],
              {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
            );
            return (
              <div
                key={i}
                style={{
                  fontFamily: F.mono,
                  fontSize: 15,
                  lineHeight: 1.55,
                  color: l.color,
                  opacity: o,
                  translate: `${(1 - o) * 8}px 0`,
                  whiteSpace: 'nowrap',
                }}
              >
                {l.text}
                {i === terminalLines.length - 1 ? (
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 15,
                      background: C.cyan,
                      marginLeft: 8,
                      verticalAlign: '-2px',
                      opacity: cursorOn ? 0.9 : 0,
                    }}
                  />
                ) : null}
              </div>
            );
          })}
        </div>

        {/* counters */}
        <Glass
          style={{
            position: 'absolute',
            left: 1330,
            top: 834,
            width: 470,
            height: 176,
            padding: '16px 24px',
          }}
        >
          {[
            {label: 'npx 启动', value: 6, color: C.red, delay: 230},
            {label: '直接 node 启动', value: 0, color: C.muted, delay: 242},
            {label: '初次连接失败', value: 1, color: C.red, delay: 254},
          ].map((r) => (
            <div
              key={r.label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                padding: '4px 0',
                borderBottom: `1px solid ${C.lineSoft}`,
              }}
            >
              <span
                style={{
                  fontFamily: F.mono,
                  fontSize: 12,
                  letterSpacing: 1.3,
                  color: C.muted,
                }}
              >
                {r.label}
              </span>
              <Count
                to={r.value}
                delay={r.delay}
                duration={20}
                decimals={0}
                style={{
                  fontFamily: F.display,
                  fontSize: 28,
                  fontWeight: 650,
                  color: r.color,
                  letterSpacing: -0.5,
                }}
              />
            </div>
          ))}
          <div
            style={{
              marginTop: 8,
              fontFamily: F.mono,
              fontSize: 10,
              color: C.dim,
              letterSpacing: 0.8,
            }}
          >
            每多一个 MCP，就多一段串行等待
          </div>
        </Glass>
      </SceneShell>
    </SceneFade>
  );
};
