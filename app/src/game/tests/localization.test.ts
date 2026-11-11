import { describe, expect, it } from 'vitest';
import { languages, translateText, type Language } from '../../i18n/translate';
import source from '../../i18n/messages/source.json';
import en from '../../i18n/messages/en.json';
import de from '../../i18n/messages/de.json';
import es from '../../i18n/messages/es.json';
import itMessages from '../../i18n/messages/it.json';

describe('Локализация', () => {
  it('содержит все подготовленные игровые тексты для четырёх переводов', () => {
    for (const table of [en, de, es, itMessages] as Record<string, string>[]) {
      expect(source.filter(key => !table[key]?.trim())).toEqual([]);
    }
  });

  it('переводит составные подписи и сохраняет динамические значения', () => {
    for (const lang of Object.keys(languages).filter(id => id !== 'ru') as Language[]) {
      const text = translateText('Нужно 24 монет.', lang);
      expect(text).toContain('24');
      expect(text).not.toMatch(/[А-Яа-яЁё]/);
      expect(translateText('бедное сословие', lang)).not.toMatch(/[А-Яа-яЁё]/);
      expect(translateText('  Летопись жизни  ', lang)).toMatch(/^  .+  $/);
    }
  });

  it('сохраняет исходные строки и названия идентификаторов при русском языке', () => {
    expect(translateText('Летопись жизни', 'ru')).toBe('Летопись жизни');
    expect(translateText('aurelian:2', 'en')).toBe('aurelian:2');
    expect(translateText('1230–1300', 'de')).toBe('1230–1300');
  });
});
