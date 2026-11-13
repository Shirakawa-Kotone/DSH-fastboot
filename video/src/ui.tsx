import type {CSSProperties, ReactNode} from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {C, F, monoLabel, panelStyle, tabular} from './theme';

export const SceneShell = ({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) => (
  <AbsoluteFill style={{overflow: 'hidden', fontFamily: F.sans, ...style}}>
    {children}
  </AbsoluteFill>
);

/** Masked line reveal. Delay is in frames. */
export const Reveal = ({
  children,
  delay = 0,
  y = 26,
  durationInFrames = 14,
  style,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  durationInFrames?: number;
  style?: CSSProperties;
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({
    frame: frame - delay,
    fps,
    config: {damping: 200, mass: 0.55, stiffness: 220},
    durationInFrames,
  });
  return (
    <div style={{overflow: 'hidden', ...style}}>
      <div
        style={{
          translate: `0 ${(1 - p) * y}px`,
          opacity: interpolate(p, [0, 0.35, 1], [0, 1, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        {children}
      </div>
    </div>
  );
};

export const Fade = ({
  children,
  delay = 0,
  duration = 14,
  style,
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  style?: CSSProperties;
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  return <div style={{opacity, ...style}}>{children}</div>;
};

/** Number counter with tabular figures. */
export const Count = ({
  to,
  from = 0,
  delay = 0,
  duration = 24,
  decimals = 2,
  suffix = '',
  style,
}: {
  to: number;
  from?: number;
  delay?: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  style?: CSSProperties;
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [delay, delay + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const value = from + (to - from) * p;
  return (
    <span style={{...tabular, ...style}}>
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
};

export const Kicker = ({
  children,
  color = C.cyan,
  style,
}: {
  children: ReactNode;
  color?: string;
  style?: CSSProperties;
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      ...monoLabel,
      color,
      ...style,
    }}
  >
    <span
      style={{
        width: 24,
        height: 2,
        background: color,
        boxShadow: `0 0 12px ${color}`,
      }}
    />
    {children}
  </div>
);

export const SceneHeader = ({
  index,
  kicker,
  title,
  width = 1040,
  delay = 0,
  accent = C.cyan,
}: {
  index: string;
  kicker: string;
  title: ReactNode;
  width?: number;
  delay?: number;
  accent?: string;
}) => (
  <div
    style={{
      position: 'absolute',
      left: 120,
      top: 88,
      width,
      zIndex: 5,
    }}
  >
    <Reveal delay={delay} y={18} durationInFrames={18}>
      <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
        <span
          style={{
            fontFamily: F.mono,
            fontSize: 17,
            letterSpacing: 2,
            color: accent,
          }}
        >
          {index}
        </span>
        <span
          style={{
            width: 40,
            height: 1,
            background: accent,
            opacity: 0.55,
          }}
        />
        <span style={{...monoLabel, fontSize: 14, color: C.muted}}>
          {kicker}
        </span>
      </div>
    </Reveal>
    <Reveal delay={delay + 3} y={24} durationInFrames={16}>
      <div
        style={{
          marginTop: 18,
          fontFamily: F.display,
          fontSize: 58,
          fontWeight: 600,
          lineHeight: 1.16,
          letterSpacing: -1.2,
          color: C.ink,
          textWrap: 'balance',
        }}
      >
        {title}
      </div>
    </Reveal>
  </div>
);

export const Glass = ({
  children,
  style,
  accent,
}: {
  children: ReactNode;
  style?: CSSProperties;
  accent?: string;
}) => (
  <div
    style={{
      ...panelStyle,
      position: 'relative',
      ...(accent
        ? {boxShadow: `${panelStyle.boxShadow}, 0 0 0 1px ${accent}22, 0 0 40px ${accent}14`}
        : {}),
      ...style,
    }}
  >
    {accent ? (
      <div
        style={{
          position: 'absolute',
          left: 22,
          right: 22,
          top: 0,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${accent}aa, transparent)`,
        }}
      />
    ) : null}
    {children}
  </div>
);

export const Chip = ({
  children,
  color = C.cyan,
  filled = false,
  style,
}: {
  children: ReactNode;
  color?: string;
  filled?: boolean;
  style?: CSSProperties;
}) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 14px',
      borderRadius: 999,
      border: `1px solid ${color}3d`,
      background: filled ? `${color}1c` : 'rgba(255,255,255,0.025)',
      color: filled ? color : C.soft,
      fontFamily: F.mono,
      fontSize: 14,
      letterSpacing: 1.2,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {children}
  </span>
);

export const Dot = ({
  color = C.green,
  size = 8,
  glow = true,
}: {
  color?: string;
  size?: number;
  glow?: boolean;
}) => (
  <span
    style={{
      display: 'inline-block',
      width: size,
      height: size,
      borderRadius: 999,
      background: color,
      boxShadow: glow ? `0 0 10px ${color}` : undefined,
      flexShrink: 0,
    }}
  />
);

export const Rule = ({
  width = 80,
  color = C.cyan,
  delay = 0,
  duration = 18,
}: {
  width?: number;
  color?: string;
  delay?: number;
  duration?: number;
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [delay, delay + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  return (
    <div
      style={{
        width: width * p,
        height: 2,
        background: `linear-gradient(90deg, ${color}, ${color}00)`,
      }}
    />
  );
};

// ---------- code tokens ----------

export const Tok = ({
  c,
  children,
  b = false,
}: {
  c: string;
  children: ReactNode;
  b?: boolean;
}) => <span style={{color: c, fontWeight: b ? 600 : 400}}>{children}</span>;

export const KW = ({children}: {children: ReactNode}) => (
  <Tok c="#c084fc">{children}</Tok>
);
export const FN = ({children}: {children: ReactNode}) => (
  <Tok c="#67e8f9">{children}</Tok>
);
export const STR = ({children}: {children: ReactNode}) => (
  <Tok c="#86efac">{children}</Tok>
);
export const COM = ({children}: {children: ReactNode}) => (
  <Tok c="#5b6b84">{children}</Tok>
);
export const NUM = ({children}: {children: ReactNode}) => (
  <Tok c="#fbbf24">{children}</Tok>
);
export const PROP = ({children}: {children: ReactNode}) => (
  <Tok c="#93c5fd">{children}</Tok>
);
export const PUNC = ({children}: {children: ReactNode}) => (
  <Tok c="#8fa3bf">{children}</Tok>
);
export const PLAIN = ({children}: {children: ReactNode}) => (
  <Tok c="#dce7f7">{children}</Tok>
);

export const CodeCard = ({
  title,
  children,
  style,
  accent = C.cyan,
  fontSize = 19,
}: {
  title: string;
  children: ReactNode;
  style?: CSSProperties;
  accent?: string;
  fontSize?: number;
}) => (
  <Glass style={{overflow: 'hidden', ...style}} accent={accent}>
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
          fontSize: 13,
          letterSpacing: 1.2,
          color: C.muted,
        }}
      >
        {title}
      </span>
    </div>
    <div
      style={{
        padding: '22px 24px',
        fontFamily: F.mono,
        fontSize,
        lineHeight: 1.72,
        color: '#dce7f7',
      }}
    >
      {children}
    </div>
  </Glass>
);

export const CodeLine = ({
  n,
  children,
  highlight = false,
}: {
  n?: number;
  children: ReactNode;
  highlight?: boolean;
}) => (
  <div
    style={{
      display: 'flex',
      gap: 18,
      background: highlight ? 'rgba(34,211,238,0.08)' : undefined,
      boxShadow: highlight ? 'inset 2px 0 0 #22d3ee' : undefined,
      padding: highlight ? '0 10px 0 8px' : undefined,
      margin: highlight ? '0 -10px 0 -8px' : undefined,
      borderRadius: 4,
    }}
  >
    {n !== undefined ? (
      <span
        style={{
          width: 22,
          textAlign: 'right',
          color: '#3d4d66',
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        {n}
      </span>
    ) : null}
    <span style={{whiteSpace: 'pre'}}>{children}</span>
  </div>
);

export const SceneFade = ({
  children,
  duration,
  fadeIn = 8,
  fadeOut = 10,
}: {
  children: ReactNode;
  duration: number;
  fadeIn?: number;
  fadeOut?: number;
}) => {
  const frame = useCurrentFrame();
  const opacity = Math.min(
    interpolate(frame, [0, fadeIn], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
    interpolate(frame, [duration - fadeOut, duration], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );
  return <AbsoluteFill style={{opacity}}>{children}</AbsoluteFill>;
};
