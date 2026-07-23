import { esc } from '../utils/html.js';
import { getSetting, store } from '../db.js';
import { isoDate, formatShortDate } from '../utils/date.js';
import { computeSchedule, getPhase, testSuggestion, totalReintroDay, totalReintroDays, ELIMINATION_DAYS } from '../utils/fodmap.js';
import { setNavContext } from '../navContext.js';
import { toast } from '../toast.js';
import { requestPermission } from '../notifications.js';

const VERDICT_LABEL = {
  podnosi: 'podnosim dobro',
  delimicno: 'delimično podnosim',
  ne_podnosi: 'ne podnosim dobro',
};
const VERDICT_CLASS = { podnosi: 'ok', delimicno: 'mid', ne_podnosi: 'bad' };

function todayTaskCard(schedule, phase, todayIso) {
  if (phase.phase === 'pre') {
    return `<div class="today-task"><div class="tag">Uskoro</div><h2>Plan počinje ${esc(formatShortDate(schedule.eliminationStart))}</h2></div>`;
  }
  if (phase.phase === 'elimination') {
    const week = Math.ceil(phase.dayNum / 7);
    const segs = Array.from({ length: 6 }, (_, i) => `<span class="${i < week ? 'on' : ''}"></span>`).join('');
    return `
      <div class="today-task">
        <div class="tag">Faza eliminacije</div>
        <h2>Dan ${phase.dayNum} od ${ELIMINATION_DAYS}</h2>
        <div class="desc">Izbegavaj namirnice iz svih FODMAP grupa. Prati simptome — ovo je osnova za poređenje kad počne testiranje.</div>
        <div class="dayprog">${segs}</div>
        <div class="btnrow">
          <button class="primarybtn" data-action="go-symptoms">Unesi simptome</button>
        </div>
      </div>
    `;
  }
  if (phase.phase === 'testing') {
    const segs = Array.from({ length: 3 }, (_, i) => `<span class="${i < phase.dayNum ? 'on' : ''}"></span>`).join('');
    const suggestion = testSuggestion(phase.group.index, phase.dayNum);
    return `
      <div class="today-task">
        <div class="tag">Zadatak za danas</div>
        <h2>Dan ${phase.dayNum} od 3 — ${esc(phase.group.name)}</h2>
        <div class="desc">Unesi ${esc(suggestion)} uz obrok. Prati simptome narednih 4–6h.</div>
        <div class="dayprog">${segs}</div>
        <div class="btnrow">
          <button class="primarybtn" data-action="go-symptoms" data-group="${phase.group.index}" data-groupname="${esc(phase.group.name)}" data-day="${phase.dayNum}">Unesi simptome</button>
          <button class="ghostbtn" data-action="remind-me" data-groupname="${esc(phase.group.name)}">Podseti me</button>
        </div>
      </div>
    `;
  }
  if (phase.phase === 'pause') {
    const nextIdx = phase.group.index + 1;
    const nextGroup = schedule.groups[nextIdx];
    const segs = Array.from({ length: 3 }, (_, i) => `<span class="${i < phase.dayNum ? 'on' : ''}"></span>`).join('');
    return `
      <div class="today-task">
        <div class="tag">Pauza</div>
        <h2>Dan ${phase.dayNum} od 3 — pauza</h2>
        <div class="desc">Nema testiranja danas. ${nextGroup ? `Sledeća grupa — ${esc(nextGroup.name)} — počinje ${esc(formatShortDate(nextGroup.testStart))}.` : 'Ovo je poslednja pauza pre finalne tabele.'}</div>
        <div class="dayprog">${segs}</div>
        <div class="btnrow">
          <button class="primarybtn" data-action="go-symptoms">Unesi simptome</button>
        </div>
      </div>
    `;
  }
  return `
    <div class="today-task">
      <div class="tag">Plan gotov</div>
      <h2>Faza personalizacije</h2>
      <div class="desc">Sve grupe su testirane. Pogledaj finalnu tabelu ispod da vidiš šta dobro podnosiš.</div>
    </div>
  `;
}

