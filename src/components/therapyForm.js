import { openModal, closeModal } from './modal.js';
import { store, uid } from '../db.js';
import { esc } from '../utils/html.js';
import { toast } from '../toast.js';
import { scheduleAllReminders } from '../notifications.js';

export function openTherapyForm(item, onDone) {
  const isEdit = !!item;
  const hasFixedTime = isEdit ? !!item.vreme : true;
  const sheet = openModal(`
    <div class="modal-head">
      <h2>${isEdit ? 'Izmeni stavku' : 'Dodaj lek ili suplement'}</h2>
      <button class="modal-close" data-close>✕</button>
    </div>
    <form id="therapy-form">
      <div class="field">
        <label>Naziv</label>
        <input type="text" name="naziv" required maxlength="60" placeholder="npr. Colospa" value="${esc(item?.naziv || '')}" />
      </div>
      <div class="field">
        <label>Vreme</label>
        <div class="radio-row" style="margin-bottom:10px;">
          <label><input type="radio" name="mode" value="fixed" ${hasFixedTime ? 'checked' : ''}/> Fiksno vreme</label>
          <label><input type="radio" name="mode" value="prn" ${!hasFixedTime ? 'checked' : ''}/> Po potrebi</label>
        </div>
        <input type="time" name="vreme" value="${esc(item?.vreme || '08:00')}" ${!hasFixedTime ? 'disabled' : ''} />
      </div>
      <div class="field switch-row">
        <span>Podsetnik</span>
        <label class="switch">
          <input type="checkbox" name="podsetnik" ${item ? (item.podsetnik_ukljucen ? 'checked' : '') : 'checked'} />
          <span class="track"></span>
        </label>
      </div>
      <div class="modal-actions">
        ${isEdit ? '<button type="button" class="btn-danger" id="del-therapy" style="flex:1;">Obriši</button>' : ''}
        <button type="submit" class="save-btn" style="flex:2;">Sačuvaj</button>
      </div>
    </form>
  `, {
    onMount(sheet) {
      const form = sheet.querySelector('#therapy-form');
      const timeInput = form.querySelector('input[name=vreme]');
      const podsetnikChk = form.querySelector('input[name=podsetnik]');
      form.querySelectorAll('input[name=mode]').forEach(r => {
        r.addEventListener('change', () => {
          const isFixed = form.querySelector('input[name=mode]:checked').value === 'fixed';
          timeInput.disabled = !isFixed;
          if (!isFixed) podsetnikChk.checked = false;
        });
      });
      sheet.querySelector('[data-close]').addEventListener('click', closeModal);
      if (isEdit) {
        sheet.querySelector('#del-therapy').addEventListener('click', async () => {
          if (!confirm(`Obrisati "${item.naziv}"? Istorija unosa ostaje sačuvana.`)) return;
          item.arhivirano = true;
          await store.put('therapyItems', item);
          closeModal();
          toast('Stavka obrisana');
          scheduleAllReminders();
          onDone?.();
        });
      }
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const naziv = fd.get('naziv').trim();
        if (!naziv) return;
        const mode = fd.get('mode');
        const vreme = mode === 'fixed' ? fd.get('vreme') : null;
        const podsetnik_ukljucen = mode === 'fixed' && fd.get('podsetnik') === 'on';
        const record = item ? { ...item } : { id: uid(), arhivirano: false, createdAt: Date.now() };
        record.naziv = naziv;
        record.vreme = vreme;
        record.podsetnik_ukljucen = podsetnik_ukljucen;
        await store.put('therapyItems', record);
        closeModal();
        toast('Sačuvano');
        scheduleAllReminders();
        onDone?.();
      });
    },
  });
  return sheet;
}
