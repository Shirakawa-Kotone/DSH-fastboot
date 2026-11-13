import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, F, panelStyle} from '../theme';
import {
  CodeCard,
  CodeLine,
  COM,
  Dot,
  Fade,
  FN,
  Glass,
  KW,
  PUNC,
  PLAIN,
  PROP,
  SceneFade,
  SceneHeader,
  SceneShell,
  Tok,
} from '../ui';

type NodeProps = {
  x: number;
  y: number;
  w: number;
  label: string;
  sub: string;
  accent: string;
  p: number;
  ring?: number;
};

const Node = ({x, y, w, label, sub, accent, p, ring}: NodeProps) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      height: 110,
      borderRadius: 14,
      background:
        'linear-gradient(180deg, rgba(20,32,55,0.9), rgba(10,16,30,0.9))',
      border: `1px solid ${accent}33`,
      boxShadow: `0 18px 50px rgba(0,0,0,0.35)${
        ring ? `, 0 0 0 1px ${accent}${ring > 0 ? '88' : '00'}, 0 0 ${34 * ring}px ${accent}33` : ''
      }`,
      opacity: p,
      translate: `0 ${(1 - p) * 18}px`,
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        background: accent,
        opacity: 0.85,
      }}
    />
    <div style={{padding: '20px 22px'}}>
      <div
        style={{
          fontFamily: F.mono,
          fontSize: 17,
          color: C.ink,
          letterSpacing: 0.2,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: F.mono,
          fontSize: 10.5,
          color: C.dim,
          letterSpacing: 1,
          marginTop: 8,
          whiteSpace: 'nowrap',
        }}
      >
        {sub}
      </div>
    </div>
  </div>
);

const Connector = ({
  x,
  y,
  w,
  color,
  progress,
}: {
  x: number;
  y: number;
  w: number;
  color: string;
  progress: number;
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: w * progress,
      height: 1,
      background: `repeating-linear-gradient(90deg, ${color} 0 5px, ${color}22 5px 10px)`,
      opacity: 0.9,
    }}
  />
);

