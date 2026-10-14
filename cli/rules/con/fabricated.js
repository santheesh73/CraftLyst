/** Placeholder text that must never ship (block). */
const PLACEHOLDERS = [
  { re: /\blorem ipsum\b|\bdolor sit amet\b|\bconsectetur adipiscing\b/i, what: 'lorem ipsum placeholder text' },
  { re: /\b(john|jane) doe\b/i, what: 'placeholder person name' },
  { re: /\bAcme\b/, what: 'placeholder company name "Acme"' }
];

/** Claims that need a real source (warn). */
const CLAIMS = [
  { re: /\b\d[\d,.]*\s?[kKmMbB]?\+\s*(happy |satisfied |active )?(users|customers|clients|developers|teams|companies|downloads|businesses|members|reviews|creators|students|installs)\b/i, what: 'unsourced count claim' },
  { re: /\b(over|more than|join)\s+\d[\d,.]*\s?[kKmMbB]?\+?\s+(happy |satisfied |active )?(users|customers|clients|developers|teams|companies|businesses|members|creators|students)\b/i, what: 'unsourced count claim' },
  { re: /\btrusted by\b/i, what: '"Trusted by" claim (needs a data source)' },
  { re: /\b99\.9+\s?%\s*(uptime|availability|satisfaction)\b/i, what: 'unsourced reliability claim' },
  { re: /★{4,}|⭐{3,}|\b[45](\.\d)?\s*\/\s*5\s*stars?\b|\b5[- ]star(s)? (rating|reviews?)\b/i, what: 'star-rating filler' }
];

/** Plan limits ("Team size: 100+ developers", "Up to 20+ users") on pricing pages are not adoption claims. */
const PLAN_FILE = /pric|plans?\b|billing|subscription/i;
const PLAN_LINE = /\b(up to|team size|seats?|limits?|max(imum)?|per (month|year|seat|user))\b/i;

const SKIP_CONTEXT = /^attr:(class|className|href|src|srcSet|id|key|type|name|placeholder|rel|target|role|data-|aria-controls|htmlFor|for|style|as|method|action|lang|dir|width|height|sizes|loading|variant|size|color)/;

/** @type {import('../types.js').Rule} */
export default {
  id: 'con/fabricated',
  description: 'Placeholder text, invented names and counts, unsourced proof, and unattributed testimonials.',
  severity: 'block',
  confidence: 0.8,
  tier: 'T0',
  check(ctx) {
    /** @type {import('../types.js').RawFinding[]} */
    const out = [];
    for (const doc of ctx.docs) {
      if (doc.kind === 'css' || doc.isTest || doc.isFixture) continue;
      /** @type {[number, number][]} */
      const illustrative = doc.all.filter((e) => 'data-craft-illustrative' in e.attrs).map((e) => [e.line, e.endLine]);
      const isIllustrative = (/** @type {number} */ line) => illustrative.some(([a, b]) => line >= a && line <= b);
      /** @type {Set<string>} */
      const seen = new Set();
      const lines = doc.source.split('\n');
      for (const s of doc.strings) {
        if (SKIP_CONTEXT.test(s.context) || isIllustrative(s.line)) continue;
        if (/^(\.|\/|@|https?:|[\w-]+\/[\w-]+$)/.test(s.value.trim())) continue;
        for (const p of PLACEHOLDERS) {
          const key = `${s.line}|${p.what}`;
          if (p.re.test(s.value) && !seen.has(key)) {
            seen.add(key);
            out.push({ file: doc.file, line: s.line, severity: 'block', confidence: 0.9, message: `${p.what[0].toUpperCase()}${p.what.slice(1)}: "${s.value.trim().slice(0, 60)}".`, remediation: 'Use real content, or wrap illustrative content in an element with data-craft-illustrative and list the gap in DESIGN.md open questions.' });
          }
        }
        for (const c of CLAIMS) {
          const key = `${s.line}|${c.what}`;
          if (c.what === 'unsourced count claim' && (PLAN_FILE.test(doc.file) || PLAN_LINE.test(lines[s.line - 1] ?? ''))) continue;
          if (c.re.test(s.value) && !seen.has(key)) {
            seen.add(key);
            out.push({ file: doc.file, line: s.line, severity: 'warn', confidence: c.what.startsWith('"Trusted') ? 0.5 : 0.7, message: `${c.what[0].toUpperCase()}${c.what.slice(1)}: "${s.value.trim().slice(0, 60)}".`, remediation: 'Back the claim with a real, cited source, or remove it. Mark mock content with data-craft-illustrative.' });
            break;
          }
        }
      }
      for (const el of doc.all) {
        // A blockquote without literal text is a component wrapper (MDX, CMS), not a testimonial.
        if (el.tag !== 'blockquote' || isIllustrative(el.line) || el.hasSpread || !el.text.length) continue;
        const attributed = 'cite' in el.attrs || el.children.some((c) => /^(cite|footer|figcaption)$/.test(c.tag)) || (el.parent?.tag === 'figure' && el.parent.children.some((c) => c.tag === 'figcaption'));
        if (!attributed) out.push({ file: doc.file, line: el.line, severity: 'warn', confidence: 0.4, message: 'Quote without attribution (no cite, footer, or figcaption).', remediation: 'Attribute testimonials to a real, consenting person or source, or remove them.' });
      }
    }
    return out;
  }
};
