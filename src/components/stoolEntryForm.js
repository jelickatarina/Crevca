import { openModal, closeModal } from './modal.js';
import { store } from '../db.js';
import { esc } from '../utils/html.js';
import { toast } from '../toast.js';
import { isoDate, formatTime } from '../utils/date.js';
import { BRISTOL_TYPES } from '../data/symptoms.js';

export function openStoolEntryForm(entry, onDone) {
  const d = new Date(entry.timestamp);
  const dateVal = isoDate(d);
  const timeVal = formatTime(d);

  const sheet = openModal(`
    <div class="modal-head">
      <h2>Izmeni unos stolice</h2>
      <button class="modal-close" data-close>✕</button>
    </div>
    <form id="stool-edit-form">
      <div class="field">
        <label>Bristol tip</label>
        <div class="bristol-row">
          ${BRISTOL_TYPES.map(b => `
            <button type="button" class="bristol-chip ${entry.bristolTip === b.tip ? 'sel' : ''}" data-tip="${b.tip}" title="${esc(b.desc)}">
              <div class="num">${b.tip}</div><div class="lbl">${esc(b.label)}</div>
            </button>
          `).join('')}
        </div>
        <input type="hidden" name="bristolTip" value="${entry.bristolTip}" />
      </div>
      <div class="field" style="display:flex; gap:10px;">
        <div style="flex:1;">
          <label>Datum</label>
          <input type="date" name="datum" value="${dateVal}" />
        </div>
        <div style="flex:1;">
          <label>Vreme</label>
          <input type="time" name="vreme" value="${timeVal}" />
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-danger" id="del-stool-entry" style="flex:1;">Obriši</button>
        <button type="submit" class="save-btn" style="flex:2;">Sačuvaj</button>
      </div>
    </form>
  `, {
    onMount(sheet) {
      const form = sheet.querySelector('#stool-edit-form');
      const hiddenTip = form.querySelector('input[name=bristolTip]');
      sheet.querySelectorAll('.bristol-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          sheet.querySelectorAll('.bristol-chip').forEach(c => c.classList.remove('sel'));
          chip.classList.add('sel');
          hiddenTip.value = chip.dataset.tip;
        });
      });
      sheet.querySelector('[data-close]').addEventListener('click', closeModal);

      sheet.querySelector('#del-stool-entry').addEventListener('click', async () => {
        await store.delete('stoolEntries', entry.id);
        closeModal();
        toast('Obrisano');
        onDone?.();
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const datum = fd.get('datum');
        const vreme = fd.get('vreme');
        const [h, m] = vreme.split(':').map(Number);
        const [y, mo, da] = datum.split('-').map(Number);
        const newDate = new Date(y, mo - 1, da, h, m, 0, 0);
        const record = {
          ...entry,
          bristolTip: Number(fd.get('bristolTip')),
          timestamp: newDate.getTime(),
        };
        await store.put('stoolEntries', record);
        closeModal();
        toast('Sačuvano');
        onDone?.();
      });
    },
  });
  return sheet;
}
