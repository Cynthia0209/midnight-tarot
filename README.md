# Midnight Tarot

一个移动端优先、包含完整 78 张 Rider–Waite–Smith 牌组的沉浸式 AI 塔罗体验。

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## OpenAI API

Create `.env.local`:

```bash
OPENAI_API_KEY=your_api_key_here
```

可从 `.env.example` 复制配置。默认模型为 `gpt-5.4-mini`，也可通过 `OPENAI_MODEL` 覆盖。没有 API Key 时会根据真实抽到的牌生成本地降级解读。

## V1

- 6 种牌阵与 78 张正逆位牌
- Web Crypto 固定单次牌序
- GSAP 洗牌、扇形展开和落牌动画
- 逐张揭示与 OpenAI Responses API 流式解读
- 本地历史、分享图片、静音和减少动画模式

## 牌面来源

牌面下载自 Wikimedia Commons 的 “Rider-Waite-Smith tarot deck (Geldard)” 分类。原始 1909 年 RWS 作品在美国及作者逝世后 70 年保护期的司法辖区属于公版；逐张来源记录位于 `public/cards/SOURCE.md`。

重新下载素材：

```bash
node scripts/download-tarot-assets.mjs
```
