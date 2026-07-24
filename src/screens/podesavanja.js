import { esc } from '../utils/html.js';
import { store, getSetting, setSetting, wipeAllData, initDB } from '../db.js';
import { toast } from '../toast.js';
import { requestPermission, permissionState, scheduleAllReminders } from '../notifications.js';
import { daysRemaining } from '../utils/therapy.js';
import { login, register, logout, isLoggedIn, currentEmail, ensureSessionLoaded } from '../cloudAccount.js';
import { drainOutbox, pendingCount } from '../sync.js';

function backupStatus() {
  if (!navigator.onLine) return { label: 'Bez interneta', small: `${pendingCount()} čeka slanje čim se povežeš` };
  const pending = pendingCount();
  if (pending > 0) return { label: 'Sinhronizacija u toku', small: `${pending} stavki čeka slanje` };
  return { label: 'Ažurno', small: 'Svi podaci su sačuvani u cloud-u' };
}

export async function renderPodesavanja(root, go) {
  await ensureSessionLoaded();
  const items = (await store.getAll('therapyItems')).filter(i => !i.arhivirano && i.vreme);
  items.sort((a, b) => a.vreme.localeCompare(b.vreme));
  const startDate = await getSetting('fodmapStartDate');
  const perm = permissionState();
  const loggedIn = isLoggedIn();
  const backup = loggedIn ? backupStatus() : null;

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
      <h2>Nalog i sigurnosna kopija</h2>
      ${loggedIn ? `
        <div class="hint">Podaci se automatski čuvaju u cloud-u — preživljavaju brisanje ili menjanje telefona. Uloguj se istim nalogom na novom uređaju da ih vratiš.</div>
        <div class="settings-row">
          <div class="l">Ulogovana kao<small>${esc(currentEmail())}</small></div>
        </div>
        <div class="settings-row">
          <div class="l">${esc(backup.label)}<small>${esc(backup.small)}</small></div>
          <button class="save-btn ghost" id="sync-now" style="width:auto; margin-top:0; padding:10px 16px;">Sinhronizuj</button>
        </div>
        <button class="btn-danger" id="logout-btn" style="margin-top:10px;">Izloguj se</button>
      ` : `
        <div class="hint">Napravi nalog jednom da ti podaci prežive brisanje app-a ili promenu telefona. Ne treba ti ponovo da se loguješ dok se sama ne izloguješ.</div>
        <form id="account-form">
          <div class="field"><label>Email</label><input type="email" name="email" required autocomplete="email" /></div>
          <div class="field" style="margin-bottom:10px;"><label>Lozinka</label><input type="password" name="password" required minlength="6" autocomplete="current-password" /></div>
          <div class="modal-actions">
            <button type="submit" data-mode="login" class="btn-secondary" style="flex:1;">Uloguj se</button>
            <button type="submit" data-mode="register" class="save-btn" style="flex:1; margin-top:0;">Registruj se</button>
          </div>
        </form>
      `}
    </div>

    <div class="card">
      <h2>Podaci</h2>
      <div class="hint">${loggedIn ? 'Podaci se čuvaju na ovom uređaju i u cloud-u.' : 'Podaci se trenutno čuvaju samo na ovom uređaju.'} Brisanje je trajno i ne može se opozvati.</div>
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

  const acctForm = root.querySelector('#account-form');
  if (acctForm) {
    acctForm.querySelectorAll('button[data-mode]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const fd = new FormData(acctForm);
        const email = fd.get('email').trim();
        const password = fd.get('password');
        if (!email || password.length < 6) { toast('Unesi email i lozinku (min. 6 karaktera)'); return; }
        btn.disabled = true;
        try {
          if (btn.dataset.mode === 'login') {
            await login(email, password);
            toast('Ulogovana — podaci se sinhronizuju');
          } else {
            const result = await register(email, password);
            if (!result?.session) {
              toast('Proveri email da potvrdiš nalog, pa se uloguj');
              btn.disabled = false;
              return;
            }
            toast('Nalog napravljen — podaci se sinhronizuju');
          }
          renderPodesavanja(root, go);
        } catch (err) {
          toast(err.message || 'Greška — probaj ponovo');
          btn.disabled = false;
        }
      });
    });
  }

  const syncBtn = root.querySelector('#sync-now');
  if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
      await drainOutbox();
      toast(pendingCount() === 0 ? 'Sinhronizovano' : 'Bez interneta — pokušaću ponovo kad se povežeš');
      renderPodesavanja(root, go);
    });
  }

  const logoutBtn = root.querySelector('#logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (!confirm('Izlogovati se? Podaci ostaju na ovom uređaju, ali se prestaju automatski sinhronizovati.')) return;
      await logout();
      toast('Izlogovana');
      renderPodesavanja(root, go);
    });
  }
}
