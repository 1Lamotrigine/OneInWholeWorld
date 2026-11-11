'use client';

import { Children, cloneElement, createContext, isValidElement, useContext, useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react';
import { languages, translateText, type Language } from './translate';

const LanguageContext = createContext<{ language: Language; setLanguage(value: Language): void }>({ language: 'ru', setLanguage: () => {} });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('ru');
  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem('elarion-language'); } catch { /* Optional preference. */ }
    if (saved && Object.hasOwn(languages, saved)) {
      const value = saved as Language;
      queueMicrotask(() => setLanguage(value));
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = translateText('Жизнь в Эларионе', language);
  }, [language]);
  const value = useMemo(() => ({ language, setLanguage: (language: Language) => {
    setLanguage(language);
    try { localStorage.setItem('elarion-language', language); } catch { /* Optional preference. */ }
  } }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);

function translated(node: ReactNode, language: Language): ReactNode {
  if (typeof node === 'string') return translateText(node, language);
  if (Array.isArray(node)) return Children.map(node, child => translated(child, language));
  if (!isValidElement<Record<string, unknown>>(node)) return node;
  const props: Record<string, unknown> = {};
  for (const key of ['title', 'aria-label', 'placeholder', 'label', 'text']) {
    if (typeof node.props[key] === 'string') props[key] = translateText(node.props[key], language);
  }
  if ('children' in node.props) props.children = translated(node.props.children as ReactNode, language);
  return cloneElement(node as ReactElement<Record<string, unknown>>, props);
}

/** Translate presentation text while keeping save data and engine identifiers stable. */
export function Localize({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  return <>{translated(children, language)}</>;
}

export function LanguageSelect() {
  const { language, setLanguage } = useLanguage();
  const labels = { ru: 'Язык', en: 'Language', de: 'Sprache', es: 'Idioma', it: 'Lingua' };
  return <label className="language-select"><span>{labels[language]}</span>
    <select aria-label={labels[language]} value={language} onChange={event => setLanguage(event.target.value as Language)}>
      {Object.entries(languages).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
    </select>
  </label>;
}
