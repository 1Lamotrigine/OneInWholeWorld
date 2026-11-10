'use client';

import { ArrowRight, BookOpen, Compass, Feather, Globe2, MapPin, Shuffle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGame } from '../stores/game-store';
import { Loading, StorageStatus } from './app-shell';
import { atlas, pathIds, paths } from '../game/content/atlas';
import { regionIds, regions } from '../game/content/world';
import { PathIcon } from './life-path';
import { WorldMap } from './world-map';

const principles = [
  [Shuffle, 'Случайное рождение', 'Раса, семья и достаток достаются по воле случая.'],
  [Compass, 'Мир живёт сам', 'Школы открываются, торговые пути меняются, союзы распадаются.'],
  [Feather, 'Своя летопись', 'Ключевые решения и повседневные события складываются в историю.'],
] as const;

export function Home() {
  const router = useRouter();
  const { state, loading, saving, error, newLife } = useGame();
  return <main id="main" className="shell home">
    <StorageStatus />
    <section className="home-hero panel">
      <div className="home-landscape" role="img" aria-label="Пиксельный пейзаж Элариона в сумерках" />
      <div className="home-copy">
        <p className="eyebrow"><Compass size={15} /> Летописи Элариона</p>
        <h1>Кем ты родишься<br />в Эларионе?</h1>
        <p>Случай решит, где начнётся твоя история. Выбери путь на всю жизнь и узнай, чем Эларион ответит на твои поступки.</p>
        <div className="home-actions">
          <button className="button primary" disabled={loading || saving || !!(error && state)} onClick={() => { newLife(); router.push('/game/'); }}>Начать жизнь <ArrowRight size={18} /></button>
          {!state && <a className="button" href="#continent">Исследовать мир <Compass size={17} /></a>}
          {state && <Link href="/game/" className="button">Открыть летопись <BookOpen size={17} /></Link>}
        </div>
      </div>
      <div className="hero-index"><span>1230 год</span> Начало летописи</div>
    </section>
    {loading ? <Loading text="Открываем локальный архив…" /> : state && <Link className="panel last-life" href="/game/">
      <BookOpen size={20} /><span><small>Последняя жизнь</small><strong>{state.character.name}</strong></span>
      <span className="last-meta">{state.ended ? 'Завершена' : `Возраст: ${state.character.age}`}</span><ArrowRight size={19} />
    </Link>}
    <div className="home-numbers" aria-label="Мир в цифрах"><span><strong>5</strong> народов</span><span><strong>6</strong> стран</span><span><strong>18</strong> поселений</span><span><strong>7</strong> жизненных путей</span></div>
    <div className="home-principles">
      {principles.map(([Icon, title, text]) => <article className="panel principle" key={title}><Icon size={19} /><h2>{title}</h2><p>{text}</p></article>)}
    </div>
    <section className="home-section" id="continent">
      <div className="home-section-heading"><div><p className="eyebrow"><Globe2 size={16} /> Атлас материка</p><h2>Шесть стран. Разные правила жизни.</h2><p>У каждой земли свои законы, люди и места, куда ведут дороги.</p></div><WorldMap /></div>
      <div className="country-grid">{regionIds.map(id => <article key={id} className="panel country-preview">
        <div className="country-preview-art" style={{ backgroundImage: `url(/art/${id}.svg)`, borderBottomColor: atlas[id].color }} />
        <div><p className="eyebrow"><MapPin size={13} /> {regions[id].polity}</p><h3>{regions[id].name}</h3><p>{atlas[id].lore}</p></div>
      </article>)}</div>
    </section>
    <section className="home-section">
      <div className="home-section-heading"><div><p className="eyebrow"><Compass size={16} /> Путь на всю жизнь</p><h2>Кем станешь после рождения?</h2><p>Роль откроет свои знакомства, решения и способы менять мир.</p></div></div>
      <div className="home-paths">{pathIds.map(id => <article className="panel home-path" key={id}><PathIcon path={id} /><div><h3>{paths[id].name}</h3><p>{paths[id].story}</p></div></article>)}</div>
    </section>
    <section className="panel home-story"><Feather size={22} /><div><p className="eyebrow">Отрывок из возможной летописи</p><h2>У порога кто-то просит ночлег</h2><p>Наутро гость исчезает, оставив половину печати. Через три года дозорный показывает тебе её вторую половину. Теперь нужно решить, что рассказать.</p></div></section>
    <footer className="home-footer"><span>Симулятор жизни в фэнтезийном мире</span><Link href="/archive/">Локальный архив <ArrowRight size={15} /></Link></footer>
  </main>;
}