export const S4Loader = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const p = (delay: number, stiffness = 110) =>
    spring({
      frame: frame - delay,
      fps,
      config: {damping: 200, mass: 0.75, stiffness},
      durationInFrames: 26,
    });

  const wrapper = interpolate(frame, [92, 124], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const ring = interpolate(frame, [118, 148], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const stamp = spring({
    frame: frame - 276,
    fps,
    config: {damping: 14, mass: 0.6, stiffness: 160},
    durationInFrames: 24,
  });
  const flow = (frame * 1.4) % 10;

  const steps = [
    {label: '拦截', en: 'INTERCEPT', at: 50},
    {label: '包装', en: 'WRAP', at: 150},
    {label: '不等待', en: 'NO AWAIT', at: 270},
  ];
  const active = frame < 150 ? 0 : frame < 270 ? 1 : 2;

  return (
    <SceneFade duration={480} fadeIn={8} fadeOut={10}>
      <SceneShell>
        <SceneHeader
          index="04"
          kicker="机制 · 非阻塞启动"
          title={
            <>
              不改上游，<span style={{color: C.cyan}}>只包一层</span>。
            </>
          }
          width={1100}
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
            在 Loader 导出插件时接住 mcp-client，把 apply 变成「启动，但不等待」。
          </div>
        </Fade>

        {/* wrapper box */}
        <div
          style={{
            position: 'absolute',
            left: 718,
            top: 276,
            width: 600,
            height: 178,
            borderRadius: 22,
            border: '1px dashed rgba(52,211,153,0.38)',
            background: 'rgba(52,211,153,0.025)',
            clipPath: `inset(0 ${(1 - wrapper) * 100}% 0 0)`,
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: 18,
              top: 6,
              padding: '2px 9px',
              borderRadius: 5,
              background: '#0a1424',
              border: '1px solid rgba(52,211,153,0.4)',
              fontFamily: F.mono,
              fontSize: 10.5,
              letterSpacing: 1.6,
              color: C.green,
            }}
          >
            wrapper
          </span>
        </div>

        {/* nodes */}
        <Node
          x={120}
          y={300}
          w={220}
          label="Cordis Loader"
          sub="cordis-plugin-loader"
          accent={C.cyan}
          p={p(26)}
        />
        <Node
          x={400}
          y={300}
          w={290}
          label="unwrapExports()"
          sub="导出阶段 · 同步钩子"
          accent={C.cyan}
          p={p(38)}
          ring={ring}
        />
        <Node
          x={750}
          y={300}
          w={250}
          label="mcp-client"
          sub="plugin object"
          accent={C.violet}
          p={p(50)}
        />
        <Node
          x={1060}
          y={300}
          w={210}
          label="apply()"
          sub="async (ctx, config)"
          accent={C.violet}
          p={p(62)}
        />

        {/* highlight ring around unwrap */}
        <div
          style={{
            position: 'absolute',
            left: 388,
            top: 288,
            width: 314,
            height: 134,
            borderRadius: 18,
            border: `1px solid ${C.cyan}`,
            boxShadow: `0 0 26px ${C.cyan}33, inset 0 0 26px ${C.cyan}0d`,
            opacity: ring * 0.8,
          }}
        />

        {/* connectors */}
        <Connector x={340} y={365} w={60} color={C.cyan} progress={p(44)} />
        <Connector x={690} y={365} w={60} color={C.cyan} progress={p(56)} />
        <Connector x={1000} y={365} w={60} color={C.violet} progress={p(68)} />

        {/* boot arrow right */}
        <div
          style={{
            position: 'absolute',
            left: 1310,
            top: 364,
            width: 380 * interpolate(frame, [250, 300], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
            height: 2,
            background:
              'repeating-linear-gradient(90deg, rgba(52,211,153,0.8) 0 8px, rgba(52,211,153,0.15) 8px 16px)',
            backgroundPositionX: -flow,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 1490,
            top: 338,
            fontFamily: F.mono,
            fontSize: 12,
            letterSpacing: 2,
            color: C.green,
            opacity: interpolate(frame, [262, 290], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          HOST 继续启动 →
        </div>

        {/* mcp down arrow */}
        <div
          style={{
            position: 'absolute',
            left: 1245,
            top: 406,
            width: 1,
            height: 58 * interpolate(frame, [268, 300], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
            background:
              'repeating-linear-gradient(180deg, rgba(34,211,238,0.8) 0 6px, rgba(34,211,238,0.12) 6px 12px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 1260,
            top: 468,
            fontFamily: F.mono,
            fontSize: 11,
            letterSpacing: 1.2,
            color: C.cyanSoft,
            opacity: interpolate(frame, [280, 306], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          连接在后台继续
        </div>

        {/* no await stamp */}
        <div
          style={{
            position: 'absolute',
            left: 1440,
            top: 250,
            padding: '7px 16px',
            border: `1px solid ${C.green}77`,
            borderRadius: 6,
            rotate: '-7deg',
            scale: stamp,
            opacity: stamp,
            fontFamily: F.mono,
            fontSize: 20,
            letterSpacing: 3,
            color: C.green,
            background: 'rgba(52,211,153,0.06)',
            boxShadow: `0 0 30px ${C.green}22`,
          }}
        >
          NO AWAIT
        </div>

        {/* step rail */}
        <div
          style={{
            position: 'absolute',
            left: 120,
            top: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 18,
          }}
        >
          {steps.map((s, i) => {
            const on = i === active;
            const done = i < active;
            const color = on ? C.cyan : done ? C.green : C.dim;
            return (
              <div key={s.label} style={{display: 'flex', alignItems: 'center'}}>
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 99,
                    border: `1px solid ${color}66`,
                    background: on ? `${C.cyan}1c` : 'transparent',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: F.mono,
                    fontSize: 10,
                    color,
                    boxShadow: on ? `0 0 14px ${C.cyan}44` : undefined,
                  }}
                >
                  {done ? '✓' : `0${i + 1}`}
                </span>
                <span
                  style={{
                    marginLeft: 8,
                    fontFamily: F.mono,
                    fontSize: 12,
                    letterSpacing: 2,
                    color,
                  }}
                >
                  {s.label}
                </span>
                <span
                  style={{
                    marginLeft: 8,
                    fontFamily: F.mono,
                    fontSize: 9,
                    letterSpacing: 1,
                    color: on ? C.cyanSoft : C.dim,
                    opacity: 0.8,
                  }}
                >
                  {s.en}
                </span>
                {i < steps.length - 1 ? (
                  <span
                    style={{
                      width: 54,
                      height: 1,
                      margin: '0 18px',
                      background: `linear-gradient(90deg, ${color}55, ${C.dim}33)`,
                    }}
                  />
                ) : null}
              </div>
            );
          })}
        </div>

        {/* left code card */}
        <div
          style={{
            position: 'absolute',
            left: 120,
            top: 568,
            width: 760,
          }}
        >
          <CodeCard
            title="loader-hook.js"
            accent={C.cyan}
            fontSize={15.5}
            style={{
              opacity: interpolate(frame, [80, 106], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
              translate: `0 ${interpolate(frame, [80, 106], [18, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })}px`,
            }}
          >
            <CodeLine n={1}>
              <KW>const</KW> <PLAIN>original</PLAIN> <PUNC>=</PUNC>{' '}
              <PLAIN>Loader.prototype.unwrapExports</PLAIN>
            </CodeLine>
            <CodeLine n={2}>{' '}</CodeLine>
            <CodeLine n={3}>
              <PLAIN>Loader.prototype.unwrapExports</PLAIN> <PUNC>=</PUNC>{' '}
              <KW>function</KW> <PUNC>(</PUNC>
              <PLAIN>e</PLAIN>
              <PUNC>) {'{'}</PUNC>
            </CodeLine>
            <CodeLine n={4}>
              <PLAIN>  </PLAIN>
              <KW>const</KW> <PLAIN>plugin</PLAIN> <PUNC>=</PUNC>{' '}
              <PLAIN>original.call</PLAIN>
              <PUNC>(</PUNC>
              <KW>this</KW>
              <PUNC>, e)</PUNC>
            </CodeLine>
            <CodeLine n={5}>{' '}</CodeLine>
            <CodeLine n={6}>
              <PLAIN>  </PLAIN>
              <KW>if</KW> <PUNC>(</PUNC>
              <PLAIN>plugin?.name</PLAIN> <PUNC>===</PUNC>{' '}
              <Tok c={C.green}>'mcp-client'</Tok>
              <PUNC>)</PUNC>
            </CodeLine>
            <CodeLine n={7}>
              <PLAIN>    </PLAIN>
              <KW>return</KW> <FN>wrap</FN>
              <PUNC>(</PUNC>
              <PLAIN>plugin</PLAIN>
              <PUNC>)</PUNC>
            </CodeLine>
            <CodeLine n={8}>{' '}</CodeLine>
            <CodeLine n={9}>
              <PLAIN>  </PLAIN>
              <KW>return</KW> <PLAIN>plugin</PLAIN>
            </CodeLine>
            <CodeLine n={10}>
              <PUNC>{'}'}</PUNC>
            </CodeLine>
          </CodeCard>
        </div>

        {/* right code card */}
        <div
          style={{
            position: 'absolute',
            left: 920,
            top: 568,
            width: 760,
          }}
        >
          <CodeCard
            title="wrapper.apply"
            accent={C.green}
            fontSize={15.5}
            style={{
              opacity: interpolate(frame, [96, 122], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
              translate: `0 ${interpolate(frame, [96, 122], [18, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })}px`,
            }}
          >
            <CodeLine n={1}>
              <KW>async</KW> <FN>apply</FN>
              <PUNC>(</PUNC>
              <PLAIN>ctx</PLAIN>
              <PUNC>, </PUNC>
              <PLAIN>config</PLAIN>
              <PUNC>) {'{'}</PUNC>
            </CodeLine>
            <CodeLine n={2}>
              <PLAIN>  </PLAIN>
              <KW>const</KW> <PLAIN>sdk</PLAIN> <PUNC>=</PUNC>{' '}
              <KW>await</KW> <FN>loadSdk</FN>
              <PUNC>()</PUNC>
            </CodeLine>
            <CodeLine n={3}>
              <PLAIN>  </PLAIN>
              <FN>installPatch</FN>
              <PUNC>(</PUNC>
              <PLAIN>sdk.Client</PLAIN>
              <PUNC>)</PUNC>
            </CodeLine>
            <CodeLine n={4}>{' '}</CodeLine>
            <CodeLine n={5} highlight>
              <PLAIN>  </PLAIN>
              <Tok c={C.green} b>
                void
              </Tok>{' '}
              <PLAIN>plugin.apply</PLAIN>
              <PUNC>(</PUNC>
              <PLAIN>ctx, config</PLAIN>
              <PUNC>)</PUNC>
            </CodeLine>
            <CodeLine n={6}>
              <PLAIN>  </PLAIN>
              <COM>{'// 不 await：连接在后台继续'}</COM>
            </CodeLine>
            <CodeLine n={7}>
              <PUNC>{'}'}</PUNC>
            </CodeLine>
          </CodeCard>
        </div>

        {/* lifecycle note */}
        <Glass
          style={{
            position: 'absolute',
            left: 940,
            top: 866,
            width: 720,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            opacity: interpolate(frame, [300, 326], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          <span
            style={{
              fontFamily: F.mono,
              fontSize: 11,
              letterSpacing: 1.4,
              color: C.greenSoft,
              marginRight: 4,
            }}
          >
            上游生命周期仍完整
          </span>
          {['effects', 'reconnect', 'dispose', 'tools/list'].map((t) => (
            <span
              key={t}
              style={{
                fontFamily: F.mono,
                fontSize: 11,
                color: C.soft,
                border: `1px solid ${C.line}`,
                borderRadius: 5,
                padding: '3px 8px',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              {t}
            </span>
          ))}
        </Glass>
      </SceneShell>
    </SceneFade>
  );
};
