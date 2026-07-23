import { openModal, closeModal } from './modal.js';
import { store } from '../db.js';
import { esc } from '../utils/html.js';
import { toast } from '../toast.js';
import { isoDate, formatTime } from '../utils/date.js';
import { SYMPTOMS } from '../data/symptoms.js';

export function openSymptomEntryForm(entry, onDone) {
  const d = new Date(entry.timestamp);
  const dateVal = isoDate(d);
  const timeVal = formatTime(d);

  const sheet = openModal(`
    <div class="modal-head">
      <h2>Izmeni unos simptoma</h2>
      <button class="modal-close" data-close>✕</button>
    </div>
    <form id="symptom-edit-form">
      <div class="field">
        <label>Simptom</label>
        <select name="simptom">
          ${SYMPTOMS.map(s => `<option value="${esc(s)}" ${s === entry.simptom ? 'selected' : ''}>${esc(s)}</option>`).join('')}
        </select>
      </div>
      <div class="slider-card" style="margin-bottom:14px;">
        <div class="bigval" id="edit-bigval">${entry.jacina}</div>
        <div class="slider-track">
          <input type="range" min="1" max="10" step="1" value="${entry.jacina}" id="edit-slider" />
        </div>
        <div class="slider-scale"><span>1</span><span>3</span><span>5</span><span>7</span><span>10</span></div>
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
      <div class="field switch-row" style="margin-bottom:10px;">
        <span>Kofein danas</span>
        <label class="switch"><input type="checkbox" name="kofein" ${entry.kofein ? 'checked' : ''} /><span class="track"></span></label>
      </div>
      <div class="field switch-row">
        <span>Alkohol danas</span>
        <label class="switch"><input type="checkbox" name="alkohol" ${entry.alkohol ? 'checked' : ''} /><span class="track"></span></label>
      </div>
      <div class="field">
        <label>Beleška</label>
        <textarea name="beleska" rows="2" maxlength="200" placeholder="Opciono">${esc(entry.beleska || '')}</textarea>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-danger" id="del-symptom-entry" style="flex:1;">Obriši</button>
        <button type="submit" class="save-btn" style="flex:2;">Sačuvaj</button>
      </div>
    </form>
  `, {
    onMount(sheet) {
      const form = sheet.querySelector('#symptom-edit-form');
      const slider = form.querySelector('#edit-slider');
      const bigval = form.querySelector('#edit-bigval');
      slider.addEventListener('input', () => { bigval.textContent = slider.value; });
      sheet.querySelector('[data-close]').addEventListener('click', closeModal);

      sheet.querySelector('#del-symptom-entry').addEventListener('click', async () => {
        await store.delete('symptomEntries', entry.id);
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
          simptom: fd.get('simptom'),
          jacina: Number(slider.value),
          timestamp: newDate.getTime(),
          beleska: fd.get('beleska').trim(),
          kofein: fd.get('kofein') === 'on',
          alkohol: fd.get('alkohol') === 'on',
        };
        await store.put('symptomEntries', record);
        closeModal();
        toast('Sačuvano');
        onDone?.();
      });
    },
  });
  return sheet;
}