function pathHtml(schedule, phase, verdicts) {
  const eliminationDone = phase.phase !== 'elimination' && phase.phase !== 'pre';
  const eliminationCurrent = phase.phase === 'elimination';
  let steps = `
    <div class="pstep ${eliminationDone ? 'done' : eliminationCurrent ? 'current' : ''}">
      <div class="pnode">${eliminationDone ? '✓' : '1'}</div>
      <div class="pcontent">
        <h3>Faza eliminacije</h3>
        <div class="when">${esc(formatShortDate(schedule.eliminationStart))} — ${esc(formatShortDate(schedule.eliminationEnd))}</div>
        <p>${eliminationDone ? 'Završeno.' : `${ELIMINATION_DAYS} dana bez FODMAP namirnica.`}</p>
      </div>
    </div>
  `;
  schedule.groups.forEach((g, i) => {
    const isCurrent = (phase.phase === 'testing' || phase.phase === 'pause') && phase.group.index === i;
    const isDone = phase.phase === 'done' || (phase.phase === 'testing' && phase.group.index > i) || (phase.phase === 'pause' && phase.group.index >= i);
    const verdict = verdicts[i];
    steps += `
      <div class="pstep ${isDone ? 'done' : isCurrent ? 'current' : ''}">
        <div class="pnode">${isDone ? '✓' : i + 2}</div>
        <div class="pcontent">
          <h3>Grupa ${i + 1} — ${esc(g.name)}</h3>
          <div class="when">${esc(formatShortDate(g.testStart))} — ${esc(formatShortDate(g.testEnd))}</div>
          <p>${esc(g.primer)}</p>
          ${verdict ? `<span class="verdict ${VERDICT_CLASS[verdict.verdict]}">${VERDICT_LABEL[verdict.verdict]}</span>` : ''}
        </div>
      </div>
    `;
  });
  return steps;
}

function verdictEntryHtml(group, verdict) {
  return `
    <div class="card" data-verdict-card="${group.index}">
      <h2>Verdikt — ${esc(group.name)}</h2>
      <div class="hint">Kako je organizam reagovao na ${esc(group.name.toLowerCase())}?</div>
      <div class="verdict-btns">
        <button data-verdict="podnosi" data-group="${group.index}" class="${verdict?.verdict === 'podnosi' ? 'sel-ok' : ''}">Podnosim</button>
        <button data-verdict="delimicno" data-group="${group.index}" class="${verdict?.verdict === 'delimicno' ? 'sel-mid' : ''}">Delimično</button>
        <button data-verdict="ne_podnosi" data-group="${group.index}" class="${verdict?.verdict === 'ne_podnosi' ? 'sel-bad' : ''}">Ne podnosim</button>
      </div>
      <textarea class="note-input" data-note="${group.index}" rows="2" maxlength="200" placeholder="Beleška (opciono)">${esc(verdict?.beleska || '')}</textarea>
      <button class="save-btn" data-save-verdict="${group.index}" style="margin-top:10px;">Sačuvaj verdikt</button>
    </div>
  `;
}

