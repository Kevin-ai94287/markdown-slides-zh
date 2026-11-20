#!/usr/bin/env node
/**
 * Markdown一键转课件 — 本机把中文 Markdown 讲稿转成 HTML/PDF/PPTX/PNG。
 * 通过固定版本的 @marp-team/marp-cli 调用，不上传文件。
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = path.resolve(__dirname, '..');
const REPORT_NAME = 'conversion-report.json';
const EXT = new Set(['.md', '.markdown']);
const THEMES = {
  'zh-business': path.join(SKILL_ROOT, 'themes', 'zh-business.css'),
  'zh-simple': path.join(SKILL_ROOT, 'themes', 'zh-simple.css'),
};
const FORMATS = ['html', 'pdf', 'pptx', 'png'];

function usage() {
  return `用法：node scripts/convert.mjs <文件或目录> [选项]

把中文 Markdown 讲稿转成本机可投影或分发的课件（默认 PDF）。
可选导出 HTML、PPTX 或逐页 PNG。全部在本机完成，不上传内容。
导出 PDF / PPTX / PNG 需要本机已安装 Chrome、Chromium、Edge 或 Firefox。

位置参数：
  输入                Markdown 文件，或递归处理 .md/.markdown 的目录

可选参数：
  -h, --help          显示帮助并退出
  -o, --output-dir    输出目录；默认在输入旁创建「<名称>_课件」
  --format <fmt>      pdf（默认）| html | pptx | png | all
  --theme <name|path> 主题：zh-business（默认）、zh-simple，或 CSS 文件路径
  --browser-path <p>  浏览器可执行文件路径（自动找不到时再指定）
  --allow-local-files 允许讲稿读取本地文件（有安全风险，需明确同意）
  --overwrite         覆盖已有产物（默认跳过已完成的文件）

退出码：0 无失败；1 至少一个文件失败；2 参数或环境错误。
`;
}

function fail(code, msg) {
  console.error(msg);
  process.exit(code);
}

function parseArgs(argv) {
  const args = {
    input: null,
    outputDir: null,
    format: 'pdf',
    theme: 'zh-business',
    browserPath: null,
    allowLocalFiles: false,
    overwrite: false,
  };
  const list = [...argv];
  while (list.length) {
    const a = list.shift();
    if (a === '-h' || a === '--help') {
      process.stdout.write(usage());
      process.exit(0);
    }
    if (a === '-o' || a === '--output-dir') {
      args.outputDir = list.shift();
      if (!args.outputDir) fail(2, '参数错误：--output-dir 需要目录路径');
      continue;
    }
    if (a === '--format') {
      args.format = (list.shift() || '').toLowerCase();
      if (![...FORMATS, 'all'].includes(args.format)) {
        fail(2, '参数错误：--format 只能是 html、pdf、pptx、png 或 all');
      }
      continue;
    }
    if (a === '--theme') {
      args.theme = list.shift();
      if (!args.theme) fail(2, '参数错误：--theme 需要主题名或 CSS 路径');
      continue;
    }
    if (a === '--browser-path') {
      args.browserPath = list.shift();
      if (!args.browserPath) fail(2, '参数错误：--browser-path 需要浏览器可执行文件路径');
      continue;
    }
    if (a === '--allow-local-files') {
      args.allowLocalFiles = true;
      continue;
    }
    if (a === '--overwrite') {
      args.overwrite = true;
      continue;
    }
    if (a.startsWith('-')) fail(2, '参数错误：未知选项 ' + a);
    if (args.input) fail(2, '参数错误：只能指定一个输入路径');
    args.input = a;
  }
  if (!args.input) fail(2, '参数错误：请提供 Markdown 文件或目录\n\n' + usage());
  return args;
}

function ensureNode() {
  const parts = process.versions.node.split('.').map((x) => Number(x));
  const major = parts[0];
  const minor = parts[1] || 0;
  if (Number.isNaN(major) || major < 20 || (major === 20 && minor < 19)) {
    fail(
      2,
      `环境错误：需要 Node.js 20.19 或更新版，当前为 ${process.version}。请升级后重试。`
    );
  }
}

function marpBin() {
  const local = path.join(__dirname, 'node_modules', '@marp-team', 'marp-cli', 'marp-cli.js');
  const alt = path.join(__dirname, 'node_modules', '.bin', 'marp');
  if (fs.existsSync(local)) return { cmd: process.execPath, baseArgs: [local] };
  if (fs.existsSync(alt)) return { cmd: alt, baseArgs: [] };
  fail(
    2,
    '环境错误：未找到 @marp-team/marp-cli。请在 scripts 目录执行：\n  npm install\n（需要联网一次）'
  );
}

function resolveTheme(theme) {
  if (THEMES[theme]) {
    const p = THEMES[theme];
    if (!fs.existsSync(p)) fail(2, '环境错误：找不到主题文件 ' + p);
    return p;
  }
  const abs = path.resolve(theme);
  if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs;
  fail(2, '参数错误：主题须是 zh-business、zh-simple，或已存在的 CSS 文件：' + theme);
}

function findInputs(src) {
  const st = fs.statSync(src);
  if (st.isFile()) {
    if (!EXT.has(path.extname(src).toLowerCase())) {
      fail(2, '参数错误：输入文件须为 .md 或 .markdown');
    }
    return [path.resolve(src)];
  }
  if (!st.isDirectory()) fail(2, '参数错误：输入既不是文件也不是目录');
  const out = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      if (name.startsWith('.')) continue;
      const p = path.join(dir, name);
      const s = fs.statSync(p);
      if (s.isDirectory()) walk(p);
      else if (s.isFile() && EXT.has(path.extname(name).toLowerCase())) out.push(p);
    }
  };
  walk(src);
  return out.sort();
}

function defaultOutDir(src) {
  const abs = path.resolve(src);
  const st = fs.statSync(abs);
  if (st.isFile()) {
    const base = path.basename(abs, path.extname(abs));
    return path.join(path.dirname(abs), base + '_课件');
  }
  return abs.replace(/[/\\]+$/, '') + '_课件';
}

function formatsOf(fmt) {
  if (fmt === 'all') return [...FORMATS];
  return [fmt];
}

function needsBrowser(formats) {
  return formats.some((f) => f !== 'html');
}

function pngDirFor(outDir, relBase) {
  return path.join(outDir, relBase + '_png');
}

function pngOutputArg(dir) {
  // marp --images 需要带 .png 的文件模板，才会写成 slide.001.png
  return path.join(dir, 'slide.png');
}

function targetsFor(outDir, relBase, formats) {
  const map = {};
  for (const f of formats) {
    if (f === 'png') map[f] = pngDirFor(outDir, relBase);
    else map[f] = path.join(outDir, relBase + '.' + f);
  }
  return map;
}

function pngComplete(dir) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return false;
  return fs.readdirSync(dir).some((n) => /\.png$/i.test(n));
}

function isComplete(format, target) {
  if (format === 'png') return pngComplete(target);
  return fs.existsSync(target) && fs.statSync(target).isFile() && fs.statSync(target).size > 0;
}

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

function runMarp(bin, inputFile, outputPath, format, theme, browserPath, allowLocalFiles) {
  const args = [
    ...bin.baseArgs,
    inputFile,
    '--no-config',
    '--theme',
    theme,
    '-o',
    outputPath,
  ];
  if (format === 'pdf') {
    args.push('--pdf', '--pdf-outlines');
  } else if (format === 'pptx') {
    args.push('--pptx');
  } else if (format === 'png') {
    args.push('--images', 'png');
  }
  if (browserPath) args.push('--browser-path', browserPath);
  if (allowLocalFiles) args.push('--allow-local-files');
  const r = spawnSync(bin.cmd, args, { encoding: 'utf8', timeout: 180000 });
  if (r.error) return { ok: false, error: String(r.error) };
  if (r.status !== 0) {
    const detail = (r.stderr || r.stdout || 'marp 退出码 ' + r.status).trim();
    const hint =
      format !== 'html' && /browser|chrome|chromium|executable/i.test(detail)
        ? '\n请安装 Google Chrome、Chromium、Edge 或 Firefox，或使用 --browser-path 指定可执行文件。'
        : '';
    return { ok: false, error: detail + hint };
  }
  const checkPath = format === 'png' ? path.dirname(outputPath) : outputPath;
  if (!isComplete(format, checkPath)) {
    return { ok: false, error: '命令已结束，但未找到产物：' + checkPath };
  }
  return { ok: true };
}

function main() {
  ensureNode();
  const args = parseArgs(process.argv.slice(2));
  const src = path.resolve(args.input);
  if (!fs.existsSync(src)) fail(2, '参数错误：找不到输入路径 ' + src);

  const outDir = path.resolve(args.outputDir || defaultOutDir(src));
  if (path.resolve(src) === outDir) fail(2, '参数错误：输出目录不能与输入目录相同');

  const inputs = findInputs(src);
  if (!inputs.length) fail(2, '参数错误：未找到任何 .md / .markdown 文件');

  const theme = resolveTheme(args.theme);
  if (args.browserPath && !fs.existsSync(args.browserPath)) {
    fail(2, '参数错误：找不到浏览器：' + args.browserPath);
  }

  const bin = marpBin();
  const formats = formatsOf(args.format);
  if (needsBrowser(formats) && !args.browserPath) {
    console.log('提示：导出 PDF / PPTX / PNG 需要本机浏览器；若失败请加 --browser-path。');
  }
  ensureDir(outDir);

  const srcRoot = fs.statSync(src).isDirectory() ? src : path.dirname(src);
  const started = Date.now();
  const results = [];
  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of inputs) {
    const rel = path.relative(srcRoot, file);
    const relBase = rel.replace(/\.(md|markdown)$/i, '').split(path.sep).join('/');
    const targets = targetsFor(outDir, relBase, formats);
    const parent = path.dirname(Object.values(targets)[0]);
    ensureDir(parent);

    const missing = formats.filter((f) => !isComplete(f, targets[f]));
    if (!args.overwrite && missing.length === 0) {
      skipped += 1;
      results.push({ input: file, status: 'skipped', outputs: targets });
      console.log('跳过（已存在）：' + rel);
      continue;
    }

    const need = args.overwrite ? formats : missing;
    const produced = {};
    let err = null;
    for (const f of need) {
      if (f === 'png') ensureDir(targets[f]);
      const r = runMarp(
        bin,
        file,
        f === 'png' ? pngOutputArg(targets[f]) : targets[f],
        f,
        theme,
        args.browserPath,
        args.allowLocalFiles
      );
      if (!r.ok) {
        err = r.error;
        break;
      }
      produced[f] = targets[f];
    }
    if (err) {
      failed += 1;
      results.push({ input: file, status: 'failed', error: err, outputs: produced });
      console.error('失败：' + rel + ' — ' + err);
    } else {
      ok += 1;
      for (const f of formats) {
        if (!produced[f] && isComplete(f, targets[f])) produced[f] = targets[f];
      }
      results.push({ input: file, status: 'ok', outputs: { ...targets, ...produced } });
      console.log('完成：' + rel + ' → ' + need.map((f) => path.basename(targets[f])).join(', '));
    }
  }

  const report = {
    skill: 'markdown-slides-zh',
    version: '1.0.0',
    node: process.version,
    marp_cli: '4.5.1',
    format: args.format,
    theme,
    input: src,
    output_dir: outDir,
    total: inputs.length,
    success: ok,
    skipped,
    failed,
    elapsed_ms: Date.now() - started,
    files: results,
  };
  const reportPath = path.join(outDir, REPORT_NAME);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(
    `汇总：成功 ${ok}，跳过 ${skipped}，失败 ${failed}，用时 ${report.elapsed_ms} ms。报告：${reportPath}`
  );
  process.exit(failed ? 1 : 0);
}

main();
