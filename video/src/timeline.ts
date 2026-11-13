export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export type SceneSpec = {
  id: string;
  label: string;
  from: number;
  duration: number;
};

export const SCENES: SceneSpec[] = [
  {id: 'intro', label: '开场', from: 0, duration: 240},
  {id: 'problem', label: '问题', from: 240, duration: 420},
  {id: 'insight', label: '洞察', from: 660, duration: 480},
  {id: 'loader', label: '机制 · 非阻塞', from: 1140, duration: 480},
  {id: 'protocol', label: '机制 · 协议', from: 1620, duration: 420},
  {id: 'reload', label: '机制 · 热重载', from: 2040, duration: 300},
  {id: 'results', label: '实测', from: 2340, duration: 480},
  {id: 'floor', label: '逼近地板', from: 2820, duration: 360},
  {id: 'outro', label: '收尾', from: 3180, duration: 240},
];

export const TOTAL_FRAMES = 3420;

export const scene = (id: string) => {
  const found = SCENES.find((s) => s.id === id);
  if (!found) throw new Error(`unknown scene ${id}`);
  return found;
};
