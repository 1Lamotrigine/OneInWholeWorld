'use client';

import { LanguageProvider, LanguageSelect, Localize } from '../i18n/localize';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Archive, BookOpen, Compass, Download, RotateCcw, Settings2, TriangleAlert } from 'lucide-react';
import { useEffect } from 'react';
import { useGame } from '../stores/game-store';
import { exportLife } from '../application/save-service';

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const motion = useGame(s => s.reducedMotion);
  const toggleMotion = useGame(s => s.toggleMotion);
  const initialize = useGame(s => s.initialize);
  useEffect(() => { void initialize(); }, [initialize]);
  const game = path.startsWith('/game');
  const archive = path.startsWith('/archive');
  return <LanguageProvider><Localize><div className="app-shell" data-motion={motion ? 'off' : 'on'}>
    <a className="skip-link" href="#main">К содержанию</a>
    <header className="site-header">
      <div className="shell header-inner">
        <Link href="/" className="brand" aria-label="Жизнь в Эларионе, главная">
          <span className="brand-mark"><Compass size={22} strokeWidth={1.6} /></span>
          <span>Жизнь в Эларионе</span>
        </Link>
        <nav aria-label="Основная навигация">
          <Link href="/game/" aria-current={game ? 'page' : undefined} aria-label="Жизнь"><BookOpen size={16} /><span>Жизнь</span></Link>
          <Link href="/archive/" aria-current={archive ? 'page' : undefined} aria-label="Сохранения"><Archive size={16} /><span>Сохранения</span></Link>
          <LanguageSelect />
          <details className="settings">
            <summary className="icon-button" aria-label="Настройки" title="Настройки"><Settings2 size={19} /></summary>
            <div className="settings-menu panel">
              <strong>Настройки</strong>
              <label><input type="checkbox" checked={motion} onChange={toggleMotion} /> Уменьшить анимацию</label>
              <p className="muted">Системная настройка уменьшения движения тоже учитывается.</p>
            </div>
          </details>
        </nav>
      </div>
    </header>
    {children}
  </div></Localize></LanguageProvider>;
}

export function StorageStatus() {
  const { state, error, loading, saving, retry, exportMode, enableExportMode } = useGame();
  if (error) return <Localize><aside className="storage-warning panel" role="status">
    <TriangleAlert size={20} /><div><strong>{exportMode ? 'Режим ручного экспорта' : 'Проблема с сохранением'}</strong><p>{error}</p>
      <div className="flex flex-wrap gap-2">
        <button className="button" onClick={retry} disabled={loading || saving}><RotateCcw size={16} /> Повторить</button>
        {state && <button className="button" onClick={() => void exportLife(state)}><Download size={16} /> Экспортировать прогресс</button>}
        {state && !state.ended && !exportMode && <button className="button" onClick={enableExportMode} disabled={loading || saving}>Играть с ручным экспортом</button>}
      </div>
    </div>
  </aside></Localize>;
  return null;
}

export function Loading({ text = 'Восстанавливаем летопись…' }: { text?: string }) {
  return <Localize><div className="panel loading-panel" role="status"><span className="loading-diamond" /> {text}</div></Localize>;
}