export async function renderFodmap(root, go) {
  const todayIso = isoDate(new Date());
  const startDate = await getSetting('fodmapStartDate', todayIso);
  const schedule = computeSchedule(startDate);
  const phase = getPhase(schedule, todayIso);

  const verdictRows = await store.getAll('fodmapVerdicts');
  const verdicts = {};
  for (const v of verdictRows) verdicts[v.groupIndex] = v;

  const totalDay = totalReintroDay(schedule, todayIso);
  const totalDays = totalReintroDays(schedule);
  const subtitle = phase.phase === 'elimination'
    ? `Faza eliminacije, dan ${phase.dayNum} od ${ELIMINATION_DAYS}`
    : (totalDay > 0 ? `Faza reintrodukcije, dan ${totalDay} od ${totalDays}` : 'Priprema plana');

  // groups awaiting a verdict: test period has ended and no verdict yet, OR currently testing (allow early entry from day 3)
  const awaitingGroups = schedule.groups.filter((g) => {
    if (verdicts[g.index]) return false;
    if (todayIso < g.testStart) return false;
    const dayNum = phase.phase === 'testing' && phase.group.index === g.index ? phase.dayNum : null;
    return todayIso > g.testEnd || (dayNum && dayNum >= 3);
  });

  const testedGroups = schedule.groups.filter((g) => todayIso >= g.testStart);

  root.innerHTML = `
    <div class="eyebrow">Plan</div>
    <div class="pagetitle">FODMAP raspored</div>
    <div class="pagesub">${esc(subtitle)}</div>

    ${todayTaskCard(schedule, phase, todayIso)}

    <div class="card">
      <h2>Put testiranja</h2>
      <div class="path">${pathHtml(schedule, phase, verdicts)}</div>
    </div>

    ${awaitingGroups.map(g => verdictEntryHtml(g, verdicts[g.index])).join('')}

    <div class="card">
      <h2>Do sada testirano</h2>
      ${testedGroups.length ? testedGroups.map(g => `
        <div class="verdict-row">
          <span style="font-size:13px;">${esc(g.name)}</span>
          ${verdicts[g.index]
            ? `<span class="verdict ${VERDICT_CLASS[verdicts[g.index].verdict]}">${VERDICT_LABEL[verdicts[g.index].verdict]}</span>`
            : '<span class="verdict mid">čeka verdikt</span>'}
        </div>
      `).join('') : '<div class="empty-hint">Još ništa nije testirano</div>'}
    </div>

    ${phase.phase === 'done' ? `
      <div class="card">
        <h2>Finalna tabela</h2>
        <div class="hint">Personalizacija — ovo su namirnice koje možeš da vratiš u ishranu</div>
        ${schedule.groups.map(g => `
          <div class="verdict-row">
            <span style="font-size:13px;">${esc(g.name)} <span style="color:var(--ink-faint);">— ${esc(g.primer)}</span></span>
            <span class="verdict ${VERDICT_CLASS[verdicts[g.index]?.verdict] || 'mid'}">${verdicts[g.index] ? VERDICT_LABEL[verdicts[g.index].verdict] : '—'}</span>
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;

  root.querySelectorAll('[data-action="go-symptoms"]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.groupname) {
        setNavContext({ fodmapTest: { groupName: btn.dataset.groupname, day: btn.dataset.day } });
      }
      go('simptomi');
    });
  });

  const remindBtn = root.querySelector('[data-action="remind-me"]');
  if (remindBtn) {
    remindBtn.addEventListener('click', async () => {
      const perm = await requestPermission();
      if (perm !== 'granted') {
        toast('Dozvoli notifikacije da bi podsetnik radio');
        return;
      }
      setTimeout(() => {
        try {
          new Notification('Dnevnik ritma', { body: `Vreme je da uneseš simptome — ${remindBtn.dataset.groupname}`, icon: '/icons/icon-192.png' });
        } catch { /* ignore */ }
      }, 4 * 60 * 60 * 1000);
      toast('Podsetnik zakazan za 4h (dok je app otvoren)');
    });
  }

  root.querySelectorAll('[data-verdict]').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = root.querySelector(`[data-verdict-card="${btn.dataset.group}"]`);
      card.querySelectorAll('[data-verdict]').forEach(b => b.className = '');
      const map = { podnosi: 'sel-ok', delimicno: 'sel-mid', ne_podnosi: 'sel-bad' };
      btn.className = map[btn.dataset.verdict];
      card.dataset.pending = btn.dataset.verdict;
    });
  });
  root.querySelectorAll('[data-save-verdict]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const groupIndex = Number(btn.dataset.saveVerdict);
      const card = root.querySelector(`[data-verdict-card="${groupIndex}"]`);
      const pending = card.dataset.pending || verdicts[groupIndex]?.verdict;
      if (!pending) { toast('Izaberi verdikt'); return; }
      const note = card.querySelector('[data-note]').value.trim();
      await store.put('fodmapVerdicts', { groupIndex, verdict: pending, beleska: note, timestamp: Date.now() });
      toast('Verdikt sačuvan');
      renderFodmap(root, go);
    });
  });
}
