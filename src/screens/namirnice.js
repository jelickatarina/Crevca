import { esc } from '../utils/html.js';
import { store, uid, getSetting } from '../db.js';
import { isoDate } from '../utils/date.js';
import { computeSchedule, getPhase, foodStatus } from '../utils/fodmap.js';
import { CATEGORIES } from '../data/foods.js';
import { openModal, closeModal } from '../components/modal.js';
import { toast } from '../toast.js';

let query = '';
let activeCategory = 'Sve';

function phaseBanner(phase) {
  if (phase.phase === 'elimination') {
    return { title: 'Faza eliminacije', body: 'Sve FODMAP grupe se trenutno izbegavaju. Namirnice ispod su označene prema tome šta je uvek nisko-FODMAP i šta čeka testiranje.' };
  }
  if (phase.phase === 'testing') {
    return { title: `Faza reintrodukcije — testiraš ${phase.group.name.toLowerCase()}`, body: `Sve ostale grupe i dalje drži na "izbegavaj" dok ne dođeš na njih. ${phase.group.name} su danas markirane posebno ispod.` };
  }
  if (phase.phase === 'pause') {
    return { title: 'Pauza između grupa', body: 'Nastavi da izbegavaš netestirane grupe do kraja pauze.' };
  }
  if (phase.phase === 'done') {
    return { title: 'Plan završen', body: 'Liste ispod odražavaju tvoje verdikte iz testiranja.' };
  }
  return { title: 'Plan uskoro počinje', body: '' };
}

function buildSections(foods, phase) {
  const q = query.trim().toLowerCase();
  let filtered = foods.filter((f) => !q || f.naziv.toLowerCase().includes(q));

  if (activeCategory === 'Testiram sada') {
    if (phase.phase !== 'testing') return { sections: [], emptyMsg: 'Trenutno se ne testira nijedna grupa.' };
    filtered = filtered.filter((f) => f.fodmap_grupa === phase.group.index);
    return { sections: filtered.length ? [{ title: `Testiraš sada — ${phase.group.name}`, items: filtered }] : [], emptyMsg: filtered.length ? null : 'Nema rezultata.' };
  }
  if (activeCategory !== 'Sve') {
    filtered = filtered.filter((f) => f.kategorija === activeCategory);
    return { sections: filtered.length ? [{ title: activeCategory, items: filtered }] : [], emptyMsg: filtered.length ? null : 'Nema rezultata.' };
  }
  const sections = [];
  if (phase.phase === 'testing') {
    const testing = filtered.filter((f) => f.fodmap_grupa === phase.group.index);
    if (testing.length) sections.push({ title: `Testiraš sada — ${phase.group.name}`, items: testing });
  }
  const remaining = filtered.filter((f) => !(phase.phase === 'testing' && f.fodmap_grupa === phase.group.index));
  const byCategory = {};
  for (const f of remaining) {
    (byCategory[f.kategorija] ||= []).push(f);
  }
  for (const cat of Object.keys(byCategory).sort()) {
    sections.push({ title: cat, items: byCategory[cat] });
  }
  return { sections, emptyMsg: sections.length ? null : 'Nema rezultata.' };
}

function foodRowHtml(food, schedule, verdicts, todayIso) {
  if (food.custom) {
    return `
      <div class="food-row" data-edit-food="${food.id}" style="cursor:pointer;">
        <div>
          <div class="food-name">${esc(food.naziv)}</div>
          ${food.napomena_o_kolicini ? `<div class="food-note">${esc(food.napomena_o_kolicini)}</div>` : ''}
        </div>
        <span class="food-tag custom">lična beleška</span>
      </div>
    `;
  }
  const status = foodStatus(food, schedule, verdicts, todayIso);
  return `
    <div class="food-row">
      <div>
        <div class="food-name">${esc(food.naziv)}</div>
        ${food.napomena_o_kolicini ? `<div class="food-note">${esc(food.napomena_o_kolicini)}</div>` : ''}
      </div>
      <span class="food-tag ${status.key}">${esc(status.label)}</span>
    </div>
  `;
}

