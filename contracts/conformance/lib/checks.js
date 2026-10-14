// Conformance checks, one suite per component contract (contracts/components/<name>.md).
// Each suite drives a real page through the adapter's selectors and reports every check id
// it declares as pass, fail, or not_applicable with evidence. A check the suite never
// reaches (because an earlier step failed) is reported by the harness as a failure.
import { waitFor, press, find, findVisible, roleAndName, activeDescription, hasFocus, currentItem, idrefs, countClicks, clicks, axeScan, tabTo } from './dom.js';

/** @typedef {import('./types.js').Ctx} Ctx */
/** @typedef {import('./types.js').ComponentSuite} ComponentSuite */
/** @typedef {import('./types.js').Locator} Locator */

/**
 * Report an axe scan as a check result.
 * @param {Ctx} ctx
 * @param {string} id
 * @param {string[]} selectors
 */
async function axeCheck(ctx, id, selectors) {
  const v = await axeScan(ctx.page, ctx.axeSource, selectors.filter(Boolean));
  ctx.result(id, v.length ? 'fail' : 'pass', v.length ? `axe-core: ${v.map((x) => `${x.id} (${x.impact}) at ${x.nodes.join(', ')}`).join('; ')}` : `axe-core WCAG 2.x A/AA: no violations in ${selectors.filter(Boolean).join(', ')}`);
}

/**
 * Require an adapter selector to match; reports failure on `id` when it does not.
 * @param {Ctx} ctx
 * @param {string} key
 * @param {string} id
 * @returns {Promise<Locator | null>}
 */
async function need(ctx, key, id) {
  const sel = ctx.cfg[key];
  if (!sel) {
    ctx.result(id, 'fail', `adapter is missing "${key}"`);
    return null;
  }
  const loc = await find(ctx.page, sel);
  if (!loc) ctx.result(id, 'fail', `selector ${sel} (${key}) matched nothing`);
  return loc;
}

/**
 * Find an open popup of a role: the trigger's aria-controls target if it is visible, else
 * the first visible element with that role.
 * @param {Ctx} ctx
 * @param {Locator} trigger
 * @param {string} roleSelector
 * @param {string} [override] adapter selector
 * @returns {Promise<Locator | null>}
 */
async function popup(ctx, trigger, roleSelector, override) {
  const found = await waitFor(async () => {
    if (override) return findVisible(ctx.page, override);
    const ref = await idrefs(trigger, 'aria-controls');
    if (ref.present && ref.ids.length && !ref.missing.length) {
      const el = await findVisible(ctx.page, `[id="${ref.ids[0]}"]`);
      if (el && (await el.evaluate((/** @type {Element} */ e, /** @type {string} */ s) => e.matches(s), roleSelector))) return el;
    }
    return findVisible(ctx.page, roleSelector);
  }, 1500);
  return found || null;
}

/** @param {Locator} loc @param {string} attr */
const attr = (loc, attr) => loc.getAttribute(attr);

