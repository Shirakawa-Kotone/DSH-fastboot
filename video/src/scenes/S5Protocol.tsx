import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, F, panelStyle} from '../theme';
import {Count, Dot, Fade, Glass, SceneFade, SceneHeader, SceneShell} from '../ui';

const Box = ({
  x,
  y,
  w,
  h,
  label,
  sub,
  color,
  p,
  dashed = false,
  strike = 0,
  dim = 1,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub?: string;
  color: string;
  p: number;
  dashed?: boolean;
  strike?: number;
  dim?: number;
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: 10,
      border: `${dashed ? '1px dashed' : '1px solid'} ${color}${p > 0.5 ? '55' : '22'}`,
      background: `${color}0d`,
      opacity: p * dim,
      translate: `0 ${(1 - p) * 12}px`,
      padding: '10px 14px',
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        fontFamily: F.mono,
        fontSize: 15,
        color,
        textDecoration: strike > 0.5 ? 'line-through' : 'none',
        opacity: strike > 0.5 ? 0.55 : 1,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </div>
    {sub ? (
      <div
        style={{
          fontFamily: F.mono,
          fontSize: 9.5,
          color: C.dim,
          letterSpacing: 0.8,
          marginTop: 5,
          whiteSpace: 'nowrap',
        }}
      >
        {sub}
      </div>
    ) : null}
  </div>
);

const VLine = ({
  x,
  y,
  h,
  color,
  p,
}: {
  x: number;
  y: number;
  h: number;
  color: string;
  p: number;
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: 1,
      height: h * p,
      background: `linear-gradient(180deg, ${color}88, ${color}22)`,
    }}
  />
);

const HLine = ({
  x,
  y,
  w,
  color,
  p,
}: {
  x: number;
  y: number;
  w: number;
  color: string;
  p: number;
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: w * p,
      height: 1,
      background: `linear-gradient(90deg, ${color}88, ${color}22)`,
    }}
  />
);

