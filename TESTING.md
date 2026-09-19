# Testing

`just test-fast` runs everything that does not need a built extension;
`just test` also builds the VSIX and tests it end to end.

## Test what you fly

The extension is tested as users receive it. `just build` produces one VSIX, and
`just test-vsix` installs that exact file into a throwaway VS Code profile and
drives it, through VS Code's public API, against a real Roc language server.
Nothing in that run loads the extension from the source tree.

```sh
just test-fast                       # type-check, tooling unit tests, grammar tests
just build                           # build/roc-vscode-<version>.vsix
just check-vsix                      # inspect the VSIX without launching VS Code
just test-vsix                       # integration battery against the VSIX
just test-vsix-matrix                # ...on the minimum supported and stable VS Code
just test                            # all of the above, in that order
```

`test-vsix` takes an optional VSIX path and these options:

| Option | Meaning |
|---|---|
| `--roc PATH` | Roc executable. Defaults to `$ROC_PATH`, then `roc` on `PATH`. |
| `--roc pinned` | Download, verify and use the nightly pinned in `test/roc-nightly.json`. CI uses this. |
| `--vscode-version V` | `stable` (default), `insiders`, an exact version, or `minimum` for the oldest version allowed by the VSIX's `engines.vscode`. |
| `--grep PATTERN` | Only run matching tests. |
| `--keep` | Keep the sandbox (profile, installed extension, workspace) for inspection. |

How a run is put together:

1. **Artifact checks** (`scripts/vsix-lib.mjs`) read the VSIX as a zip: the
   declared entry point, grammar, language configuration and icons must be
   present; sources, tests and tooling must not be; the version must agree with
   the file name and `package.json`. The SHA-256 is printed and repeated on
   success, so a release can be tied to the run that tested it.
2. **The Roc server** is resolved once and must answer `experimental-lsp --help`.
3. **A sandbox** is created with its own user-data and extensions directories
   and a copy of `test/fixtures/workspace`. `roc.path` is set in its user
   settings. The VSIX is installed with VS Code's own CLI, and the run stops
   unless it is then the only extension installed.
4. **The test driver** in `test/driver` is the only thing loaded from source. It
   is a separate, empty extension that hosts Mocha suites; the product is never
   given to VS Code as a development extension, because that would hide
   packaging mistakes.
5. After VS Code exits, the harness checks that the language server it left
   running has exited too.

The suites, in `test/driver/suites`:

- `01-activation`: the installed copy is the VSIX under test, it stays inactive
  until a `.roc` file opens, starts exactly one server from `roc.path`, and
  applies the packaged language configuration.
- `02-lsp`: diagnostics, hover, definition, references, highlights, symbols,
  completion (including the `.` trigger), rename, folding and selection ranges,
  inlay hints, code actions, semantic tokens and formatting. These assert the
  bridge, not the compiler: a result arrives, is a VS Code object, points inside
  the document, and edits apply.
- `03-editing`: unsaved edits, broken then repaired syntax, non-ASCII and CRLF
  positions, close and reopen, two documents, rapid edits with overlapping
  requests.
- `09-lifecycle`: restart really replaces the process, repeated restarts do not
  leak, a missing or non-LSP executable fails with a message naming the path and
  the `roc.path` setting and then recovers, and a changed `roc.path` is used.

When the extension cannot start a server at all, the first suite to need one
reports why and the rest fail immediately instead of timing out one by one.

CI builds the VSIX once: `build.yaml` tests that file on both ends of
the VS Code range, re-checks its digest, and uploads the same bytes to the
release.

### Running the Nix parts without Nix installed

The flake build, real Biome and the pre-commit hooks only exist inside Nix. A
container is enough to run them against the working tree:

```sh
docker run --rm -v roc-vscode-nix:/nix -v "$PWD":/work -w /work \
  -e NIX_CONFIG="experimental-features = nix-command flakes" nixos/nix \
  sh -c 'git config --global --add safe.directory /work &&
         nix develop --command pre-commit run --all-files;
         chown -R '"$(id -u):$(id -g)"' /work'
```

Replace the inner command with `nix build --print-out-paths .#roc-vscode-vsix`
to produce the VSIX exactly as CI does, then test it with `just test-vsix`.
After changing `package-lock.json`, refresh the flake's `npmDeps` hash with
`nix run nixpkgs#prefetch-npm-deps -- package-lock.json`. Note that the `biome`
package on npm is an unrelated project; the formatter comes from Nix.

## TextMate grammar tests

Add ordinary grammar fixtures under `syntaxes/tests/`. A new test should fail before it is recorded in `syntaxes/skipped-tests.json`, and only behavior that is currently unsupported should be skipped. Give each skipped fixture one focused purpose, a concrete reason, and preferably a tracking issue.

Skipped fixtures are visible technical debt, not an alternative assertion mode. After implementing support, remove the fixture's manifest entry; the fixture itself does not need to change. The local runner validates the manifest and always reports the number of known unsupported tests skipped.

Before running the upstream tool, the local runner rejects assertion mistakes that `textmate-grammar-test` accepts silently:

- **Drifted ranges.** A range that cuts through a word at one edge only has usually slid sideways, which is easy to do on tab-indented lines. A range wholly inside a word is treated as deliberate.
- **Indented arrows.** `# <--` always measures from column one of the source line, even when the comment is indented, so use carets for indented code.
- **Empty arrows.** An arrow covers one column per `-`, starting after one column per `~`. The `<` covers nothing, so `# <~~` is an empty range and `# <-----` covers five columns, not six.
- **Unasserted fixtures.** A fixture without a single assertion passes whatever the grammar does.
- **State gaps.** The upstream tool only tokenizes source lines that carry assertions, passing tokenizer state from one asserted line straight to the next. An unasserted line that opens or closes a region, such as a lone `}` or a multiline string, is never seen. The runner compares that view with a full tokenization and fails where they diverge; assert on every line that opens or closes a region.

