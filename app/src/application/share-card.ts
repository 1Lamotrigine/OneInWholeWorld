import { ageText } from '../components/game-panels';
import { portraitDataUrl } from '../components/portrait-svg';
import { backgrounds, races, regionScene, regions } from '../game/content/world';
import {
  birthRarity, fateEpitaph, fateHook, formatRarity, seedCode, turningPoints,
} from '../game/engine/fate-card';
import { BIRTH_YEAR, type GameState } from '../game/types';
import { translateText, type Language } from '../i18n/translate';
import { downloadFile } from './save-service';

const WIDTH = 1080;
const HEIGHT = 1920;

type Point = { x: number; y: number };

function loadImage(source: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = source;
  });
}

function drawImageCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const imageWidth = image.naturalWidth || image.width || 320;
  const imageHeight = image.naturalHeight || image.height || 144;
  const scale = Math.max(width / imageWidth, height / imageHeight);
  const drawnWidth = imageWidth * scale;
  const drawnHeight = imageHeight * scale;
  ctx.drawImage(image, x + (width - drawnWidth) / 2, y + (height - drawnHeight) / 2, drawnWidth, drawnHeight);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !line) line = candidate;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

function drawWrapped(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
  align: CanvasTextAlign = 'left',
): void {
  const lines = wrap(ctx, text, maxWidth);
  const shown = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    let last = shown[maxLines - 1];
    while (last.length > 1 && ctx.measureText(last + '…').width > maxWidth) last = last.slice(0, -1);
    shown[maxLines - 1] = last + '…';
  }
  ctx.textAlign = align;
  shown.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
}

function bezier(t: number, start: Point, first: Point, second: Point, finish: Point): Point {
  const u = 1 - t;
  return {
    x: u * u * u * start.x + 3 * u * u * t * first.x + 3 * u * t * t * second.x + t * t * t * finish.x,
    y: u * u * u * start.y + 3 * u * u * t * first.y + 3 * u * t * t * second.y + t * t * t * finish.y,
  };
}

