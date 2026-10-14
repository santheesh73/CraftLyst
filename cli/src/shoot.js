// Tier 2: render pages in Chromium (Playwright) and check what static analysis cannot:
// overflow at real viewports, axe-core, keyboard focus visibility, target sizes, motion under
// prefers-reduced-motion, plus dark, RTL, 200% zoom, and forced-colors captures.
// Playwright and axe-core are resolved from the project, then from the CLI's own location;
// craft never installs them (ADR-0013). Only loopback and file:// are reachable unless
// --allow-network is passed (ADR-0012).
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve as resolvePath, relative, sep } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

/** @typedef {import('./report.js').Check} Check */
/** @typedef {import('./lint.js').Finding} Finding */

export const VIEWPORTS = [320, 375, 768, 1280, 1920];
export const PINNED = { playwright: '1.56.1', axe: '4.13.0' };
export const INSTALL_COMMAND = `npm install --save-dev --save-exact playwright@${PINNED.playwright} axe-core@${PINNED.axe} && npx playwright install chromium`;
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/**
 * @param {string} url
 * @returns {boolean}
 */
export function isLoopback(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'file:' || ((u.protocol === 'http:' || u.protocol === 'https:') && LOOPBACK.has(u.hostname));
  } catch {
    return false;
  }
}

/** Requests that are always local to the page. */
const isInline = (/** @type {string} */ url) => /^(data|blob|about):/.test(url);

/**
 * Find a module from the project first, then from the CLI install.
 * @param {string} root
 * @param {string} specifier
 * @returns {string | null} resolved file path
 */
export function resolveFrom(root, specifier) {
  for (const base of [join(root, 'package.json'), fileURLToPath(import.meta.url)]) {
    try {
      return createRequire(base).resolve(specifier);
    } catch {
      // try the next location
    }
  }
  return null;
}

/**
 * @param {string} s
 * @returns {string}
 */
