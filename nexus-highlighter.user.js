// ==UserScript==
// @name         Nexus Opportunities Highlighters
// @namespace    temp-highlighter
// @version      5.17
// @description  Highlight whole rows that match name + type rules. Includes a forced self-update watchdog.
// @author       Akshay(akparaks)
// @match        *://scheduling.amazon.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_openInTab
// @grant        GM_notification
// @grant        GM_registerMenuCommand
// @connect      raw.githubusercontent.com
// @updateURL    https://raw.githubusercontent.com/akshayparakh036-ctrl/nxu8highlight/refs/heads/main/nexus-highlighter.user.js?v=5.17
// @downloadURL  https://raw.githubusercontent.com/akshayparakh036-ctrl/nxu8highlight/refs/heads/main/nexus-highlighter.user.js?v=5.17
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const SCRIPT_URL = 'https://raw.githubusercontent.com/akshayparakh036-ctrl/nxu8highlight/refs/heads/main/nexus-highlighter.user.js';
  let updatePrompted = false;

  function versionParts(v) {
    return String(v).split(/[.\-_]/).map((p) => {
      const n = parseInt(p, 10);
      return Number.isFinite(n) ? n : 0;
    });
  }

  function isNewerVersion(remote, current) {
    const a = versionParts(remote);
    const b = versionParts(current);
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) {
      const x = a[i] || 0;
      const y = b[i] || 0;
      if (x > y) return true;
      if (x < y) return false;
    }
    return false;
  }

  // Forced update: on load, every 10 minutes, and via the Tampermonkey menu.
  function checkForUpdate(force) {
    if (updatePrompted && !force) return;
    if (typeof GM_xmlhttpRequest !== 'function' || typeof GM_openInTab !== 'function') return;
    const current = (typeof GM_info !== 'undefined' && GM_info.script && GM_info.script.version) || '0';
    GM_xmlhttpRequest({
      method: 'GET',
      url: SCRIPT_URL + '?check=' + Date.now(),
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
      timeout: 10000,
      onload: function (res) {
        if (!res || res.status !== 200 || !res.responseText) return;
        const m = res.responseText.match(/^\/\/ @version\s+(\S+)/m);
        if (!m) return;
        const remote = m[1];
        if (!isNewerVersion(remote, current)) return;
        updatePrompted = true;
        const message = `New version ${remote} found (installed ${current}). Opening the installer.`;
        console.log(`[Nexus HL updater] ${message}`);
        if (typeof GM_notification === 'function') {
          GM_notification({ title: 'Nexus Opportunities Highlighters update', text: message, timeout: 8000 });
        }
        GM_openInTab(SCRIPT_URL + '?v=' + encodeURIComponent(remote), { active: true });
      },
      onerror: function () {},
      ontimeout: function () {},
    });
  }

  checkForUpdate();
  setInterval(checkForUpdate, 10 * 60 * 1000);
  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('Force Nexus HL update check', () => checkForUpdate(true));
  }

  const RULES = [
    { names: ['NEXUS_TAYLOR', 'FC_OUTBOUND', 'FC_INBOUND', 'FC_ICQA'], types: ['VET', 'VTO'], color: 'pink' },

  ];
 

  const FLAG = 'data-nexus-hl';
  const esc = w => w.trim()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/[_ ]+/g, '[_ ]+');         
  const compiled = RULES.map(r => ({
    name: new RegExp(r.names.map(esc).join('|'), 'i'),
    type: r.types && r.types.length
      ? new RegExp('\\b(?:' + r.types.map(esc).join('|') + ')\\b', 'i')
      : null,
    color: r.color || 'orange'
  }));

  function paint(tr, color) {
    tr.setAttribute(FLAG, color);
    tr.style.setProperty('background-color', color, 'important');
    tr.querySelectorAll('td, th').forEach(c => {
      c.style.setProperty('background-color', color, 'important');
      c.style.setProperty('color', 'black', 'important');
    });
  }

  function unpaint(tr) {
    tr.removeAttribute(FLAG);
    tr.style.removeProperty('background-color');
    tr.querySelectorAll('td, th').forEach(c => {
      c.style.removeProperty('background-color');
      c.style.removeProperty('color');
    });
  }

  function run() {
    let hits = 0;
    document.querySelectorAll('tr').forEach(tr => {
      const whole = tr.textContent;
      const cells = [...tr.querySelectorAll('td, th')].map(c => c.textContent.trim());
      const rule = compiled.find(r =>
        r.name.test(whole) &&
        (!r.type || r.type.test(cells.join(' | ')) || r.type.test(whole))
      );
      const current = tr.getAttribute(FLAG);
      if (rule) { hits++; if (current !== rule.color) paint(tr, rule.color); }
      else if (current) unpaint(tr);
    });
    return hits;
  }

  console.log('[Nexus HL] running, rows highlighted:', run());

  let timer;
  new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(run, 200);
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  setInterval(run, 1000);
})();
