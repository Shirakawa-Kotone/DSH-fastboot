import {AbsoluteFill} from 'remotion';
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
      gap: size * 0.38,
      padding: `${size * 0.42}px ${size * 0.85}px`,
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
        width: size * 0.34,
        height: size * 0.34,
        borderRadius: 99,
        background: color,
        boxShadow: `0 0 ${size * 0.45}px ${color}`,
      }}
    />
    {children}
  </span>
);

export const Cover43 = () => (
  <AbsoluteFill style={{backgroundColor: C.bg0, fontFamily: F.sans}}>
    <CoverBackdrop />

    {/* left column */}
    <div style={{position: 'absolute', left: 90, top: 200, width: 700}}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          fontFamily: F.mono,
          fontSize: 14,
          letterSpacing: 4.5,
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

      <div
        style={{
          marginTop: 24,
          fontFamily: F.display,
          fontSize: 236,
          fontWeight: 800,
          letterSpacing: -13,
          lineHeight: 0.88,
          color: C.ink,
          textShadow: '0 18px 70px rgba(0,0,0,0.5)',
        }}
      >
        DSH
      </div>

      <div
        style={{
          marginTop: 8,
          fontFamily: F.mono,
          fontSize: 94,
          fontWeight: 500,
          letterSpacing: 18,
          lineHeight: 1,
          ...gradText(C.cyanSoft, C.violetSoft),
          textShadow: '0 0 60px rgba(34,211,238,0.25)',
        }}
      >
        FASTBOOT
      </div>

      <div
        style={{
          marginTop: 42,
          fontSize: 42,
          color: C.soft,
          letterSpacing: 1.2,
          lineHeight: 1.4,
          whiteSpace: 'nowrap',
        }}
      >
        让你的 DSH 启动再快一点
      </div>

      <div
        style={{
          marginTop: 44,
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <Chip color={C.cyan} size={20}>
          MCP 加速
        </Chip>
        <Chip color={C.violet} size={20}>
          局部热重载
        </Chip>
        <Chip color={C.green} size={20}>
          零配置
        </Chip>
      </div>

      <div
        style={{
          marginTop: 28,
          fontFamily: F.mono,
          fontSize: 11.5,
          letterSpacing: 1.4,
          color: C.dim,
        }}
      >
        DSH 0.2.2-rc.1 · 4 轮交替实测 · macOS arm64
      </div>
    </div>

    {/* mcp queue strip */}
    <div style={{position: 'absolute', left: 90, top: 814, width: 704}}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: F.mono,
          fontSize: 11.5,
          letterSpacing: 1.6,
          color: C.muted,
        }}
      >
        <span>MCP × 5 · 每一项都在拖慢启动</span>
        <span style={{color: C.redSoft}}>+1.32s each</span>
      </div>
      <div style={{display: 'flex', gap: 8, marginTop: 10}}>
        {['Docs', 'Bindings', 'Notion', 'Observability', '⋯'].map((name) => (
          <div
            key={name}
            style={{
              width: 132,
              height: 42,
              borderRadius: 8,
              border: '1px solid rgba(251,113,133,0.24)',
              background: 'rgba(251,113,133,0.055)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontFamily: F.mono,
              fontSize: name === '⋯' ? 18 : 10.5,
              color: name === '⋯' ? C.dim : C.soft,
              whiteSpace: 'nowrap',
            }}
          >
            {name}
            {name !== '⋯' ? (
              <span style={{fontSize: 8, color: C.red}}>+1.32</span>
            ) : null}
          </div>
        ))}
      </div>
    </div>

    {/* divider */}
    <div
      style={{
        position: 'absolute',
        left: 826,
        top: 240,
        width: 1,
        height: 640,
        background:
          'linear-gradient(180deg, transparent, rgba(125,170,240,0.18), transparent)',
      }}
    />

    {/* stat card */}
    <div
      style={{
        position: 'absolute',
        left: 872,
        top: 272,
        width: 488,
        height: 590,
        padding: '34px 36px',
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
          fontSize: 12,
          letterSpacing: 2.2,
          color: C.muted,
        }}
      >
        <span>HOST READY · 中位数</span>
        <span style={{color: C.dim}}>单位 s</span>
      </div>

      <div
        style={{
          marginTop: 26,
          fontFamily: F.mono,
          fontSize: 11.5,
          letterSpacing: 2,
          color: C.red,
        }}
      >
        WITHOUT
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          color: C.red,
          opacity: 0.84,
          marginTop: 2,
        }}
      >
        <span
          style={{
            fontFamily: F.display,
            fontSize: 78,
            fontWeight: 700,
            letterSpacing: -2,
            textDecoration: 'line-through',
            textDecorationThickness: 3,
            lineHeight: 1,
          }}
        >
          8.14
        </span>
        <span
          style={{
            fontFamily: F.mono,
            fontSize: 18,
            marginLeft: 5,
          }}
        >
          s
        </span>
      </div>

      <div
        style={{
          margin: '14px 0 12px',
          height: 1,
          background:
            'linear-gradient(90deg, rgba(251,113,133,0.3), rgba(140,180,240,0.14), rgba(52,211,153,0.3))',
        }}
      />

      <div
        style={{
          fontFamily: F.mono,
          fontSize: 11.5,
          letterSpacing: 2,
          color: C.green,
        }}
      >
        WITH FASTBOOT
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          color: C.green,
          textShadow: '0 0 52px rgba(52,211,153,0.38)',
          marginTop: 2,
        }}
      >
        <span
          style={{
            fontFamily: F.display,
            fontSize: 148,
            fontWeight: 800,
            letterSpacing: -5,
            lineHeight: 1,
          }}
        >
          2.22
        </span>
        <span
          style={{
            fontFamily: F.mono,
            fontSize: 24,
            marginLeft: 6,
          }}
        >
          s
        </span>
      </div>

      <div
        style={{
          marginTop: 20,
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
          marginTop: 18,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 12px',
            borderRadius: 999,
            border: '1px solid rgba(52,211,153,0.3)',
            background: 'rgba(52,211,153,0.08)',
            fontFamily: F.mono,
            fontSize: 14,
            letterSpacing: 0.8,
            color: C.green,
          }}
        >
          ↓ 72.7% 启动耗时
        </span>
        <span
          style={{
            fontFamily: F.mono,
            fontSize: 10,
            letterSpacing: 1,
            color: C.dim,
          }}
        >
          后台初始化
        </span>
      </div>

      <div
        style={{
          marginTop: 22,
          fontFamily: F.mono,
          fontSize: 11.5,
          letterSpacing: 0.7,
          color: C.muted,
        }}
      >
        MCP 后台加载 · 与 Web 启动并发
      </div>

      <div
        style={{
          position: 'absolute',
          left: 36,
          right: 36,
          bottom: 26,
          paddingTop: 14,
          borderTop: `1px solid ${C.lineSoft}`,
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: F.mono,
          fontSize: 10,
          letterSpacing: 0.8,
          color: C.dim,
        }}
      >
        <span>VS 无 MCP 基线 2.15s</span>
        <span style={{color: C.greenSoft}}>+0.07s</span>
      </div>
    </div>
  </AbsoluteFill>
);
