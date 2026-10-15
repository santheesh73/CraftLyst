// Reference fixture behavior (trust L1: test fixture, not a component library).
// Written for this repository from the contracts in contracts/components/.
(function () {
  'use strict';
  /** @param {string} id */
  var $ = function (id) { return document.getElementById(id); };

  // Button: toggle.
  $('btn-bold').addEventListener('click', function () {
    var b = $('btn-bold');
    b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
  });

  // Text field: validate on blur and on submit.
  var email = $('email');
  var emailError = $('email-error');
  function validateEmail() {
    var ok = email.value !== '' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value);
    if (ok) {
      email.removeAttribute('aria-invalid');
      email.setAttribute('aria-describedby', 'email-hint');
      emailError.hidden = true;
      emailError.textContent = '';
    } else {
      email.setAttribute('aria-invalid', 'true');
      email.setAttribute('aria-describedby', 'email-hint email-error');
      emailError.textContent = email.value === '' ? 'Enter an email address.' : 'Enter an email address like name@example.com.';
      emailError.hidden = false;
    }
    return ok;
  }
  email.addEventListener('blur', validateEmail);
  $('email-form').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validateEmail()) email.focus();
  });

  // Select-only combobox with aria-activedescendant.
  var combo = $('fruit');
  var list = $('fruit-list');
  var options = Array.prototype.slice.call(list.querySelectorAll('[role="option"]'));
  var active = 0;
  function setActive(i) {
    active = (i + options.length) % options.length;
    options.forEach(function (o, k) { o.classList.toggle('active', k === active); });
    combo.setAttribute('aria-activedescendant', options[active].id);
  }
  function openList() {
    list.hidden = false;
    combo.setAttribute('aria-expanded', 'true');
    setActive(options.findIndex(function (o) { return o.getAttribute('aria-selected') === 'true'; }));
  }
  function closeList() {
    list.hidden = true;
    combo.setAttribute('aria-expanded', 'false');
    combo.removeAttribute('aria-activedescendant');
  }
  function choose(i) {
    options.forEach(function (o, k) { o.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
    combo.textContent = options[i].textContent;
    closeList();
  }
  combo.addEventListener('keydown', function (e) {
    var open = !list.hidden;
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openList(); return; }
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(active + 1, options.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(active - 1, 0)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(options.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active); }
    else if (e.key === 'Escape') { e.preventDefault(); closeList(); }
    else if (e.key === 'Tab') { closeList(); }
  });
  combo.addEventListener('click', function () { if (list.hidden) openList(); else closeList(); });
  options.forEach(function (o, i) {
    o.addEventListener('mousedown', function (e) { e.preventDefault(); choose(i); });
  });

  // Modal dialog: focus moves in, Tab is trapped, Escape closes, focus returns.
  var dlg = $('dlg');
  var box = $('dlg-box');
  var opener = null;
  function focusables() {
    return Array.prototype.slice.call(box.querySelectorAll('button, input, [href], [tabindex]:not([tabindex="-1"])'));
  }
  function openDialog() {
    opener = document.activeElement;
    dlg.hidden = false;
    $('main').inert = true;
    document.querySelector('header').inert = true;
    $('dlg-name').focus();
  }
  function closeDialog() {
    dlg.hidden = true;
    $('main').inert = false;
    document.querySelector('header').inert = false;
    if (opener) opener.focus();
  }
  $('dlg-open').addEventListener('click', openDialog);
  $('dlg-cancel').addEventListener('click', closeDialog);
  $('dlg-save').addEventListener('click', closeDialog);
  dlg.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); closeDialog(); return; }
    if (e.key !== 'Tab') return;
    var f = focusables();
    var i = f.indexOf(document.activeElement);
    e.preventDefault();
    var next = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i === f.length - 1 ? 0 : i + 1);
    f[next].focus();
  });

  // Menu button.
  var menuBtn = $('menu-btn');
  var menu = $('menu-list');
  var items = Array.prototype.slice.call(menu.querySelectorAll('[role="menuitem"]'));
  function openMenu(last) {
    menu.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true');
    items[last ? items.length - 1 : 0].focus();
  }
  function closeMenu(returnFocus) {
    menu.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
    if (returnFocus) menuBtn.focus();
  }
  menuBtn.addEventListener('click', function () { if (menu.hidden) openMenu(false); else closeMenu(true); });
  menuBtn.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); openMenu(false); }
    if (e.key === 'ArrowUp') { e.preventDefault(); openMenu(true); }
  });
  menu.addEventListener('keydown', function (e) {
    var i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); closeMenu(true); }
    else if (e.key === 'Tab') { closeMenu(false); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeMenu(true); }
  });

  // Tabs with automatic activation and wrapping.
  var tabs = Array.prototype.slice.call(document.querySelectorAll('#tabs [role="tab"]'));
  function selectTab(i) {
    tabs.forEach(function (t, k) {
      var on = k === i;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      $(t.getAttribute('aria-controls')).hidden = !on;
    });
    tabs[i].focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(i); });
    t.addEventListener('keydown', function (e) {
      var n = tabs.length;
      var to = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
      if (to !== undefined) { e.preventDefault(); selectTab(to); }
    });
  });

  // Tooltip: focus or hover shows, blur, leave, or Escape hides.
  var tipBtn = $('tip-btn');
  var tip = $('tip-1');
  function showTip() { tip.hidden = false; }
  function hideTip() { tip.hidden = true; }
  tipBtn.addEventListener('focus', showTip);
  tipBtn.addEventListener('blur', hideTip);
  tipBtn.addEventListener('mouseenter', showTip);
  tipBtn.addEventListener('mouseleave', function () { if (document.activeElement !== tipBtn) hideTip(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !tip.hidden) hideTip(); });

  // Non-modal popover.
  var popBtn = $('pop-btn');
  var pop = $('pop-1');
  function closePop(returnFocus) {
    pop.hidden = true;
    popBtn.setAttribute('aria-expanded', 'false');
    if (returnFocus) popBtn.focus();
  }
  popBtn.addEventListener('click', function () {
    if (!pop.hidden) { closePop(true); return; }
    pop.hidden = false;
    popBtn.setAttribute('aria-expanded', 'true');
    pop.querySelector('input').focus();
  });
  pop.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); closePop(true); } });
  $('pop-close').addEventListener('click', function () { closePop(true); });

  // Accordion (each section toggles independently).
  Array.prototype.slice.call(document.querySelectorAll('#faq .acc')).forEach(function (b) {
    b.addEventListener('click', function () {
      var open = b.getAttribute('aria-expanded') === 'true';
      b.setAttribute('aria-expanded', open ? 'false' : 'true');
      $(b.getAttribute('aria-controls')).hidden = open;
    });
  });

  // Toast into a live region that exists from page load.
  $('toast-btn').addEventListener('click', function () {
    var t = document.createElement('div');
    t.className = 'toast';
    var msg = document.createElement('span');
    msg.textContent = 'Settings saved.';
    var close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'Dismiss notification');
    close.textContent = '×';
    close.addEventListener('click', function () { t.remove(); });
    t.appendChild(msg);
    t.appendChild(close);
    $('toasts').appendChild(t);
  });

  // Table: sortable name column and a text filter.
  var tbody = document.querySelector('#people tbody');
  var th = $('th-name');
  $('sort-name').addEventListener('click', function () {
    var dir = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
    th.setAttribute('aria-sort', dir);
    var rows = Array.prototype.slice.call(tbody.rows);
    rows.sort(function (a, b) {
      var c = a.cells[0].textContent.localeCompare(b.cells[0].textContent);
      return dir === 'ascending' ? c : -c;
    });
    rows.forEach(function (r) { tbody.appendChild(r); });
  });
  $('filter').addEventListener('input', function (e) {
    var q = e.target.value.toLowerCase();
    Array.prototype.slice.call(tbody.rows).forEach(function (r) {
      r.hidden = q !== '' && r.cells[0].textContent.toLowerCase().indexOf(q) === -1;
    });
  });

  // Site navigation disclosure.
  var more = $('nav-more');
  var moreList = $('nav-more-list');
  more.addEventListener('click', function () {
    var open = more.getAttribute('aria-expanded') === 'true';
    more.setAttribute('aria-expanded', open ? 'false' : 'true');
    moreList.hidden = open;
  });
  more.parentElement.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && more.getAttribute('aria-expanded') === 'true') {
      more.setAttribute('aria-expanded', 'false');
      moreList.hidden = true;
      more.focus();
    }
  });
})();
