'use client';

import { Archive as ArchiveIcon, ArrowRight, Download, FileUp, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { exportLife, openRepository } from '../application/save-service';
import type { SaveInfo } from '../db/save-repository';
import { deserializeSave, MAX_SAVE_BYTES } from '../db/save-format';
import { races } from '../game/content/world';
import { useGame } from '../stores/game-store';
import { Loading, StorageStatus } from './app-shell';
import { ageText } from './game-panels';

const date = new Intl.DateTimeFormat('ru', { dateStyle: 'medium', timeStyle: 'short' });

export function Archive() {
  const router = useRouter();
  const { state, loading, saving, error: storageError, load, newLife, forget } = useGame();
  const input = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<SaveInfo[] | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const disabled = busy || saving || loading;
  const refresh = async () => setRows(await (await openRepository()).list());
  useEffect(() => {
    if (loading || saving) return;
    let active = true;
    void openRepository().then(repo => repo.list()).then(rows => { if (active) setRows(rows); }).catch(error => {
      if (active) { setError(error instanceof Error ? error.message : 'Не удалось открыть архив.'); setRows([]); }
    });
    return () => { active = false; };
  }, [loading, saving]);
  async function run(operation: () => Promise<void>) {
    if (disabled) return;
    setBusy(true);
    setError('');
    setNotice('');
    try { await operation(); } catch (error) { setError(error instanceof Error ? error.message : 'Действие не удалось.'); }
    finally { setBusy(false); }
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    await run(async () => {
      if (file.size > MAX_SAVE_BYTES) throw new Error('Файл больше 2 МБ.');
      const imported = deserializeSave(await file.text());
      const id = crypto.randomUUID();
      await (await openRepository()).save({ ...imported, saveId: id }, null, crypto.randomUUID());
      await refresh();
      setNotice('Сохранение добавлено отдельной жизнью.');
    });
    if (input.current) input.current.value = '';
  }

  return <main id="main" className="shell archive-page">
    <StorageStatus />
    <div className="archive-heading">
      <div><p className="eyebrow"><ArchiveIcon size={16} /> На этом устройстве</p><h1>Архив жизней</h1><p>Продолжай любую жизнь или возвращайся к завершённым историям. Очистка данных сайта удалит местный архив.</p></div>
      <div className="summary-actions">
        <input ref={input} type="file" hidden accept=".json,application/json" onChange={event => void importFile(event.target.files?.[0])} />
        <button className="button" disabled={disabled} onClick={() => input.current?.click()}><FileUp size={17} /> Импорт JSON</button>
        <button className="button primary" disabled={disabled || !!(storageError && state)} onClick={() => { newLife(); router.push('/game/'); }}>Новая жизнь <ArrowRight size={17} /></button>
      </div>
    </div>
    {error && <p className="archive-message error" role="alert">{error}</p>}
    {notice && <p className="archive-message" role="status">{notice}</p>}
    {rows === null ? <Loading /> : !rows.length ? <section className="panel action-card archive-empty"><ArchiveIcon size={24} /><h2>Сохранений пока нет</h2><p>Первая жизнь появится в архиве сразу после рождения.</p><Link className="button" href="/">На главную</Link></section> :
      <ul className="archive-list">{rows.map(row => <li className="panel archive-row" key={row.id}>
        <div className="archive-row-info"><span className="panel-label">{row.ended ? 'Завершена' : 'В процессе'}</span><h2>{row.title}</h2><p>{races[row.race]?.name ?? 'Эларион'} · {ageText(row.age)} · {date.format(new Date(row.updated))}</p></div>
        {removeId === row.id ? <div className="archive-confirm"><p>Удалить эту жизнь из архива?</p><button className="button danger" disabled={disabled} onClick={() => void run(async () => {
          await (await openRepository()).remove(row.id);
          forget(row.id);
          setRemoveId(null);
          await refresh();
          setNotice('Жизнь удалена.');
        })}>Удалить</button> <button className="button" onClick={() => setRemoveId(null)}>Отмена</button></div> :
          <div className="summary-actions">
            <button className="button" disabled={disabled} onClick={() => void run(async () => { if (await load(row.id)) router.push('/game/'); })}>{row.ended ? 'Открыть итог' : 'Продолжить'} <ArrowRight size={16} /></button>
            <button className="button" disabled={disabled} aria-label={'Экспортировать ' + row.title} onClick={() => void run(async () => {
              const life = state?.saveId === row.id ? state : await (await openRepository()).load(row.id);
              if (life) await exportLife(life);
            })}><Download size={17} /></button>
            <button className="button" disabled={disabled} aria-label={'Удалить ' + row.title} onClick={() => setRemoveId(row.id)}><Trash2 size={17} /></button>
          </div>}
      </li>)}</ul>}
  </main>;
}
