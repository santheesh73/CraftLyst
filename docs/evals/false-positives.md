# Slop Lint false-positive rate on open-source repos

P2 gate item: "false-positive rate under 15% on 5 or more real OSS repos".

**Result: 9.4% (8 of 85 sampled findings) on holdout set I, five repos not used for tuning.
The 95% Wilson interval is 4.8% to 17.5%, so the upper bound is above 15%.
Seven earlier holdout rounds failed (17% to 59%); each failure was fixed and then re-measured
on repos the rules had never seen.**

Every verdict below was judged by Claude reading the flagged code, not by a human. A human
spot-check of the round I table ([holdout-i-sample.md](holdout-i-sample.md)) would turn this
into a verified number.

## Method

1. Clone each repo at the commit listed below (`git clone --depth 1`).
2. Run `craft lint --json` with the rules at the commit listed for the round.
3. Sample the non-info findings: up to 10 per rule per repo, evenly spaced through the report
   ([scripts/eval/sample.js](../../scripts/eval/sample.js)). Info findings are advisory and not
   counted.
4. Open the flagged code and judge each sampled finding:
   - **TP**: the claim is true and the rule targets this code. Intentional placeholder or demo
     content still counts as TP, because the remedy is to mark it (`data-craft-illustrative`
     or a reasoned `craft-allow`).
   - **FP**: the claim is wrong, or the code is outside what the rule is for (vendored or
     compiled code, hidden or decorative elements, code samples, variables defined by a
     library), or no reasonable reviewer would act on it.
5. FP rate = FP / sampled.
6. A round that fails gets its causes fixed, and the next round uses five or more repos that
   no earlier round touched.

Repos were picked to cover the stacks the skill targets: Next.js, React, Vue, Nuxt, Svelte,
Astro, Solid, Hugo and Eleventy templates, plain HTML/CSS, Tailwind v3 and v4, CSS modules,
and SCSS. Each round's rules were frozen before its repos were cloned.

## Results by round

| Round | Rules at | Repos | Sampled | FP | FP rate | Outcome |
|---|---|---|---|---|---|---|
| A (tuning) | before `eeada8a` | 6 | not counted | | | Used to tune, not a measurement |
| B | before `eeada8a` | 5 | 51 | 30 | 59% | ❌ Failed, fixed in `eeada8a` |
| C | `eeada8a` | 5 | 133 | 30 | 23% | ❌ Failed, fixed in `90c0ed7` |
| D | `90c0ed7` | 10 | 122 | 36 | 30% | ❌ Failed, fixed in `6d289fd` |
| E | `6d289fd` | 5 | 71 | 12 | 17% | ❌ Failed, fixed in `a603c7e` |
| F | `a603c7e` | 5 | 66 | 21 | 32% | ❌ Failed, fixed in `2557dbe` |
| G | `2557dbe` | 5 | 108 | 39 | 36% | ❌ Failed, fixed in `a292931` |
| H | `a292931` | 5 | 108 | 29 | 27% | ❌ Failed, fixed in `b2c583f` |
| **I** | **`b2c583f`** | **5** | **85** | **8** | **9.4%** | ✅ Under 15% (judged by Claude) |

After round I, `21515a1` fixed both FP causes it found. That change has not been measured
on fresh repos.

## Round I detail

| Repo | Commit | Sampled | FP | FP causes |
|---|---|---|---|---|
| sanity-io/sanity-template-nextjs-clean | `2ad95bf` | 2 | 0 | |
| creativetimofficial/notus-react | `e5a3728` | 32 | 6 | A rounded, shadowed `<img>` counted as a nested card |
| codewithsadee/vcard-personal-portfolio | `927f09a` | 23 | 0 | |
| ThemeSelection/materio-vuetify-vuejs-admin-template-free | `039f469` | 27 | 2 | Vite SPA mount point holding a loader read as a page without `<main>` |
| mdn/todo-vue | `85c46ef` | 1 | 0 | |

Every sampled finding and its verdict: [holdout-i-sample.md](holdout-i-sample.md).

## What the failed rounds found

Each cause was fixed and covered by a case in `cli/test/rules.test.js`.

- **B (59%)**: Tailwind v4 theme variables, Prism palettes, library-defined variables
  (`--pagefind-*`), `calc()`/`clamp()` lengths, `print.css`, test fixtures, OG image routes,
  fade-only and blink animations, buttons read as cards, the `%sapper.html%` shell.
