import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'scripts', 'convert.mjs');
const fixture = path.join(root, 'tests', 'fixtures', 'deck.md');

function run(args) {
  return spawnSync(process.execPath, [cli, ...args], {
    encoding: 'utf8',
    cwd: root,
    timeout: 180000,
  });
}

function readReport(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'conversion-report.json'), 'utf8'));
}

test('--help 退出码为 0', () => {
  const result = run(['--help']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /用法/);
});

test('缺少输入、未知参数、错误格式都以退出码 2 结束', () => {
  assert.equal(run([]).status, 2);
  assert.equal(run(['--format', 'doc']).status, 2);
  assert.equal(run(['--theme']).status, 2);
  assert.match(run(['--not-a-flag', fixture]).stderr, /未知选项/);
});

test('不存在的路径、非 Markdown、空目录、输出目录与输入相同', () => {
  assert.equal(run(['/tmp/does-not-exist-markdown-slides.md']).status, 2);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slides-arg-'));
  fs.writeFileSync(path.join(dir, 'notes.txt'), 'hello');
  assert.equal(run([path.join(dir, 'notes.txt')]).status, 2);
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'slides-empty-'));
  assert.equal(run([empty]).status, 2);
  assert.equal(run([empty, '-o', empty]).status, 2);
  assert.equal(run([fixture, '--theme', 'missing-theme']).status, 2);
});

test('最小样例导出 HTML，重复运行会跳过，覆盖会重写', { timeout: 180000 }, () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'slides-html-'));
  const html = run([fixture, '-o', out, '--format', 'html']);
  assert.equal(html.status, 0, html.stderr);
  const htmlFile = path.join(out, 'deck.html');
  const htmlText = fs.readFileSync(htmlFile, 'utf8');
  assert.match(htmlText, /最小课件样例/);
  assert.match(htmlText, /一条虚构要点/);
  const report = readReport(out);
  assert.equal(report.success, 1);
  assert.equal(report.failed, 0);
  assert.equal(report.marp_cli, '4.5.1');

  const again = run([fixture, '-o', out, '--format', 'html']);
  assert.equal(again.status, 0, again.stderr);
  assert.equal(readReport(out).skipped, 1);

  const before = fs.statSync(htmlFile).mtimeMs;
  const overwritten = run([fixture, '-o', out, '--format', 'html', '--overwrite', '--theme', 'zh-simple']);
  assert.equal(overwritten.status, 0, overwritten.stderr);
  assert.ok(fs.statSync(htmlFile).mtimeMs >= before);
});

test('最小样例导出 PDF、PPTX 和 PNG', { timeout: 180000 }, () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'slides-bin-'));
  const pdf = run([fixture, '-o', out, '--format', 'pdf']);
  assert.equal(pdf.status, 0, pdf.stderr);
  assert.equal(fs.readFileSync(path.join(out, 'deck.pdf')).subarray(0, 4).toString(), '%PDF');

  const pptx = run([fixture, '-o', out, '--format', 'pptx']);
  assert.equal(pptx.status, 0, pptx.stderr);
  assert.equal(fs.readFileSync(path.join(out, 'deck.pptx')).subarray(0, 2).toString(), 'PK');

  const png = run([fixture, '-o', out, '--format', 'png']);
  assert.equal(png.status, 0, png.stderr);
  const pngDir = path.join(out, 'deck_png');
  const names = fs.readdirSync(pngDir).filter((name) => name.endsWith('.png')).sort();
  assert.ok(names.length >= 2, names.join(','));
  assert.equal(fs.readFileSync(path.join(pngDir, names[0])).subarray(0, 4).toString('hex'), '89504e47');
  assert.equal(readReport(out).failed, 0);
});

test('示例讲稿可以导出 HTML', { timeout: 180000 }, () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'slides-example-'));
  const result = run([path.join(root, 'examples', 'training.md'), '-o', out, '--format', 'html', '--theme', 'zh-business']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(fs.readFileSync(path.join(out, 'training.html'), 'utf8'), /新人入职第一课/);
});
