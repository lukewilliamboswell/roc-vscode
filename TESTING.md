# Testing

Run the extension and grammar test suites with:

```sh
just test
```

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