const slug = (s) => s.replace(/^[a-z]+:\/\/[^/]+/, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'index';

/** Map axe rule ids onto craft rule ids. */
const AXE_RULE = /** @type {Record<string, string>} */ ({
  'color-contrast': 'a11y/contrast', 'color-contrast-enhanced': 'a11y/contrast',
  'image-alt': 'a11y/alt', 'button-name': 'a11y/alt', 'link-name': 'a11y/alt', 'input-image-alt': 'a11y/alt', 'svg-img-alt': 'a11y/alt', 'role-img-alt': 'a11y/alt',
  'target-size': 'a11y/target', 'meta-viewport': 'rsp/viewport', 'meta-viewport-large': 'rsp/viewport'
});

/**
 * @typedef {{ urls?: string[], files?: string[], allowNetwork?: boolean, outDir?: string, viewports?: number[], maxTabs?: number }} ShootOptions
 * @typedef {{ status: 'ok', checks: Check[], findings: Finding[], screenshots: string[], blocked: string[] }
 *   | { status: 'unavailable', message: string }
 *   | { status: 'usage', message: string }} ShootResult
 */

/**
 * @param {string} root
 * @param {ShootOptions} opts
 * @returns {Promise<ShootResult>}
 */
export async function shoot(root, opts) {
  /** @type {{ label: string, url: string }[]} */
  const targets = [];
  for (const u of opts.urls ?? []) {
    let parsed;
    try {
      parsed = new URL(u);
    } catch {
      return { status: 'usage', message: `"${u}" is not a valid URL.` };
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return { status: 'usage', message: `--url must be http(s); use --file for local files.` };
    if (!isLoopback(u) && !opts.allowNetwork) return { status: 'usage', message: `${parsed.host} is not loopback. Pass --allow-network to render a remote URL (ADR-0012).` };
    targets.push({ label: parsed.pathname + parsed.search, url: u });
  }
  for (const f of opts.files ?? []) {
    const abs = resolvePath(root, f);
    if (!existsSync(abs)) return { status: 'usage', message: `File not found: ${f}` };
    targets.push({ label: relative(root, abs).split(sep).join('/'), url: pathToFileURL(abs).href });
  }
  if (!targets.length) return { status: 'usage', message: 'Pass --url <http://localhost:PORT/path> (repeatable) or --file <page.html>.' };

  const pwPath = resolveFrom(root, 'playwright');
  const axePath = resolveFrom(root, 'axe-core/axe.min.js');
  if (!pwPath || !axePath) {
    return { status: 'unavailable', message: `Tier 2 needs Playwright and axe-core, which are not installed (${[!pwPath && 'playwright', !axePath && 'axe-core'].filter(Boolean).join(', ')} missing). With the user's approval, install the pinned versions:\n  ${INSTALL_COMMAND}\nUntil then, record Tier 2 checks as not verified.` };
  }
  /** @type {any} */
  const pw = await import(pathToFileURL(pwPath).href);
  const chromium = pw.chromium ?? pw.default?.chromium;
  const axeSource = readFileSync(axePath, 'utf8');
  /** @type {any} */
  let browser;
  try {
    browser = await chromium.launch();
  } catch (err) {
    return { status: 'unavailable', message: `Chromium could not start: ${String(/** @type {Error} */ (err).message).split('\n')[0]}. With the user's approval run: npx playwright install chromium` };
  }

  const outDir = opts.outDir ?? join(root, '.craft', 'reports', 'shots');
  mkdirSync(outDir, { recursive: true });
  const viewports = opts.viewports ?? VIEWPORTS;
  /** @type {Check[]} */
  const checks = [];
  /** @type {Finding[]} */
  const findings = [];
  /** @type {string[]} */
  const screenshots = [];
  /** @type {Set<string>} */
  const blocked = new Set();
  /** @param {Omit<Finding, 'tier' | 'confidence'> & { confidence?: number }} f */
  const add = (f) => findings.push({ confidence: 0.9, ...f, tier: 'T2' });
  /** @param {string} p */
  const rel = (p) => relative(root, p).split(sep).join('/');

  /**
   * @param {Record<string, any>} contextOptions
   * @returns {Promise<any>}
   */
  const newPage = async (contextOptions) => {
    const context = await browser.newContext(contextOptions);
    await context.route('**/*', (/** @type {any} */ route) => {
      const url = route.request().url();
      if (opts.allowNetwork || isLoopback(url) || isInline(url)) return route.continue();
      blocked.add(new URL(url).origin);
      return route.abort('blockedbyclient');
    });
    return context.newPage();
  };

  try {
    for (const target of targets) {
      const name = slug(target.label);
      const started = Date.now();
      let loadError = null;

      // 1. Overflow and screenshots at each viewport.
      /** @type {string[]} */
      const overflowAt = [];
      for (const width of viewports) {
        const page = await newPage({ viewport: { width, height: 900 } });
        try {
          await page.goto(target.url, { waitUntil: 'load', timeout: 30000 });
        } catch (err) {
          loadError = String(/** @type {Error} */ (err).message).split('\n')[0];
          await page.context().close();
          break;
        }
        const shot = join(outDir, `${name}-${width}.png`);
        await page.screenshot({ path: shot, fullPage: true });
        screenshots.push(rel(shot));
        const over = await page.evaluate(overflowProbe);
        if (over.scrollWidth > over.innerWidth + 1) {
          overflowAt.push(`${width}px`);
          add({ ruleId: 'rsp/overflow', file: target.label, severity: 'block', message: `Horizontal overflow at ${width}px: page is ${over.scrollWidth}px wide${over.culprits.length ? `; widest: ${over.culprits.join(', ')}` : ''}.`, remediation: 'Let the element shrink (min-width: 0, max-width: 100%, flex-wrap) or wrap long content; check the 320px screenshot.' });
        }
        if (width === 375) {
          // axe target-size enforces the WCAG 2.2 24px minimum (with its spacing exception);
          // this adds the 44px touch recommendation as information.
          for (const t of await page.evaluate(targetProbe, 44)) {
            add({ ruleId: 'a11y/target', file: target.label, severity: 'info', confidence: 0.6, message: `Target ${t.label} is ${t.w}x${t.h}px at 375px, under the 44x44px touch recommendation.`, remediation: 'Give touch controls a 44x44px hit area with padding or min-height where layout allows.' });
          }
        }
        await page.context().close();
      }
      if (loadError) {
        checks.push({ id: `t2.load:${target.label}`, tier: 'T2', status: 'failed', evidence: `Could not load ${target.url}: ${loadError}` });
        continue;
      }
      checks.push(overflowAt.length
        ? { id: `t2.overflow:${target.label}`, tier: 'T2', status: 'failed', evidence: `Horizontal overflow at ${overflowAt.join(', ')}` }
        : { id: `t2.overflow:${target.label}`, tier: 'T2', status: 'verified', evidence: `No horizontal overflow at ${viewports.join(', ')}px` });

      // 2. axe-core, light and dark, at 1280px.
      for (const scheme of ['light', 'dark']) {
        const page = await newPage({ viewport: { width: 1280, height: 900 }, colorScheme: scheme });
        await page.goto(target.url, { waitUntil: 'load', timeout: 30000 });
        await page.addScriptTag({ content: axeSource });
        /** @type {{ id: string, impact: string | null, help: string, nodes: { target: string[] }[] }[]} */
        const violations = await page.evaluate(async (/** @type {boolean} */ onlyContrast) => {
          // @ts-ignore axe is injected above
          const r = await window.axe.run(document, onlyContrast ? { runOnly: ['color-contrast'] } : { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] });
          return r.violations.map((/** @type {any} */ v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 5).map((/** @type {any} */ n) => ({ target: n.target })) }));
        }, scheme === 'dark');
        for (const v of violations) {
          add({ ruleId: AXE_RULE[v.id] ?? 'a11y/semantics', file: target.label, severity: v.impact === 'critical' || v.impact === 'serious' ? 'block' : 'warn', message: `axe ${v.id} (${scheme}): ${v.help}. Nodes: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}.`, remediation: `See the axe-core rule "${v.id}" and fix each listed node.` });
        }
        checks.push(violations.some((v) => v.impact === 'critical' || v.impact === 'serious')
          ? { id: `t2.axe-${scheme}:${target.label}`, tier: 'T2', status: 'failed', evidence: `axe-core ${scheme}: ${violations.length} rule(s) violated (${violations.map((v) => v.id).join(', ')})` }
          : { id: `t2.axe-${scheme}:${target.label}`, tier: 'T2', status: 'verified', evidence: `axe-core ${scheme === 'dark' ? 'color-contrast in dark scheme' : 'WCAG 2.2 A/AA + best-practice'}: ${violations.length ? `${violations.length} minor/moderate rule(s) (${violations.map((v) => v.id).join(', ')})` : 'no violations'}` });
        if (scheme === 'dark') {
          const shot = join(outDir, `${name}-dark-1280.png`);
          await page.screenshot({ path: shot, fullPage: true });
          screenshots.push(rel(shot));
        }
        await page.context().close();
      }

      // 3. Keyboard walk: every Tab stop must show a visible focus indicator.
      {
        const page = await newPage({ viewport: { width: 1280, height: 900 } });
        await page.goto(target.url, { waitUntil: 'load', timeout: 30000 });
        /** @type {string[]} */
        const invisible = [];
        /** @type {string[]} */
        const seen = [];
        for (let i = 0; i < (opts.maxTabs ?? 60); i++) {
          await page.keyboard.press('Tab');
          const info = await page.evaluate(focusProbe);
          if (!info) break;
          if (seen.includes(info.key)) break;
          seen.push(info.key);
          if (!info.visible) invisible.push(info.label);
        }
        for (const label of invisible) add({ ruleId: 'a11y/focus', file: target.label, severity: 'block', message: `Keyboard focus on ${label} shows no outline, ring, or border change.`, remediation: 'Add a :focus-visible style with at least a 2px outline in the focus color token.' });
        checks.push(invisible.length
          ? { id: `t2.keyboard:${target.label}`, tier: 'T2', status: 'failed', evidence: `${invisible.length} of ${seen.length} tab stops have no visible focus indicator` }
          : seen.length
            ? { id: `t2.keyboard:${target.label}`, tier: 'T2', status: 'verified', evidence: `${seen.length} tab stops, each with a visible focus indicator` }
            : { id: `t2.keyboard:${target.label}`, tier: 'T2', status: 'not_verified', reason: 'The page has no keyboard-focusable elements.' });
        await page.context().close();
      }

      // 4. Reduced motion: nothing should keep animating.
      {
        const page = await newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
        await page.goto(target.url, { waitUntil: 'load', timeout: 30000 });
        await page.waitForTimeout(300);
        const moving = await page.evaluate(motionProbe);
        for (const m of moving) add({ ruleId: 'mot/no-reduced', file: target.label, severity: 'warn', confidence: 0.8, message: `Under prefers-reduced-motion: reduce, ${m} is still animating.`, remediation: 'Stop or shorten the animation inside @media (prefers-reduced-motion: reduce).' });
        checks.push(moving.length
          ? { id: `t2.reduced-motion:${target.label}`, tier: 'T2', status: 'failed', evidence: `${moving.length} animation(s) still running under reduced motion: ${moving.slice(0, 3).join(', ')}` }
          : { id: `t2.reduced-motion:${target.label}`, tier: 'T2', status: 'verified', evidence: 'No running long or infinite animations under prefers-reduced-motion: reduce' });
        await page.context().close();
      }

      // 5. 200% zoom (1280px at 2x = 640 CSS px) and RTL: overflow only; plus forced-colors capture.
      /** @type {[string, Record<string, any>, boolean][]} */
      const variants = [['zoom200', { viewport: { width: 640, height: 900 } }, false], ['rtl', { viewport: { width: 375, height: 900 } }, true]];
      for (const [variant, ctxOpts, rtl] of variants) {
        const page = await newPage(ctxOpts);
        await page.goto(target.url, { waitUntil: 'load', timeout: 30000 });
        if (rtl) await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
        const over = await page.evaluate(overflowProbe);
        const shot = join(outDir, `${name}-${variant}.png`);
        await page.screenshot({ path: shot, fullPage: true });
        screenshots.push(rel(shot));
        if (over.scrollWidth > over.innerWidth + 1) {
          add({ ruleId: 'rsp/overflow', file: target.label, severity: variant === 'rtl' ? 'warn' : 'block', message: `Horizontal overflow ${variant === 'rtl' ? 'in RTL at 375px' : 'at 200% zoom (640 CSS px)'}: ${over.scrollWidth}px wide${over.culprits.length ? `; widest: ${over.culprits.join(', ')}` : ''}.`, remediation: variant === 'rtl' ? 'Use logical properties (margin-inline, inset-inline) instead of left/right.' : 'Content must reflow at 200% zoom (WCAG 1.4.10).' });
          checks.push({ id: `t2.${variant}:${target.label}`, tier: 'T2', status: 'failed', evidence: `Horizontal overflow ${over.scrollWidth}px > ${over.innerWidth}px` });
        } else {
          checks.push({ id: `t2.${variant}:${target.label}`, tier: 'T2', status: 'verified', evidence: `No horizontal overflow (${variant === 'rtl' ? 'dir=rtl at 375px' : '640 CSS px, equivalent to 200% zoom at 1280px'})` });
        }
        await page.context().close();
      }
      {
        const page = await newPage({ viewport: { width: 1280, height: 900 }, forcedColors: 'active' });
        await page.goto(target.url, { waitUntil: 'load', timeout: 30000 });
        const shot = join(outDir, `${name}-forced-colors.png`);
        await page.screenshot({ path: shot, fullPage: true });
        screenshots.push(rel(shot));
        checks.push({ id: `t2.forced-colors:${target.label}`, tier: 'T2', status: 'not_verified', reason: `Captured ${rel(shot)}; forced-colors rendering needs a visual review (no automated assertion).` });
        await page.context().close();
      }
      checks.push({ id: `t2.render:${target.label}`, tier: 'T2', status: 'verified', evidence: `Rendered ${target.url} in Chromium at ${viewports.join('/')}px, dark, RTL, 200% zoom, forced colors in ${Math.round((Date.now() - started) / 100) / 10} s; screenshots in ${rel(outDir)}` });
    }
  } finally {
    await browser.close();
  }
  if (blocked.size) {
    checks.push({ id: 't2.network', tier: 'T2', status: 'not_verified', reason: `Blocked non-loopback requests to ${[...blocked].sort().join(', ')} (pass --allow-network to load them); the render may differ from production.` });
  }
  return { status: 'ok', checks, findings, screenshots, blocked: [...blocked].sort() };
}

