import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, F, panelStyle} from '../theme';
import {Count, Fade, Glass, SceneFade, SceneHeader, SceneShell} from '../ui';

const H = 86; // px per second
const BASE = 760;

const steps = [
  {label: '仅 fastboot', sub: '主测试', value: 4.37, color: C.cyan, x: 230},
  {label: '＋Notion 后台', sub: '原型', value: 2.8, color: C.cyan, x: 470},
  {label: '＋全部 MCP 后台', sub: '原型', value: 2.22, color: C.green, x: 710},
  {label: '停用全部 MCP', sub: '局部基线', value: 2.15, color: C.muted, x: 950},
];

const homeRows = [
  {label: '关闭 fastboot', value: 9.73, color: C.red},
  {label: '仅 fastboot', value: 4.92, color: C.cyan},
  {label: '＋Notion 后台', value: 2.81, color: C.cyan},
  {label: '＋全部后台', value: 2.27, color: C.green},
];

export const S8Floor = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = (delay: number, stiffness = 80) =>
    spring({
      frame: frame - delay,
      fps,
      config: {damping: 200, mass: 0.9, stiffness},
      durationInFrames: 36,
    });

  const floor = interpolate(frame, [120, 160], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const callout = interpolate(frame, [170, 200], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <SceneFade duration={360} fadeIn={8} fadeOut={10}>
      <SceneShell>
        <SceneHeader
          index="08"
          kicker="继续压榨"
          title={
            <>
              4.37 → 2.22，<span style={{color: C.green}}>逼近地板</span>。
            </>
          }
          width={1220}
        />

        <Fade delay={18} duration={18}>
          <div
            style={{
              position: 'absolute',
              left: 120,
              top: 228,
              fontSize: 20,
              color: C.muted,
            }}
          >
            把首次 MCP 初始化也移出关键路径；2.22s 距离「完全没有 MCP」只差 0.07s。
          </div>
        </Fade>

        {/* chart baseline */}
        <div
          style={{
            position: 'absolute',
            left: 160,
            top: BASE,
            width: 1040,
            height: 1,
            background: 'rgba(150,185,230,0.3)',
          }}
        />
        {[0, 1, 2, 3, 4, 5].map((t) => (
          <div key={t}>
            <div
              style={{
                position: 'absolute',
                left: 160,
                top: BASE - t * H,
                width: 1040,
                height: 1,
                background:
                  t === 0 ? 'transparent' : 'rgba(130,170,230,0.07)',
              }}
            />
            <span
              style={{
                position: 'absolute',
                left: 126,
                top: BASE - t * H - 8,
                width: 24,
                textAlign: 'right',
                fontFamily: F.mono,
                fontSize: 11,
                color: C.dim,
              }}
            >
              {t}
            </span>
          </div>
        ))}

        {/* bars */}
        {steps.map((s, i) => {
          const p = sp(28 + i * 26);
          const isFloor = i === 3;
          return (
            <div key={s.label}>
              <div
                style={{
                  position: 'absolute',
                  left: s.x,
                  top: BASE - s.value * H * p,
                  width: 170,
                  height: s.value * H * p,
                  borderRadius: '8px 8px 0 0',
                  background: isFloor
                    ? 'rgba(140,160,190,0.05)'
                    : `linear-gradient(180deg, ${s.color}dd 0%, ${s.color}33 100%)`,
                  border: `${isFloor ? '1px dashed' : '1px solid'} ${s.color}${isFloor ? '66' : '77'}`,
                  borderBottom: 'none',
                  boxShadow: isFloor ? 'none' : `0 -10px 34px ${s.color}22`,
                  opacity: isFloor ? 0.7 : 1,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: s.x - 15,
                  top: BASE - s.value * H - 54,
                  width: 200,
                  textAlign: 'center',
                  opacity: p,
                }}
              >
                <Count
                  to={s.value}
                  delay={38 + i * 26}
                  duration={32}
                  style={{
                    fontFamily: F.display,
                    fontSize: 42,
                    fontWeight: 700,
                    letterSpacing: -1.4,
                    color: s.color,
                  }}
                />
                <span
                  style={{
                    fontFamily: F.mono,
                    fontSize: 12,
                    color: s.color,
                    opacity: 0.65,
                  }}
                >
                  s
                </span>
              </div>
              <div
                style={{
                  position: 'absolute',
                  left: s.x - 30,
                  top: BASE + 18,
                  width: 230,
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontFamily: F.mono,
                    fontSize: 12,
                    letterSpacing: 0.8,
                    color: isFloor ? C.dim : C.soft,
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontFamily: F.mono,
                    fontSize: 9.5,
                    letterSpacing: 1,
                    color: C.dim,
                    marginTop: 4,
                  }}
                >
                  {s.sub}
                </div>
              </div>
            </div>
          );
        })}

        {/* floor line */}
        <div
          style={{
            position: 'absolute',
            left: 160,
            top: BASE - 2.15 * H,
            width: 1040 * floor,
            height: 1,
            background:
              'repeating-linear-gradient(90deg, rgba(180,190,210,0.5) 0 6px, transparent 6px 12px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 160,
            top: 838,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            opacity: floor,
          }}
        >
          <span
            style={{
              width: 42,
              height: 1,
              background:
                'repeating-linear-gradient(90deg, rgba(180,190,210,0.6) 0 6px, transparent 6px 12px)',
            }}
          />
          <span
            style={{
              fontFamily: F.mono,
              fontSize: 11,
              letterSpacing: 1,
              color: C.dim,
            }}
          >
            无 MCP 基线 · 2.15s
          </span>
        </div>

        {/* 0.07 callout */}
        <div
          style={{
            position: 'absolute',
            left: 890,
            top: 486,
            opacity: callout,
            translate: `0 ${(1 - callout) * 10}px`,
          }}
        >
          <div
            style={{
              fontFamily: F.display,
              fontSize: 30,
              fontWeight: 700,
              color: C.green,
              letterSpacing: -0.8,
              textAlign: 'center',
            }}
          >
            0.07s
          </div>
          <div
            style={{
              fontFamily: F.mono,
              fontSize: 10,
              letterSpacing: 1,
              color: C.greenSoft,
              textAlign: 'center',
              marginTop: 4,
            }}
          >
            距离地板
          </div>
          <div
            style={{
              width: 1,
              height: 44,
              background: `linear-gradient(180deg, ${C.green}, transparent)`,
              margin: '8px auto 0',
            }}
          />
        </div>

        {/* homepage panel */}
        <Glass
          style={{
            position: 'absolute',
            left: 1260,
            top: 320,
            width: 540,
            height: 372,
            padding: '22px 26px',
          }}
        >
          <div
            style={{
              fontFamily: F.mono,
              fontSize: 11,
              letterSpacing: 2,
              color: C.dim,
            }}
          >
            首页 HTTP 200 · 用户真正看到页面
          </div>
          <div
            style={{
              fontFamily: F.display,
              fontSize: 15,
              color: C.muted,
              marginTop: 8,
            }}
          >
            9.73s → 2.27s
            <span
              style={{
                fontFamily: F.mono,
                fontSize: 11,
                color: C.green,
                marginLeft: 10,
              }}
            >
              −76.7%
            </span>
          </div>

          <div style={{marginTop: 20}}>
            {homeRows.map((r, i) => {
              const p = sp(180 + i * 18, 100);
              return (
                <div
                  key={r.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    height: 54,
                    opacity: p,
                  }}
                >
                  <span
                    style={{
                      width: 120,
                      fontFamily: F.mono,
                      fontSize: 10.5,
                      color: C.muted,
                      letterSpacing: 0.4,
                    }}
                  >
                    {r.label}
                  </span>
                  <div
                    style={{
                      width: 260,
                      height: 7,
                      borderRadius: 6,
                      background: 'rgba(255,255,255,0.045)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: (r.value / 10) * 260 * p,
                        height: '100%',
                        borderRadius: 6,
                        background: r.color,
                        opacity: 0.8,
                      }}
                    />
                  </div>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontFamily: F.display,
                      fontSize: 22,
                      fontWeight: 650,
                      color: r.color,
                      letterSpacing: -0.5,
                    }}
                  >
                    {r.value.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>

          <div
            style={{
              fontFamily: F.mono,
              fontSize: 9.5,
              color: C.dim,
              letterSpacing: 0.7,
              marginTop: 12,
            }}
          >
            URL 打开到首页返回 200 · 每种模式补测 1 轮
          </div>
        </Glass>

        <Fade delay={250} duration={22}>
          <div
            style={{
              position: 'absolute',
              left: 120,
              bottom: 84,
              fontFamily: F.display,
              fontSize: 34,
              fontWeight: 600,
              color: C.ink,
              letterSpacing: -0.6,
            }}
          >
            MCP 的等待，几乎从关键路径上消失。
          </div>
        </Fade>
      </SceneShell>
    </SceneFade>
  );
};
