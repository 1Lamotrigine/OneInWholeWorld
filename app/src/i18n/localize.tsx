'use client';

import { Children, cloneElement, createContext, isValidElement, useContext, useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { languages, translateText, type Language } from './translate';

const LanguageContext = createContext<{ language: Language; setLanguage(value: Language): void }>({ language: 'en', setLanguage: () => {} });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
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

function LanguageFlag({ language }: { language: Language }) {
  return <svg className="language-flag" data-language={language} viewBox="0 0 24 16" aria-hidden="true" focusable="false">
    {language === 'ru' && <><path fill="#f4f4f1" d="M0 0h24v6H0z" /><path fill="#4269bc" d="M0 5.33h24v5.34H0z" /><path fill="#c74a51" d="M0 10.67h24V16H0z" /></>}
    {language === 'de' && <><path fill="#292b30" d="M0 0h24v6H0z" /><path fill="#bd4149" d="M0 5.33h24v5.34H0z" /><path fill="#e6ba58" d="M0 10.67h24V16H0z" /></>}
    {language === 'es' && <><path fill="#b63d49" d="M0 0h24v16H0z" /><path fill="#e8bc55" d="M0 4h24v8H0z" /><path fill="#b63d49" d="M6 6h3v4H6z" /></>}
    {language === 'it' && <><path fill="#f4f4f1" d="M0 0h24v16H0z" /><path fill="#459576" d="M0 0h8v16H0z" /><path fill="#c74a51" d="M16 0h8v16h-8z" /></>}
    {language === 'en' && <><path fill="#344e80" d="M0 0h24v16H0z" /><path stroke="#f4f4f1" strokeWidth="4" d="m0 0 24 16M24 0 0 16" /><path stroke="#bf4a57" strokeWidth="1.4" d="m0 0 24 16M24 0 0 16" /><path stroke="#f4f4f1" strokeWidth="6" d="M12 0v16M0 8h24" /><path stroke="#bf4a57" strokeWidth="3" d="M12 0v16M0 8h24" /></>}
  </svg>;
}

export function LanguageSelect() {
  const { language, setLanguage } = useLanguage();
  const labels = { ru: 'Язык', en: 'Language', de: 'Sprache', es: 'Idioma', it: 'Lingua' };
  return <label className="language-select" title={`${labels[language]} · ${languages[language]}`}>
    <LanguageFlag language={language} />
    <select aria-label={labels[language]} value={language} onChange={event => setLanguage(event.target.value as Language)}>
      {Object.entries(languages).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
    </select>
    <span className="language-code" aria-hidden="true">{language.toUpperCase()}</span>
    <ChevronDown className="language-chevron" size={14} aria-hidden="true" />
  </label>;
}
