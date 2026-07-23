export function openModal(innerHtml, { onMount } = {}) {
  closeModal();
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.id = 'modal-backdrop';
  backdrop.innerHTML = `<div class="modal-sheet" role="dialog">${innerHtml}</div>`;
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });
  document.body.appendChild(backdrop);
  const sheet = backdrop.querySelector('.modal-sheet');
  if (onMount) onMount(sheet);
  return sheet;
}

export function closeModal() {
  const el = document.getElementById('modal-backdrop');
  if (el) el.remove();
}
