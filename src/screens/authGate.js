import { continueAuth } from '../cloudAccount.js';
import { esc } from '../utils/html.js';

export function renderAuthGate(root, onSuccess) {
  root.innerHTML = `
    <div class="auth-gate">
      <div class="auth-mark"><img src="/icons/icon-192.png" alt="" /></div>
      <div class="pagetitle" style="text-align:center;">Dnevnik ritma</div>
      <div class="pagesub" style="text-align:center; margin:6px 0 24px; padding:0 8px;">Uloguj se — podaci se čuvaju na tvom nalogu i ostaju bezbedni čak i ako obrišeš app.</div>

      <form id="auth-form" class="auth-card">
        <div class="field">
          <label>Email</label>
          <input type="email" name="email" required autocomplete="email" placeholder="tvoja@email.com" />
        </div>
        <div class="field" style="margin-bottom:0;">
          <label>Lozinka</label>
          <input type="password" name="password" required minlength="6" autocomplete="current-password" placeholder="min. 6 karaktera" />
        </div>
        <button type="submit" class="save-btn" id="auth-submit" style="margin-top:20px;">Nastavi</button>
      </form>
      <div class="auth-hint-link">Prvi put? Samo se uloguj — nalog se pravi automatski.</div>
      <div id="auth-message"></div>
    </div>
  `;

  const form = root.querySelector('#auth-form');
  const submitBtn = root.querySelector('#auth-submit');
  const messageEl = root.querySelector('#auth-message');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    messageEl.innerHTML = '';
    const fd = new FormData(form);
    const email = fd.get('email').trim();
    const password = fd.get('password');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sačekaj...';
    try {
      const result = await continueAuth(email, password);
      if (result.needsEmailConfirm) {
        messageEl.innerHTML = '<div class="auth-hint-link" style="color:var(--red-soft);">Poslali smo ti email da potvrdiš nalog — klikni link pa se vrati ovde i uloguj se ponovo.</div>';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Nastavi';
        return;
      }
      onSuccess();
    } catch (err) {
      messageEl.innerHTML = `<div class="auth-hint-link" style="color:var(--red-soft);">${esc(err.message || 'Greška — probaj ponovo')}</div>`;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Nastavi';
    }
  });
}
