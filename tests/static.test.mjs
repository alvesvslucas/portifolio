import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const attributes = source => Object.fromEntries(
  [...source.matchAll(/([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)]
    .map(match => [match[1].toLowerCase(), match[2] ?? match[3]])
);
const elements = [...html.matchAll(/<([a-z][\w:-]*)\b([^<>]*)>/gi)]
  .map(match => ({ tag: match[1].toLowerCase(), attrs: attributes(match[2]) }));
const ids = elements.flatMap(({ attrs }) => attrs.id ? [attrs.id] : []);
const links = elements.filter(({ tag, attrs }) => tag === 'a' && attrs.href).map(({ attrs }) => attrs.href);
const isExternal = value => /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value);

function localPath(value, sourceFile) {
  if (!value || isExternal(value) || value.startsWith('#')) return null;
  const resource = decodeURIComponent(value.split(/[?#]/, 1)[0]).replace(/\\([ ()])/g, '$1');
  if (!resource) return null;
  const destination = path.resolve(value.startsWith('/') ? root : path.dirname(sourceFile), resource.replace(/^\/+/, ''));
  const relative = path.relative(root, destination);
  assert.ok(relative !== '..' && !relative.startsWith('..' + path.sep), 'Recurso local fora da pasta do projeto.');
  return destination;
}

function requireLocalResource(value, sourceFile) {
  const destination = localPath(value, sourceFile);
  if (!destination) return;
  assert.ok(fs.existsSync(destination), 'Recurso local referenciado não foi encontrado.');
  // Confere a grafia exata, inclusive em sistemas de arquivos sem distinção de maiúsculas.
  let directory = root;
  for (const segment of path.relative(root, destination).split(path.sep).filter(Boolean)) {
    assert.ok(fs.readdirSync(directory).includes(segment), 'Grafia de um caminho local difere do arquivo existente.');
    directory = path.join(directory, segment);
  }
}

test('IDs são únicos e âncoras internas têm destino', () => {
  assert.ok(new Set(ids).size === ids.length, 'Há IDs repetidos na página.');
  const known = new Set(ids);
  for (const value of links.filter(value => value.startsWith('#'))) {
    assert.ok(value.length > 1 && known.has(decodeURIComponent(value.slice(1))), 'Uma âncora interna não tem destino.');
  }
});

test('recursos locais de HTML e CSS existem com a grafia correta', () => {
  const entry = path.join(root, 'index.html');
  for (const { attrs } of elements) {
    for (const name of ['src', 'href', 'poster']) {
      if (attrs[name]) requireLocalResource(attrs[name], entry);
    }
  }
  const cssFiles = elements.filter(({ tag, attrs }) => tag === 'link' && attrs.rel === 'stylesheet')
    .map(({ attrs }) => localPath(attrs.href, entry)).filter(Boolean);
  for (const file of cssFiles) {
    const css = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const match of css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi)) {
      requireLocalResource((match[1] ?? match[2] ?? match[3]).trim(), file);
    }
  }
});

test('links de contato mantêm formato e destino consistentes', () => {
  const whatsapp = links.filter(value => /^https:\/\/wa\.me\//i.test(value)).map(value => new URL(value).pathname.slice(1));
  assert.ok(whatsapp.length > 0 && whatsapp.every(number => /^[1-9]\d{7,14}$/.test(number)), 'Um link de WhatsApp não usa somente dígitos no formato internacional.');
  assert.ok(new Set(whatsapp).size === 1, 'Os links de WhatsApp têm destinos divergentes.');

  const emails = links.filter(value => /^mailto:/i.test(value))
    .map(value => decodeURIComponent(value.slice(7).split('?')[0]).toLowerCase());
  assert.ok(emails.length > 0 && new Set(emails).size === 1, 'Os links de e-mail têm destinos divergentes.');
  for (const match of html.matchAll(/<a\b([^>]+)>([\s\S]*?)<\/a>/gi)) {
    const href = attributes(match[1]).href ?? '';
    if (!/^mailto:/i.test(href)) continue;
    const visible = match[2].replace(/<[^>]+>/g, '').trim().toLowerCase();
    if (visible.includes('@')) {
      assert.ok(visible === decodeURIComponent(href.slice(7).split('?')[0]).toLowerCase(), 'O texto visível de e-mail difere do destino.');
    }
  }

  const profile = value => new URL(value).pathname.replace(/\/+$/, '').toLowerCase();
  const linkedin = links.filter(value => /^https:\/\/(?:www\.)?linkedin\.com\/in\//i.test(value)).map(profile);
  const documented = [...readme.matchAll(/https:\/\/(?:www\.)?linkedin\.com\/in\/[^\s)]+/gi)].map(match => profile(match[0]));
  assert.ok(documented.length === 1 && linkedin.length > 0 && linkedin.every(value => value === documented[0]), 'Os destinos de LinkedIn divergem da referência documentada.');
});

