import {Composition} from 'remotion';
import {DshFastboot} from './Video';
import {Cover43} from './covers/Cover43';
import {FPS, HEIGHT, TOTAL_FRAMES, WIDTH} from './timeline';

export const RemotionRoot = () => (
  <>
    <Composition
      id="DshFastboot"
      component={DshFastboot}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    <Composition
      id="Cover43"
      component={Cover43}
      durationInFrames={1}
      fps={30}
      width={1440}
      height={1080}
    />
  </>
);
