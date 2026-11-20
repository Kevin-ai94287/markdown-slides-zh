# Markdown一键转课件（markdown-slides-zh）

把中文 Markdown 讲稿在本机转成课件。默认导出 PDF，也可以导出 HTML、PPTX 或逐页 PNG。附两套自写中文主题。版本 1.0.0。作者：Kevin技能工坊。

商品名是「Markdown一键转课件」。请不要把 Marp 或 Marpit 当作本工具的名称。实现会调用 MIT 许可的 `@marp-team/marp-cli`，但本仓库不是 Marp team 的官方产品，也不表示对方认可或背书。自写命令行、主题、说明和示例使用 MIT；上游依赖仍使用各自许可证，详见 [NOTICE](NOTICE)。

截至 2026-11-20，这个工具还是草稿，没有上架，也不能在商店购买。下面只说明怎样在自己的电脑上安装和运行。

## 安装

需要 Node.js 20.19 或更新版本。导出 PDF、PPTX、PNG 时，还需要本机已经安装 Google Chrome、Chromium、Microsoft Edge 或 Firefox。本包不附带浏览器。只导出 HTML 时可以不装浏览器。

```bash
cd scripts
npm ci
cd ..
node scripts/convert.mjs --help
```

首次安装需要联网。转换在本机完成，不上传讲稿。国内镜像可写成 `npm ci --registry=https://registry.npmmirror.com`。

自动找不到浏览器时，用 `--browser-path` 指向可执行文件，例如 macOS 上的 `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`。

## 运行

在本目录执行：

```bash
node scripts/convert.mjs examples/training.md
node scripts/convert.mjs examples/training.md --format html
node scripts/convert.mjs examples/pitch.md --format pptx --theme zh-simple
node scripts/convert.mjs examples/weekly.md --format png
node scripts/convert.mjs examples -o /tmp/slides-demo --format html
```

讲稿用单独一行的 `---` 分页，开头可以写 YAML 头。没有分页符的长文会挤在一页里。

支持 `.md` 和 `.markdown`。目录会递归处理并保留相对路径。默认输出在输入旁边：文件 `讲稿.md` 对应 `讲稿_课件/`，目录 `稿子` 对应 `稿子_课件/`。`-o` 不能和输入目录相同。

- `pdf`（默认）：带书签的 PDF。
- `html`：浏览器里翻页的单文件课件。
- `pptx`：由页面渲染得到的演示文件，不是可以随意改母版的源稿。
- `png`：每一页一张 PNG，放在以文稿名命名的子目录里。
- `all`：四种都生成。

默认主题是 `themes/zh-business.css`。`--theme zh-simple` 使用白底主题，也可以传入自己的 CSS 路径。已有产物默认跳过，`--overwrite` 重做。输出目录里的 `conversion-report.json` 记录成功、失败、跳过和路径。退出码：0 没有失败，1 至少有一个文件失败，2 是参数或环境错误。

除非你明确要嵌入本地图片，否则不要加 `--allow-local-files`。

## 限制

- 导出 PDF、PPTX、PNG 必须能启动本机浏览器。HTML 不需要。
- 中文显示成方框时，先安装苹方、微软雅黑或 Noto Sans CJK SC 一类字体再导出。
- 主题引用上游内置的 `default` 主题。该主题随 `@marp-team/marp-core` 安装，不在本目录里另附一份。
- 公式功能会带上传递依赖 `mathjax-full@3.2.2`（Apache-2.0）。npm 已提示这个包名被后续版本取代，但本 lockfile 仍锁定 3.2.2，没有改到别的版本。
- 本仓库在 2026-11-20 只用 Linux、Node.js 22.23.4 和本机 Google Chrome 跑过测试。没有在 macOS 或 Windows 上复测。
- 不上传文件，也没有账号或支付接口。

## 测试

```bash
cd scripts
npm ci
npm test
```

`npm test` 运行 `tests/*.test.mjs`。覆盖错误参数、HTML、PDF、PPTX、PNG、两套主题、跳过与覆盖，并检查仓库文本。浏览器导出若失败，测试不会被算作通过。测试写到临时目录。

## 示例

- `examples/training.md`：虚构的新人周报写法课。
- `examples/pitch.md`：虚构的社区烘焙店会员卡路演。
- `examples/weekly.md`：虚构的运营组周会稿，里面的数字只属于这个故事。

## 许可证

- 自写代码、两套主题、说明、测试和示例：MIT，版权人 Kevin技能工坊。见 [LICENSE](LICENSE)。
- 上游命令行：MIT，© 2018 Marp team。Puppeteer（导出 PDF / PPTX / PNG）为 Apache-2.0，© 2017 Google Inc. 写在其 LICENSE 附录中。argparse 3.0.4 为 PSF-2.0，argparse 2.0.1 为 Python-2.0。
- 本目录附带的 [licenses/](licenses/) 是这些上游文本的副本，用来保留署名。见 [NOTICE](NOTICE)。
