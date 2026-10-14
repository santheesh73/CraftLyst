/** Custom properties set at runtime by common libraries; references to them are not errors. */
const LIBRARY_PREFIXES = /^--(tw-|radix-|reach-|chakra-|mantine-|mui-|bs-|swiper-|toastify-|rdp-|sonner-|vaul-|cmdk-|framer-|motion-|font-|next-|geist-|un-|shiki-)/;

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
    for (const doc of ctx.docs) {
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
          if (m[2] || defined.has(name) || LIBRARY_PREFIXES.test(name)) continue;
          out.push({ file: doc.file, line, message: `var(${name}) is not defined in the project CSS or .craft/tokens.json.`, remediation: `Define ${name} (or the matching token), fix the name, or add a fallback value.` });
        }
      }
    }
    return out;
  }
};
