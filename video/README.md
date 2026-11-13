# DSH Fastboot · 项目介绍动画

用 Remotion 制作的约 2 分钟 1080P 动画，介绍 DSH Fastboot 解决的问题、实现原理和实测收益。

## 成品

- `out/dsh-fastboot.mp4` — 1920×1080 / 30 fps / 114 s / H.264 + AAC
- `STORYBOARD.md` — 分镜、逐场文案、视觉规范与数据来源

## 封面

- `out/cover-4x3.png` — 1440×1080，B站首页 4:3 横版封面
- 源码：`src/covers/Cover.tsx`；修改后重新渲染：

```sh
npx remotion still src/index.ts Cover43 out/cover-4x3.png --frame=0 \
  --browser-executable "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --gl angle
```

## 结构

```
src/
  timeline.ts        场景时间线（9 个场景，共 3600 帧）
  theme.ts           色彩、字体、玻璃卡片
  Backdrop.tsx       网格、光晕、噪点、粒子
  Hud.tsx            进度线、章节号、时间码
  CutFX.tsx          场景切换光带
  ui.tsx             标题、遮罩入场、计数器、代码卡
  scenes/
    S1Intro ... S9Outro
scripts/make-soundtrack.py  生成 114s 原创配乐（鼓/贝斯/琶音/铺底）
public/soundtrack.wav
```

## 预览 / 渲染

```sh
cd video
npm install
npm run studio          # Remotion Studio

# 本机已装 Chrome 时，直接指定可执行文件，避免下载 Headless Shell
npx remotion render src/index.ts DshFastboot out/dsh-fastboot.mp4 \
  --browser-executable "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --gl angle --concurrency=4 --codec h264 --crf 18
```

重新生成音频：

```sh
python3 scripts/make-soundtrack.py
```

## 数据

图表数据来自 `DSH 启动速度对比.xlsx`（2026-11-09，macOS arm64，DSH 0.2.2-rc.1，Web profile，暖缓存，启停各 4 轮交替，取中位数）。精确值见 `STORYBOARD.md` 的数据附录。

主结果：Host ready 8.14 s → 4.37 s（−46.3%）；把首次 MCP 初始化也移出关键路径后 2.22 s，距离「停用全部 MCP」的 2.15 s 只差 0.07 s。

## 说明

- 视频中的所有图形由 React/Remotion 绘制，无外部图片素材；字体使用本机 PingFang SC / SF Mono。
- 动画只使用 `useCurrentFrame()` 驱动的确定性插值，可逐帧复现。
- 音频为脚本原创合成：100 BPM、Am–F–C–G、底鼓/军鼓/踩镲/贝斯/琶音/铺底 + 转场 whoosh，无版权素材。
