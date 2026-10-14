// Small Playwright helpers shared by the conformance checks. Everything here drives the
// page through public Playwright APIs (locators, keyboard, ariaSnapshot) so a check sees
// what an assistive technology or keyboard user would, not a library's internals.

/** @typedef {import('./types.js').Page} Page */
/** @typedef {import('./types.js').Locator} Locator */

/** Default wait after a key press for the page to settle (ms). */
export const SETTLE_MS = 120;

/**
 * Poll `fn` until it returns truthy or the timeout passes.
 * @template T
 * @param {() => Promise<T>} fn
 * @param {number} [timeout]
 * @returns {Promise<T | false>}
 */
export async function waitFor(fn, timeout = 1500) {
  const end = Date.now() + timeout;
  for (;;) {
    let v;
    try {
      v = await fn();
    } catch {
      v = false;
    }
    if (v) return v;
    if (Date.now() > end) return false;
    await new Promise((r) => setTimeout(r, 50));
  }
}

/**
 * Press a key on the focused element and let the page settle.
 * @param {Page} page
 * @param {string} key
 */
export async function press(page, key) {
  await page.keyboard.press(key);
  await page.waitForTimeout(SETTLE_MS);
}

/**
 * First element matching a selector, or null when nothing matches.
 * @param {Page} page
 * @param {string} selector
 * @returns {Promise<Locator | null>}
 */
export async function find(page, selector) {
  const loc = page.locator(selector).first();
  return (await loc.count()) ? loc : null;
}

/**
 * First visible element matching a selector, or null.
 * @param {Page} page
 * @param {string} selector
 * @returns {Promise<Locator | null>}
 */
export async function findVisible(page, selector) {
  const loc = page.locator(selector).filter({ visible: true }).first();
  return (await loc.count()) ? loc : null;
}

/**
 * Role and accessible name as Playwright computes them (first line of the ARIA snapshot).
 * @param {Locator} loc
 * @returns {Promise<{ role: string | null, name: string }>}
 */
export async function roleAndName(loc) {
  const snap = await loc.ariaSnapshot({ timeout: 2000 }).catch(() => '');
  const first = String(snap).split('\n')[0] ?? '';
  const m = /^- ([a-zA-Z]+)(?: "((?:[^"\\]|\\.)*)")?/.exec(first) ?? /^- ([a-zA-Z]+)(?: (\S.*?))?:?$/.exec(first);
  if (!m) return { role: null, name: '' };
  return { role: m[1], name: (m[2] ?? '').replace(/\\"/g, '"').replace(/:$/, '').trim() };
}

/**
 * Short description of the focused element, for evidence strings.
 * @param {Page} page
 * @returns {Promise<string>}
 */
export function activeDescription(page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return 'body (nothing focused)';
    const role = el.getAttribute('role');
    const id = el.id ? `#${el.id}` : '';
    const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
    return `${el.tagName.toLowerCase()}${id}${role ? `[role=${role}]` : ''}${text ? ` "${text}"` : ''}`;
  });
}

/**
 * Is the focused element this element (or, with `within`, inside it)?
 * @param {Locator} loc
 * @param {boolean} [within]
 * @returns {Promise<boolean>}
 */
export function hasFocus(loc, within = false) {
  return loc.evaluate((el, w) => {
    const a = document.activeElement;
    return a === el || (w && a !== null && el.contains(a));
  }, within);
}

/**
 * The element that is "current" for a composite widget: the focused element, or the
 * element named by aria-activedescendant on the focused element.
 * @param {Page} page
 * @returns {Promise<{ text: string, role: string | null, id: string } | null>}
 */
export function currentItem(page) {
  return page.evaluate(() => {
    let el = document.activeElement;
    const ad = el?.getAttribute('aria-activedescendant');
    if (ad) el = document.getElementById(ad);
    if (!el || el === document.body) return null;
    return { text: (el.textContent ?? '').trim().replace(/\s+/g, ' '), role: el.getAttribute('role'), id: el.id };
  });
}

/**
 * Do all ids in an IDREF attribute exist in the document?
 * @param {Locator} loc
 * @param {string} attr
 * @returns {Promise<{ present: boolean, ids: string[], missing: string[], text: string }>}
 */
export function idrefs(loc, attr) {
  return loc.evaluate((el, a) => {
    const value = el.getAttribute(a);
    if (value === null) return { present: false, ids: [], missing: [], text: '' };
    const ids = value.trim().split(/\s+/).filter(Boolean);
    const missing = ids.filter((id) => !document.getElementById(id));
    const text = ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' ').trim().replace(/\s+/g, ' ');
    return { present: true, ids, missing, text };
  }, attr);
}

/**
 * Install a click counter on an element (window.__craftClicks).
 * @param {Locator} loc
 */
export async function countClicks(loc) {
  await loc.evaluate((el) => {
    /** @type {any} */ (window).__craftClicks = 0;
    el.addEventListener('click', () => { /** @type {any} */ (window).__craftClicks++; });
  });
}

/**
 * @param {Page} page
 * @returns {Promise<number>}
 */
export function clicks(page) {
  return page.evaluate(() => /** @type {any} */ (window).__craftClicks ?? 0);
}

/**
 * Move focus to an element with a real Tab key press, the way a keyboard user arrives:
 * a temporary button is inserted just before it, focused, and Tab is pressed. Some
 * libraries react differently to programmatic focus() than to keyboard focus.
 * @param {Page} page
 * @param {Locator} loc
 * @returns {Promise<boolean>} whether the element ended up focused
 */
export async function tabTo(page, loc) {
  await loc.evaluate((/** @type {Element} */ el) => {
    const b = document.createElement('button');
    b.id = '__craft_tab_probe';
    b.textContent = 'probe';
    el.before(b);
  });
  await page.locator('#__craft_tab_probe').focus();
  await page.keyboard.press('Tab');
  await page.evaluate(() => document.getElementById('__craft_tab_probe')?.remove());
  await page.waitForTimeout(SETTLE_MS);
  return hasFocus(loc);
}

/**
 * Run axe-core (already injected) over the given selectors, WCAG 2.x A/AA rules only.
 * @param {Page} page
 * @param {string} axeSource
 * @param {string[]} selectors
 * @returns {Promise<{ id: string, impact: string, nodes: string[] }[]>}
 */
export async function axeScan(page, axeSource, selectors) {
  const has = await page.evaluate(() => typeof (/** @type {any} */ (window).axe) !== 'undefined');
  if (!has) await page.addScriptTag({ content: axeSource });
  return page.evaluate(async (sels) => {
    const include = sels.filter((s) => document.querySelector(s)).map((s) => [s]);
    if (!include.length) return [];
    // @ts-ignore axe is injected above
    const r = await window.axe.run({ include }, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] });
    return r.violations.map((/** @type {any} */ v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((/** @type {any} */ n) => n.target.join(' ')).slice(0, 5) }));
  }, selectors);
}
