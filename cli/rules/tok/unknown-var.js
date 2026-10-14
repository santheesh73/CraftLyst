/** Custom properties set at runtime by common libraries; references to them are not errors. */
const LIBRARY_PREFIXES = /^--(tw-|radix-|reach-|chakra-|mantine-|mui-|bs-|swiper-|toastify-|rdp-|sonner-|vaul-|cmdk-|framer-|motion-|font-|next-|geist-|un-|shiki-)/;

/** Theme variables Tailwind CSS v4 defines when a stylesheet imports "tailwindcss". */
const TAILWIND_V4 = /^--(color|spacing|radius|font|text|tracking|leading|shadow|inset-shadow|drop-shadow|text-shadow|breakpoint|container|ease|animate|blur|perspective|aspect|default)(-|$)/;

/**
 * Family of a custom property: everything before its last segment (--vp-c-shadow-3 -> --vp-c-).
 * @param {string} name
 */
const family = (name) => name.replace(/-[^-]+$/, '-');

/** @type {import('../types.js').Rule} */
export default {
  id: 'tok/unknown-var',
  description: 'var(--x) references a custom property that is defined nowhere in the project or tokens.',
  severity: 'warn',
  confidence: 0.7,
  tier: 'T0',
  check(ctx) {
    /** @type {import('../types.js').RawFinding[]} */
    const out = [];
    const defined = new Set([...ctx.definedVars, ...ctx.tokenVars]);
    // Variables assigned from JavaScript (style.setProperty('--x') or style={{'--x': ...}}) count as defined.
    for (const m of ctx.text().matchAll(/['"`](--[\w-]+)['"`]/g)) defined.add(m[1]);
    const tailwind4 = ctx.docs.some((d) => d.css.some((c) => c.atRules.some((a) => a.name === 'import' && /["']tailwindcss["']/.test(a.params) || a.name === 'theme')));
    const families = new Set([...defined].map(family));
    // A dependency's own variables (--pagefind-*, --docsearch-*) are set by its stylesheet at runtime.
    /** @type {Set<string>} */
    const depPrefixes = new Set();
    for (const d of ctx.docs) for (const i of d.imports) depPrefixes.add(i.replace(/^@[^/]+\//, '').split(/[/.-]/)[0].toLowerCase());
    for (const doc of ctx.docs) {
      if (doc.isTest || doc.isFixture) continue;
      /** @type {{ value: string, line: number }[]} */
      const values = [];
      for (const css of doc.css) for (const d of css.decls) values.push({ value: d.value, line: d.line });
      for (const el of doc.all) {
        for (const d of el.styleDecls) values.push({ value: d.value, line: d.line });
        for (const c of el.classes) if (c.includes('var(--')) values.push({ value: c, line: el.line });
      }
      for (const { value, line } of values) {
        for (const m of value.matchAll(/var\(\s*(--[\w-]+)\s*(,)?/g)) {
          const name = m[1];
          if (m[2] || defined.has(name) || LIBRARY_PREFIXES.test(name) || (tailwind4 && TAILWIND_V4.test(name))) continue;
          if (depPrefixes.has(name.slice(2).split('-')[0].toLowerCase())) continue;
          // A sibling of defined variables (--vp-c-shadow-3 next to --vp-c-*) is likely a typo: warn.
          // A name from an unknown family may come from a library stylesheet: informational.
          const sibling = families.has(family(name));
          out.push({ file: doc.file, line, severity: sibling ? 'warn' : 'info', confidence: sibling ? 0.75 : 0.4, message: `var(${name}) is not defined in the project CSS or .craft/tokens.json${sibling ? ', though related variables are' : ' (it may come from a library stylesheet)'}.`, remediation: `Define ${name} (or the matching token), fix the name, or add a fallback value.` });
        }
      }
    }
    return out;
  }
};
