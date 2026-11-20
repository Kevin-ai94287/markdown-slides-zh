---
name: markdown-slides-zh
display_name: Markdown一键转课件
display_name_en: Markdown to Lecture Slides
description: 在本机把中文 Markdown 大纲转成可投影的课件，支持 HTML、PDF、PPTX 和逐页 PNG，附中文主题，可目录批量。
description_zh: 本地将 Markdown 讲稿转为 HTML/PDF/PPTX/PNG 课件，默认中文商务主题，支持目录批量与覆盖保护。导出 PDF、PPTX、PNG 需本机已安装 Chrome 或 Chromium。
description_en: Convert local Mandarin Markdown outlines into HTML, PDF, PPTX or per-slide PNG decks, with Chinese themes and folder batch mode. PDF/PPTX/PNG need a local Chrome or Chromium.
version: 1.0.0
author: Kevin技能工坊
---

# Markdown一键转课件

用户需要把中文 Markdown 大纲、讲稿、路演稿转成可投影或可分发的课件（HTML、PDF、PPTX，或逐页 PNG）时，使用此技能。按 [README.md](README.md) 检查 **Node.js 20.19+**、依赖，以及导出 PDF / PPTX / PNG 时本机的 Chrome / Chromium / Edge / Firefox。使用 `scripts/convert.mjs`。商品名是「Markdown一键转课件」，不要写成 Marp 或 Marpit。本技能不是 Marp 官方产品。

确定输入路径（单个 `.md` / `.markdown` 或目录；目录递归处理）。默认使用本包主题 `themes/zh-business.css`，默认导出 **PDF**。需要网页版、演示文稿或图片时加 `--format html`、`--format pptx`、`--format png` 或 `--format all`。另一种中文简洁主题用 `--theme zh-simple`。未经用户同意不要加 `--overwrite`，默认跳过已有产物。除非用户明确要求读取本地图片或附件，否则不要加 `--allow-local-files`。

执行结束后读取输出目录的 `conversion-report.json`，报告成功、失败、跳过数及每个文件的产物路径。输入须是 Marp 风格的 Markdown（`---` 分页，可选 YAML 头）。所有处理在本机完成，不上传文档；首次需联网 `npm install`。导出 PDF / PPTX / PNG 必须能启动本机浏览器；仅导出 HTML 时可以不装浏览器。

示例（在技能目录）：

```bash
node scripts/convert.mjs "入职培训.md"
node scripts/convert.mjs "课件目录" -o "课件结果" --format all
node scripts/convert.mjs "路演稿.md" --format pptx --theme zh-simple
```