function openFoodModal(food, onDone) {
  const isEdit = !!food;
  openModal(`
    <div class="modal-head"><h2>${isEdit ? 'Izmeni namirnicu' : 'Dodaj namirnicu'}</h2><button class="modal-close" data-close>✕</button></div>
    <form id="food-form">
      <div class="field"><label>Naziv</label><input type="text" name="naziv" required maxlength="60" placeholder="npr. Kokosovo mleko" value="${esc(food?.naziv || '')}" /></div>
      <div class="field">
        <label>Kategorija</label>
        <select name="kategorija">${CATEGORIES.map(c => `<option value="${esc(c)}" ${food?.kategorija === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
      </div>
      <div class="field"><label>Napomena</label><textarea name="napomena" rows="2" maxlength="200" placeholder="Lična napomena (opciono)">${esc(food?.napomena_o_kolicini || '')}</textarea></div>
      <div class="modal-actions">
        ${isEdit ? '<button type="button" class="btn-danger" id="del-food" style="flex:1;">Obriši</button>' : ''}
        <button type="submit" class="save-btn" style="flex:${isEdit ? 2 : 1};">${isEdit ? 'Sačuvaj' : 'Dodaj'}</button>
      </div>
    </form>
  `, {
    onMount(sheet) {
      sheet.querySelector('[data-close]').addEventListener('click', closeModal);
      if (isEdit) {
        sheet.querySelector('#del-food').addEventListener('click', async () => {
          if (!confirm(`Obrisati "${food.naziv}"?`)) return;
          await store.delete('foods', food.id);
          closeModal();
          toast('Namirnica obrisana');
          onDone?.();
        });
      }
      sheet.querySelector('#food-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const naziv = fd.get('naziv').trim();
        if (!naziv) return;
        const record = isEdit ? { ...food } : {
          id: uid(), fodmap_grupa: null, portion_safe: false, custom: true,
        };
        record.naziv = naziv;
        record.kategorija = fd.get('kategorija');
        record.napomena_o_kolicini = fd.get('napomena').trim() || null;
        await store.put('foods', record);
        closeModal();
        toast(isEdit ? 'Sačuvano' : 'Namirnica dodata');
        onDone?.();
      });
    },
  });
}

export async function renderNamirnice(root, go) {
  const todayIso = isoDate(new Date());
  const startDate = await getSetting('fodmapStartDate', todayIso);
  const schedule = computeSchedule(startDate);
  const phase = getPhase(schedule, todayIso);

  const verdictRows = await store.getAll('fodmapVerdicts');
  const verdicts = {};
  for (const v of verdictRows) verdicts[v.groupIndex] = v;

  const foods = (await store.getAll('foods')).sort((a, b) => a.naziv.localeCompare(b.naziv, 'sr'));
  const { sections, emptyMsg } = buildSections(foods, phase);
  const banner = phaseBanner(phase);

  const chips = ['Sve', 'Testiram sada', ...CATEGORIES];

  root.innerHTML = `
    <div class="eyebrow">Vodič</div>
    <div class="pagetitle">Šta smem, šta ne</div>
    <div class="pagesub">Prilagođeno tvojoj trenutnoj fazi</div>

    <div class="phase-banner" style="margin-top:14px;"><b>${esc(banner.title)}</b>${esc(banner.body)}</div>

    <div class="searchbar">
      <span>🔍</span>
      <input placeholder="Pretraži namirnicu, npr. luk" id="food-search" value="${esc(query)}" />
    </div>

    <div class="catchips">
      ${chips.map(c => `<div class="catchip ${activeCategory === c ? 'active' : ''}" data-cat="${esc(c)}">${esc(c)}</div>`).join('')}
    </div>

    <div class="card">
      ${sections.map(sec => `
        <div class="food-group-title">${esc(sec.title)}</div>
        ${sec.items.map(f => foodRowHtml(f, schedule, verdicts, todayIso)).join('')}
      `).join('') || `<div class="empty-hint">${esc(emptyMsg || 'Nema rezultata')}</div>`}
    </div>

    <div class="card">
      <h2>Predloži dopunu</h2>
      <div class="hint">Ne vidiš namirnicu koju tražiš? Dodaj je ručno, sa svojom napomenom.</div>
      <button class="addmed-btn" id="add-food">+ Dodaj namirnicu</button>
    </div>
  `;

  const searchInput = root.querySelector('#food-search');
  searchInput.addEventListener('input', () => {
    query = searchInput.value;
    const cursorPos = searchInput.selectionStart;
    renderNamirnice(root, go).then(() => {
      const newInput = root.querySelector('#food-search');
      newInput.focus();
      newInput.setSelectionRange(cursorPos, cursorPos);
    });
  });
  root.querySelectorAll('.catchip').forEach(chip => {
    chip.addEventListener('click', () => {
      activeCategory = chip.dataset.cat;
      renderNamirnice(root, go);
    });
  });
  root.querySelector('#add-food').addEventListener('click', () => {
    openFoodModal(null, () => renderNamirnice(root, go));
  });
  root.querySelectorAll('[data-edit-food]').forEach(el => {
    el.addEventListener('click', async () => {
      const food = await store.get('foods', el.dataset.editFood);
      if (food) openFoodModal(food, () => renderNamirnice(root, go));
    });
  });
}