/** @type {ComponentSuite[]} */
export const SUITES = [
  {
    name: 'button',
    checks: {
      'button/role': 'Exposed as a button (native button or role=button).',
      'button/name': 'Has a non-empty accessible name (icon-only buttons included).',
      'button/focusable': 'Reachable by keyboard focus.',
      'button/enter': 'Enter activates.',
      'button/space': 'Space activates.',
      'button/toggle-state': 'A toggle exposes aria-pressed and flips it on activation.',
      'button/disabled': 'A disabled button is exposed as disabled (disabled or aria-disabled="true").',
      'button/axe': 'No axe-core WCAG A/AA violations in the component region.'
    },
    async run(ctx) {
      const { page, cfg } = ctx;
      const btn = await need(ctx, 'button', 'button/role');
      if (!btn) return;
      const { role, name } = await roleAndName(btn);
      ctx.result('button/role', role === 'button' ? 'pass' : 'fail', `computed role: ${role ?? 'none'}`);
      ctx.result('button/name', name ? 'pass' : 'fail', name ? `accessible name "${name}"` : 'accessible name is empty');
      await btn.focus();
      const focused = await hasFocus(btn);
      ctx.result('button/focusable', focused ? 'pass' : 'fail', focused ? 'focus() lands on the button' : `focus is on ${await activeDescription(page)}`);
      // Activation is observed through DOM click events, or, for libraries whose press
      // handling does not dispatch click on keyboard activation, through an adapter-declared
      // element whose text changes when the button's handler runs (activationSignal).
      const signal = cfg.activationSignal ? await find(page, cfg.activationSignal) : null;
      const read = async () => (signal ? ((await signal.textContent()) ?? '') : String(await clicks(page)));
      const how = signal ? `text of ${cfg.activationSignal}` : 'click events';
      await countClicks(btn);
      for (const key of ['Enter', 'Space']) {
        const before = await read();
        await btn.focus();
        await press(page, key);
        const after = await read();
        ctx.result(`button/${key.toLowerCase()}`, after !== before ? 'pass' : 'fail', `${how}: "${before}" -> "${after}" after ${key}`);
      }
      if (cfg.toggle) {
        const t = await find(page, cfg.toggle);
        if (!t) ctx.result('button/toggle-state', 'fail', `selector ${cfg.toggle} matched nothing`);
        else {
          const before = await attr(t, 'aria-pressed');
          await t.focus();
          await press(page, 'Space');
          const after = await attr(t, 'aria-pressed');
          ctx.result('button/toggle-state', before !== null && after !== null && before !== after ? 'pass' : 'fail', `aria-pressed ${before} -> ${after} after Space`);
        }
      } else ctx.result('button/toggle-state', 'not_applicable', 'adapter declares no toggle button');
      if (cfg.disabled) {
        const d = await find(page, cfg.disabled);
        const state = d ? await d.evaluate((/** @type {any} */ el) => ({ disabled: el.disabled === true, aria: el.getAttribute('aria-disabled') })) : null;
        ctx.result('button/disabled', state && (state.disabled || state.aria === 'true') ? 'pass' : 'fail', state ? `disabled=${state.disabled}, aria-disabled=${state.aria}` : `selector ${cfg.disabled} matched nothing`);
      } else ctx.result('button/disabled', 'not_applicable', 'adapter declares no disabled button');
      await axeCheck(ctx, 'button/axe', [cfg.region ?? cfg.button]);
    }
  },

  {
    name: 'text-field',
    checks: {
      'text-field/name': 'The input has a non-empty accessible name from a visible label.',
      'text-field/required': 'A required field exposes it (required or aria-required="true").',
      'text-field/invalid': 'After invalid input the field sets aria-invalid="true".',
      'text-field/error-described': 'The error message is referenced by aria-describedby or aria-errormessage, exists, and has text.',
      'text-field/axe': 'No axe-core WCAG A/AA violations in the field region, valid and invalid.'
    },
    async run(ctx) {
      const { page, cfg } = ctx;
      const input = await need(ctx, 'input', 'text-field/name');
      if (!input) return;
      const { name } = await roleAndName(input);
      const labelled = await input.evaluate((/** @type {any} */ el) => Boolean((el.labels && el.labels.length) || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')));
      ctx.result('text-field/name', name && labelled ? 'pass' : 'fail', !name ? 'accessible name is empty' : labelled ? `accessible name "${name}"` : `name "${name}" comes only from placeholder or title, not a label`);
      if (cfg.required) {
        const req = await input.evaluate((/** @type {any} */ el) => ({ required: el.required === true, aria: el.getAttribute('aria-required') }));
        ctx.result('text-field/required', req.required || req.aria === 'true' ? 'pass' : 'fail', `required=${req.required}, aria-required=${req.aria}`);
      } else ctx.result('text-field/required', 'not_applicable', 'adapter does not declare the field required');
      await axeCheck(ctx, 'text-field/axe', [cfg.region ?? cfg.input]);
      await input.fill(String(cfg.invalidValue ?? ''));
      if (cfg.submit) {
        const s = await find(page, cfg.submit);
        if (s) {
          await s.focus();
          await press(page, 'Enter');
        }
      } else {
        await input.focus();
        await press(page, 'Tab');
      }
      const invalid = await waitFor(async () => (await attr(input, 'aria-invalid')) === 'true', 1500);
      ctx.result('text-field/invalid', invalid ? 'pass' : 'fail', `aria-invalid=${await attr(input, 'aria-invalid')} after entering ${JSON.stringify(cfg.invalidValue ?? '')}${cfg.submit ? ' and submitting' : ' and leaving the field'}`);
      const by = await idrefs(input, 'aria-describedby');
      const em = await idrefs(input, 'aria-errormessage');
      const ref = em.present && !em.missing.length && em.text ? em : by;
      const ok = ref.present && ref.ids.length > 0 && !ref.missing.length && ref.text.length > 0;
      ctx.result('text-field/error-described', ok ? 'pass' : 'fail', ref.present ? `${ref === em ? 'aria-errormessage' : 'aria-describedby'} -> ${ref.ids.join(' ')}${ref.missing.length ? ` (missing: ${ref.missing.join(' ')})` : ''}: "${ref.text.slice(0, 80)}"` : 'no aria-describedby or aria-errormessage on the input');
      // Re-scan in the invalid state; a failure here overrides the earlier pass.
      const v = await axeScan(page, ctx.axeSource, [cfg.region ?? cfg.input]);
      if (v.length) ctx.result('text-field/axe', 'fail', `axe-core (invalid state): ${v.map((x) => `${x.id} (${x.impact}) at ${x.nodes.join(', ')}`).join('; ')}`);
    }
  },

  {
    name: 'select-combobox',
    checks: {
      'select/role': 'The trigger is a combobox, or a button with aria-haspopup="listbox".',
      'select/name': 'The trigger has a non-empty accessible name.',
      'select/expanded': 'aria-expanded is false when closed and true when open (opened with the keyboard).',
      'select/listbox': 'The open popup is a listbox with at least one option.',
      'select/controls': 'aria-controls, when present, references an element that exists while open.',
      'select/arrow-moves': 'ArrowDown moves the active option (focus or aria-activedescendant).',
      'select/enter-selects': 'Enter selects the active option, closes the popup, and shows the value.',
      'select/escape-closes': 'Escape closes the popup and leaves focus on the trigger.',
      'select/axe': 'No axe-core WCAG A/AA violations, closed and open.'
    },
    async run(ctx) {
      const { page, cfg } = ctx;
      const trigger = await need(ctx, 'trigger', 'select/role');
      if (!trigger) return;
      const { role, name } = await roleAndName(trigger);
      const popupAttr = await attr(trigger, 'aria-haspopup');
      ctx.result('select/role', role === 'combobox' || (role === 'button' && popupAttr === 'listbox') ? 'pass' : 'fail', `computed role: ${role ?? 'none'}, aria-haspopup=${popupAttr}`);
      ctx.result('select/name', name ? 'pass' : 'fail', name ? `accessible name "${name}"` : 'accessible name is empty');
      await axeCheck(ctx, 'select/axe', [cfg.region ?? cfg.trigger]);
      const closed = await attr(trigger, 'aria-expanded');
      await trigger.focus();
      await press(page, cfg.openKey ?? 'ArrowDown');
      const list = await popup(ctx, trigger, '[role="listbox"]', cfg.listbox);
      const open = await attr(trigger, 'aria-expanded');
      ctx.result('select/expanded', (closed === 'false' || closed === null) && open === 'true' && list ? 'pass' : 'fail', `aria-expanded ${closed} -> ${open} after ${cfg.openKey ?? 'ArrowDown'}; popup ${list ? 'visible' : 'not found'}`);
      if (!list) {
        ctx.result('select/listbox', 'fail', `no visible [role=listbox] after ${cfg.openKey ?? 'ArrowDown'}`);
        return;
      }
      const options = await list.locator('[role="option"]').count();
      ctx.result('select/listbox', options > 0 ? 'pass' : 'fail', `listbox with ${options} option(s)`);
      const ctl = await idrefs(trigger, 'aria-controls');
      ctx.result('select/controls', !ctl.present ? 'not_applicable' : ctl.missing.length ? 'fail' : 'pass', ctl.present ? `aria-controls=${ctl.ids.join(' ')}${ctl.missing.length ? ' (missing)' : ' (exists)'}` : 'no aria-controls on the trigger');
      const v = await axeScan(page, ctx.axeSource, [cfg.region ?? cfg.trigger, cfg.listbox ?? '[role="listbox"]']);
      if (v.length) ctx.result('select/axe', 'fail', `axe-core (open): ${v.map((x) => `${x.id} (${x.impact}) at ${x.nodes.join(', ')}`).join('; ')}`);
      const first = await currentItem(page);
      await press(page, 'ArrowDown');
      const second = await currentItem(page);
      const moved = Boolean(second && second.role === 'option' && (!first || first.id !== second.id || first.text !== second.text));
      ctx.result('select/arrow-moves', moved ? 'pass' : 'fail', `active option "${first?.text ?? 'none'}" -> "${second?.text ?? 'none'}" (${second?.role ?? 'no role'})`);
      const chosen = second?.text ?? '';
      await press(page, 'Enter');
      const closedAfter = await waitFor(async () => !(await findVisible(page, cfg.listbox ?? '[role="listbox"]')), 1000);
      const shown = await trigger.evaluate((/** @type {any} */ el) => `${el.value ?? ''} ${el.textContent ?? ''}`.trim());
      ctx.result('select/enter-selects', closedAfter && chosen && shown.includes(chosen) ? 'pass' : 'fail', `popup ${closedAfter ? 'closed' : 'still open'}; trigger shows "${shown.slice(0, 60)}", expected "${chosen}"`);
      await trigger.focus();
      await press(page, cfg.openKey ?? 'ArrowDown');
      const reopened = await popup(ctx, trigger, '[role="listbox"]', cfg.listbox);
      if (!reopened) {
        ctx.result('select/escape-closes', 'fail', 'could not reopen the popup');
        return;
      }
      await press(page, 'Escape');
      const gone = await waitFor(async () => !(await findVisible(page, cfg.listbox ?? '[role="listbox"]')), 1000);
      const back = await hasFocus(trigger);
      ctx.result('select/escape-closes', gone && back ? 'pass' : 'fail', `popup ${gone ? 'closed' : 'still open'}; focus on ${await activeDescription(page)}`);
    }
  },

  {
    name: 'dialog',
    checks: {
      'dialog/opens': 'The trigger opens the dialog with Enter.',
      'dialog/role': 'The dialog has role dialog or alertdialog (or is a native <dialog>).',
      'dialog/modal': 'A modal dialog is exposed as modal (aria-modal="true" or native showModal).',
      'dialog/name': 'The dialog has an accessible name (aria-labelledby a visible title, or aria-label).',
      'dialog/initial-focus': 'Opening moves focus inside the dialog.',
      'dialog/focus-trap': 'Tab and Shift+Tab keep focus inside the dialog.',
      'dialog/escape': 'Escape closes the dialog.',
      'dialog/return-focus': 'Closing returns focus to the trigger.',
      'dialog/axe': 'No axe-core WCAG A/AA violations inside the open dialog.'
    },
    async run(ctx) {
      const { page, cfg } = ctx;
      const trigger = await need(ctx, 'trigger', 'dialog/opens');
      if (!trigger) return;
      await trigger.focus();
      await press(page, 'Enter');
      const sel = cfg.dialog ?? '[role="dialog"], [role="alertdialog"], dialog[open]';
      const dlg = /** @type {Locator | false} */ (await waitFor(() => findVisible(page, sel)));
      ctx.result('dialog/opens', dlg ? 'pass' : 'fail', dlg ? 'dialog visible after Enter on the trigger' : `nothing matching ${sel} became visible`);
      if (!dlg) return;
      const info = await dlg.evaluate((/** @type {any} */ el) => {
        // Older but valid technique: everything outside the dialog is aria-hidden or inert.
        const outside = [...document.body.children].filter((c) => !c.contains(el) && !['SCRIPT', 'STYLE', 'TEMPLATE'].includes(c.tagName));
        const hidden = outside.filter((c) => c.getAttribute('aria-hidden') === 'true' || /** @type {any} */ (c).inert === true);
        return { tag: el.tagName.toLowerCase(), role: el.getAttribute('role'), modalAttr: el.getAttribute('aria-modal'), nativeModal: el.matches(':modal'), outside: outside.length, hidden: hidden.length };
      });
      const { name } = await roleAndName(dlg);
      ctx.result('dialog/role', info.role === 'dialog' || info.role === 'alertdialog' || info.tag === 'dialog' ? 'pass' : 'fail', `<${info.tag}> role=${info.role}`);
      const bgHidden = info.outside > 0 && info.hidden === info.outside;
      ctx.result('dialog/modal', info.modalAttr === 'true' || info.nativeModal || bgHidden ? 'pass' : 'fail', `aria-modal=${info.modalAttr}, :modal=${info.nativeModal}, background hidden: ${info.hidden}/${info.outside} body children aria-hidden or inert${bgHidden && info.modalAttr !== 'true' && !info.nativeModal ? ' (passes via hidden background, not aria-modal)' : ''}`);
      ctx.result('dialog/name', name ? 'pass' : 'fail', name ? `accessible name "${name}"` : 'no accessible name');
      await page.waitForTimeout(150);
      const inside = await hasFocus(dlg, true);
      ctx.result('dialog/initial-focus', inside ? 'pass' : 'fail', `focus on ${await activeDescription(page)}`);
      await axeCheck(ctx, 'dialog/axe', sel.split(',').map((s) => s.trim()));
      const focusables = await dlg.evaluate((/** @type {Element} */ el) => el.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])').length);
      const steps = Math.max(3, focusables + 2);
      /** @type {string[]} */
      const escapes = [];
      for (const key of ['Tab', 'Shift+Tab']) {
        for (let i = 0; i < steps; i++) {
          await page.keyboard.press(key);
          if (!(await hasFocus(dlg, true))) {
            escapes.push(`${key} #${i + 1} -> ${await activeDescription(page)}`);
            break;
          }
        }
      }
      ctx.result('dialog/focus-trap', escapes.length ? 'fail' : 'pass', escapes.length ? `focus left the dialog: ${escapes.join('; ')}` : `${steps} Tab and ${steps} Shift+Tab presses stayed inside (${focusables} focusable)`);
      if (escapes.length) await dlg.locator('button, [href], input').first().focus().catch(() => {});
      await press(page, 'Escape');
      const closed = await waitFor(async () => !(await findVisible(page, sel)), 1500);
      ctx.result('dialog/escape', closed ? 'pass' : 'fail', closed ? 'dialog hidden after Escape' : 'dialog still visible after Escape');
      if (!closed) return;
      await page.waitForTimeout(100);
      const back = await hasFocus(trigger);
      ctx.result('dialog/return-focus', back ? 'pass' : 'fail', `focus on ${await activeDescription(page)}`);
    }
  },

  {
    name: 'menu',
    checks: {
      'menu/button': 'The menu button has aria-haspopup (true or menu) and aria-expanded="false" while closed.',
      'menu/opens': 'Enter opens a role=menu and sets aria-expanded="true".',
      'menu/focus-first': 'Opening with the keyboard moves focus to the first item.',
      'menu/item-roles': 'Items are menuitem, menuitemcheckbox, or menuitemradio.',
      'menu/arrows': 'ArrowDown moves focus to the next item.',
      'menu/home-end': 'End moves to the last item and Home to the first.',
      'menu/escape': 'Escape closes the menu and returns focus to the button.',
      'menu/axe': 'No axe-core WCAG A/AA violations, closed and open.'
    },
    async run(ctx) {
      const { page, cfg } = ctx;
      const trigger = await need(ctx, 'trigger', 'menu/button');
      if (!trigger) return;
      const hp = await attr(trigger, 'aria-haspopup');
      const ex = await attr(trigger, 'aria-expanded');
      ctx.result('menu/button', (hp === 'true' || hp === 'menu') && (ex === 'false' || ex === null) ? 'pass' : 'fail', `aria-haspopup=${hp}, aria-expanded=${ex}`);
      await axeCheck(ctx, 'menu/axe', [cfg.region ?? cfg.trigger]);
      await trigger.focus();
      await press(page, 'Enter');
      const menu = await popup(ctx, trigger, '[role="menu"]', cfg.menu);
      const exOpen = await attr(trigger, 'aria-expanded');
      ctx.result('menu/opens', menu && exOpen === 'true' ? 'pass' : 'fail', `menu ${menu ? 'visible' : 'not found'}; aria-expanded=${exOpen}`);
      if (!menu) return;
      const v = await axeScan(page, ctx.axeSource, [cfg.menu ?? '[role="menu"]']);
      if (v.length) ctx.result('menu/axe', 'fail', `axe-core (open): ${v.map((x) => `${x.id} (${x.impact}) at ${x.nodes.join(', ')}`).join('; ')}`);
      const items = menu.locator('[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]');
      const n = await items.count();
      const other = await menu.evaluate((/** @type {Element} */ el) => [...el.querySelectorAll('button, a[href], [tabindex]')].filter((x) => !/^menuitem/.test(x.getAttribute('role') ?? '')).length);
      ctx.result('menu/item-roles', n > 0 && other === 0 ? 'pass' : 'fail', `${n} menu item(s); ${other} focusable element(s) without a menuitem role`);
      if (n < 2) {
        ctx.result('menu/focus-first', n ? 'pass' : 'fail', `${n} item(s)`);
        return;
      }
      await waitFor(() => hasFocus(items.nth(0)), 600);
      const firstFocused = await hasFocus(items.nth(0));
      ctx.result('menu/focus-first', firstFocused ? 'pass' : 'fail', `focus on ${await activeDescription(page)}`);
      if (!firstFocused) await items.nth(0).focus();
      await press(page, 'ArrowDown');
      const second = await hasFocus(items.nth(1));
      ctx.result('menu/arrows', second ? 'pass' : 'fail', `after ArrowDown focus on ${await activeDescription(page)}`);
      await press(page, 'End');
      const last = await hasFocus(items.nth(n - 1));
      const lastDesc = await activeDescription(page);
      await press(page, 'Home');
      const firstAgain = await hasFocus(items.nth(0));
      ctx.result('menu/home-end', last && firstAgain ? 'pass' : 'fail', `End -> ${lastDesc}; Home -> ${await activeDescription(page)}`);
      await press(page, 'Escape');
      const gone = await waitFor(async () => !(await findVisible(page, cfg.menu ?? '[role="menu"]')), 1000);
      const back = await hasFocus(trigger);
      ctx.result('menu/escape', gone && back && (await attr(trigger, 'aria-expanded')) !== 'true' ? 'pass' : 'fail', `menu ${gone ? 'closed' : 'still open'}; focus on ${await activeDescription(page)}; aria-expanded=${await attr(trigger, 'aria-expanded')}`);
    }
  },

  {
    name: 'tabs',
    checks: {
      'tabs/roles': 'A tablist contains at least two tabs.',
      'tabs/selected': 'Exactly one tab has aria-selected="true".',
      'tabs/controls': 'The selected tab\'s aria-controls references an existing tabpanel.',
      'tabs/panel-name': 'The visible tabpanel is labelled (aria-labelledby the tab, or aria-label).',
      'tabs/roving-tabindex': 'Tab enters the tablist on the selected tab, and the next Tab leaves it (one tab stop).',
      'tabs/arrows': 'ArrowRight moves focus to the next tab; ArrowLeft back.',
      'tabs/wrap': 'ArrowRight on the last tab moves to the first.',
      'tabs/home-end': 'Home and End move to the first and last tab.',
      'tabs/axe': 'No axe-core WCAG A/AA violations in the tabs region.'
    },
    async run(ctx) {
      const { page, cfg } = ctx;
      const list = await need(ctx, 'tablist', 'tabs/roles');
      if (!list) return;
      const tabs = list.locator('[role="tab"]');
      const n = await tabs.count();
      const listRole = (await roleAndName(list)).role;
      ctx.result('tabs/roles', listRole === 'tablist' && n >= 2 ? 'pass' : 'fail', `role=${listRole}, ${n} tab(s)`);
      if (n < 2) return;
      const state = await tabs.evaluateAll((/** @type {Element[]} */ els) => els.map((el) => ({ selected: el.getAttribute('aria-selected'), controls: el.getAttribute('aria-controls'), tabindex: /** @type {HTMLElement} */ (el).tabIndex, id: el.id })));
      const sel = state.filter((s) => s.selected === 'true');
      ctx.result('tabs/selected', sel.length === 1 ? 'pass' : 'fail', `${sel.length} tab(s) with aria-selected="true"`);
      const selIdx = Math.max(0, state.findIndex((s) => s.selected === 'true'));
      const ctl = await idrefs(tabs.nth(selIdx), 'aria-controls');
      const panelOk = ctl.present && !ctl.missing.length && (await page.locator(`[id="${ctl.ids[0]}"][role="tabpanel"]`).count()) > 0;
      ctx.result('tabs/controls', panelOk ? 'pass' : 'fail', ctl.present ? `aria-controls=${ctl.ids.join(' ')}${ctl.missing.length ? ' (missing)' : ''}` : 'selected tab has no aria-controls');
      const panel = await findVisible(page, cfg.panel ?? '[role="tabpanel"]');
      const pname = panel ? await roleAndName(panel) : null;
      ctx.result('tabs/panel-name', pname?.name ? 'pass' : 'fail', panel ? `tabpanel name "${pname?.name ?? ''}"` : 'no visible tabpanel');
      // Measure the real Tab sequence: from a temporary button just before the tablist, Tab
      // must land on the selected tab, and the next Tab must leave the tablist.
      await list.evaluate((/** @type {Element} */ el) => {
        const b = document.createElement('button');
        b.id = '__craft_probe';
        b.textContent = 'probe';
        el.before(b);
      });
      await page.locator('#__craft_probe').focus();
      await press(page, 'Tab');
      const entered = await hasFocus(tabs.nth(selIdx));
      const enteredDesc = await activeDescription(page);
      await press(page, 'Tab');
      const left = await list.evaluate((/** @type {Element} */ el) => !el.contains(document.activeElement));
      const leftDesc = await activeDescription(page);
      await page.evaluate(() => document.getElementById('__craft_probe')?.remove());
      ctx.result('tabs/roving-tabindex', entered && left ? 'pass' : 'fail', `Tab into the tablist -> ${enteredDesc}; next Tab -> ${leftDesc}`);
      await tabs.nth(0).focus();
      await press(page, 'ArrowRight');
      const right = await hasFocus(tabs.nth(1));
      const rightDesc = await activeDescription(page);
      await press(page, 'ArrowLeft');
      const back = await hasFocus(tabs.nth(0));
      ctx.result('tabs/arrows', right && back ? 'pass' : 'fail', `ArrowRight -> ${rightDesc}; ArrowLeft -> ${await activeDescription(page)}`);
      await press(page, 'End');
      const end = await hasFocus(tabs.nth(n - 1));
      const endDesc = await activeDescription(page);
      await press(page, 'ArrowRight');
      const wrapped = await hasFocus(tabs.nth(0));
      ctx.result('tabs/wrap', wrapped ? 'pass' : 'fail', `ArrowRight on the last tab -> ${await activeDescription(page)}`);
      await tabs.nth(1).focus();
      await press(page, 'Home');
      const home = await hasFocus(tabs.nth(0));
      ctx.result('tabs/home-end', end && home ? 'pass' : 'fail', `End -> ${endDesc}; Home -> ${await activeDescription(page)}`);
      await axeCheck(ctx, 'tabs/axe', [cfg.region ?? cfg.tablist]);
    }
  },

  {
    name: 'tooltip-popover',
    checks: {
      'tooltip/focus': 'Focusing the trigger shows a role=tooltip.',
      'tooltip/described-by': 'The trigger\'s aria-describedby references the tooltip text.',
      'tooltip/escape': 'Escape hides the tooltip without moving focus.',
      'tooltip/hover': 'Hovering the trigger shows the tooltip.',
      'popover/expanded': 'The popover trigger sets aria-expanded false -> true when opened with Enter.',
      'popover/controls': 'aria-controls, when present, references the open popover.',
      'popover/escape': 'Escape closes the popover and returns focus to its trigger.',
      'tooltip-popover/axe': 'No axe-core WCAG A/AA violations, with the tooltip and the popover open.'
    },
    async run(ctx) {
      const { page, cfg } = ctx;
      /** @type {string[]} */
      const scan = [cfg.region ?? ''];
      if (cfg.tooltipTrigger) {
        const t = await need(ctx, 'tooltipTrigger', 'tooltip/focus');
        if (t) {
          // Arrive with a real Tab press: some libraries show tooltips for keyboard focus only.
          if (!(await tabTo(page, t))) await t.focus();
          const tip = /** @type {Locator | false} */ (await waitFor(() => findVisible(page, cfg.tooltip ?? '[role="tooltip"]'), 2000));
          ctx.result('tooltip/focus', tip ? 'pass' : 'fail', tip ? `tooltip visible: "${((await tip.textContent()) ?? '').trim().slice(0, 60)}"` : 'no visible role=tooltip within 2 s of focus');
          const by = await idrefs(t, 'aria-describedby');
          const tipText = tip ? ((await tip.textContent()) ?? '').trim() : '';
          ctx.result('tooltip/described-by', by.present && !by.missing.length && by.text && (!tipText || tipText.includes(by.text) || by.text.includes(tipText)) ? 'pass' : 'fail', by.present ? `aria-describedby -> "${by.text.slice(0, 60)}"${by.missing.length ? ` (missing ${by.missing.join(' ')})` : ''}` : 'trigger has no aria-describedby while the tooltip is shown');
          if (tip) {
            const v = await axeScan(page, ctx.axeSource, [cfg.tooltip ?? '[role="tooltip"]']);
            if (v.length) scan.push('__tooltip_fail__' + v.map((x) => x.id).join(','));
            await press(page, 'Escape');
            const hidden = await waitFor(async () => !(await findVisible(page, cfg.tooltip ?? '[role="tooltip"]')), 1000);
            const still = await hasFocus(t);
            ctx.result('tooltip/escape', hidden && still ? 'pass' : 'fail', `tooltip ${hidden ? 'hidden' : 'still visible'}; focus on ${await activeDescription(page)}`);
          } else ctx.result('tooltip/escape', 'fail', 'tooltip never appeared');
          await page.locator('body').focus().catch(() => {});
          await page.evaluate(() => /** @type {HTMLElement | null} */ (document.activeElement)?.blur());
          await page.mouse.move(0, 0);
          await page.waitForTimeout(300);
          await t.hover();
          const hov = await waitFor(() => findVisible(page, cfg.tooltip ?? '[role="tooltip"]'), 2500);
          ctx.result('tooltip/hover', hov ? 'pass' : 'fail', hov ? 'tooltip visible on hover' : 'no tooltip within 2.5 s of hover');
          await page.mouse.move(0, 0);
          // Let the tooltip finish closing (libraries apply a close delay) so it cannot
          // intercept keys meant for the popover below.
          await waitFor(async () => !(await findVisible(page, cfg.tooltip ?? '[role="tooltip"]')), 3000);
        }
      } else {
        for (const id of ['tooltip/focus', 'tooltip/described-by', 'tooltip/escape', 'tooltip/hover']) ctx.result(id, 'not_applicable', 'adapter declares no tooltip');
      }
      if (cfg.popoverTrigger) {
        const p = await need(ctx, 'popoverTrigger', 'popover/expanded');
        if (p) {
          const before = await attr(p, 'aria-expanded');
          await p.focus();
          await press(page, 'Enter');
          const pop = await popup(ctx, p, '[role="dialog"]', cfg.popover);
          const after = await attr(p, 'aria-expanded');
          ctx.result('popover/expanded', (before === 'false' || before === null) && after === 'true' && pop ? 'pass' : 'fail', `aria-expanded ${before} -> ${after}; popover ${pop ? 'visible' : 'not found'}`);
          const ctl = await idrefs(p, 'aria-controls');
          ctx.result('popover/controls', !ctl.present ? 'not_applicable' : ctl.missing.length ? 'fail' : 'pass', ctl.present ? `aria-controls=${ctl.ids.join(' ')}${ctl.missing.length ? ' (missing)' : ' (exists)'}` : 'no aria-controls on the trigger');
          if (pop) {
            const v = await axeScan(page, ctx.axeSource, [cfg.popover ?? '[role="dialog"]']);
            if (v.length) scan.push('__popover_fail__' + v.map((x) => x.id).join(','));
            await press(page, 'Escape');
            const gone = await waitFor(async () => !(await findVisible(page, cfg.popover ?? '[role="dialog"]')), 1000);
            await page.waitForTimeout(100);
            const back = await hasFocus(p);
            ctx.result('popover/escape', gone && back ? 'pass' : 'fail', `popover ${gone ? 'closed' : 'still open'}; focus on ${await activeDescription(page)}`);
          } else ctx.result('popover/escape', 'fail', 'popover never opened');
        }
      } else {
        for (const id of ['popover/expanded', 'popover/controls', 'popover/escape']) ctx.result(id, 'not_applicable', 'adapter declares no popover');
      }
      const overlayFails = scan.filter((s) => s.startsWith('__'));
      const v = await axeScan(page, ctx.axeSource, [cfg.region ?? cfg.tooltipTrigger ?? cfg.popoverTrigger]);
      const all = [...v.map((x) => `${x.id} (${x.impact}) at ${x.nodes.join(', ')}`), ...overlayFails.map((s) => s.replace(/^__(\w+)_fail__/, '$1 open: '))];
      ctx.result('tooltip-popover/axe', all.length ? 'fail' : 'pass', all.length ? `axe-core: ${all.join('; ')}` : 'axe-core WCAG 2.x A/AA: no violations (region, open tooltip, open popover)');
    }
  },

  {
    name: 'accordion-disclosure',
    checks: {
      'accordion/button': 'Each header trigger is a button.',
      'accordion/expanded': 'Each trigger has aria-expanded="true" or "false".',
      'accordion/controls': 'Each trigger\'s aria-controls references an existing panel (required when expanded).',
      'accordion/enter': 'Enter on a collapsed trigger expands it and shows its panel.',
      'accordion/space': 'Space on a trigger toggles it.',
      'accordion/collapsed-hidden': 'Panels of collapsed triggers are hidden.',
      'accordion/axe': 'No axe-core WCAG A/AA violations in the accordion region.'
    },
    async run(ctx) {
      const { page, cfg } = ctx;
      if (!cfg.triggers) {
        ctx.result('accordion/button', 'fail', 'adapter is missing "triggers"');
        return;
      }
      const triggers = page.locator(cfg.triggers);
      const n = await triggers.count();
      if (!n) {
        ctx.result('accordion/button', 'fail', `selector ${cfg.triggers} matched nothing`);
        return;
      }
      /** @type {{ role: string | null, expanded: string | null, controls: { present: boolean, ids: string[], missing: string[], text: string } }[]} */
      const info = [];
      for (let i = 0; i < n; i++) info.push({ role: (await roleAndName(triggers.nth(i))).role, expanded: await attr(triggers.nth(i), 'aria-expanded'), controls: await idrefs(triggers.nth(i), 'aria-controls') });
      ctx.result('accordion/button', info.every((x) => x.role === 'button') ? 'pass' : 'fail', `roles: ${info.map((x) => x.role).join(', ')}`);
      ctx.result('accordion/expanded', info.every((x) => x.expanded === 'true' || x.expanded === 'false') ? 'pass' : 'fail', `aria-expanded: ${info.map((x) => x.expanded).join(', ')}`);
      const badCtl = info.filter((x) => (x.expanded === 'true' && !x.controls.present) || x.controls.missing.length);
      ctx.result('accordion/controls', badCtl.length ? 'fail' : 'pass', badCtl.length ? `${badCtl.length} trigger(s) with a missing or dangling aria-controls` : `${info.filter((x) => x.controls.present).length}/${n} triggers reference existing panels`);
      /** @param {number} i */
      const panelVisible = async (i) => {
        const c = await idrefs(triggers.nth(i), 'aria-controls');
        if (!c.present || c.missing.length) return null;
        return page.locator(`[id="${c.ids[0]}"]`).isVisible();
      };
      const hiddenProblems = [];
      for (let i = 0; i < n; i++) if (info[i].expanded === 'false' && (await panelVisible(i)) === true) hiddenProblems.push(i + 1);
      ctx.result('accordion/collapsed-hidden', hiddenProblems.length ? 'fail' : 'pass', hiddenProblems.length ? `collapsed trigger(s) ${hiddenProblems.join(', ')} have visible panels` : 'every collapsed panel is hidden or not rendered');
      const idx = info.findIndex((x) => x.expanded === 'false');
      if (idx < 0) {
        ctx.result('accordion/enter', 'fail', 'no collapsed trigger to test');
      } else {
        await triggers.nth(idx).focus();
        await press(page, 'Enter');
        const exp = await attr(triggers.nth(idx), 'aria-expanded');
        const vis = await panelVisible(idx);
        ctx.result('accordion/enter', exp === 'true' && vis === true ? 'pass' : 'fail', `trigger ${idx + 1}: aria-expanded=${exp}, panel visible=${vis}`);
      }
      const idx2 = (await Promise.all([...Array(n).keys()].map((i) => attr(triggers.nth(i), 'aria-expanded')))).findIndex((x) => x === 'false');
      const j = idx2 >= 0 ? idx2 : Math.max(0, idx);
      const before = await attr(triggers.nth(j), 'aria-expanded');
      await triggers.nth(j).focus();
      await press(page, 'Space');
      const after = await attr(triggers.nth(j), 'aria-expanded');
      ctx.result('accordion/space', before !== after && after !== null ? 'pass' : 'fail', `trigger ${j + 1}: aria-expanded ${before} -> ${after} after Space`);
      await axeCheck(ctx, 'accordion/axe', [cfg.region ?? cfg.triggers]);
    }
  },

  {
    name: 'toast-alert',
    checks: {
      'toast/live-region': 'Messages go into a live region (role status/alert or aria-live) that exists before the message, or an inserted role=alert.',
      'toast/announced': 'Triggering the toast puts its text into a live region.',
      'toast/focus-kept': 'Showing the toast does not move focus.',
      'toast/dismiss-name': 'A dismiss control, when present, has an accessible name.',
      'alert/role': 'A static inline alert uses role=alert or role=status.',
      'toast-alert/axe': 'No axe-core WCAG A/AA violations with the toast showing.'
    },
    async run(ctx) {
      const { page, cfg } = ctx;
      const live = '[role="status"], [role="alert"], [role="log"], [aria-live="polite"], [aria-live="assertive"]';
      if (cfg.alert) {
        const a = await find(page, cfg.alert);
        const r = a ? await attr(a, 'role') : null;
        ctx.result('alert/role', r === 'alert' || r === 'status' ? 'pass' : 'fail', a ? `role=${r}` : `selector ${cfg.alert} matched nothing`);
      } else ctx.result('alert/role', 'not_applicable', 'adapter declares no static alert');
      if (!cfg.trigger) {
        for (const id of ['toast/live-region', 'toast/announced', 'toast/focus-kept', 'toast/dismiss-name']) ctx.result(id, 'not_applicable', 'adapter declares no toast trigger');
        await axeCheck(ctx, 'toast-alert/axe', [cfg.region ?? cfg.alert]);
        return;
      }
      const trigger = await need(ctx, 'trigger', 'toast/live-region');
      if (!trigger) return;
      // Track every live region from now on, remembering the text it had when first seen.
      await page.evaluate((sel) => {
        /** @type {any} */ const w = window;
        w.__craftLive = new Map();
        let initial = true;
        const scan = () => { for (const el of document.querySelectorAll(sel)) if (!w.__craftLive.has(el)) w.__craftLive.set(el, { first: (el.textContent ?? '').trim(), initial }); };
        scan();
        initial = false;
        new MutationObserver(scan).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['role', 'aria-live'] });
      }, live);
      await trigger.focus();
      await press(page, 'Enter');
      const changed = /** @type {{ text: string, role: string | null, firstSeen: string } | false} */ (await waitFor(() => page.evaluate(() => {
        /** @type {any} */ const w = window;
        for (const [el, seen] of w.__craftLive) {
          const text = (el.textContent ?? '').trim();
          if (el.isConnected && text && (text !== seen.first || !seen.initial)) return { text, role: el.getAttribute('role'), firstSeen: seen.first };
        }
        return false;
      }), 2500));
      ctx.result('toast/announced', changed ? 'pass' : 'fail', changed ? `live region text: "${changed.text.slice(0, 80)}"` : 'no live region gained text within 2.5 s');
      const regionFirst = changed && changed.firstSeen !== changed.text;
      ctx.result('toast/live-region', changed && (regionFirst || changed.role === 'alert') ? 'pass' : 'fail', changed ? `message landed in role=${changed.role}; region ${regionFirst ? `was in the DOM before the message (first seen with "${changed.firstSeen.slice(0, 30)}")` : 'was inserted together with the message'}` : 'no live region gained the message');
      const kept = await hasFocus(trigger);
      ctx.result('toast/focus-kept', kept ? 'pass' : 'fail', `focus on ${await activeDescription(page)}`);
      const toast = await waitFor(() => findVisible(page, cfg.toast ?? '[role="status"], [role="alert"]'), 1000);
      if (toast) {
        const btn = toast.locator('button');
        const nb = await btn.count();
        if (nb) {
          const names = [];
          for (let i = 0; i < nb; i++) names.push((await roleAndName(btn.nth(i))).name);
          ctx.result('toast/dismiss-name', names.every(Boolean) ? 'pass' : 'fail', `button name(s): ${names.map((x) => `"${x}"`).join(', ')}`);
        } else ctx.result('toast/dismiss-name', 'not_applicable', 'toast has no buttons');
      } else ctx.result('toast/dismiss-name', 'not_applicable', `no visible toast element (${cfg.toast ?? 'role status/alert'}) to inspect`);
      await axeCheck(ctx, 'toast-alert/axe', [cfg.region ?? cfg.trigger, cfg.toast ?? '']);
    }
  },

  {
    name: 'table',
    checks: {
      'table/semantics': 'The table is a table or grid with column headers and rows.',
      'table/sort-button': 'The sort control is a named button inside the column header.',
      'table/sort-state': 'The sorted header exposes aria-sort and it changes between ascending and descending.',
      'table/sort-order': 'Activating sort with the keyboard reorders the rows.',
      'table/filter-name': 'The filter input has an accessible name.',
      'table/filter-works': 'Typing a filter value reduces the visible rows.',
      'table/axe': 'No axe-core WCAG A/AA violations in the table region.'
    },
    async run(ctx) {
      const { page, cfg } = ctx;
      const table = await need(ctx, 'table', 'table/semantics');
      if (!table) return;
      const sem = await table.evaluate((/** @type {Element} */ el) => ({
        role: el.getAttribute('role') ?? (el.tagName === 'TABLE' ? 'table' : null),
        headers: el.querySelectorAll('th, [role="columnheader"]').length,
        rows: el.querySelectorAll('tbody tr, [role="row"]').length
      }));
      ctx.result('table/semantics', (sem.role === 'table' || sem.role === 'grid' || sem.role === 'treegrid') && sem.headers > 0 && sem.rows > 0 ? 'pass' : 'fail', `role=${sem.role}, ${sem.headers} header cell(s), ${sem.rows} row(s)`);
      const bodyRows = cfg.rows ?? 'tbody tr, [role="rowgroup"]:last-of-type [role="row"]';
      /** @returns {Promise<string[]>} */
      const rowTexts = () => table.locator(bodyRows).filter({ visible: true }).allTextContents();
      if (cfg.sortButton) {
        const b = await find(page, cfg.sortButton);
        if (!b) {
          ctx.result('table/sort-button', 'fail', `selector ${cfg.sortButton} matched nothing`);
        } else {
          const rn = await roleAndName(b);
          const inHeader = await b.evaluate((/** @type {Element} */ el) => Boolean(el.closest('th, [role="columnheader"]')));
          ctx.result('table/sort-button', (rn.role === 'button' || rn.role === 'columnheader') && rn.name && inHeader ? 'pass' : 'fail', `role=${rn.role}, name "${rn.name}", inside a column header: ${inHeader}`);
          const header = b.locator('xpath=ancestor-or-self::*[self::th or @role="columnheader"][1]');
          const s0 = await attr(header, 'aria-sort');
          const r0 = await rowTexts();
          await b.focus();
          await press(page, 'Enter');
          const s1 = await attr(header, 'aria-sort');
          const r1 = await rowTexts();
          await b.focus();
          await press(page, 'Enter');
          const s2 = await attr(header, 'aria-sort');
          const r2 = await rowTexts();
          const okState = ['ascending', 'descending'].includes(String(s1)) && ['ascending', 'descending'].includes(String(s2)) && s1 !== s2;
          ctx.result('table/sort-state', okState ? 'pass' : 'fail', `aria-sort ${s0} -> ${s1} -> ${s2} over two Enter presses`);
          const reordered = JSON.stringify(r1) !== JSON.stringify(r2) || JSON.stringify(r0) !== JSON.stringify(r1);
          ctx.result('table/sort-order', reordered ? 'pass' : 'fail', `first row: "${(r0[0] ?? '').slice(0, 30)}" -> "${(r1[0] ?? '').slice(0, 30)}" -> "${(r2[0] ?? '').slice(0, 30)}"`);
        }
      } else {
        for (const id of ['table/sort-button', 'table/sort-state', 'table/sort-order']) ctx.result(id, 'not_applicable', 'adapter declares no sort control');
      }
      if (cfg.filterInput) {
        const f = await find(page, cfg.filterInput);
        if (!f) ctx.result('table/filter-name', 'fail', `selector ${cfg.filterInput} matched nothing`);
        else {
          const { name } = await roleAndName(f);
          ctx.result('table/filter-name', name ? 'pass' : 'fail', name ? `accessible name "${name}"` : 'accessible name is empty');
          const before = (await rowTexts()).length;
          await f.fill(String(cfg.filterValue ?? ''));
          const after = await waitFor(async () => {
            const k = (await rowTexts()).length;
            return k < before ? k : false;
          }, 1500);
          ctx.result('table/filter-works', after !== false ? 'pass' : 'fail', `visible rows ${before} -> ${after === false ? (await rowTexts()).length : after} after typing ${JSON.stringify(cfg.filterValue ?? '')}`);
        }
      } else {
        for (const id of ['table/filter-name', 'table/filter-works']) ctx.result(id, 'not_applicable', 'adapter declares no filter input');
      }
      await axeCheck(ctx, 'table/axe', [cfg.region ?? cfg.table]);
    }
  },

  {
    name: 'pagination',
    checks: {
      'pagination/landmark': 'Pagination is a navigation landmark with an accessible name.',
      'pagination/current': 'Exactly one page control has aria-current="page" (or "true").',
      'pagination/names': 'Every link and button has an accessible name.',
      'pagination/axe': 'No axe-core WCAG A/AA violations in the pagination region.'
    },
    async run(ctx) {
      const { page, cfg } = ctx;
      const nav = await need(ctx, 'nav', 'pagination/landmark');
      if (!nav) return;
      const rn = await roleAndName(nav);
      ctx.result('pagination/landmark', rn.role === 'navigation' && rn.name ? 'pass' : 'fail', `role=${rn.role}, name "${rn.name}"`);
      const cur = await nav.locator('[aria-current="page"], [aria-current="true"]').count();
      ctx.result('pagination/current', cur === 1 ? 'pass' : 'fail', `${cur} element(s) with aria-current`);
      const controls = nav.locator('a[href], button, [role="link"], [role="button"]');
      const k = await controls.count();
      const unnamed = [];
      for (let i = 0; i < k; i++) if (!(await roleAndName(controls.nth(i))).name) unnamed.push(i + 1);
      ctx.result('pagination/names', k && !unnamed.length ? 'pass' : 'fail', unnamed.length ? `control(s) ${unnamed.join(', ')} of ${k} have no name` : `${k} control(s), all named`);
      await axeCheck(ctx, 'pagination/axe', [cfg.region ?? cfg.nav]);
    }
  },

  {
    name: 'navigation',
    checks: {
      'navigation/landmark': 'The navigation is a nav landmark, named when the page has more than one.',
      'navigation/current': 'The link for the current page has aria-current="page".',
      'navigation/no-menu-roles': 'Site navigation does not use role=menu or role=menubar.',
      'navigation/disclosure': 'A submenu trigger toggles aria-expanded with Enter, and Escape closes it and returns focus.',
      'navigation/axe': 'No axe-core WCAG A/AA violations in the navigation region.'
    },
    async run(ctx) {
      const { page, cfg } = ctx;
      const nav = await need(ctx, 'nav', 'navigation/landmark');
      if (!nav) return;
      const rn = await roleAndName(nav);
      const navCount = await page.locator('nav, [role="navigation"]').count();
      ctx.result('navigation/landmark', rn.role === 'navigation' && (rn.name || navCount === 1) ? 'pass' : 'fail', `role=${rn.role}, name "${rn.name}", ${navCount} navigation landmark(s) on the page`);
      if (cfg.expectCurrent === false) ctx.result('navigation/current', 'not_applicable', 'adapter says no current page is shown');
      else {
        const cur = await nav.locator('[aria-current="page"]').count();
        ctx.result('navigation/current', cur === 1 ? 'pass' : 'fail', `${cur} link(s) with aria-current="page"`);
      }
      const menus = await nav.locator('[role="menu"], [role="menubar"]').count();
      ctx.result('navigation/no-menu-roles', menus ? 'fail' : 'pass', `${menus} element(s) with role menu/menubar`);
      if (cfg.submenuTrigger) {
        const t = await find(page, cfg.submenuTrigger);
        if (!t) ctx.result('navigation/disclosure', 'fail', `selector ${cfg.submenuTrigger} matched nothing`);
        else {
          const e0 = await attr(t, 'aria-expanded');
          await t.focus();
          await press(page, 'Enter');
          const e1 = await waitFor(async () => ((await attr(t, 'aria-expanded')) === 'true' ? 'true' : false), 1000);
          const v = await axeScan(page, ctx.axeSource, [cfg.region ?? cfg.nav]);
          if (v.length) ctx.result('navigation/axe', 'fail', `axe-core (submenu open): ${v.map((x) => `${x.id} (${x.impact}) at ${x.nodes.join(', ')}`).join('; ')}`);
          await press(page, 'Escape');
          const e2 = await attr(t, 'aria-expanded');
          const back = await hasFocus(t);
          ctx.result('navigation/disclosure', e0 === 'false' && e1 === 'true' && e2 === 'false' && back ? 'pass' : 'fail', `aria-expanded ${e0} -> ${e1 || await attr(t, 'aria-expanded')} (Enter) -> ${e2} (Escape); focus on ${await activeDescription(page)}`);
        }
      } else ctx.result('navigation/disclosure', 'not_applicable', 'adapter declares no submenu trigger');
      await axeCheck(ctx, 'navigation/axe', [cfg.region ?? cfg.nav]);
    }
  }
];

export const COMPONENTS = SUITES.map((s) => s.name);