- **C (23%)**: menus, badges, and dialogs read as nested cards; FAQ entries and slides read
  as clone grids; Hugo templates that pull `<head>` and `<main>` from partials; a `:focus`
  rule that swaps in a background; plan limits on pricing pages read as adoption claims;
  theme-fade transitions on `html`; one repo holding fifty separate demo sites.
- **D (30%)**: a copied-in CodeMirror library; compiled Tailwind output; fixed widths
  hidden below a breakpoint or under `aria-hidden`; inline SVG logo colors; lorem ipsum
  inside `<pre>` code samples; custom property names lowercased (`--text-GRAD`).
- **E (17%)**: `hsl(var(--x))` read as a literal color; JSX boolean `aria-hidden`;
  horizontal scroll containers; `fixed inset-0` backdrops; absolutely positioned panels;
  one-word variables grouped as one family; Tailwind arbitrary properties
  (`[--peek:1rem]`) not counted as definitions; syntax colors inside a main stylesheet.
- **F (32%)**: Svelte `<Input>` lowercased to `<input>` by the HTML parser, so the
  component's own focus ring was invisible; highlight.js themes in contrast checks.
- **G (36%)**: dark elevation shadows read as colored glows; `Toolbar.ToggleItem` and other
  control components read as nested cards; variables from an imported package stylesheet
  (`@radix-ui/themes`); a fixed width capped by `max-w-*`.
- **H (27%)**: a minified, generated Element UI theme (26 of the 29 FPs); a JS comment in
  an Astro template parsed as markup; a CMS admin page whose body only loads scripts;
  `role="group"` click-forwarding wrappers.

## Known limits

- The round I interval is wide (4.8% to 17.5%). More holdout repos would narrow it.
- Rules still flag demo collections heavily (for example `mdn/css-examples` in round D:
  nested demo boxes as cards, no `<main>` on single-feature pages). Those claims are true,
  but nobody would act on them.
- A JS-toggled class that removes the outline only for mouse users (`vuejs/docs`,
  `.no-outline`) still reads as a removed focus style.
- Variables a UI library injects at runtime from JavaScript (PrimeVue presets) are not
  visible to lint.

## Reproduce

```sh
git clone https://github.com/creativetimofficial/notus-react
git -C notus-react checkout e5a3728ab2fdf93677ba717f00bbb8413bfafb39
git checkout b2c583f   # in this repo: the rules round I measured
node cli/bin/craft.js lint --json --cwd notus-react > notus.json
node scripts/eval/sample.js notus.json notus
```

Commits for all rounds (full SHAs):

