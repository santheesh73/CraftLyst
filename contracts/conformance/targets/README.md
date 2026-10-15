# External conformance targets

Demo pages that render the component contracts with real third-party libraries, plus an
adapter for each, so the conformance kit can be run against code we did not write.
Only the demo source and adapters live here; the libraries are installed elsewhere and
the bundles (`*/build/`) are not committed or packaged.

| Target | Library | Adapter |
|---|---|---|
| `radix/` | Radix Primitives (React) | [radix/adapter.json](radix/adapter.json) |
| `react-aria/` | React Aria Components | [react-aria/adapter.json](react-aria/adapter.json) |

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
  @radix-ui/react-tooltip@1.4.1 react-aria-components@1.22.1
cd -   # back to the repository root

node contracts/conformance/targets/build.js --modules "$DEPS/node_modules"
node contracts/conformance/run.js --adapter contracts/conformance/targets/radix/adapter.json
node contracts/conformance/run.js --adapter contracts/conformance/targets/react-aria/adapter.json
```

`build.js` bundles `<lib>/main.jsx` to `<lib>/build/app.js` with esbuild (IIFE, production
React). The pages load over `file://`; the kit blocks every non-local request.

## Writing a demo page for another library

1. Render each contract with the library's own components and as little glue as possible.
2. Give each instance a stable selector (an `id` or class you pass through the library).
3. Write `adapter.json` (format in [../../README.md](../../README.md)); mark components the
   library does not offer with `"notApplicable": "<reason>"`.
4. Record versions and results honestly, including failures and kit bugs you find.
