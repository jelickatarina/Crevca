import { continueAuth } from '../cloudAccount.js';
import { esc } from '../utils/html.js';

export function renderAuthGate(root, onSuccess) {
  root.innerHTML = `
    <div class="auth-gate">
      <div class="auth-mark">
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#D6567F" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 21c-.3-1.6.5-2.7 1.9-3.3M12 8.8c-2.7-2.4-6.4-1-6.4 3 0 3.8 2.8 7.7 5.4 7.7.6 0 1.1-.2 1.7-.5 1.6.7 3 .4 4-.6 2.3-2 2.7-7.8-.8-9.2-1.2-.5-2.5-.4-3.6.3Z"/>
        </svg>
      </div>
      <div class="pagetitle" style="text-align:center;">Dnevnik ritma</div>
      <div class="pagesub" style="text-align:center; margin-bottom:22px;">Uloguj se — podaci se čuvaju na tvom nalogu i ostaju bezbedni čak i ako obrišeš app.</div>

      <form id="auth-form" class="card" style="text-align:left;">
        <div class="field">
          <label>Email</label>
          <input type="email" name="email" required autocomplete="email" />
        </div>
        <div class="field" style="margin-bottom:6px;">
          <label>Lozinka</label>
          <input type="password" name="password" required minlength="6" autocomplete="current-password" />
        </div>
        <div class="hint" style="margin-bottom:14px;">Prvi put? Samo se uloguj — nalog se pravi automatski.</div>
        <button type="submit" class="save-btn" id="auth-submit">Nastavi</button>
      </form>
    </div>
  `;

  const form = root.querySelector('#auth-form');
  const submitBtn = root.querySelector('#auth-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const email = fd.get('email').trim();
    const password = fd.get('password');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sačekaj...';
    try {
      const result = await continueAuth(email, password);
      if (result.needsEmailConfirm) {
        form.insertAdjacentHTML('beforeend', '<div class="hint" style="color:var(--red-soft); margin-top:10px;">Poslali smo ti email da potvrdiš nalog — klikni link pa se vrati ovde i uloguj se ponovo.</div>');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Nastavi';
        return;
      }
      onSuccess();
    } catch (err) {
      form.querySelectorAll('.auth-error').forEach((el) => el.remove());
      form.insertAdjacentHTML('beforeend', `<div class="hint auth-error" style="color:var(--red-soft); margin-top:10px;">${esc(err.message || 'Greška — probaj ponovo')}</div>`);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Nastavi';
    }
  });
}
