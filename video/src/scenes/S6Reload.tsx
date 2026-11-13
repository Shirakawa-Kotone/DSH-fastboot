import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, F, panelStyle} from '../theme';
import {
  Chip,
  Count,
  Dot,
  Fade,
  Glass,
  SceneFade,
  SceneHeader,
  SceneShell,
} from '../ui';

const GraphNode = ({
  x,
  y,
  w,
  h,
  label,
  sub,
  color,
  opacity,
  glow = 0,
  p,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub: string;
  color: string;
  opacity: number;
  glow?: number;
  p: number;
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: 12,
      border: `1px solid ${color}${glow > 0.2 ? 'aa' : '38'}`,
      background: `${color}${glow > 0.2 ? '18' : '0b'}`,
      boxShadow:
        glow > 0.2
          ? `0 0 ${26 * glow}px ${color}44, inset 0 0 20px ${color}11`
          : 'none',
      opacity,
      translate: `0 ${(1 - p) * 12}px`,
      padding: '12px 16px',
    }}
  >
    <div
      style={{
        fontFamily: F.mono,
        fontSize: 16,
        color,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontFamily: F.mono,
        fontSize: 10,
        color: C.dim,
        letterSpacing: 0.8,
        marginTop: 5,
      }}
    >
      {sub}
    </div>
  </div>
);

