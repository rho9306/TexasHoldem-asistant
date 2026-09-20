import './style.css';
import { renderTabbar, switchPage } from './ui/tabs.js';
document.getElementById('app').innerHTML = `
  <header id="topbar" class="card"><b>♠ 德扑助手</b> <span id="street-badge" class="num"></span></header>
  <main id="page-calc" class="page active"></main>
  <main id="page-gto" class="page"></main>
  <main id="page-history" class="page"></main>
  <main id="page-settings" class="page"></main>
  <nav id="tabbar"></nav>`;
renderTabbar(document.getElementById('tabbar'), switchPage);
switchPage('calc');
