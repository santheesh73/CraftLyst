// Shared JSDoc types for the conformance kit. Playwright objects are typed loosely so the
// kit type-checks without Playwright installed (it is optional, ADR-0013).

/** @typedef {any} Page */
/** @typedef {any} Locator */

/**
 * @typedef {'pass' | 'fail' | 'not_applicable'} Status
 * @typedef {{ id: string, component: string, requirement: string, status: Status, evidence: string }} CheckResult
 * @typedef {{ page: Page, cfg: Record<string, any>, axeSource: string, result: (id: string, status: Status, evidence: string) => void }} Ctx
 * @typedef {{ requirement: string }} CheckInfo
 * @typedef {{ name: string, checks: Record<string, string>, run: (ctx: Ctx) => Promise<void> }} ComponentSuite
 */

export {};
