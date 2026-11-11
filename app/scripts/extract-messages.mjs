import ts from 'typescript';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const messages = new Set();
async function walk(directory) {
  for (const file of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, file.name);
    if (file.isDirectory()) { if (!['tests', 'i18n'].includes(file.name)) await walk(path); continue; }
    if (!/\.tsx?$/.test(path) || path.endsWith('.test.ts')) continue;
    const text = await readFile(path, 'utf8');
    const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = node => {
      let value;
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) value = node.text;
      else if ([ts.SyntaxKind.TemplateHead, ts.SyntaxKind.TemplateMiddle, ts.SyntaxKind.TemplateTail].includes(node.kind)) value = node.text;
      else if (ts.isJsxText(node)) value = node.text.replace(/\s+/g, ' ');
      if (typeof value === 'string' && /[А-Яа-яЁё]/.test(value)) {
        value = value.trim();
        if (value && value.length < 2200 && !value.includes('CREATE TABLE')) messages.add(value);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
}
await walk('src');
await writeFile('src/i18n/messages/source.json', JSON.stringify([...messages].sort(), null, 2) + '\n');
console.log(`Extracted ${messages.size} game and interface messages.`);
