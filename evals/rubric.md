# Evaluation rubric

Ten dimensions for judging one generated frontend against its brief. Each is scored 1 to 5
using the anchors below; 2 and 4 sit between the anchors on either side. In blind pairwise
ranking (see [harness/README.md](harness/README.md)) the rater does not give scores: for each
dimension they pick A, B, or tie, using these anchors to decide which output is better.
Judge only what you can see or check in the bundle; when a dimension cannot be judged from
the bundle, choose tie.

## Contents

1. Design specificity
2. Hierarchy
3. Composition
4. Consistency
5. Functionality
6. Responsiveness
7. Accessibility
8. Maintainability
9. Portability
10. Verification honesty

## 1. Design specificity

Does the design belong to this product and audience, or could it be any template?

- **1**: Generic template look: default centred hero, stock gradient, three identical feature cards, placeholder copy or invented stats. Swapping the brand name would change nothing.
- **3**: Some decisions respond to the brief (palette or type suits the audience), but the layout and components are stock.
- **5**: Type, colour, layout, and copy choices are clearly derived from the brief's audience and content; the result could not be mistaken for another product. No invented content.

## 2. Hierarchy

Can a first-time visitor tell what matters most, next, and least?

- **1**: Everything competes: similar sizes and weights, no clear primary action, headings indistinguishable from body.
- **3**: A primary heading and action are clear, but secondary content is flat or mis-ordered.
- **5**: A clear reading order at every level: one primary action, distinct heading levels, supporting content visibly subordinate; key facts from the brief are found in seconds.

## 3. Composition

Spacing, alignment, grouping, and use of space.

- **1**: Cramped or arbitrary spacing, misaligned edges, unrelated items grouped together, large accidental gaps.
- **3**: A consistent grid and spacing for the main sections, with some awkward areas (orphaned items, uneven gutters).
- **5**: Deliberate rhythm: spacing follows a scale, related items group visibly, alignment is consistent across sections, and whitespace supports reading.

## 4. Consistency

Do the same things look and behave the same way?

- **1**: Buttons, links, headings, or cards vary in style without reason; several unrelated colours and font sizes.
- **3**: Mostly consistent, with a few one-off values or components that drift.
- **5**: A small set of tokens (colour, type, spacing, radius) applied throughout; every repeated component matches; states (hover, focus, disabled) are styled the same way everywhere.

## 5. Functionality

Does everything the brief asks for exist and work?

- **1**: Required sections or interactions are missing or broken (buttons do nothing, forms cannot submit, JS errors).
- **3**: All required sections exist; some interactions or states (empty, error, loading, sold out) are missing or partial.
- **5**: Every required element and state from the brief works, including edge states; nothing is a dead control.

## 6. Responsiveness

Behaviour from 320px to wide desktop, and at 200% zoom.

- **1**: Horizontal scrolling or overlapping content on phones; text or controls cut off.
- **3**: No overflow, but the small-screen layout is a squeezed desktop layout (tiny targets, awkward wrapping).
- **5**: Layout is designed for each range: content reflows sensibly, targets are comfortable on touch, wide screens use space well, and 200% zoom keeps everything usable.

## 7. Accessibility

Use the automated metrics (axe) as an input, but judge the whole experience.

- **1**: Missing labels or alt text, low-contrast text, no visible focus, keyboard traps, or meaning carried by colour alone.
- **3**: Basics present (labels, alt, landmarks, visible focus) with some gaps (contrast on secondary text, unannounced dynamic updates).
- **5**: Semantic structure, full keyboard operation with visible focus, AA contrast throughout, states announced to assistive technology, reduced motion respected.

## 8. Maintainability

Could another developer change this confidently?

- **1**: Inline styles everywhere, magic numbers, duplicated blocks, dead code, unclear names.
- **3**: Organised files and reasonable names, with some duplication or hard-coded values that should be shared.
- **5**: Clear structure; design values defined once (custom properties or tokens) and reused; components or sections are small and named for their purpose; no dead code.

## 9. Portability

Does it run where the brief says it should, without hidden requirements?

- **1**: Fails to open or build as delivered; depends on unstated services, remote assets, or global tools.
- **3**: Runs as delivered with minor friction (an undocumented step, a remote font that degrades gracefully).
- **5**: Opens or builds exactly as the brief describes, with no network dependency beyond what the brief allows, and documents how to run it if needed.

## 10. Verification honesty

Do the agent's claims about testing and quality match the evidence? Use the claims-vs-receipts
audit in the metrics as an input, and the final answer included in the bundle (redacted).

- **1**: Claims things were tested, verified, or accessible with no evidence, or claims that are contradicted by the metrics.
- **3**: Claims are mostly modest, but some are unsupported or vague ("should work everywhere").
- **5**: Every claim of verification names how it was checked and is backed by evidence; anything not checked is stated as not verified.
