// Simple line-style icon set for the bottom nav, drawn to match the app's
// rounded, soft design language. Each uses stroke="currentColor" so it
// inherits the nav button's text color (including the active-tab teal).

const wrap = (inner) => `
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    ${inner}
  </svg>
`;

export const NAV_ICONS = {
  danas: wrap(`
    <path d="M3.5 11.5 12 4l8.5 7.5" />
    <path d="M5.5 10v9a1 1 0 0 0 1 1h3.5v-6h4v6H18a1 1 0 0 0 1-1v-9" />
  `),
  simptomi: wrap(`
    <path d="M7 3.5h6.5L18 8v11a1.3 1.3 0 0 1-1.3 1.3H7A1.3 1.3 0 0 1 5.7 19V4.8A1.3 1.3 0 0 1 7 3.5Z" />
    <path d="M13.5 3.5V7a1 1 0 0 0 1 1H18" />
    <path d="M8.3 13.2h2l1-1.8 1.3 3.6 1-1.8h1.8" />
  `),
  fodmap: wrap(`
    <path d="M12 21V4" />
    <path d="M12 7c-1.7-1.5-3.8-1.1-4.2.6" />
    <path d="M12 7c1.7-1.5 3.8-1.1 4.2.6" />
    <path d="M12 11c-1.7-1.5-3.8-1.1-4.2.6" />
    <path d="M12 11c1.7-1.5 3.8-1.1 4.2.6" />
    <path d="M12 15c-1.7-1.5-3.8-1.1-4.2.6" />
    <path d="M12 15c1.7-1.5 3.8-1.1 4.2.6" />
  `),
  namirnice: wrap(`
    <path d="M12 8.8c-2.7-2.4-6.4-1-6.4 3 0 3.8 2.8 7.7 5.4 7.7.6 0 1.1-.2 1.7-.5 1.6.7 3 .4 4-.6 2.3-2 2.7-7.8-.8-9.2-1.2-.5-2.5-.4-3.6.3Z" />
    <path d="M12 8.8c-.3-1.6.5-2.7 1.9-3.3" />
  `),
  izvestaj: wrap(`
    <path d="M4.5 20V11" />
    <path d="M10.5 20V6.5" />
    <path d="M16.5 20v-8.5" />
    <path d="M4.5 20h15" />
  `),
  podesavanja: wrap(`
    <circle cx="12" cy="12" r="2.8" />
    <path d="M19.4 13.2a7.7 7.7 0 0 0 0-2.4l1.9-1.4-1.8-3.2-2.2.8a7.7 7.7 0 0 0-2-1.2L15 3.5h-4l-.3 2.3a7.7 7.7 0 0 0-2 1.2l-2.2-.8-1.8 3.2 1.9 1.4a7.7 7.7 0 0 0 0 2.4L4.7 14.6l1.8 3.2 2.2-.8a7.7 7.7 0 0 0 2 1.2l.3 2.3h4l.3-2.3a7.7 7.7 0 0 0 2-1.2l2.2.8 1.8-3.2Z" />
  `),
};
