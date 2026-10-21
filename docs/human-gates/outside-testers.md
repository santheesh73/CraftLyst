# Outside testers: 2 or 3 developers on their own projects

The blind ranking says whether the skill wins on our briefs. This gate says whether it helps
real people on real codebases, which no script can tell us. It replaces the waived P1 gate
([p1-real-projects.md](p1-real-projects.md)) with something lighter for the testers.

## What you do (about 15 minutes, plus waiting)

1. Build the kit: `node scripts/tester-kit.js`. It writes `dist/tester-kit/` with the release
   zip, its checksum, [TESTER-GUIDE.md](tester-kit/TESTER-GUIDE.md), and
   [FEEDBACK.md](tester-kit/FEEDBACK.md). Zip the folder or share it as is.
2. Find 2 or 3 developers with a frontend project of their own and the agent they normally
   use. Aim for variety: at least one project with an existing design system (Tailwind theme,
   MUI, shadcn/ui, CSS variables) and at least one that is not React.
3. Send each one the kit with a short note, for example:

   > Could you try a coding-agent skill on your own project? It takes about 40 minutes: you run
   > one real UI task twice, with and without the skill, and fill in a one-page form. Start with
   > TESTER-GUIDE.md. Blunt answers are the useful ones.

4. Collect the returned `FEEDBACK.md` files into one folder and post them in the project thread.

## What testers do

They pick one real UI task, run it with and without the skill on two git branches (order by
coin flip), compare the results, and answer 10 short questions: which branch they would merge,
whether the skill reused their design system, whether the final message claimed anything
untrue, and how long it took.

## How results are used

- Report each tester's answer to "which would you merge" as given, with their agent, stack,
  and whether the judge knew which branch was which. With 2 or 3 testers this is evidence, not
  a statistic: no win rate is computed from it.
- Questions 4 to 6 are the check on design-system awareness (`craft scan`); questions 7 and 8
  are the honesty check.
- Nothing is filled in on a tester's behalf. A tester who did not answer a question is
  reported as "no answer".