Assertions match scope names exactly: `keyword.control.roc` does not satisfy `keyword.control.import.roc` or the reverse.

## Semantic token audit

VS Code colours a file with the TextMate grammar first and again when the
language server's semantic tokens arrive. Wherever the two disagree the colours
visibly jump. `just semantic-audit` measures that against a real server:

```sh
just semantic-audit                              # roc from $ROC_PATH or PATH
just semantic-audit --roc ../roc/zig-out/bin/roc # a locally built compiler
just semantic-audit --no-scopes                  # without our semanticTokenScopes
just semantic-audit --output before.json         # save a report ...
just semantic-audit --baseline before.json       # ... and compare with it later
```

It starts `roc experimental-lsp`, requests `textDocument/semanticTokens/full`
for `syntaxes/semantic-audit/corpus`, the oracle corpus, the workspace fixtures
and the syntax snapshot, and reports for every covered span:

- **Colour changes.** Both the TextMate scope and the semantic token are resolved
  to a foreground in the stock themes of the newest VS Code under `.vscode-test`
  (run the VSIX tests once to download one, or pass `--themes DIR`). Semantic
  tokens are resolved as VS Code does: the theme's `semanticTokenColors`, then the
  `semanticTokenScopes` this extension contributes, then VS Code's built-in
  fallback scopes.
- **Three-way roles.** The server, the grammar and the tree-sitter oracle are
  reduced to the oracle's role vocabulary. `server-differs` means the other two
  agree with each other and not with the server, which points at the server;
  `grammar-differs` points at the grammar.

The files in `syntaxes/semantic-audit/corpus` must pass `roc check`, so that
what the server says about them is what it says about working code. When
upgrading Roc, run the audit with the old and the new compiler and compare.
Keep `contributes.semanticTokenScopes` in `package.json` in step with the scopes
the grammar uses for the same things; that mapping is what stops a correct
semantic token from changing the colour.

## Grammar performance laboratory

The repository-owned benchmark uses the vendored `vscode-textmate` and
Oniguruma runtime. It has deterministic feature and generated stress corpora,
and can also read the ignored project corpus populated by `just oracle-fetch`.

```sh
just grammar-bench --iterations 20
just grammar-bench --corpus stress --stress-blocks 5000
just grammar-bench --corpus project --project .oracle-corpus
```

JSON results include grammar and corpus hashes, environment/runtime metadata,
cold load, warm full-document, independent per-line, incremental edit, memory,
throughput, token/call counts, per-file results, and slow-line samples. Compare
runs on the same quiet machine. Saved baselines are local and ignored by Git:

```sh
just grammar-bench-save before --corpus stress
just grammar-bench-save after --corpus stress
just grammar-bench-compare benchmarks/baselines/before.json benchmarks/baselines/after.json --output comparison.md
just grammar-bench-report benchmarks/baselines/after.json --output after.md
```

`compare` prints Markdown (pass `--json` for the raw report). It lists per-file
changes using the minimum of the repeated runs, and reports the run-to-run
spread so that changes inside the noise floor are labelled as such. Token counts
come from an untimed `tokenizeLine` pass, because `tokenizeLine2` merges adjacent
tokens that share theme metadata and would otherwise report two or three tokens
per line.

### Finding the expensive rule

```sh
just grammar-lint
just grammar-ablate
just grammar-ablate --rule definitions --corpus stress
```

`just grammar-ablate` removes one top-level pattern at a time (or one pattern of
a repository rule with `--rule`), re-measures, and sorts by the time saved. This
is the quickest way to attribute a regression to a rule. Read it with care:
removing a rule hands its text to later rules, so a large saving can be partly
displacement, and removing a region rule such as `#strings` makes the document
slower because its contents are then tokenized as code.

`just grammar-lint` statically reports the shapes that measurements here have
shown to matter, and `just grammar-bench-test` fails on its errors:

- **Every regex costs something on every token.** All patterns in a scanner are
  searched from each token position, so sibling rules with the same scope should
  be one alternation, and rules differing only by scope should be one regex with
  captures. Merging the original operator, punctuation and keyword lists took the
  stress corpus from +45% to parity.
- **Never use a variable-length lookbehind** such as `(?<=^\s*Name)\(`. It made
  deeply nested input six times slower. Anchor the rule with `^` and consume the
  prefix with captures instead.
- **Prefer a literal or character class first.** `:(?<=\s:)` lets Oniguruma skip
  ahead where `(?<=\s):` cannot.
- **Keep `.*` lookaheads behind a `^` anchor** so they run once per line rather
  than once per candidate.
- **Anchored rules are not free.** A `^` rule is still searched from every token
  position, because Oniguruma looks ahead for a line start. Five anchored
  branch-pattern and definition rules cost 11% on the stress corpus; merged into
  two regexes with alternation and captures they cost nothing measurable.

`just grammar-diagnose` instruments compiled Oniguruma scanner calls. It records
pattern sets, match indexes, input sizes and slow failed calls, but does not
falsely attribute aggregate scanner time to one regex. Diagnostic overhead
makes these results unsuitable for throughput comparisons.

`just grammar-profile --corpus stress --iterations 100` launches a stable loop
under `samply` when available, otherwise Linux `perf`. Select explicitly with
`--tool samply` or `--tool perf`. Run focused checks with
`just grammar-bench-test`.