// The probes below run inside the page (serialized by Playwright), not in Node.

/** @returns {{ scrollWidth: number, innerWidth: number, culprits: string[] }} */
function overflowProbe() {
  const innerWidth = document.documentElement.clientWidth;
  /** @type {{ w: number, label: string }[]} */
  const wide = [];
  for (const el of Array.from(document.body ? document.body.querySelectorAll('*') : [])) {
    const r = el.getBoundingClientRect();
    if ((r.right > innerWidth + 1 || r.left < -1) && r.width > 0) {
      const cls = typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : '';
      wide.push({ w: Math.round(r.width), label: `<${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${cls}> (${Math.round(r.width)}px)` });
    }
  }
  wide.sort((a, b) => b.w - a.w);
  return { scrollWidth: document.documentElement.scrollWidth, innerWidth, culprits: wide.slice(0, 3).map((x) => x.label) };
}

/**
 * @param {number} min
 * @returns {{ label: string, w: number, h: number }[]}
 */
function targetProbe(min) {
  /** @type {{ label: string, w: number, h: number }[]} */
  const out = [];
  for (const el of Array.from(document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=link], [tabindex]:not([tabindex="-1"])'))) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    // Inline links inside running text are exempt (WCAG 2.5.8 inline exception).
    if (el.tagName === 'A' && getComputedStyle(el).display === 'inline' && el.parentElement && /^(P|LI|TD|SPAN|DD)$/.test(el.parentElement.tagName)) continue;
    if (r.width < min || r.height < min) {
      const text = (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30);
      out.push({ label: `<${el.tagName.toLowerCase()}>${text ? ` "${text}"` : ''}`, w: Math.round(r.width), h: Math.round(r.height) });
    }
  }
  return out.slice(0, 20);
}

