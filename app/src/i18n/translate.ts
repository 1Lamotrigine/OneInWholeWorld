import en from './messages/en.json';
import de from './messages/de.json';
import es from './messages/es.json';
import it from './messages/it.json';

export const languages = { ru: 'Русский', en: 'English', de: 'Deutsch', es: 'Español', it: 'Italiano' } as const;
export type Language = keyof typeof languages;
const dictionaries: Record<Exclude<Language, 'ru'>, Record<string, string>> = { en, de, es, it };
type Prefix = { children: Map<string, Prefix>; key?: string };
const folded = new Map<Language, Record<string, string>>();
const cache = new Map<string, string>();
let prefix: Prefix | undefined;

function messageIndex() {
  if (prefix) return prefix;
  prefix = { children: new Map() };
  for (const language of Object.keys(dictionaries) as Exclude<Language, 'ru'>[]) {
    const table: Record<string, string> = {};
    for (const [source, value] of Object.entries(dictionaries[language])) {
      const key = source.toLocaleLowerCase('ru');
      table[key] = value;
      let node = prefix;
      for (const character of key) {
        let child = node.children.get(character);
        if (!child) { child = { children: new Map() }; node.children.set(character, child); }
        node = child;
      }
      node.key = key;
    }
    folded.set(language, table);
  }
  return prefix;
}

const cyrillic = (character: string | undefined) => !!character && /[А-Яа-яЁё]/.test(character);

export function translateText(text: string, language: Language): string {
  if (language === 'ru' || !/[А-Яа-яЁё]/.test(text)) return text;
  const key = language + '\u0000' + text;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const table = dictionaries[language];
  const trimmed = text.trim();
  if (table[trimmed]) {
    const result = text.replace(trimmed, table[trimmed]);
    cache.set(key, result);
    return result;
  }

  const root = messageIndex();
  const values = folded.get(language)!;
  const lower = text.toLocaleLowerCase('ru');
  const output: string[] = [];
  let position = 0;
  let copied = 0;
  while (position < text.length) {
    let node = root;
    let end = position;
    let matched: { end: number; value: string } | undefined;
    if (!cyrillic(lower[position - 1])) {
      while (end < text.length) {
        const child = node.children.get(lower[end]);
        if (!child) break;
        node = child;
        end++;
        if (node.key && !cyrillic(lower[end]) && values[node.key]) matched = { end, value: values[node.key] };
      }
    }
    if (matched) {
      output.push(text.slice(copied, position), matched.value);
      position = matched.end;
      copied = position;
    } else {
      position++;
    }
  }
  output.push(text.slice(copied));
  const translated = output.join('');
  if (cache.size > 6000) cache.clear();
  cache.set(key, translated);
  return translated;
}