| Round | Repo | Commit |
|---|---|---|
| A | shadcn-ui/taxonomy | 298a8857c7128a0d121e7f699dfd729f23b3966d |
| A | vercel/commerce | 3761e52e60df9c6a316e067dbfd7032e494d3634 |
| A | h5bp/html5-boilerplate | b6597338e695dc4a8165c5abcb2bfffa586c3ee5 |
| A | pmndrs/react-three-next | bb29a61949601e1c563688faf33a12d062ec3710 |
| A | sveltejs/realworld | df796708040f5200ec572b28ab7f88ecee5794dd |
| A | vuejs/vitepress | 16c020dbbc791853e73131cedb21a79428005da3 |
| B | steven-tey/precedent | 3be40205d7cdf56082cd284f07f12251b9208f79 |
| B | timlrx/tailwind-nextjs-starter-blog | b45bef66b40c63b6f57c15ee8cd090682238df4c |
| B | vercel/nextjs-subscription-payments | bdd0813206e47e6b218d42f15a7976c8a0d3c3eb |
| B | withastro/starlight | 472a599b13e1845b502df427287d7ed0b2b62899 |
| B | sveltejs/sapper-template | 20dbab45215f7ed4f865b04b6fe279620394e80f |
| C | cruip/open-react-template | 9da36763df216be7840f3c063edcdcaf7862401e |
| C | leerob/next-saas-starter | 6e33e58b1e553a41fe22e6b941a7229a002de361 |
| C | themesberg/flowbite-admin-dashboard | 229df7ff25808ab2bbda65f03f2397a05f7b4288 |
| C | antfu/vitesse | a8785264f83c2ebe1b3cf689296775a4949957c8 |
| C | bradtraversy/50projects50days | c92b0bc3a87fc95d44b89552b7b6a2eeb36ca481 |
| D | mdn/todo-react | 09ca326eca360f8df36309ca375202957996d926 |
| D | nuxt/movies | 215904c17d3f56e024afd4aa099f62727d99959a |
| D | pmndrs/racing-game | 7816a5d954b75e6ad853ae4e4f0cbbd628072643 |
| D | 11ty/eleventy-base-blog | 94bd3b71d454da5b88eb505b8db6aea1cd0e9754 |
| D | satnaing/astro-paper | 35cfa7fbe0b897306d27670d3819e55d5205f3dd |
| D | themesberg/landwind | f8be851cc8b4b44ff9d842ca8f5149d7911af88c |
| D | StartBootstrap/startbootstrap-agency | b2d5d5c6b1396bc5b0e8dd92c693b106cfb7cee1 |
| D | ixartz/Next-js-Boilerplate | b83157a8018f55b926a3c25a4b7a7e14b0dfbc35 |
| D | mdn/css-examples | 65b08d2236b304d50d28a807a48c35f6889d902d |
| D | cruip/tailwind-landing-page-template | 909e38e3249ac575017864a202188b48ef016c9c |
| E | mickasmt/next-saas-stripe-starter | c6df229ae73c207e87356d5e592779c511a9b56d |
| E | nuxt-ui-templates/landing | 33723eb83d140042c4ecaa137ffdf187e1aaa34b |
| E | TailAdmin/free-react-tailwind-admin-dashboard | e888dd1716b9803b535c7c2fa4f2c6b7d39b3da9 |
| E | codedthemes/mantis-free-react-admin-template | bec0222f77d2298897799c5ba28aaaca797f9c46 |
| E | vercel/platforms | ec12e65709c8263dd3462c4d33261851b8a3157d |
| F | vuejs/docs | 40aa88af0094f7bab4aaf786e55c748a6a251d88 |
| F | ixartz/SaaS-Boilerplate | e3952a7ed5b0ef172ac4363c4644b8c334d1094b |
| F | gatsbyjs/gatsby-starter-blog | d75052245100ae3c98807c5f38c6e7ec68910e74 |
| F | solidjs/solid-site | 0028cfd588cdd3796b68066a173526bb8d065037 |
| F | themesberg/flowbite-svelte-admin-dashboard | 171b17eb7e4744d042abd3710047cb9acef27b5d |
| G | radix-ui/website | 402e749613ab2e7ab7139c65b0029842b0360f07 |
| G | Kiranism/next-shadcn-dashboard-starter | 7705dfc0d13889e45c26a55ad5908da6a7a9a605 |
| G | adrianhajdin/project_hoobank | 54887f678438f5196d692de2a42727c2332e8e38 |
| G | bedimcode/responsive-portfolio-website-Alexa | 51b1f90bf129025f8a50bcab8401275678f47d56 |
| G | primefaces/sakai-vue | ec6b6ef53ad4fa7f2861277f50f2d9e236c40372 |
| H | Blazity/next-enterprise | 97c4f3ed6be0a5b255d0e71606c7b355138281a9 |
| H | PanJiaChen/vue-element-admin | 6858a9ad67483025f6a9432a926beb9327037be3 |
| H | alan2207/bulletproof-react | 9506629ed003a561c6627735480cce4994244bb4 |
| H | onwidget/astrowind | 14e1a691f80548dcc36370847b1a02c0d0b12821 |
| H | vercel/ai-chatbot | c2f8235e1f3ea903ad8b7f61447c4f74164b5c58 |
| I | sanity-io/sanity-template-nextjs-clean | 2ad95bf24ad23bfbd710980bf917ef515bec1e32 |
| I | creativetimofficial/notus-react | e5a3728ab2fdf93677ba717f00bbb8413bfafb39 |
| I | codewithsadee/vcard-personal-portfolio | 927f09a6ef894a24cc8aef7a2e51f8e93ac306f7 |
| I | ThemeSelection/materio-vuetify-vuejs-admin-template-free | 039f469f9a60996b95e92fd6eaa75fb45647b106 |
| I | mdn/todo-vue | 85c46efaa2431d1084f1fc3f9098bcb351e71cdb |

Round D repos with no non-info findings (todo-react, eleventy-base-blog, astro-paper,
Next-js-Boilerplate) add nothing to the sample. The same holds for antfu/vitesse in C,
gatsby-starter-blog in F, and bedimcode/responsive-portfolio-website-Alexa in G.
