import { esc } from '../utils/html.js';
import { formatLongDate, isoDate, currentBlock, nextBlock, BLOCK_ORDER } from '../utils/date.js';
import { getSetting } from '../db.js';
import { computeSchedule, getPhase } from '../utils/fodmap.js';
import {
  loadTherapyData, groupByBlock, blockStats, toggleTherapyTaken,
  logPrnUse, removeLastPrnUse, allPrnCountsToday, prnCounts as prnCountsForItem,
} from '../utils/therapy.js';
import { store } from '../db.js';
import { openTherapyForm } from '../components/therapyForm.js';
import { toast } from '../toast.js';
import { scheduleAllReminders } from '../notifications.js';

function phaseLabel(schedule, todayIso) {
  const phase = getPhase(schedule, todayIso);
  if (phase.phase === 'elimination') return `Eliminacija — dan ${phase.dayNum} od ${phase.totalDays}`;
  if (phase.phase === 'testing') return `FODMAP: dan ${phase.dayNum} od 3 — ${phase.group.name}`;
  if (phase.phase === 'pause') return `Pauza pre sledeće grupe (dan ${phase.dayNum} od 3)`;
  if (phase.phase === 'done') return 'FODMAP plan završen';
  return 'FODMAP plan uskoro počinje';
}

function arcSvg(pct, blockNodeStates) {
  const circumference = 377;
  const offset = Math.round(circumference * (1 - pct / 100));
  const positions = [
    { x: 34, y: 112 }, { x: 98, y: 35 }, { x: 182, y: 35 }, { x: 246, y: 112 },
  ];
  const nodes = positions.map((p, i) => {
    const st = blockNodeStates[i];
    if (st === 'complete') {
      return `<circle cx="${p.x}" cy="${p.y}" r="9" fill="#D6567F"/><text x="${p.x}" y="${p.y + 4}" font-size="10" fill="#fff" text-anchor="middle" font-weight="700">✓</text>`;
    }
    if (st === 'current') {
      return `<circle cx="${p.x}" cy="${p.y}" r="9" fill="#FFFFFF" stroke="#E38FAE" stroke-width="2.5"/>`;
    }
    return `<circle cx="${p.x}" cy="${p.y}" r="9" fill="#FFFFFF" stroke="#F2D2E0" stroke-width="2.5"/>`;
  }).join('');
  return `
    <svg width="270" height="140" viewBox="0 0 280 150">
      <path d="M 20 140 A 120 120 0 0 1 260 140" fill="none" stroke="#FADCE8" stroke-width="10" stroke-linecap="round"/>
      <path d="M 20 140 A 120 120 0 0 1 260 140" fill="none" stroke="#D6567F" stroke-width="10" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/>
      ${nodes}
      <text x="140" y="105" font-size="21" fill="#4A2E3B" text-anchor="middle" font-family="Fredoka" font-weight="600">${Math.round(pct)}%</text>
    </svg>
  `;
}

function medRow(item, taken, dateIso) {
  return `
    <div class="med-row ${taken ? 'done' : ''}" data-item="${item.id}">
      <button class="check ${taken ? 'on' : ''}" data-action="toggle-taken" data-id="${item.id}"></button>
      <label data-action="edit" data-id="${item.id}">${esc(item.naziv)}</label>
      <span class="time">${esc(item.vreme)}</span>
      <button class="bell ${item.podsetnik_ukljucen ? 'on' : ''}" data-action="toggle-bell" data-id="${item.id}">${item.podsetnik_ukljucen ? '🔔' : '🔕'}</button>
    </div>
  `;
}

function prnRow(item, count) {
  return `
    <div class="med-row" data-item="${item.id}">
      <button class="check" data-action="unlog-prn" data-id="${item.id}" ${count === 0 ? 'disabled' : ''} style="border-radius:50%; font-size:16px; color:var(--teal);">–</button>
      <label data-action="edit" data-id="${item.id}">${esc(item.naziv)}</label>
      <span class="time">danas: ${count}</span>
      <button class="check" data-action="log-prn" data-id="${item.id}" style="border-radius:50%; font-size:16px; color:var(--teal);">+</button>
    </div>
  `;
}

