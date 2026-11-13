export const C = {
  bg0: '#04060b',
  bg1: '#080e1c',
  bg2: '#0c1526',
  ink: '#e9f0fb',
  soft: '#c3d2e8',
  muted: '#7d8ea9',
  dim: '#4d5d76',
  cyan: '#22d3ee',
  cyanSoft: '#7dd3fc',
  violet: '#8b5cf6',
  violetSoft: '#c4b5fd',
  green: '#34d399',
  greenSoft: '#6ee7b7',
  red: '#fb7185',
  redSoft: '#fda4af',
  amber: '#fbbf24',
  line: 'rgba(132, 176, 235, 0.16)',
  lineSoft: 'rgba(132, 176, 235, 0.09)',
  glass: 'rgba(11, 18, 33, 0.74)',
  glassHi: 'rgba(22, 34, 58, 0.82)',
} as const;

export const F = {
  sans: '"PingFang SC", "Hiragino Sans GB", "Helvetica Neue", Helvetica, Arial, sans-serif',
  display:
    '"SF Pro Display", "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", Helvetica, Arial, sans-serif',
  mono: '"SF Mono", "Menlo", "Monaco", "Roboto Mono", monospace',
} as const;

export const panelStyle: React.CSSProperties = {
  background:
    'linear-gradient(180deg, rgba(20, 32, 55, 0.86) 0%, rgba(9, 15, 28, 0.86) 100%)',
  border: '1px solid rgba(125, 170, 240, 0.16)',
  borderRadius: 20,
  boxShadow:
    '0 28px 70px rgba(0, 0, 0, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.055)',
};

export const monoLabel: React.CSSProperties = {
  fontFamily: F.mono,
  fontSize: 15,
  letterSpacing: 4,
  textTransform: 'uppercase',
  color: C.muted,
};

export const tabular: React.CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  fontFeatureSettings: '"tnum" 1',
};

export const gradText = (from: string, to: string): React.CSSProperties => ({
  backgroundImage: `linear-gradient(96deg, ${from} 0%, ${to} 100%)`,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
});