/** @returns {{ key: string, label: string, visible: boolean } | null} */
function focusProbe() {
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return null;
  const s = getComputedStyle(el);
  const outline = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
  const shadow = s.boxShadow !== 'none';
  // Compare with the unfocused style to catch border or background changes.
  const clone = /** @type {HTMLElement} */ (el.cloneNode(false));
  clone.style.position = 'absolute';
  clone.style.visibility = 'hidden';
  (el.parentElement || document.body).appendChild(clone);
  const c = getComputedStyle(clone);
  const changed = c.borderColor !== s.borderColor || c.backgroundColor !== s.backgroundColor || c.textDecorationLine !== s.textDecorationLine || c.color !== s.color;
  clone.remove();
  const r = el.getBoundingClientRect();
  const text = (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30);
  return { key: `${el.tagName}|${Math.round(r.x)}|${Math.round(r.y)}|${text}`, label: `<${el.tagName.toLowerCase()}>${text ? ` "${text}"` : ''}`, visible: outline || shadow || changed };
}

/** @returns {string[]} */
function motionProbe() {
  return document.getAnimations()
    .filter((a) => {
      if (a.playState !== 'running') return false;
      const t = a.effect ? a.effect.getComputedTiming() : null;
      return !!t && (t.iterations === Infinity || Number(t.duration) > 1000);
    })
    .slice(0, 10)
    .map((a) => {
      const target = a.effect && /** @type {KeyframeEffect} */ (a.effect).target;
      const name = /** @type {any} */ (a).animationName || /** @type {any} */ (a).transitionProperty || 'animation';
      return `${name} on <${target ? target.tagName.toLowerCase() : '?'}>`;
    });
}
