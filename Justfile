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

# Run all the tests
[parallel]
test: test-extension test-textmate-grammar grammar-bench-test

# Test the extension
[linux]
test-extension:
    xvfb-run -a npm run test

# Test the extension
[macos]
test-extension:
    npm run test

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
    node --test scripts/highlighting-oracle.test.mjs

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

grammar-profile *ARGS:
    node scripts/grammar-bench.mjs profile {{ ARGS }}

grammar-bench-test:
    node --test scripts/grammar-bench-corpus.test.mjs scripts/grammar-bench.test.mjs
