const PAGES = [
  { id: 'calc', label: '计算' }, { id: 'gto', label: 'GTO图' },
  { id: 'history', label: '历史' }, { id: 'settings', label: '设置' },
];
export function renderTabbar(container, onSwitch) {
  container.innerHTML = '';
  for (const p of PAGES) {
    const b = document.createElement('button');
    b.textContent = p.label; b.dataset.page = p.id;
    b.addEventListener('click', () => onSwitch(p.id));
    container.appendChild(b);
  }
}
export function switchPage(id) {
  document.querySelectorAll('.page').forEach(el => el.classList.toggle('active', el.id === 'page-' + id));
  document.querySelectorAll('#tabbar button').forEach(b => b.classList.toggle('active', b.dataset.page === id));
}
