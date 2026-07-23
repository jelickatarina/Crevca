import './style.css';
import { initDB } from './db.js';
import { renderDanas } from './screens/danas.js';
import { renderSimptomi } from './screens/simptomi.js';
import { renderFodmap } from './screens/fodmap.js';
import { renderNamirnice } from './screens/namirnice.js';
import { renderIzvestaj } from './screens/izvestaj.js';
import { renderPodesavanja } from './screens/podesavanja.js';
import { registerSW } from 'virtual:pwa-register';
import { scheduleAllReminders } from './notifications.js';
import { archiveExpiredTherapy } from './utils/therapy.js';

const TABS = [
  { id: 'danas', label: 'Danas', icon: '🏠', render: renderDanas },
  { id: 'simptomi', label: 'Simptomi', icon: '📝', render: renderSimptomi },
  { id: 'fodmap', label: 'FODMAP', icon: '🌾', render: renderFodmap },
  { id: 'namirnice', label: 'Namirnice', icon: '🥗', render: renderNamirnice },
  { id: 'izvestaj', label: 'Izveštaj', icon: '📊', render: renderIzvestaj },
  { id: 'podesavanja', label: 'Podešavanja', icon: '⚙️', render: renderPodesavanja },
];

const state = { tab: localStorage.getItem('lastTab') || 'danas' };

const app = document.getElementById('app');
app.innerHTML = `
  <div id="screen-root"></div>
  <nav class="bottomnav" id="bottomnav">
    ${TABS.map(t => `
      <button data-tab="${t.id}" class="${t.id === state.tab ? 'active' : ''}">
        <span class="navicon">${t.icon}</span>
        <span>${t.label}</span>
      </button>
    `).join('')}
  </nav>
`;

const screenRoot = document.getElementById('screen-root');

export function refresh() {
  const tab = TABS.find(t => t.id === state.tab);
  if (tab) tab.render(screenRoot, go);
}

export function go(tabId) {
  if (!TABS.some(t => t.id === tabId)) return;
  state.tab = tabId;
  localStorage.setItem('lastTab', tabId);
  document.querySelectorAll('#bottomnav button').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tabId);
  });
  screenRoot.scrollTop = 0;
  window.scrollTo(0, 0);
  refresh();
}

document.getElementById('bottomnav').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-tab]');
  if (btn) go(btn.dataset.tab);
});

async function boot() {
  await initDB();
  await archiveExpiredTherapy();
  refresh();
  scheduleAllReminders();
  if ('serviceWorker' in navigator) {
    registerSW({ immediate: true });
  }
}

boot();