export const S6Reload = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = (delay: number) =>
    spring({
      frame: frame - delay,
      fps,
      config: {damping: 200, mass: 0.7, stiffness: 110},
      durationInFrames: 24,
    });

  const save = spring({
    frame: frame - 56,
    fps,
    config: {damping: 12, mass: 0.5, stiffness: 170},
    durationInFrames: 18,
  });
  const changed = interpolate(frame, [92, 112], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const pulse = 0.5 + 0.5 * Math.sin((frame - 110) / 7);
  const timerOn = frame > 128;
  const edgeP = interpolate(frame, [108, 140], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <SceneFade duration={300} fadeIn={8} fadeOut={10}>
      <SceneShell>
        <SceneHeader
          index="06"
          kicker="机制 · 局部热重载"
          title={
            <>
              改一行，只重载<span style={{color: C.cyan}}>一个 entry</span>。
            </>
          }
          width={1200}
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
            HMR 本来就能替换变更模块，只是默认不监听链接目录；把它暴露成工具。
          </div>
        </Fade>

        {/* editor */}
        <Glass
          style={{
            position: 'absolute',
            left: 120,
            top: 292,
            width: 720,
            height: 528,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '15px 20px',
              borderBottom: `1px solid ${C.lineSoft}`,
              background: 'rgba(255,255,255,0.018)',
            }}
          >
            <Dot color="#fb7185" size={9} glow={false} />
            <Dot color="#fbbf24" size={9} glow={false} />
            <Dot color="#34d399" size={9} glow={false} />
            <span
              style={{
                marginLeft: 12,
                fontFamily: F.mono,
                fontSize: 12,
                color: C.muted,
                letterSpacing: 0.8,
              }}
            >
              src/loader-hook.js
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
              linked plugin
            </span>
          </div>

          <div
            style={{
              padding: '22px 24px',
              fontFamily: F.mono,
              fontSize: 15.5,
              lineHeight: 1.8,
              color: '#dce7f7',
            }}
          >
            {[
              {
                n: 1,
                t: 'Loader.prototype.unwrapExports = function (e) {',
              },
              {
                n: 2,
                t: '  const plugin = original.call(this, e)',
              },
              {
                n: 3,
                t: '  if (plugin?.name === "mcp-client")',
              },
              {
                n: 4,
                t: '    return wrap(plugin)',
              },
              {
                n: 5,
                t: '  return plugin',
              },
              {n: 6, t: '}'},
            ].map((l) => (
              <div key={l.n} style={{display: 'flex', gap: 18}}>
                <span
                  style={{
                    width: 22,
                    textAlign: 'right',
                    color: '#3d4d66',
                    flexShrink: 0,
                  }}
                >
                  {l.n}
                </span>
                <span style={{whiteSpace: 'pre'}}>
                  {l.t.split('mcp-client').length > 1 ? (
                    <>
                      {l.t.split('mcp-client')[0]}
                      <span style={{color: C.green}}>'mcp-client'</span>
                      {l.t.split('mcp-client')[1]}
                    </>
                  ) : (
                    l.t
                  )}
                </span>
              </div>
            ))}
          </div>

          {/* save badge */}
          <div
            style={{
              position: 'absolute',
              right: 26,
              top: 70,
              padding: '7px 12px',
              borderRadius: 8,
              border: `1px solid ${C.cyan}55`,
              background: 'rgba(34,211,238,0.08)',
              fontFamily: F.mono,
              fontSize: 12,
              color: C.cyanSoft,
              letterSpacing: 1.2,
              scale: save,
              opacity: save,
              boxShadow: `0 0 24px ${C.cyan}22`,
            }}
          >
            ⌘ S
          </div>

          {/* changed line overlay */}
          <div
            style={{
              position: 'absolute',
              left: 40,
              right: 26,
              top: 252,
              opacity: changed,
              translate: `0 ${(1 - changed) * 14}px`,
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: 12,
                padding: '8px 12px',
                borderRadius: 6,
                background: 'rgba(251,113,133,0.07)',
                borderLeft: `2px solid ${C.red}`,
                fontFamily: F.mono,
                fontSize: 13.5,
                color: C.redSoft,
              }}
            >
              <span style={{color: C.red}}>−</span>
              <span style={{textDecoration: 'line-through', opacity: 0.75}}>
                const FASTENED = false
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 12,
                padding: '8px 12px',
                borderRadius: 6,
                background: 'rgba(52,211,153,0.08)',
                borderLeft: `2px solid ${C.green}`,
                fontFamily: F.mono,
                fontSize: 13.5,
                color: C.greenSoft,
                marginTop: 6,
              }}
            >
              <span style={{color: C.green}}>+</span>
              <span>const FASTENED = true // saved</span>
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              left: 26,
              right: 26,
              bottom: 26,
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: F.mono,
              fontSize: 10.5,
              color: C.dim,
              letterSpacing: 1,
              borderTop: `1px solid ${C.lineSoft}`,
              paddingTop: 12,
            }}
          >
            <span>saved · watcher idle</span>
            <span style={{color: C.greenSoft}}>change detected</span>
          </div>
        </Glass>

        {/* graph */}
        <div
          style={{
            position: 'absolute',
            left: 880,
            top: 292,
            width: 920,
            height: 360,
            ...panelStyle,
            padding: '20px 24px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: F.mono,
              fontSize: 11,
              letterSpacing: 2,
              color: C.dim,
            }}
          >
            <span>PROFILE ENTRIES</span>
            <span>only changed → restart</span>
          </div>

          <svg
            width={920}
            height={360}
            style={{position: 'absolute', left: 0, top: 0}}
          >
            <defs>
              <linearGradient id="edge" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor={C.cyan} stopOpacity="0.55" />
                <stop offset="1" stopColor={C.cyan} stopOpacity="0.12" />
              </linearGradient>
            </defs>
            <path
              d="M 320 130 C 390 130, 410 90, 500 90"
              fill="none"
              stroke="url(#edge)"
              strokeWidth="1.5"
              strokeDasharray="6 6"
              strokeDashoffset={-frame * 1.2}
              opacity={edgeP}
            />
            <path
              d="M 320 130 C 390 130, 410 210, 500 210"
              fill="none"
              stroke="url(#edge)"
              strokeWidth="1.5"
              strokeDasharray="6 6"
              strokeDashoffset={-frame * 1.2}
              opacity={edgeP}
            />
          </svg>

          <GraphNode
              x={40}
              y={96}
              w={280}
              h={70}
              label="include:mcp-fastboot"
              sub="changed · reconcileProfile()"
              color={C.cyan}
              opacity={1}
              glow={pulse * changed}
              p={sp(32)}
            />
            <GraphNode
              x={500}
              y={56}
              w={240}
              h={64}
              label="mcp-client"
              sub="apply · reconnect"
              color={C.muted}
              opacity={0.42}
              p={sp(46)}
            />
            <GraphNode
              x={500}
              y={176}
              w={240}
              h={64}
              label="web ui"
              sub="untouched"
              color={C.muted}
              opacity={0.42}
              p={sp(54)}
            />
            <GraphNode
              x={40}
              y={236}
              w={260}
              h={58}
              label="include:hot-reload"
              sub="untouched"
              color={C.muted}
              opacity={0.3}
              p={sp(62)}
            />

        </div>

        {/* timer card */}
        <Glass
          style={{
            position: 'absolute',
            left: 880,
            top: 680,
            width: 920,
            height: 250,
            padding: '24px 30px',
            border: '1px solid rgba(52,211,153,0.22)',
          }}
          accent={C.green}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: F.mono,
                  fontSize: 11,
                  letterSpacing: 2.2,
                  color: C.dim,
                }}
              >
                RELOAD LATENCY · 变更 entry 重启
              </div>
              <div style={{display: 'flex', alignItems: 'baseline', marginTop: 8}}>
                <Count
                  to={0.112}
                  delay={130}
                  duration={34}
                  decimals={3}
                  style={{
                    fontFamily: F.display,
                    fontSize: 76,
                    fontWeight: 700,
                    letterSpacing: -3,
                    color: C.green,
                    lineHeight: 1,
                  }}
                />
                <span
                  style={{
                    fontFamily: F.mono,
                    fontSize: 20,
                    color: C.green,
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
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 999,
                border: `1px solid ${C.green}3a`,
                background: 'rgba(52,211,153,0.07)',
                opacity: interpolate(frame, [190, 214], [0, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                }),
              }}
            >
              <span
                style={{
                  fontFamily: F.display,
                  fontSize: 26,
                  fontWeight: 700,
                  color: C.green,
                }}
              >
                39×
              </span>
              <span
                style={{
                  fontFamily: F.mono,
                  fontSize: 10,
                  letterSpacing: 1,
                  color: C.greenSoft,
                }}
              >
                vs 完整重启
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
              marginTop: 24,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Chip color={C.cyan}>reload_dsh</Chip>
            <Chip color={C.cyan}>/reload</Chip>
            <span
              style={{
                fontFamily: F.mono,
                fontSize: 11,
                color: C.dim,
                letterSpacing: 0.6,
              }}
            >
              无参数＝重载变更 · 带参数＝重启指定 entry
            </span>
          </div>
        </Glass>

        <Fade delay={244} duration={20}>
          <div
            style={{
              position: 'absolute',
              left: 120,
              bottom: 60,
              fontFamily: F.mono,
              fontSize: 12,
              color: C.muted,
              letterSpacing: 1.8,
            }}
          >
            HMR service · <span style={{color: C.cyanSoft}}>reconcileProfile()</span>
            <span style={{color: C.dim}}> · 只处理发生变化的模块图</span>
          </div>
        </Fade>
      </SceneShell>
    </SceneFade>
  );
};