export async function saveArcCard(state: GameState, language: Language): Promise<void> {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Графический экспорт недоступен.');

  const c = state.character;
  const hook = fateHook(state, language);
  const epitaph = translateText(fateEpitaph(state), language);
  const points = turningPoints(state);
  const rarity = birthRarity(state);

  const background = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  background.addColorStop(0, '#162330');
  background.addColorStop(.58, '#0e1720');
  background.addColorStop(1, '#0b1119');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = '#594d3e';
  ctx.lineWidth = 3;
  ctx.strokeRect(28, 28, WIDTH - 56, HEIGHT - 56);
  ctx.strokeStyle = '#d9b77c33';
  ctx.lineWidth = 1;
  ctx.strokeRect(40, 40, WIDTH - 80, HEIGHT - 80);

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#d9b77c';
  ctx.font = '600 22px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(translateText('Жизнь в Эларионе', language).toUpperCase(), 72, 100);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#a6b1bb';
  ctx.fillText(`${BIRTH_YEAR}–${state.world.year}`, WIDTH - 72, 100);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#e8e9e5';
  ctx.font = '600 52px Georgia, serif';
  drawWrapped(ctx, hook, 72, 204, WIDTH - 144, 64, 4);

  const sceneY = 430;
  const sceneHeight = 300;
  const scene = await loadImage(`/art/${regionScene[c.region]}.svg`);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(72, sceneY, WIDTH - 144, sceneHeight, 14);
  ctx.clip();
  ctx.fillStyle = '#0b1119';
  ctx.fillRect(72, sceneY, WIDTH - 144, sceneHeight);
  if (scene) drawImageCover(ctx, scene, 72, sceneY, WIDTH - 144, sceneHeight);
  const vignette = ctx.createLinearGradient(0, sceneY, 0, sceneY + sceneHeight);
  vignette.addColorStop(0, '#0b111900');
  vignette.addColorStop(1, '#0b1119cc');
  ctx.fillStyle = vignette;
  ctx.fillRect(72, sceneY, WIDTH - 144, sceneHeight);
  ctx.restore();

  const portrait = await loadImage(portraitDataUrl(state));
  const portraitX = WIDTH - 170;
  const portraitY = sceneY + 80;
  const portraitRadius = 70;
  ctx.save();
  ctx.beginPath();
  ctx.arc(portraitX, portraitY, portraitRadius, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#121b25';
  ctx.fillRect(portraitX - portraitRadius, portraitY - portraitRadius, portraitRadius * 2, portraitRadius * 2);
  if (portrait) ctx.drawImage(portrait, portraitX - portraitRadius, portraitY - portraitRadius, portraitRadius * 2, portraitRadius * 2);
  ctx.restore();
  ctx.strokeStyle = '#d9b77c';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(portraitX, portraitY, portraitRadius, 0, Math.PI * 2);
  ctx.stroke();

  const start = { x: 150, y: 1480 };
  const finish = { x: 930, y: 800 };
  const first = { x: 170, y: 1130 };
  const second = { x: 910, y: 1160 };
  ctx.strokeStyle = '#d9b77c33';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.bezierCurveTo(first.x, first.y, second.x, second.y, finish.x, finish.y);
  ctx.stroke();
  ctx.strokeStyle = '#705d43';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.bezierCurveTo(first.x, first.y, second.x, second.y, finish.x, finish.y);
  ctx.stroke();

  points.slice(0, 3).forEach((entry, index) => {
    const t = [.25, .5, .75][index];
    const point = bezier(t, start, first, second, finish);
    ctx.fillStyle = '#0b1119';
    ctx.strokeStyle = '#d9b77c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const align: CanvasTextAlign = index === 2 ? 'right' : 'left';
    const labelX = point.x + (index === 2 ? -34 : 34);
    ctx.fillStyle = '#d9b77c';
    ctx.font = '600 24px system-ui, sans-serif';
    ctx.textAlign = align;
    ctx.fillText(translateText(ageText(entry.age), language), labelX, point.y - 6);
    ctx.fillStyle = '#e8e9e5';
    ctx.font = '500 27px Georgia, serif';
    drawWrapped(ctx, translateText(entry.title, language), labelX, point.y + 26, 320, 34, 2, align);
  });

  ctx.textAlign = 'left';
  ctx.fillStyle = '#d9b77c';
  ctx.font = '600 22px system-ui, sans-serif';
  ctx.fillText(translateText('Старт', language).toUpperCase(), 80, 1560);
  ctx.fillStyle = '#e8e9e5';
  ctx.font = '500 27px Georgia, serif';
  drawWrapped(ctx, `${translateText(races[c.race].name, language)} · ${translateText(backgrounds[c.background].name, language)} · ${translateText(regions[c.origin].name, language)}`, 80, 1598, 470, 34, 2);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#d9b77c';
  ctx.font = '600 22px system-ui, sans-serif';
  ctx.fillText(translateText('Финал', language).toUpperCase(), WIDTH - 80, 748);
  ctx.fillStyle = '#e8e9e5';
  ctx.font = '500 27px Georgia, serif';
  drawWrapped(ctx, `${translateText(backgrounds[c.status].status, language)} · ${translateText(regions[c.region].name, language)}`, WIDTH - 80, 786, 390, 34, 2, 'right');

  ctx.textAlign = 'center';
  ctx.fillStyle = '#d9b77c';
  ctx.font = 'italic 36px Georgia, serif';
  drawWrapped(ctx, `«${epitaph}»`, WIDTH / 2, 1678, WIDTH - 180, 44, 2, 'center');

  ctx.fillStyle = '#e8e9e5';
  ctx.font = '500 26px Georgia, serif';
  ctx.fillText(`${c.name} · ${translateText(ageText(c.age), language)}`, WIDTH / 2, 1790);

  ctx.fillStyle = '#a6b1bb';
  ctx.font = '22px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`seed ${seedCode(state.seed)}`, 72, 1848);
  ctx.textAlign = 'right';
  ctx.fillText(formatRarity(rarity, language), WIDTH - 72, 1848);

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Не удалось создать изображение.');
  downloadFile(`elarion-${state.saveId}.png`, blob);
}
