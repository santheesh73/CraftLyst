// Rule registry. Static imports only: the CLI never loads code from user-controlled paths.
import tokHardcoded from './tok/hardcoded.js';
import tokUnknownVar from './tok/unknown-var.js';
import layCardDepth from './lay/card-depth.js';
import layCloneGrid from './lay/clone-grid.js';
import visDefaultStack from './vis/default-stack.js';
import visGradientText from './vis/gradient-text.js';
import conFabricated from './content/fabricated.js';
import motNoReduced from './mot/no-reduced.js';
import a11yFocus from './a11y/focus.js';
import a11yTarget from './a11y/target.js';
import a11yAlt from './a11y/alt.js';
import a11yContrast from './a11y/contrast.js';
import a11ySemantics from './a11y/semantics.js';
import rspOverflow from './rsp/overflow.js';
import rspViewport from './rsp/viewport.js';
import immNoFallback from './imm/no-fallback.js';
import immNoDomText from './imm/no-dom-text.js';
import immUnboundedLoop from './imm/unbounded-loop.js';
import ctrContract from './ctr/contract.js';
import excUnreasoned from './exc/unreasoned.js';

/** @type {import('./types.js').Rule[]} */
export const RULES = [
  tokHardcoded, tokUnknownVar, layCardDepth, layCloneGrid, visDefaultStack, visGradientText, conFabricated, motNoReduced,
  a11yFocus, a11yTarget, a11yAlt, a11yContrast, a11ySemantics, rspOverflow, rspViewport,
  immNoFallback, immNoDomText, immUnboundedLoop, ctrContract, excUnreasoned
];

export const RULE_IDS = new Set(RULES.map((r) => r.id));
