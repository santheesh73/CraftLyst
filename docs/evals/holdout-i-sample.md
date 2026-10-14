# Holdout round I: sampled findings and verdicts

Rules at `b2c583f`. Sample drawn with [scripts/eval/sample.js](../../scripts/eval/sample.js).
Verdicts judged by Claude, not a human. Method and criteria: [false-positives.md](false-positives.md).

Result: 85 sampled, 8 FP (9.4%).

| # | Repo | Rule | Location | Finding (tool output, truncated) | Verdict |
|---|---|---|---|---|---|
| 1 | sanity-io/sanity-template-nextjs-clean | a11y/alt (block) | `frontend/app/components/PortableText.tsx:48` | Icon-only &lt;a> has no accessible name. | TP |
| 2 | sanity-io/sanity-template-nextjs-clean | a11y/alt (block) | `frontend/app/components/PortableText.tsx:74` | Icon-only &lt;a> has no accessible name. | TP |
| 3 | creativetimofficial/notus-react | a11y/focus (block) | `src/components/Cards/CardPageVisits.js:17` | &lt;button> uses outline-none without a focus-visible ring or outline. | TP |
| 4 | creativetimofficial/notus-react | a11y/focus (block) | `src/components/Footers/Footer.js:40` | &lt;button> uses outline-none without a focus-visible ring or outline. | TP |
| 5 | creativetimofficial/notus-react | a11y/focus (block) | `src/components/Navbars/AuthNavbar.js:86` | &lt;button> uses outline-none without a focus-visible ring or outline. | TP |
| 6 | creativetimofficial/notus-react | a11y/focus (block) | `src/views/auth/Login.js:18` | &lt;button> uses outline-none without a focus-visible ring or outline. | TP |
| 7 | creativetimofficial/notus-react | a11y/focus (block) | `src/views/auth/Register.js:28` | &lt;button> uses outline-none without a focus-visible ring or outline. | TP |
| 8 | creativetimofficial/notus-react | a11y/focus (block) | `src/views/Index.js:589` | &lt;a> uses outline-none without a focus-visible ring or outline. | TP |
| 9 | creativetimofficial/notus-react | a11y/focus (block) | `src/views/Landing.js:294` | &lt;button> uses outline-none without a focus-visible ring or outline. | TP |
| 10 | creativetimofficial/notus-react | a11y/focus (block) | `src/views/Landing.js:352` | &lt;button> uses outline-none without a focus-visible ring or outline. | TP |
| 11 | creativetimofficial/notus-react | a11y/focus (block) | `src/views/Landing.js:393` | &lt;button> uses outline-none without a focus-visible ring or outline. | TP |
| 12 | creativetimofficial/notus-react | a11y/focus (block) | `src/views/Profile.js:60` | &lt;button> uses outline-none without a focus-visible ring or outline. | TP |
| 13 | creativetimofficial/notus-react | a11y/alt (block) | `src/components/Dropdowns/NotificationDropdown.js:21` | Icon-only &lt;a> has no accessible name. | TP |
| 14 | creativetimofficial/notus-react | a11y/alt (block) | `src/components/Footers/Footer.js:40` | Icon-only &lt;button> has no accessible name. | TP |
| 15 | creativetimofficial/notus-react | a11y/alt (block) | `src/components/Navbars/AuthNavbar.js:22` | Icon-only &lt;button> has no accessible name. | TP |
| 16 | creativetimofficial/notus-react | a11y/alt (block) | `src/components/Sidebar/Sidebar.js:57` | Icon-only &lt;button> has no accessible name. | TP |
| 17 | creativetimofficial/notus-react | a11y/alt (block) | `src/views/Landing.js:300` | Icon-only &lt;button> has no accessible name. | TP |
| 18 | creativetimofficial/notus-react | a11y/alt (block) | `src/views/Landing.js:352` | Icon-only &lt;button> has no accessible name. | TP |
| 19 | creativetimofficial/notus-react | a11y/alt (block) | `src/views/Landing.js:387` | Icon-only &lt;button> has no accessible name. | TP |
| 20 | creativetimofficial/notus-react | a11y/alt (block) | `src/views/Landing.js:405` | Icon-only &lt;button> has no accessible name. | TP |
| 21 | creativetimofficial/notus-react | a11y/semantics (warn) | `src/views/Index.js:100` | Heading level skips from h2 to h4. | TP |
| 22 | creativetimofficial/notus-react | a11y/semantics (warn) | `src/views/Index.js:121` | Heading level skips from h4 to h6. | TP |
| 23 | creativetimofficial/notus-react | a11y/semantics (warn) | `src/views/Index.js:513` | Heading level skips from h2 to h5. | TP |
| 24 | creativetimofficial/notus-react | a11y/semantics (warn) | `src/views/Landing.js:73` | Heading level skips from h1 to h6. | TP |
| 25 | creativetimofficial/notus-react | a11y/semantics (warn) | `src/views/Landing.js:283` | Heading level skips from h2 to h5. | TP |
| 26 | creativetimofficial/notus-react | a11y/semantics (warn) | `src/views/Landing.js:458` | Heading level skips from h2 to h6. | TP |
| 27 | creativetimofficial/notus-react | lay/card-depth (warn) | `src/views/Index.js:273` | Card nested 2 levels deep (&lt;img> inside another card-like container). | **FP**: A rounded, shadowed <img> is media, not a nested card. |
| 28 | creativetimofficial/notus-react | lay/card-depth (warn) | `src/views/Index.js:288` | Card nested 2 levels deep (&lt;img> inside another card-like container). | **FP**: A rounded, shadowed <img> is media, not a nested card. |
| 29 | creativetimofficial/notus-react | lay/card-depth (warn) | `src/views/Index.js:303` | Card nested 2 levels deep (&lt;img> inside another card-like container). | **FP**: A rounded, shadowed <img> is media, not a nested card. |
| 30 | creativetimofficial/notus-react | lay/card-depth (warn) | `src/views/Index.js:320` | Card nested 2 levels deep (&lt;img> inside another card-like container). | **FP**: A rounded, shadowed <img> is media, not a nested card. |
| 31 | creativetimofficial/notus-react | lay/card-depth (warn) | `src/views/Index.js:335` | Card nested 2 levels deep (&lt;img> inside another card-like container). | **FP**: A rounded, shadowed <img> is media, not a nested card. |
| 32 | creativetimofficial/notus-react | lay/card-depth (warn) | `src/views/Index.js:350` | Card nested 2 levels deep (&lt;img> inside another card-like container). | **FP**: A rounded, shadowed <img> is media, not a nested card. |
| 33 | creativetimofficial/notus-react | lay/clone-grid (warn) | `src/views/Landing.js:67` | 3 sibling &lt;div> blocks share the same structure (icon heading text). | TP |
| 34 | creativetimofficial/notus-react | lay/clone-grid (warn) | `src/views/Landing.js:454` | 3 sibling &lt;div> blocks share the same structure (icon heading text). | TP |
| 35 | codewithsadee/vcard-personal-portfolio | tok/hardcoded (warn) | `assets/css/style.css:194` | font-size: 16px uses literal 16px instead of a token. | TP |
| 36 | codewithsadee/vcard-personal-portfolio | tok/hardcoded (warn) | `assets/css/style.css:443` | font-size: 18px uses literal 18px instead of a token. | TP |
| 37 | codewithsadee/vcard-personal-portfolio | tok/hardcoded (warn) | `assets/css/style.css:644` | background: hsl(0, 0%, 5%) uses literal hsl(0, 0%, 5%) instead of a token. | TP |
| 38 | codewithsadee/vcard-personal-portfolio | tok/hardcoded (warn) | `assets/css/style.css:977` | background: hsla(0, 0%, 0%, 0.5) uses literal hsla(0, 0%, 0%, 0.5) instead of a token. | TP |
| 39 | codewithsadee/vcard-personal-portfolio | tok/hardcoded (warn) | `assets/css/style.css:1209` | font-size: 16px uses literal 16px instead of a token. | TP |
| 40 | codewithsadee/vcard-personal-portfolio | tok/hardcoded (warn) | `assets/css/style.css:1540` | font-size: 18px uses literal 18px instead of a token. | TP |
| 41 | codewithsadee/vcard-personal-portfolio | tok/hardcoded (warn) | `assets/css/style.css:1781` | box-shadow: inset 1px 1px 0 hsla(0, 0%, 100%, 0.11), inset -1px -1px 0 hsl | TP |
| 42 | codewithsadee/vcard-personal-portfolio | tok/unknown-var (warn) | `assets/css/style.css:554` | var(--fw-3) is not defined in the project CSS or .craft/tokens.json, though related variab | TP |
| 43 | codewithsadee/vcard-personal-portfolio | mot/no-reduced (warn) | `assets/css/style.css:946` | animation: scaleUp 0.25s ease forwards with no prefers-reduced-motion handling in this fil | TP |
| 44 | codewithsadee/vcard-personal-portfolio | a11y/focus (block) | `assets/css/style.css:1162` | ".form-input" removes the focus outline and the project defines no :focus-visible replacem | TP |
| 45 | codewithsadee/vcard-personal-portfolio | a11y/alt (block) | `index.html:131` | Icon-only &lt;a> has no accessible name. | TP |
| 46 | codewithsadee/vcard-personal-portfolio | a11y/alt (block) | `index.html:137` | Icon-only &lt;a> has no accessible name. | TP |
| 47 | codewithsadee/vcard-personal-portfolio | a11y/alt (block) | `index.html:143` | Icon-only &lt;a> has no accessible name. | TP |
| 48 | codewithsadee/vcard-personal-portfolio | a11y/alt (block) | `index.html:420` | Icon-only &lt;button> has no accessible name. | TP |
| 49 | codewithsadee/vcard-personal-portfolio | lay/clone-grid (warn) | `index.html:237` | 4 sibling &lt;li> blocks share the same structure (icon heading text). | TP |
| 50 | codewithsadee/vcard-personal-portfolio | lay/clone-grid (warn) | `index.html:317` | 4 sibling &lt;li> blocks share the same structure (icon heading text). | TP |
| 51 | codewithsadee/vcard-personal-portfolio | con/fabricated (block) | `index.html:327` | Lorem ipsum placeholder text: "Richard was hired to create a corporate identity. We were v | TP |
| 52 | codewithsadee/vcard-personal-portfolio | con/fabricated (block) | `index.html:349` | Lorem ipsum placeholder text: "Richard was hired to create a corporate identity. We were v | TP |
| 53 | codewithsadee/vcard-personal-portfolio | con/fabricated (block) | `index.html:371` | Lorem ipsum placeholder text: "Richard was hired to create a corporate identity. We were v | TP |
| 54 | codewithsadee/vcard-personal-portfolio | con/fabricated (block) | `index.html:393` | Lorem ipsum placeholder text: "Richard was hired to create a corporate identity. We were v | TP |
| 55 | codewithsadee/vcard-personal-portfolio | con/fabricated (block) | `index.html:439` | Lorem ipsum placeholder text: "Richard was hired to create a corporate identity. We were v | TP |
| 56 | codewithsadee/vcard-personal-portfolio | con/fabricated (block) | `index.html:1061` | Lorem ipsum placeholder text: "Enim ad minim veniam, consectetur adipiscing elit, quis nos | TP |
| 57 | codewithsadee/vcard-personal-portfolio | a11y/semantics (warn) | `index.html:645` | Heading level skips from h3 to h5. | TP |
| 58 | ThemeSelection/materio-vuetify-vuejs-admin-template-free | rsp/viewport (warn) | `documentation.html:1` | No &lt;meta name="viewport">. | TP |
| 59 | ThemeSelection/materio-vuetify-vuejs-admin-template-free | rsp/viewport (warn) | `hire-us.html:1` | No &lt;meta name="viewport">. | TP |
| 60 | ThemeSelection/materio-vuetify-vuejs-admin-template-free | a11y/semantics (warn) | `documentation.html:2` | &lt;html> has no lang attribute. | TP |
| 61 | ThemeSelection/materio-vuetify-vuejs-admin-template-free | a11y/semantics (warn) | `hire-us.html:2` | &lt;html> has no lang attribute. | TP |
| 62 | ThemeSelection/materio-vuetify-vuejs-admin-template-free | a11y/semantics (warn) | `javascript-version/index.html:2` | Page has no &lt;main> landmark. | **FP**: Vite SPA shell: #app holds a loading placeholder the app replaces. |
| 63 | ThemeSelection/materio-vuetify-vuejs-admin-template-free | a11y/semantics (warn) | `javascript-version/src/components/ErrorHeader.vue:30` | Heading level skips from h1 to h5. | TP |
| 64 | ThemeSelection/materio-vuetify-vuejs-admin-template-free | a11y/semantics (warn) | `javascript-version/src/pages/register.vue:51` | Heading level skips from h2 to h4. | TP |
| 65 | ThemeSelection/materio-vuetify-vuejs-admin-template-free | a11y/semantics (warn) | `javascript-version/src/views/dashboard/AnalyticsTotalEarning.vue:99` | Heading level skips from h3 to h6. | TP |
| 66 | ThemeSelection/materio-vuetify-vuejs-admin-template-free | a11y/semantics (warn) | `typescript-version/index.html:2` | Page has no &lt;main> landmark. | **FP**: Vite SPA shell: #app holds a loading placeholder the app replaces. |
| 67 | ThemeSelection/materio-vuetify-vuejs-admin-template-free | a11y/semantics (warn) | `typescript-version/src/components/ErrorHeader.vue:20` | Heading level skips from h1 to h5. | TP |
| 68 | ThemeSelection/materio-vuetify-vuejs-admin-template-free | a11y/semantics (warn) | `typescript-version/src/pages/register.vue:54` | Heading level skips from h2 to h4. | TP |
| 69 | ThemeSelection/materio-vuetify-vuejs-admin-template-free | a11y/semantics (warn) | `typescript-version/src/views/dashboard/AnalyticsTotalEarning.vue:90` | Heading level skips from h3 to h6. | TP |
| 70 | ThemeSelection/materio-vuetify-vuejs-admin-template-free | mot/no-reduced (warn) | `javascript-version/public/loader.css:44` | animation: rotate 1s ease infinite with no prefers-reduced-motion handling in this file or | TP |
| 71 | ThemeSelection/materio-vuetify-vuejs-admin-template-free | mot/no-reduced (warn) | `javascript-version/src/components/UpgradeToPro.vue:61` | animation: anime 12s linear infinite with no prefers-reduced-motion handling in this file  | TP |
| 72 | ThemeSelection/materio-vuetify-vuejs-admin-template-free | mot/no-reduced (warn) | `typescript-version/public/loader.css:44` | animation: rotate 1s ease infinite with no prefers-reduced-motion handling in this file or | TP |
| 73 | ThemeSelection/materio-vuetify-vuejs-admin-template-free | mot/no-reduced (warn) | `typescript-version/src/components/UpgradeToPro.vue:61` | animation: anime 12s linear infinite with no prefers-reduced-motion handling in this file  | TP |
| 74 | ThemeSelection/materio-vuetify-vuejs-admin-template-free | a11y/focus (block) | `javascript-version/src/@core/scss/template/_vertical-nav.scss:25` | ".layout-nav-type-vertical .layout-vertical-nav .nav-link, .nav-group a" removes the f | TP |
| 75 | ThemeSelection/materio-vuetify-vuejs-admin-template-free | a11y/focus (block) | `javascript-version/src/components/UpgradeToPro.vue:72` | ".buy-now-button, .button-inner" removes the focus outline and the project defines no :foc | TP |
| 76 | ThemeSelection/materio-vuetify-vuejs-admin-template-free | a11y/focus (block) | `typescript-version/src/@core/scss/template/_vertical-nav.scss:25` | ".layout-nav-type-vertical .layout-vertical-nav .nav-link, .nav-group a" removes the f | TP |
| 77 | ThemeSelection/materio-vuetify-vuejs-admin-template-free | a11y/focus (block) | `typescript-version/src/components/UpgradeToPro.vue:72` | ".buy-now-button, .button-inner" removes the focus outline and the project defines no :foc | TP |
| 78 | ThemeSelection/materio-vuetify-vuejs-admin-template-free | con/fabricated (block) | `javascript-version/src/layouts/components/UserProfile.vue:50` | Placeholder person name: "John Doe". | TP |
| 79 | ThemeSelection/materio-vuetify-vuejs-admin-template-free | con/fabricated (block) | `javascript-version/src/views/user-interface/typography/TypographyTexts.vue:37` | Lorem ipsum placeholder text: "Cupcake ipsum dolor sit amet fruitcake donut chocolate.". | TP |
| 80 | ThemeSelection/materio-vuetify-vuejs-admin-template-free | con/fabricated (block) | `javascript-version/src/views/user-interface/typography/TypographyTexts.vue:75` | Lorem ipsum placeholder text: "Cupcake ipsum dolor sit amet fruitcake donut chocolate.". | TP |
| 81 | ThemeSelection/materio-vuetify-vuejs-admin-template-free | con/fabricated (block) | `javascript-version/src/views/user-interface/typography/TypographyTexts.vue:113` | Lorem ipsum placeholder text: "Cupcake ipsum dolor sit amet fruitcake donut chocolate.". | TP |
| 82 | ThemeSelection/materio-vuetify-vuejs-admin-template-free | con/fabricated (block) | `typescript-version/src/views/user-interface/typography/TypographyTexts.vue:18` | Lorem ipsum placeholder text: "Cupcake ipsum dolor sit amet fruitcake donut chocolate.". | TP |
| 83 | ThemeSelection/materio-vuetify-vuejs-admin-template-free | con/fabricated (block) | `typescript-version/src/views/user-interface/typography/TypographyTexts.vue:56` | Lorem ipsum placeholder text: "Cupcake ipsum dolor sit amet fruitcake donut chocolate.". | TP |
| 84 | ThemeSelection/materio-vuetify-vuejs-admin-template-free | con/fabricated (block) | `typescript-version/src/views/user-interface/typography/TypographyTexts.vue:94` | Lorem ipsum placeholder text: "Cupcake ipsum dolor sit amet fruitcake donut chocolate.". | TP |
| 85 | mdn/todo-vue | a11y/semantics (warn) | `src/components/HelloWorld.vue:11` | Heading level skips from h1 to h3. | TP |
