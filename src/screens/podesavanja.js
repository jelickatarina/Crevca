import { esc } from '../utils/html.js';
import { store, getSetting, setSetting, wipeAllData, initDB } from '../db.js';
import { toast } from '../toast.js';
import { requestPermission, permissionState, scheduleAllReminders } from '../notifications.js';
import { daysRemaining } from '../utils/therapy.js';

export async function renderPodesavanja(root, go) {
  const items = (await store.getAll('therapyItems')).filter(i => !i.arhivirano && i.vreme);
  items.sort((a, b) => a.vreme.localeCompare(b.vreme));
  const startDate = await getSetting('fodmapStartDate');
  const perm = permissionState();

  root.innerHTML = `
    <div class="eyebrow">App</div>
    <div class="pagetitle">Podešavanja</div>
    <div class="pagesub">Podsetnici, plan i podaci</div>

    <div class="card" style="margin-top:14px;">
      <h2>Notifikacije</h2>
      <div class="hint">
        Podsetnici pouzdano rade dok je app instaliran i pregledač/uređaj dozvoljava pozadinske notifikacije.
        Ponašanje zavisi od OS-a — iOS ima ograničenja za web push notifikacije.
      </div>
      <div class="settings-row">
        <div class="l">Status dozvole<small>${perm === 'granted' ? 'Dozvoljeno' : perm === 'denied' ? 'Blokirano — omogući u podešavanjima pregledača' : 'Nije zatraženo'}</small></div>
        ${perm !== 'granted' ? '<button class="save-btn ghost" id="req-perm" style="width:auto; margin-top:0; padding:10px 16px;">Uključi</button>' : ''}
      </div>
    </div>

    <div class="card">
      <h2>Podsetnici po stavci</h2>
      <div class="hint">Uključi/isključi podsetnik za svaku stavku terapije sa fiksnim vremenom.</div>
      ${items.length ? items.map(it => {
        const remaining = daysRemaining(it);
        const durLabel = remaining === null ? '' : ` · još ${remaining} ${remaining === 1 ? 'dan' : 'dana'}`;
        return `
        <div class="settings-row">
          <div class="l">${esc(it.naziv)}<small>${esc(it.vreme)}${durLabel}</small></div>
          <label class="switch">
            <input type="checkbox" data-toggle-reminder="${it.id}" ${it.podsetnik_ukljucen ? 'checked' : ''} />
            <span class="track"></span>
          </label>
        </div>
      `;
      }).join('') : '<div class="empty-hint">Nema stavki sa fiksnim vremenom</div>'}
    </div>

    <div class="card">
      <h2>FODMAP plan</h2>
      <div class="field" style="margin-bottom:0;">
        <label>Datum početka eliminacije</label>
        <input type="date" id="fodmap-start" value="${esc(startDate)}" />
      </div>
      <div class="hint" style="margin-top:8px; margin-bottom:0;">Menjanje datuma pomera ceo raspored (eliminacija + sve grupe reintrodukcije).</div>
    </div>

    <div class="card">
      <h2>Podaci</h2>
      <div class="hint">Svi podaci se čuvaju samo na ovom uređaju. Brisanje je trajno i ne može se opozvati.</div>
      <button class="btn-danger" id="wipe-data">Obriši sve podatke</button>
    </div>
  `;

  const reqBtn = root.querySelector('#req-perm');
  if (reqBtn) {
    reqBtn.addEventListener('click', async () => {
      const result = await requestPermission();
      if (result === 'granted') {
        toast('Notifikacije uključene');
        scheduleAllReminders();
      } else {
        toast('Notifikacije nisu dozvoljene');
      }
      renderPodesavanja(root, go);
    });
  }

  root.querySelectorAll('[data-toggle-reminder]').forEach(chk => {
    chk.addEventListener('change', async () => {
      const item = await store.get('therapyItems', chk.dataset.toggleReminder);
      item.podsetnik_ukljucen = chk.checked;
      await store.put('therapyItems', item);
      scheduleAllReminders();
    });
  });

  root.querySelector('#fodmap-start').addEventListener('change', async (e) => {
    if (!e.target.value) return;
    await setSetting('fodmapStartDate', e.target.value);
    toast('Datum početka ažuriran');
  });

  root.querySelector('#wipe-data').addEventListener('click', async () => {
    if (!confirm('Da li si sigurna/siguran? Ovo trajno briše sve unete podatke (terapiju, simptome, stolicu, FODMAP verdikte, dodate namirnice).')) return;
    await wipeAllData();
    await initDB();
    toast('Svi podaci su obrisani');
    renderPodesavanja(root, go);
  });
}
