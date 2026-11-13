import {AbsoluteFill, useVideoConfig} from 'remotion';
import {C, F, gradText, panelStyle} from '../theme';
import {CoverBackdrop} from './CoverBackdrop';

const Chip = ({
  children,
  color,
  size,
}: {
  children: React.ReactNode;
  color: string;
  size: number;
}) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: size * 0.4,
      padding: `${size * 0.42}px ${size * 0.9}px`,
      borderRadius: 999,
      border: `1px solid ${color}42`,
      background: `${color}10`,
      color,
      fontFamily: F.mono,
      fontSize: size,
      letterSpacing: size * 0.06,
      whiteSpace: 'nowrap',
    }}
  >
    <span
      style={{
        width: size * 0.36,
        height: size * 0.36,
        borderRadius: 99,
        background: color,
        boxShadow: `0 0 ${size * 0.5}px ${color}`,
      }}
    />
    {children}
  </span>
);

export const Cover = () => {
  const {width, height} = useVideoConfig();
  const portrait = height > width;

  const contentW = portrait
    ? Math.min(width * 0.84, 920)
    : Math.min(height * 0.78, 850);

  const dshSize = height * (portrait ? 0.155 : 0.15);
  const fastSize = height * (portrait ? 0.066 : 0.064);
  const sloganSize = height * (portrait ? 0.031 : 0.029);
  const statSize = portrait ? 172 : 128;
  const oldSize = statSize * 0.52;
  const gap = height * (portrait ? 0.028 : 0.024);
  const pad = height * (portrait ? 0.028 : 0.024);
  const small = height * (portrait ? 0.014 : 0.013);

  return (
    <AbsoluteFill style={{backgroundColor: C.bg0, fontFamily: F.sans}}>
      <CoverBackdrop />

      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          padding: portrait ? '70px 0' : '54px 0',
        }}
      >
        <div
          style={{
            width: contentW,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          {/* kicker */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              fontFamily: F.mono,
              fontSize: small,
              letterSpacing: 5,
              color: C.cyan,
              textTransform: 'uppercase',
            }}
          >
            <span
              style={{
                width: 26,
                height: 2,
                background: C.cyan,
                boxShadow: `0 0 12px ${C.cyan}`,
              }}
            />
            DEEPSEEK HARNESS · RUNTIME PLUGIN
          </div>

          {/* wordmark */}
          <div
            style={{
              marginTop: gap * 0.72,
              fontFamily: F.display,
              fontSize: dshSize,
              fontWeight: 800,
              letterSpacing: -dshSize * 0.055,
              lineHeight: 0.9,
              color: C.ink,
              textShadow: '0 18px 70px rgba(0,0,0,0.5)',
            }}
          >
            DSH
          </div>
          <div
            style={{
              marginTop: height * 0.004,
              fontFamily: F.mono,
              fontSize: fastSize,
              fontWeight: 500,
              letterSpacing: fastSize * 0.22,
              lineHeight: 1,
              ...gradText(C.cyanSoft, C.violetSoft),
              textShadow: '0 0 60px rgba(34,211,238,0.25)',
            }}
          >
            FASTBOOT
          </div>

          {/* slogan */}
          <div
            style={{
              marginTop: gap * 0.7,
              fontSize: sloganSize,
              color: C.soft,
              letterSpacing: 1.2,
              lineHeight: 1.4,
            }}
          >
            让你的 DSH 启动再快一点
          </div>

          {/* stat card */}
          <div
            style={{
              marginTop: gap,
              width: '100%',
              padding: `${pad}px ${pad * 1.15}px`,
              ...panelStyle,
              border: '1px solid rgba(52,211,153,0.24)',
              boxShadow:
                '0 30px 90px rgba(0,0,0,0.45), 0 0 60px rgba(52,211,153,0.06), inset 0 1px 0 rgba(255,255,255,0.06)',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontFamily: F.mono,
                fontSize: small * 0.88,
                letterSpacing: 2.4,
                color: C.muted,
              }}
            >
              <span>HOST READY · 中位数</span>
              <span style={{color: C.dim}}>单位 s</span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                gap: 10,
                marginTop: gap * 0.62,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: F.mono,
                    fontSize: small * 0.82,
                    letterSpacing: 2,
                    color: C.red,
                    marginBottom: 2,
                  }}
                >
                  WITHOUT
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    color: C.red,
                    opacity: 0.82,
                  }}
                >
                  <span
                    style={{
                      fontFamily: F.display,
                      fontSize: oldSize,
                      fontWeight: 700,
                      letterSpacing: -2,
                      textDecoration: 'line-through',
                      textDecorationThickness: 3,
                    }}
                  >
                    8.14
                  </span>
                  <span
                    style={{
                      fontFamily: F.mono,
                      fontSize: oldSize * 0.26,
                      marginLeft: 6,
                    }}
                  >
                    s
                  </span>
                </div>
              </div>

              <div
                style={{
                  fontFamily: F.mono,
                  fontSize: statSize * 0.2,
                  color: C.dim,
                  paddingBottom: statSize * 0.18,
                }}
              >
                →
              </div>

              <div style={{textAlign: 'right'}}>
                <div
                  style={{
                    fontFamily: F.mono,
                    fontSize: small * 0.82,
                    letterSpacing: 2,
                    color: C.green,
                    marginBottom: 2,
                  }}
                >
                  WITH FASTBOOT
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'flex-end',
                    color: C.green,
                    textShadow: '0 0 52px rgba(52,211,153,0.38)',
                  }}
                >
                  <span
                    style={{
                      fontFamily: F.display,
                      fontSize: statSize,
                      fontWeight: 800,
                      letterSpacing: -statSize * 0.035,
                      lineHeight: 1,
                    }}
                  >
                    2.22
                  </span>
                  <span
                    style={{
                      fontFamily: F.mono,
                      fontSize: statSize * 0.24,
                      marginLeft: 8,
                    }}
                  >
                    s
                  </span>
                </div>
              </div>
            </div>

            {/* reduction bar */}
            <div
              style={{
                marginTop: gap * 0.55,
                height: 6,
                borderRadius: 99,
                background: 'rgba(251,113,133,0.16)',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '27.3%',
                  borderRadius: 99,
                  background: `linear-gradient(90deg, ${C.green}, ${C.cyan})`,
                  boxShadow: `0 0 16px ${C.green}66`,
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: gap * 0.38,
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: `${small * 0.55}px ${small * 1.1}px`,
                  borderRadius: 999,
                  border: '1px solid rgba(52,211,153,0.3)',
                  background: 'rgba(52,211,153,0.08)',
                  fontFamily: F.mono,
                  fontSize: small * 1.05,
                  letterSpacing: 1,
                  color: C.green,
                }}
              >
                ↓ 72.7% 启动耗时
              </span>
              <span
                style={{
                  fontFamily: F.mono,
                  fontSize: small * 0.72,
                  letterSpacing: 1.2,
                  color: C.dim,
                }}
              >
                后台初始化
              </span>
            </div>

            <div
              style={{
                marginTop: gap * 0.5,
                fontFamily: F.mono,
                fontSize: small * 0.76,
                letterSpacing: 0.8,
                color: C.muted,
              }}
            >
              MCP 后台加载 · 与 Web 启动并发
            </div>
          </div>

          {/* chips */}
          <div
            style={{
              marginTop: gap * 0.78,
              display: 'flex',
              gap: height * 0.012,
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <Chip color={C.cyan} size={small * 1.02}>
              MCP 加速
            </Chip>
            <Chip color={C.violet} size={small * 1.02}>
              局部热重载
            </Chip>
            <Chip color={C.green} size={small * 1.02}>
              零配置
            </Chip>
          </div>

          <div
            style={{
              marginTop: gap * 0.42,
              fontFamily: F.mono,
              fontSize: small * 0.68,
              letterSpacing: 1.6,
              color: C.dim,
            }}
          >
            DSH 0.2.2-rc.1 · 4 轮交替实测 · macOS arm64
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
