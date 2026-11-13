import {AbsoluteFill} from 'remotion';
import {C, F} from '../theme';

export const Placeholder = ({label}: {label: string}) => (
  <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
    <div style={{fontFamily: F.mono, color: C.dim, fontSize: 18, letterSpacing: 6}}>
      {label.toUpperCase()}
    </div>
  </AbsoluteFill>
);
