/**
 * Текстовые сериализаторы: TXT-заметка и Markdown-карточка для мессенджеров
 * (Telegram / WhatsApp) с эмодзи и структурой.
 */
import type { Digest } from './digest';
import type { TastingRecord } from '@/types/tasting';
import { QUALITY_OPTS } from '@/lib/catalog';
import { T } from '@/lib/tr';

function pairLines(pairs: [string, string][]): string {
  return pairs.map(([k, v]) => `${T(k)}: ${T(v)}`).join('\n');
}

export function buildTxt(_record: TastingRecord, d: Digest): string {
  const sections: string[] = [];
  sections.push(`${d.title}`);
  if (d.subtitle) sections.push(d.subtitle);
  sections.push('─'.repeat(40));
  sections.push(pairLines(d.meta));
  sections.push('\n' + T('ВИД'));
  sections.push(pairLines(d.eye));
  sections.push('\n' + T('НОС'));
  sections.push(pairLines(d.nose));
  sections.push('\n' + T('РОТ'));
  sections.push(pairLines(d.palate));
  sections.push('\n' + T('СТРУКТУРНЫЙ ПРОФИЛЬ'));
  sections.push(d.profileLines.join('\n'));
  sections.push('\n' + T('ИТОГ'));
  sections.push(pairLines(d.conclusion));
  if (d.media.length > 0) {
    sections.push('\n' + T('АССОЦИАЦИИ'));
    sections.push(pairLines(d.media));
  }
  return sections.join('\n');
}

export function buildMarkdownCard(record: TastingRecord, d: Digest): string {
  const emoji = record.media.emojis.length ? record.media.emojis.join(' ') + ' ' : '🍷 ';
  const quality = record.conclusion.quality
    ? T(QUALITY_OPTS.find((q) => q.value === record.conclusion.quality)?.label ?? '')
    : null;
  const stars = record.conclusion.score100 !== null && record.mode === 'sommelier-pro' ? ` · ${record.conclusion.score100}/100` : '';

  const lines: string[] = [];
  lines.push(`${emoji}**${d.title}**`);
  if (d.subtitle) lines.push(`_${d.subtitle}_`);
  lines.push('');
  if (d.eye.length > 0) {
    // Вид — только ключевое
    const color = d.eye.find(([k]) => k === 'Цвет')?.[1];
    const clarity = d.eye.find(([k]) => k === 'Прозрачность')?.[1];
    const intensity = d.eye.find(([k]) => k === 'Интенсивность')?.[1];
    if (color || clarity) lines.push(`👁 ${[clarity, intensity, color].filter((v) => v && v !== '—').join(' · ')}`);
  }

  const nosePairs = d.nose.filter(([k]) => ['Развитие', 'Ароматы'].includes(k));
  for (const [k, v] of nosePairs) lines.push(`👃 **${T(k)}:** ${T(v)}`);

  const palateKeys = ['Сладость', 'Кислотность', 'Танины', 'Тело', 'Послевкусие'];
  const palatePairs = d.palate.filter(([k]) => palateKeys.includes(k) && !k.startsWith('Послевкусие:'));
  lines.push('👅 ' + palatePairs.map(([, v]) => v.toLowerCase()).filter((v) => v !== '—').join(' · '));

  const balance = d.palate.find(([k]) => k === 'Баланс')?.[1];
  if (balance && balance !== '—') lines.push(`⚖️ ${T('Баланс')}: ${balance}`);

  lines.push('');
  lines.push(`📈 **${T('Профиль')}:**`);
  for (const line of d.profileLines) {
    /* Значение после первого двоеточия целиком: внутри вкладов есть свои
       двоеточия («base: 8.2») — split(':') терял хвост строки. */
    const idx = line.indexOf(':');
    const axis = idx >= 0 ? line.slice(0, idx) : line;
    const rest = idx >= 0 ? line.slice(idx + 1) : '';
    lines.push(`• ${axis}:${rest}`);
  }

  lines.push('');
  if (quality) lines.push(`🏆 **${T('Вердикт')}:** ${quality}${stars}`);
  const win = d.conclusion.find(([k]) => k === 'Окно питья')?.[1];
  if (win && win !== '—') lines.push(`⏳ ${T('Пить')}: ${win}`);
  /* v19: советник подачи — Pro-поверхность; в WSET-проходе строки нет. */
  if (record.mode === 'sommelier-pro') lines.push(`🌡 ${T('Подача')}: ${d.serving.temperature}`);
  const gastro = d.media.find(([k]) => k === 'Гастрономия')?.[1];
  if (gastro) lines.push(`🍽 ${gastro}`);

  const image = d.media.find(([k]) => k === 'Образ')?.[1];
  if (image) {
    lines.push('');
    lines.push(`💬 _${image}_`);
  }
  const taster = record.identity.taster;
  lines.push('');
  lines.push(`— ${taster || T('дегустация')} · ${record.identity.dateTasted}`);

  return lines.join('\n');
}