export const S5Protocol = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = (delay: number, stiffness = 120) =>
    spring({
      frame: frame - delay,
      fps,
      config: {damping: 200, mass: 0.7, stiffness},
      durationInFrames: 24,
    });

  const probeOut = interpolate(frame, [136, 162], [1, 0.28], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const cross = interpolate(frame, [136, 150], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const npxStrike = interpolate(frame, [250, 282], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <SceneFade duration={420} fadeIn={8} fadeOut={10}>
      <SceneShell>
        <SceneHeader
          index="05"
          kicker="机制 · 协议与启动器"
          title={
            <>
              少一次探测，<span style={{color: C.amber}}>少一次 npx</span>。
            </>
          }
          width={1180}
        />

        <Fade delay={18} duration={18}>
          <div
            style={{
              position: 'absolute',
              left: 120,
              top: 228,
              fontSize: 21,
              color: C.muted,
            }}
          >
            stdio 服务器用 legacy 握手；mcp-remote 从 npx 缓存直接以 node 启动。
          </div>
        </Fade>

        {/* BEFORE */}
        <div
          style={{
            position: 'absolute',
            left: 120,
            top: 292,
            width: 800,
            height: 448,
            ...panelStyle,
            border: '1px solid rgba(251,113,133,0.22)',
            padding: '22px 26px',
            overflow: 'hidden',
          }}
        >
          <div style={{display: 'flex', justifyContent: 'space-between'}}>
            <span
              style={{
                fontFamily: F.mono,
                fontSize: 13,
                letterSpacing: 2.4,
                color: C.redSoft,
              }}
            >
              BEFORE · 自动协商
            </span>
            <span
              style={{
                fontFamily: F.mono,
                fontSize: 11,
                color: C.red,
                opacity: 0.85,
                letterSpacing: 1,
              }}
            >
              × 2 npx / server
            </span>
          </div>

          <Box
            x={40}
            y={56}
            w={170}
            h={54}
            label="Host"
            sub="plugin apply"
            color={C.soft}
            p={sp(30)}
          />
          <VLine x={124} y={110} h={40} color={C.red} p={sp(44)} />
          <Box
            x={40}
            y={150}
            w={236}
            h={54}
            label="npx mcp-remote"
            sub="第一次启动"
            color={C.red}
            p={sp(52)}
          />
          <VLine x={158} y={204} h={129} color={C.red} p={sp(64)} />
          <HLine x={158} y={255} w={142} color={C.red} p={sp(70)} />
          <HLine x={158} y={333} w={142} color={C.red} p={sp(78)} />

          <Box
            x={300}
            y={228}
            w={300}
            h={54}
            label="server/discover"
            sub="短命探测进程 · 300ms 后退出"
            color={C.amber}
            p={sp(82) * probeOut}
            dashed
          />
          <Box
            x={300}
            y={306}
            w={300}
            h={54}
            label="mcp-remote"
            sub="回退后重开：真正的连接"
            color={C.red}
            p={sp(108)}
          />

          {/* cross out probe */}
          <div
            style={{
              position: 'absolute',
              left: 314,
              top: 251,
              width: 272 * cross,
              height: 1.5,
              background: C.red,
              rotate: '-8deg',
              opacity: cross * 0.9,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 486,
              top: 214,
              fontFamily: F.mono,
              fontSize: 10,
              color: C.red,
              opacity: cross,
              letterSpacing: 1,
            }}
          >
            discarded
          </div>

          <div
            style={{
              position: 'absolute',
              left: 40,
              bottom: 22,
              right: 26,
              padding: '10px 12px',
              borderRadius: 8,
              borderLeft: `2px solid ${C.red}`,
              background: 'rgba(251,113,133,0.05)',
              fontFamily: F.mono,
              fontSize: 12.5,
              color: C.redSoft,
              opacity: interpolate(frame, [150, 176], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          >
            3 个 stdio server × 2 次 npx = 6 次进程启动，外加 1 轮失败重试
          </div>
        </div>

        {/* AFTER */}
        <div
          style={{
            position: 'absolute',
            left: 1000,
            top: 292,
            width: 800,
            height: 448,
            ...panelStyle,
            border: '1px solid rgba(52,211,153,0.24)',
            padding: '22px 26px',
            overflow: 'hidden',
          }}
        >
          <div style={{display: 'flex', justifyContent: 'space-between'}}>
            <span
              style={{
                fontFamily: F.mono,
                fontSize: 13,
                letterSpacing: 2.4,
                color: C.greenSoft,
              }}
            >
              AFTER · fastboot
            </span>
            <span
              style={{
                fontFamily: F.mono,
                fontSize: 11,
                color: C.green,
                opacity: 0.9,
                letterSpacing: 1,
              }}
            >
              0 npx · 3 node
            </span>
          </div>

          <Box
            x={40}
            y={56}
            w={170}
            h={54}
            label="Host"
            sub="plugin apply"
            color={C.soft}
            p={sp(120)}
          />
          <VLine x={124} y={110} h={40} color={C.green} p={sp(132)} />
          <Box
            x={40}
            y={150}
            w={380}
            h={54}
            label="node …/mcp-remote/dist/proxy.js"
            sub="直接命中 ~/.npm/_npx 缓存，无探测"
            color={C.green}
            p={sp(140)}
          />

          <Box
            x={40}
            y={264}
            w={380}
            h={54}
            label="真实 stdio 连接"
            sub="legacy 2025 握手，一次到位"
            color={C.cyan}
            p={sp(168)}
          />
          <VLine x={230} y={204} h={60} color={C.cyan} p={sp(176)} />

          {/* ghost probe */}
          <div
            style={{
              position: 'absolute',
              left: 468,
              top: 206,
              width: 280,
              height: 54,
              borderRadius: 10,
              border: '1px dashed rgba(125,140,165,0.22)',
              opacity: 0.5,
              padding: '10px 14px',
            }}
          >
            <div
              style={{
                fontFamily: F.mono,
                fontSize: 14,
                color: C.dim,
                textDecoration: 'line-through',
              }}
            >
              server/discover
            </div>
            <div
              style={{
                fontFamily: F.mono,
                fontSize: 9,
                color: C.dim,
                marginTop: 5,
                letterSpacing: 0.6,
              }}
            >
              不再启动
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              left: 468,
              top: 290,
              fontFamily: F.mono,
              fontSize: 11,
              color: C.green,
              letterSpacing: 1.4,
              opacity: interpolate(frame, [190, 216], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          >
            ✓ 省掉一次进程 spawn
          </div>

          <div
            style={{
              position: 'absolute',
              left: 40,
              bottom: 22,
              right: 26,
              padding: '10px 12px',
              borderRadius: 8,
              borderLeft: `2px solid ${C.green}`,
              background: 'rgba(52,211,153,0.05)',
              fontFamily: F.mono,
              fontSize: 12.5,
              color: C.greenSoft,
              opacity: interpolate(frame, [200, 226], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          >
            params.command = process.execPath
          </div>
        </div>

        {/* counters */}
        <div
          style={{
            position: 'absolute',
            left: 120,
            top: 788,
            display: 'flex',
            gap: 30,
            width: 1680,
          }}
        >
          {[
            {
              label: 'npx 启动',
              before: 6,
              after: 0,
              color: C.red,
              afterColor: C.green,
            },
            {
              label: '直接 node 启动',
              before: 0,
              after: 3,
              color: C.dim,
              afterColor: C.cyan,
            },
            {
              label: '初次连接失败',
              before: 1,
              after: 0,
              color: C.red,
              afterColor: C.green,
            },
          ].map((r, i) => {
            const p = sp(230 + i * 14, 100);
            return (
              <div
                key={r.label}
                style={{
                  width: 540,
                  height: 148,
                  ...panelStyle,
                  padding: '18px 24px',
                  opacity: p,
                  translate: `0 ${(1 - p) * 16}px`,
                }}
              >
                <div
                  style={{
                    fontFamily: F.mono,
                    fontSize: 11,
                    letterSpacing: 1.6,
                    color: C.muted,
                  }}
                >
                  {r.label}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 16,
                    marginTop: 10,
                  }}
                >
                  <Count
                    to={r.before}
                    delay={250 + i * 14}
                    duration={20}
                    decimals={0}
                    style={{
                      fontFamily: F.display,
                      fontSize: 54,
                      fontWeight: 700,
                      letterSpacing: -2,
                      color: r.color,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: F.mono,
                      fontSize: 20,
                      color: C.dim,
                    }}
                  >
                    →
                  </span>
                  <Count
                    to={r.after}
                    delay={300 + i * 14}
                    duration={26}
                    decimals={0}
                    style={{
                      fontFamily: F.display,
                      fontSize: 54,
                      fontWeight: 700,
                      letterSpacing: -2,
                      color: r.afterColor,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: F.mono,
                      fontSize: 11,
                      color: C.dim,
                      marginLeft: 2,
                    }}
                  >
                    次
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <Fade delay={370} duration={22}>
          <div
            style={{
              position: 'absolute',
              left: 120,
              right: 120,
              bottom: 56,
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: F.mono,
              fontSize: 12,
              letterSpacing: 1.6,
              color: C.muted,
            }}
          >
            <span>
              streamable-HTTP 不动协议，只把连接放进后台
            </span>
            <span style={{color: C.dim}}>
              stdio: legacy handshake · cached proxy
            </span>
          </div>
        </Fade>
      </SceneShell>
    </SceneFade>
  );
};
