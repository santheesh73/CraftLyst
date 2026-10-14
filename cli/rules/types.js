// Shared JSDoc types for rules. Rules are plain objects; see CONTRIBUTING.md.

/**
 * @typedef {import('../src/document.js').Document} Document
 * @typedef {import('../src/parse/markup.js').Element} Element
 * @typedef {{
 *   root: string, docs: Document[], config: Record<string, any>,
 *   thresholds: { cardShare: number, cardDepth: number, cloneGridMin: number, defaultStackShare: number, touchTarget: number, touchTargetMin: number, glowBlurPx: number },
 *   tokens: any, tokenValues: Set<string>, tokenVars: Set<string>, definedVars: Set<string>,
 *   classes: Map<string, Map<string, string>>, design: string | null, axes: Record<string, string>,
 *   text: () => string
 * }} RuleContext
 * @typedef {{ file: string, line?: number, column?: number, message: string, remediation: string, severity?: 'block' | 'warn' | 'info', confidence?: number }} RawFinding
 * @typedef {{
 *   id: string, description: string, severity: 'block' | 'warn' | 'info', confidence: number, tier: 'T0' | 'T2',
 *   check?: (ctx: RuleContext) => RawFinding[]
 * }} Rule
 */

export {};
