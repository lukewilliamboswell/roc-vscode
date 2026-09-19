help:
    just --list

[parallel]
build: build-js build-logo
    mkdir -p build/
    vsce package --out=build/

build-js:
    esbuild \
        src/extension.ts \
        --bundle \
        --format=cjs \
        --minify \
        --sources-content=false \
        --platform=node \
        --outfile=dist/extension.js \
        --external:vscode

# Convert the logo from an SVG to a PNG
build-logo:
    inkscape \
        images/roc-logo.svg \
        --export-filename=images/roc-logo.png \
        --export-dpi=300

# Build the extension whenever a source file is changed
watch:
    esbuild \
        src/extension.ts \
        --bundle \
        --format=cjs \
        --sourcemap \
        --sources-content=false \
        --platform=node \
        --outfile=dist/extension.js \
        --external:vscode \
        --watch

# Run every check that does not need a built VSIX
[parallel]
test-fast: typecheck test-scripts test-textmate-grammar grammar-bench-test

# Everything: the fast checks, then build one VSIX and test that exact file
test: test-fast build test-vsix

# Type-check the extension sources
typecheck:
    tsc --noEmit

# Unit tests for the repository's own tooling
test-scripts:
    node --test scripts/vsix-lib.test.mjs

# Inspect a built VSIX without launching VS Code (default: the one in build/)
check-vsix *ARGS:
    node scripts/check-vsix.mjs {{ ARGS }}

# Install a built VSIX into an isolated VS Code and run the integration battery
# against it and a real Roc language server. Pass a VSIX path and/or options
# such as `--vscode-version minimum`, `--roc PATH`, `--grep hover`, `--keep`.
[linux]
test-vsix *ARGS:
    xvfb-run -a node scripts/test-vsix.mjs {{ ARGS }}

[macos]
test-vsix *ARGS:
    node scripts/test-vsix.mjs {{ ARGS }}

[windows]
test-vsix *ARGS:
    node scripts/test-vsix.mjs {{ ARGS }}

# The VSIX must work on the oldest VS Code it claims to support, and on the newest
test-vsix-matrix *ARGS: (test-vsix "--vscode-version" "minimum" ARGS) (test-vsix "--vscode-version" "stable" ARGS)

# Run the textmate grammar tests
test-textmate-grammar:
    node scripts/test-textmate-grammar.mjs
    node --test scripts/test-textmate-grammar.test.mjs
    @# Skip snapshot tests for now
    @# npx --no-install --call 'textmate-grammar-test syntaxes/snapshots/**/*.roc.snap'

# Update the snapshot tests for the textmate grammar
update-snapshots:
    npx --no-install --call 'textmate-grammar-snap -u syntaxes/snapshots/*.roc'

# Compare the TextMate grammar with the vendored tree-sitter oracle.
oracle *ARGS:
    node scripts/highlighting-oracle.mjs {{ ARGS }}

# Fetch or refresh the ignored real-world Roc corpus.
oracle-fetch:
    node scripts/fetch-oracle-corpus.mjs

# Compare all fetched real-world Roc sources.
oracle-external *ARGS:
    node scripts/highlighting-oracle.mjs --external {{ ARGS }}

# Test the local-only oracle harness.
oracle-test:
    node --test

grammar-bench *ARGS:
    node scripts/grammar-bench.mjs bench {{ ARGS }}

grammar-bench-save NAME *ARGS:
    node scripts/grammar-bench.mjs save --name {{ NAME }} {{ ARGS }}

grammar-bench-report REPORT *ARGS:
    node scripts/grammar-bench.mjs report {{ REPORT }} {{ ARGS }}

grammar-bench-compare BASE CURRENT *ARGS:
    node scripts/grammar-bench.mjs compare {{ BASE }} {{ CURRENT }} {{ ARGS }}

grammar-diagnose *ARGS:
    node scripts/grammar-bench.mjs diagnose {{ ARGS }}

# Remove one rule at a time and re-measure, to attribute cost to a rule.
grammar-ablate *ARGS:
    node scripts/grammar-bench.mjs ablate {{ ARGS }}

# Statically check the grammar for regex shapes known to be slow.
grammar-lint *ARGS:
    node scripts/grammar-bench.mjs lint {{ ARGS }}

grammar-profile *ARGS:
    node scripts/grammar-bench.mjs profile {{ ARGS }}

grammar-bench-test:
    node scripts/grammar-bench.mjs lint --json > /dev/null
    node --test scripts/grammar-bench-corpus.test.mjs scripts/grammar-bench.test.mjs
