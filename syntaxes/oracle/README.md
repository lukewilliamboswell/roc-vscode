# Highlighting oracle

The oracle compares `syntaxes/roc.tmLanguage.json` with the highlight captures from a
vendored build of [faldor20/tree-sitter-roc](https://github.com/faldor20/tree-sitter-roc).
It is a local development aid and is not part of the extension or the default CI checks.

Run the committed reduced corpus with:

```sh
just oracle
```

Use `just oracle --role function`, `just oracle --max-diagnostics 20`, or
`just oracle --strict` to focus or enforce a fully exact result. Normal runs report gaps but
exit successfully. Infrastructure and parser-loading failures always exit unsuccessfully.

## Real-world corpus

`just oracle-fetch` shallow-clones the repositories in `sources.json` at their latest default
branch revisions into the ignored `.oracle-corpus/` directory. It refuses to update a checkout
with local changes and verifies the expected license marker. Run `just oracle-external` after
fetching to compare every tracked `.roc` file in those repositories.

When reducing a real-world mismatch into `corpus/`, prefer writing the smallest independent
example. If source text is copied, add comments identifying its repository, commit, original
path, and license so its provenance remains clear.

## Updating the vendored parser

Updates are deliberately manual:

1. Check out the reviewed commit of `https://github.com/faldor20/tree-sitter-roc`.
2. In its development environment, run `npm ci` and `just build-all`.
3. Copy `tree-sitter-roc.wasm`, `queries/highlights.scm`, and `LICENSE` into `vendor/`.
4. Update `vendor/manifest.json` with the commit, CLI/ABI versions, and SHA-256 hashes.
5. Run `just oracle-test` and `just oracle`.

The adjacent Web Tree-sitter CommonJS runtime, runtime WASM, and license are version 0.25.10.
Refresh those three files together from the `web-tree-sitter@0.25.10` npm package whenever its
version in the manifest changes.

The TextMate test runtime is also vendored so this local tool does not alter the extension's npm
or Nix dependency closure. Its files come from `vscode-textmate@9.3.2` and
`vscode-oniguruma@2.0.1`; refresh each JavaScript/WASM file together with its adjacent license.
