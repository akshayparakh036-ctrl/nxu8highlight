// ==UserScript==
// @name         Nexus Opportunities Highlighters
// @namespace    temp-highlighter
// @version      5.4
// @description  Highlight whole rows that match name + type rules (editable list)
// @author       Akshay(akparaks)
// @match        *://scheduling.amazon.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ================= EDIT HERE =================
  // names = any one of these must be in the row
  // types = any one of these must ALSO be in the row (use [] to ignore)
  // color = any CSS colour
  const RULES = [
    { names: ['NEXUS_TAYLOR', 'FC_OUTBOUND', 'FC_INBOUND'], types: ['VET', 'VTO'], color: 'orange' },
    // { names: ['ANOTHER_NAME', 'THIRD_NAME'], types: ['VTO'], color: '#ffd54f' },
    // { names: ['SOME_NAME'], types: [], color: '#80deea' },
  ];
  // =============================================

  const FLAG = 'data-nexus-hl';
  const esc = w => w.trim()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/[_ ]+/g, '[_ ]+');          // space and underscore are interchangeable

  // Names: plain match (same as the console test that worked)
  // Types: whole word, so VET/VTO don't match inside other words
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