export async function renderDanas(root, go) {
  const now = new Date();
  const todayIso = isoDate(now);
  const startDate = await getSetting('fodmapStartDate', todayIso);
  const schedule = computeSchedule(startDate);

  const { items, logsToday } = await loadTherapyData(todayIso);
  const { map, prn } = groupByBlock(items);
  const stats = blockStats(map, logsToday);

  const totalItems = BLOCK_ORDER.reduce((s, b) => s + stats[b].total, 0);
  const totalTaken = BLOCK_ORDER.reduce((s, b) => s + stats[b].taken, 0);
  const pct = totalItems ? (totalTaken / totalItems) * 100 : 0;

  const cb = currentBlock(now);
  const nb = nextBlock(cb);
  const nodeStates = BLOCK_ORDER.map(b => {
    if (stats[b].total > 0 && stats[b].taken === stats[b].total) return 'complete';
    if (b === cb) return 'current';
    return 'plain';
  });

  const prnCounts = await allPrnCountsToday(prn, now);
  const prnItemCounts = {};
  for (const it of prn) {
    prnItemCounts[it.id] = await prnCountsForItem(it.id, now);
  }

  root.innerHTML = `
    <div class="eyebrow">Lični dnevnik</div>
    <div class="pagetitle">Dnevnik ritma</div>
    <div class="pagesub">${formatLongDate(now)}</div>

    <div class="rhythm-card">
      <div class="rhythm-header"><h2>Današnji ritam</h2><div class="frac"><b>${totalTaken}</b>/${totalItems} stavki</div></div>
      <div class="arc-wrap">${arcSvg(pct, nodeStates)}</div>
      <div class="rhythm-labels">
        ${BLOCK_ORDER.map(b => `<div class="rlabel ${b === cb ? 'active' : ''}">${b}</div>`).join('')}
      </div>
      <div class="phase-pill"><span class="dot"></span>${esc(phaseLabel(schedule, todayIso))}</div>
      <div class="prn-row">
        <div class="prn-box"><div class="n">${prnCounts.today}</div><div class="l">Danas</div></div>
        <div class="prn-box"><div class="n">${prnCounts.week}</div><div class="l">Ova nedelja</div></div>
        <div class="prn-box"><div class="n">${prnCounts.month}</div><div class="l">Ovaj mesec</div></div>
      </div>
    </div>

    <div class="card" style="margin-top:14px;">
      <h2>Terapija — ${cb} i ${nb}</h2>
      <div class="hint">Svaka stavka ima svoj podsetnik u tačno svoje vreme. Tapni 🔔 da uključiš/isključiš za tu stavku.</div>

      <div class="block-label">${cb}</div>
      ${map[cb].length ? map[cb].map(it => medRow(it, !!logsToday[it.id], todayIso)).join('') : '<div class="empty-hint">Nema stavki za ovaj blok</div>'}

      <div class="block-label">${nb}</div>
      ${map[nb].length ? map[nb].map(it => medRow(it, !!logsToday[it.id], todayIso)).join('') : '<div class="empty-hint">Nema stavki za ovaj blok</div>'}

      ${prn.length ? `
        <div class="block-label">Po potrebi</div>
        ${prn.map(it => prnRow(it, prnItemCounts[it.id].today)).join('')}
      ` : ''}

      <button class="addmed-btn" data-action="add">+ Dodaj lek ili suplement</button>
    </div>

    <div class="card cta-card">
      <h2>Kako je bilo danas?</h2>
      <div class="hint">30 sekundi je dovoljno.</div>
      <button class="save-btn light" data-action="go-symptoms">+ Unesi simptom</button>
    </div>
  `;

  root.querySelectorAll('[data-action="toggle-taken"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await toggleTherapyTaken(btn.dataset.id, todayIso);
      renderDanas(root, go);
    });
  });
  root.querySelectorAll('[data-action="toggle-bell"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const item = await store.get('therapyItems', btn.dataset.id);
      item.podsetnik_ukljucen = !item.podsetnik_ukljucen;
      await store.put('therapyItems', item);
      scheduleAllReminders();
      renderDanas(root, go);
    });
  });
  root.querySelectorAll('[data-action="log-prn"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await logPrnUse(btn.dataset.id);
      toast('Zabeleženo');
      renderDanas(root, go);
    });
  });
  root.querySelectorAll('[data-action="unlog-prn"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await removeLastPrnUse(btn.dataset.id);
      toast('Uklonjeno');
      renderDanas(root, go);
    });
  });
  root.querySelectorAll('[data-action="edit"]').forEach(el => {
    el.addEventListener('click', async () => {
      const item = await store.get('therapyItems', el.dataset.id);
      openTherapyForm(item, () => renderDanas(root, go));
    });
  });
  root.querySelector('[data-action="add"]').addEventListener('click', () => {
    openTherapyForm(null, () => renderDanas(root, go));
  });
  root.querySelector('[data-action="go-symptoms"]').addEventListener('click', () => go('simptomi'));
}
