import { esc } from '../utils/html.js';
import { store, getSetting } from '../db.js';
import { isoDate, addDays, formatShortDate, daysBetween } from '../utils/date.js';
import { stoolStatsForRange, symptomStatsForRange, urgencyDaysInRange, therapyAdherenceForRange } from '../utils/stats.js';
import { SYMPTOMS } from '../data/symptoms.js';
import { computeSchedule } from '../utils/fodmap.js';
import { toast } from '../toast.js';

let periodMode = 'week'; // 'week' | 'month'

const VERDICT_LABEL = { podnosi: 'podnosi dobro', delimicno: 'delimično podnosi', ne_podnosi: 'ne podnosi dobro' };

function barColor(avg) {
  if (avg === null) return 'var(--line)';
  if (avg <= 3) return 'var(--teal)';
  if (avg <= 6) return 'var(--gold)';
  return 'var(--red-soft)';
}

export async function renderIzvestaj(root, go) {
  const todayIso = isoDate(new Date());
  const days = periodMode === 'week' ? 7 : 30;
  const rangeStart = addDays(todayIso, -(days - 1));
  const prevEnd = addDays(rangeStart, -1);
  const prevStart = addDays(prevEnd, -(days - 1));

  const [adherence, urgencyDays, stool, symptoms, prevSymptoms] = await Promise.all([
    therapyAdherenceForRange(rangeStart, todayIso),
    urgencyDaysInRange(rangeStart, todayIso),
    stoolStatsForRange(rangeStart, todayIso),
    symptomStatsForRange(rangeStart, todayIso),
    symptomStatsForRange(prevStart, prevEnd),
  ]);

  const startDate = await getSetting('fodmapStartDate', todayIso);
  const schedule = computeSchedule(startDate);
  const verdictRows = await store.getAll('fodmapVerdicts');
  const verdicts = {};
  for (const v of verdictRows) verdicts[v.groupIndex] = v;
  const groupsInRange = schedule.groups.filter((g) => g.testStart <= todayIso && g.testEnd >= rangeStart);

  const totalDays = daysBetween(rangeStart, todayIso) + 1;

  root.innerHTML = `
    <div class="eyebrow">Za lekara</div>
    <div class="pagetitle">Izveštaj</div>
    <div class="pagesub">Spreman za kontrolu</div>

    <div class="toggle2">
      <button class="${periodMode === 'week' ? 'active' : ''}" data-mode="week">Nedelja</button>
      <button class="${periodMode === 'month' ? 'active' : ''}" data-mode="month">Mesec</button>
    </div>

    <div class="stat-grid">
      <div class="stat-tile"><div class="n">${adherence.pct === null ? '—' : adherence.pct + '%'}</div><div class="l">Terapija uzeta</div></div>
      <div class="stat-tile"><div class="n">${urgencyDays}/${totalDays}</div><div class="l">Dana sa hitnošću</div></div>
    </div>

    <div class="card">
      <h2>Prosek po simptomu (1–10)</h2>
      <div class="hint">${periodMode === 'week' ? 'Ova nedelja' : 'Ovaj mesec'}, ${esc(formatShortDate(rangeStart))} — ${esc(formatShortDate(todayIso))}</div>
      ${SYMPTOMS.map(s => {
        const avg = symptoms.avgBySymptom[s];
        const prevAvg = prevSymptoms.avgBySymptom[s];
        let trend = '';
        if (avg !== null && prevAvg !== null && Math.abs(avg - prevAvg) >= 0.3) {
          trend = avg > prevAvg
            ? '<span class="trend up">↑</span>'
            : '<span class="trend down">↓</span>';
        }
        const pct = avg === null ? 0 : (avg / 10) * 100;
        return `
          <div class="report-row">
            <div class="lbl">${esc(s)}</div>
            <div class="report-bar-bg"><div class="report-bar" style="width:${pct}%; background:${barColor(avg)};"></div></div>
            <div class="num">${avg === null ? '—' : avg.toFixed(1)}${trend}</div>
          </div>
        `;
      }).join('')}
    </div>

    <div class="card">
      <h2>Stolica</h2>
      <div class="hint">${periodMode === 'week' ? 'Ova nedelja' : 'Ovaj mesec'}</div>
      <div class="report-row"><div class="lbl">Prosek/dan</div><div class="report-bar-bg"><div class="report-bar" style="width:${Math.min(stool.avgPerDay / 5 * 100, 100)}%; background:var(--teal);"></div></div><div class="num">${stool.avgPerDay.toFixed(1)}</div></div>
      <div class="report-row"><div class="lbl">Vodenasto dana</div><div class="report-bar-bg"><div class="report-bar" style="width:${Math.min(stool.wateryDays / totalDays * 100, 100)}%; background:var(--red-soft);"></div></div><div class="num">${stool.wateryDays}</div></div>
      ${stool.mostCommon ? `<div class="hint" style="margin:8px 0 0;">Najčešći tip: <b style="color:var(--ink);">Tip ${stool.mostCommon}</b> · ukupno epizoda: ${stool.count}</div>` : ''}
    </div>

    <div class="card">
      <h2>FODMAP status</h2>
      <div class="hint">Testirano u ovom periodu</div>
      ${groupsInRange.length ? groupsInRange.map(g => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0;">
          <span style="font-size:13px;">Grupa ${g.index + 1} — ${esc(g.name)}</span>
          <span class="verdict ${verdicts[g.index] ? (verdicts[g.index].verdict === 'podnosi' ? 'ok' : verdicts[g.index].verdict === 'delimicno' ? 'mid' : 'bad') : 'mid'}">${verdicts[g.index] ? esc(VERDICT_LABEL[verdicts[g.index].verdict]) : 'u toku'}</span>
        </div>
      `).join('') : '<div class="empty-hint">Nije testirana nijedna grupa u ovom periodu</div>'}
    </div>

    <button class="share-btn" id="share-btn">📤 Podeli izveštaj sa lekarom</button>
    <span class="note-tag">Izveštaj se generiše iz podataka sačuvanih na ovom uređaju</span>
  `;

  root.querySelectorAll('[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      periodMode = btn.dataset.mode;
      renderIzvestaj(root, go);
    });
  });

  root.querySelector('#share-btn').addEventListener('click', async () => {
    const lines = [];
    lines.push(`Dnevnik ritma — izveštaj (${periodMode === 'week' ? 'nedelja' : 'mesec'})`);
    lines.push(`Period: ${formatShortDate(rangeStart)} — ${formatShortDate(todayIso)}`);
    lines.push('');
    lines.push(`Terapija uzeta: ${adherence.pct === null ? 'n/a' : adherence.pct + '%'}`);
    lines.push(`Dana sa hitnošću/dijarejom: ${urgencyDays}/${totalDays}`);
    lines.push('');
    lines.push('Prosek po simptomu (1-10):');
    for (const s of SYMPTOMS) {
      const avg = symptoms.avgBySymptom[s];
      lines.push(`  ${s}: ${avg === null ? '—' : avg.toFixed(1)}`);
    }
    lines.push('');
    lines.push(`Stolica — prosek/dan: ${stool.avgPerDay.toFixed(1)}, vodenasto dana: ${stool.wateryDays}, najčešći tip: ${stool.mostCommon ?? '—'}`);
    lines.push('');
    lines.push('FODMAP status:');
    if (groupsInRange.length) {
      for (const g of groupsInRange) {
        lines.push(`  ${g.name}: ${verdicts[g.index] ? VERDICT_LABEL[verdicts[g.index].verdict] : 'u toku'}`);
      }
    } else {
      lines.push('  Nema testiranja u ovom periodu');
    }
    const text = lines.join('\n');

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Dnevnik ritma — izveštaj', text });
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast('Izveštaj kopiran — nalepi ga gde želiš');
    } catch {
      toast('Deljenje nije podržano na ovom uređaju');
    }
  });
}
