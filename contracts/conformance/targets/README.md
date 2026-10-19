# External conformance targets

Demo pages that render the component contracts with real third-party libraries, plus an
adapter for each, so the conformance kit can be run against code we did not write.
Only the demo source and adapters live here; the libraries are installed elsewhere and
the bundles (`*/build/`) are not committed or packaged.

| Target | Library | Adapter |
|---|---|---|
| `radix/` | Radix Primitives (React) | [radix/adapter.json](radix/adapter.json) |
| `react-aria/` | React Aria Components | [react-aria/adapter.json](react-aria/adapter.json) |
| `mui/` | MUI (Material UI) | [mui/adapter.json](mui/adapter.json) |
| `shadcn/` | shadcn/ui (new-york-v4 registry) | [shadcn/adapter.json](shadcn/adapter.json) |

Results: [docs/evals/conformance-results.md](../../../docs/evals/conformance-results.md).

## Rebuild and run

Exact versions used for the recorded results (install them outside this repository):

```sh
DEPS=$(mktemp -d)
cd "$DEPS" && echo '{"private":true}' > package.json
npm install --save-exact --ignore-scripts --no-audit --no-fund \
  react@19.3.0 react-dom@19.3.0 esbuild@0.28.2 \
  @radix-ui/react-accordion@1.3.1 @radix-ui/react-dialog@1.3.1 \
  @radix-ui/react-dropdown-menu@2.2.1 @radix-ui/react-form@0.3.0 \
  @radix-ui/react-navigation-menu@1.4.1 @radix-ui/react-popover@1.3.1 \
  @radix-ui/react-select@2.4.1 @radix-ui/react-tabs@1.2.1 \
  @radix-ui/react-toast@1.3.1 @radix-ui/react-toggle@1.2.1 \
  @radix-ui/react-tooltip@1.4.1 react-aria-components@1.22.1 \
  @mui/material@9.5.0 @emotion/react@11.14.0 @emotion/styled@11.14.1
cd -   # back to the repository root

node contracts/conformance/targets/build.js --modules "$DEPS/node_modules"   # radix, react-aria, mui
node contracts/conformance/run.js --adapter contracts/conformance/targets/radix/adapter.json
node contracts/conformance/run.js --adapter contracts/conformance/targets/react-aria/adapter.json
node contracts/conformance/run.js --adapter contracts/conformance/targets/mui/adapter.json
```

### MUI only

The install above already includes MUI; to build and run it alone:

```sh
node contracts/conformance/targets/build.js --modules "$DEPS/node_modules" mui
node contracts/conformance/run.js --adapter contracts/conformance/targets/mui/adapter.json
```

### shadcn/ui

shadcn/ui is source its CLI copies into a project, so generate it in a scratch project
outside this repository; only our demo glue lives here. Recorded results used the
new-york-v4 registry at shadcn-ui/ui commit `4233ed1caded8c38f4bc14b14afe1f93ebcaf966`.

```sh
SH=$(mktemp -d) && cd "$SH"
echo '{"name":"shadcn-app","private":true,"type":"module"}' > package.json
echo '{"compilerOptions":{"jsx":"react-jsx","baseUrl":".","paths":{"@/*":["./src/*"]}}}' > tsconfig.json
cat > components.json <<'JSON'
{"$schema":"https://ui.shadcn.com/schema.json","style":"new-york","rsc":false,"tsx":false,
 "tailwind":{"config":"","css":"src/index.css","baseColor":"neutral","cssVariables":true,"prefix":""},
 "aliases":{"components":"@/components","utils":"@/lib/utils","ui":"@/components/ui","lib":"@/lib","hooks":"@/hooks"},
 "iconLibrary":"lucide"}
JSON
npm install --save-exact --ignore-scripts --no-audit --no-fund \
  react@19.3.0 react-dom@19.3.0 esbuild@0.28.2 shadcn@4.21.5 radix-ui@1.8.1 \
  sonner@2.0.8 next-themes@0.4.6 class-variance-authority@0.7.1 cn@0.4.0 \
  lucide-react@1.57.0 tailwindcss@4.3.3 @tailwindcss/cli@4.3.3 tw-animate-css@1.4.0
npx shadcn add --yes button toggle input label select dialog dropdown-menu tabs \
  tooltip popover accordion sonner table pagination navigation-menu
# src/index.css: the theme CSS from the shadcn manual-installation docs, then add
#   @source "<repo>/contracts/conformance/targets/shadcn/main.jsx";
npx @tailwindcss/cli -i src/index.css -o <repo>/contracts/conformance/targets/shadcn/build/app.css
cd -
node contracts/conformance/targets/build.js --modules "$SH/node_modules" --src "$SH/src" shadcn
node contracts/conformance/run.js --adapter contracts/conformance/targets/shadcn/adapter.json
```

For the recorded run `ui.shadcn.com` was unreachable, so `shadcn add` was given local
registry-item JSON files built from the commit's `apps/v4/registry/new-york-v4/ui/*.tsx`
(and `lib/utils.ts`), with `REGISTRY_URL` set to a local mirror of the commit's
`apps/v4/public/r`; details in the results doc.

`build.js` bundles `<lib>/main.jsx` to `<lib>/build/app.js` with esbuild (IIFE, production
React). The pages load over `file://`; the kit blocks every non-local request.

## Writing a demo page for another library

1. Render each contract with the library's own components and as little glue as possible.
2. Give each instance a stable selector (an `id` or class you pass through the library).
3. Write `adapter.json` (format in [../../README.md](../../README.md)); mark components the
   library does not offer with `"notApplicable": "<reason>"`.
4. Record versions and results honestly, including failures and kit bugs you find.
