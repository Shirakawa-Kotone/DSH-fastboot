import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('png');
Config.setCodec('h264');
Config.setCrf(18);
Config.setPixelFormat('yuv420p');
Config.setConcurrency(6);
Config.setChromiumOpenGlRenderer('angle');
Config.setOverwriteOutput(true);
