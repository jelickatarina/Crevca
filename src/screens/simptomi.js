import { esc } from '../utils/html.js';
import { store, uid } from '../db.js';
import { isoDate, formatTime, addDays } from '../utils/date.js';
import { SYMPTOMS, BRISTOL_TYPES } from '../data/symptoms.js';
import { stoolStatsForRange, todayMaxBySymptom } from '../utils/stats.js';
import { toast } from '../toast.js';
import { consumeNavContext } from '../navContext.js';

function severityColor(v) {
  if (v === null || v === undefined) return 'var(--line)';
  if (v <= 3) return 'var(--teal)';
  if (v <= 6) return 'var(--gold)';
  return 'var(--red-soft)';
}

function dotBar(value) {
  let dots = '';
  for (let i = 1; i <= 10; i++) {
    const on = value !== null && value !== undefined && i <= value;
    dots += `<i style="${on ? `background:${severityColor(value)};` : ''}"></i>`;
  }
  return `<div class="dot-bar">${dots}</div>`;
}

let selectedBristol = 4;
let sliderSymptom = null;

export async function renderSimptomi(root, go) {
  const now = new Date();
  const todayIso = isoDate(now);
  const weekAgo = addDays(todayIso, -6);

  const stoolWeek = await stoolStatsForRange(weekAgo, todayIso);
  const stoolToday = await stoolStatsForRange(todayIso, todayIso);
  const todayMax = await todayMaxBySymptom(todayIso);

  const navCtx = consumeNavContext();
  const fodmapLinked = navCtx?.fodmapTest || null;
  if (!sliderSymptom) sliderSymptom = SYMPTOMS[0];

  const allToday = [
    ...(await store.getAll('symptomEntries')),
    ...(await store.getAll('stoolEntries')).map((s) => ({ ...s, __stool: true })),
  ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 40);

  root.innerHTML = `
    <div class="eyebrow">Dnevnik</div>
    <div class="pagetitle">Simptomi</div>
    <div class="pagesub">Tapni na simptom da uneseš jačinu 1–10</div>

    ${fodmapLinked ? `<div class="phase-banner" style="margin-top:14px;"><b>Vezano za FODMAP test</b>Sledeći unos simptoma biće označen kao vezan za ${esc(fodmapLinked.groupName)}, dan ${fodmapLinked.day}.</div>` : ''}

    <div class="card stool-card" style="margin-top:14px;">
      <div class="symname">Stolica — tip i broj danas</div>
      <div class="bristol-row">
        ${BRISTOL_TYPES.map(b => `
          <button class="bristol-chip ${selectedBristol === b.tip ? 'sel' : ''}" data-tip="${b.tip}" title="${esc(b.desc)}">
            <div class="num">${b.tip}</div><div class="lbl">${esc(b.label)}</div>
          </button>
        `).join('')}
      </div>
      <div class="count-stepper">
        <button id="stool-minus" ${stoolToday.count === 0 ? 'disabled' : ''}>–</button>
        <div><div class="n">${stoolToday.count}</div><div class="lbl">danas</div></div>
        <button id="stool-plus">+</button>
      </div>
    </div>

    <div class="stool-tile">
      <div class="l">Ova nedelja</div>
      <div class="r">
        <div class="stat"><b>${stoolWeek.avgPerDay.toFixed(1)}</b><span>prosek/dan</span></div>
        <div class="stat"><b>${stoolWeek.mostCommon ? `Tip ${stoolWeek.mostCommon}` : '—'}</b><span>najčešće</span></div>
        <div class="stat"><b>${stoolWeek.wateryDays}</b><span>vodenasto dana</span></div>
      </div>
    </div>

    <div class="card">
      <div class="slider-card">
        <select class="symname-select" id="sym-select">
          ${SYMPTOMS.map(s => `<option value="${esc(s)}" ${s === sliderSymptom ? 'selected' : ''}>${esc(s)}</option>`).join('')}
        </select>
        <div class="bigval" id="sym-bigval" style="color:${severityColor(5)};">5</div>
        <div class="slider-track">
          <input type="range" min="1" max="10" step="1" value="5" id="sym-slider" />
        </div>
        <div class="slider-scale"><span>1</span><span>3</span><span>5</span><span>7</span><span>10</span></div>
        <div class="chk-row">
          <label><input type="checkbox" id="chk-kofein" /> Kofein danas</label>
          <label><input type="checkbox" id="chk-alkohol" /> Alkohol danas</label>
        </div>
        <textarea class="note-input" id="sym-note" rows="2" maxlength="200" placeholder="Beleška (opciono), npr. posle kafe"></textarea>
      </div>
      <button class="save-btn" id="sym-save">Sačuvaj — ${formatTime(now)}</button>
    </div>

    <div class="symptom-grid">
      ${SYMPTOMS.map(s => {
        const v = todayMax[s];
        return `
          <button class="sym-tile" data-symptom="${esc(s)}">
            <div class="name">${esc(s)}</div>
            <div class="valrow">
              ${v === undefined ? '<div class="val none">—</div>' : `<div class="val" style="color:${severityColor(v)};">${v}</div><div class="max">danas maks</div>`}
            </div>
            ${dotBar(v)}
          </button>
        `;
      }).join('')}
    </div>

    <div class="card">
      <h2>Istorija unosa</h2>
      <div class="hint">Najnovije prvo</div>
      ${allToday.length ? allToday.map(entryRow).join('') : '<div class="empty-hint">Još nema unosa</div>'}
    </div>
  `;

  // bristol selection
  root.querySelectorAll('.bristol-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      selectedBristol = Number(chip.dataset.tip);
      renderSimptomi(root, go);
    });
  });
  root.querySelector('#stool-plus').addEventListener('click', async () => {
    await store.put('stoolEntries', { id: uid(), bristolTip: selectedBristol, timestamp: Date.now() });
    toast('Zabeleženo');
    renderSimptomi(root, go);
  });
  const minusBtn = root.querySelector('#stool-minus');
  if (minusBtn) {
    minusBtn.addEventListener('click', async () => {
      const todays = (await store.getAll('stoolEntries')).filter(e => isoDate(new Date(e.timestamp)) === todayIso);
      if (!todays.length) return;
      todays.sort((a, b) => b.timestamp - a.timestamp);
      await store.delete('stoolEntries', todays[0].id);
      renderSimptomi(root, go);
    });
  }

  // symptom slider
  const select = root.querySelector('#sym-select');
  const slider = root.querySelector('#sym-slider');
  const bigval = root.querySelector('#sym-bigval');
  select.addEventListener('change', () => { sliderSymptom = select.value; });
  slider.addEventListener('input', () => {
    bigval.textContent = slider.value;
    bigval.style.color = severityColor(Number(slider.value));
  });
  root.querySelector('#sym-save').addEventListener('click', async () => {
    const record = {
      id: uid(),
      simptom: select.value,
      jacina: Number(slider.value),
      timestamp: Date.now(),
      beleska: root.querySelector('#sym-note').value.trim(),
      kofein: root.querySelector('#chk-kofein').checked,
      alkohol: root.querySelector('#chk-alkohol').checked,
      fodmapTest: fodmapLinked || null,
    };
    await store.put('symptomEntries', record);
    toast('Sačuvano');
    renderSimptomi(root, go);
  });

  root.querySelectorAll('.sym-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      sliderSymptom = tile.dataset.symptom;
      renderSimptomi(root, go);
      requestAnimationFrame(() => {
        root.querySelector('#sym-select').scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
  });

  root.querySelectorAll('[data-del-symptom]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await store.delete('symptomEntries', btn.dataset.delSymptom);
      renderSimptomi(root, go);
    });
  });
  root.querySelectorAll('[data-del-stool]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await store.delete('stoolEntries', btn.dataset.delStool);
      renderSimptomi(root, go);
    });
  });
}

function entryRow(e) {
  const d = new Date(e.timestamp);
  const time = formatTime(d);
  if (e.__stool) {
    const bt = BRISTOL_TYPES.find(b => b.tip === e.bristolTip);
    return `
      <div class="hist-row">
        <div class="hist-dot" style="background:var(--coral-deep);"></div>
        <div class="hist-main">
          <div class="hist-title">Stolica — tip ${e.bristolTip} (${esc(bt?.label || '')})</div>
          <div class="hist-sub">${time}</div>
        </div>
        <button class="hist-del" data-del-stool="${e.id}">✕</button>
      </div>
    `;
  }
  return `
    <div class="hist-row">
      <div class="hist-dot" style="background:${severityColor(e.jacina)};"></div>
      <div class="hist-main">
        <div class="hist-title">${esc(e.simptom)}</div>
        <div class="hist-sub">${time}${e.beleska ? ' · ' + esc(e.beleska) : ''}${e.fodmapTest ? ' · FODMAP test' : ''}</div>
      </div>
      <div class="hist-val">${e.jacina}</div>
      <button class="hist-del" data-del-symptom="${e.id}">✕</button>
    </div>
  `;
}
