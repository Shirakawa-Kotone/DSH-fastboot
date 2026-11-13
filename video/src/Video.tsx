import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import {Backdrop} from './Backdrop';
import {CutFX} from './CutFX';
import {Hud} from './Hud';
import {SCENES} from './timeline';
import {S1Intro} from './scenes/S1Intro';
import {S2Problem} from './scenes/S2Problem';
import {S3Insight} from './scenes/S3Insight';
import {S4Loader} from './scenes/S4Loader';
import {S5Protocol} from './scenes/S5Protocol';
import {S6Reload} from './scenes/S6Reload';
import {S7Results} from './scenes/S7Results';
import {S8Floor} from './scenes/S8Floor';
import {S9Outro} from './scenes/S9Outro';
import {Placeholder} from './scenes/Placeholder';

const registry: Record<string, React.ComponentType> = {
  intro: S1Intro,
  problem: S2Problem,
  insight: S3Insight,
  loader: S4Loader,
  protocol: S5Protocol,
  reload: S6Reload,
  results: S7Results,
  floor: S8Floor,
  outro: S9Outro,
};

export const DshFastboot = () => (
  <AbsoluteFill style={{backgroundColor: '#04060b'}}>
    <Backdrop />
    <Audio src={staticFile('soundtrack.wav')} volume={1} />
    {SCENES.map((s) => {
      const Comp = registry[s.id] ?? (() => <Placeholder label={s.label} />);
      return (
        <Sequence key={s.id} from={s.from} durationInFrames={s.duration}>
          <Comp />
        </Sequence>
      );
    })}
    <CutFX />
    <Hud />
  </AbsoluteFill>
);
