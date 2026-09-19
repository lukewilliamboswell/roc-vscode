# Testing

Run the extension and grammar test suites with:

```sh
just test
```

## TextMate grammar tests

Add ordinary grammar fixtures under `syntaxes/tests/`. A new test should fail before it is recorded in `syntaxes/skipped-tests.json`, and only behavior that is currently unsupported should be skipped. Give each skipped fixture one focused purpose, a concrete reason, and preferably a tracking issue.

Skipped fixtures are visible technical debt, not an alternative assertion mode. After implementing support, remove the fixture's manifest entry; the fixture itself does not need to change. The local runner validates the manifest and always reports the number of known unsupported tests skipped.

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

`just grammar-diagnose` instruments compiled Oniguruma scanner calls. It records
pattern sets, match indexes, input sizes and slow failed calls, but does not
falsely attribute aggregate scanner time to one regex. Diagnostic overhead
makes these results unsuitable for throughput comparisons.

`just grammar-profile --corpus stress --iterations 100` launches a stable loop
under `samply` when available, otherwise Linux `perf`. Select explicitly with
`--tool samply` or `--tool perf`. Run focused checks with
`just grammar-bench-test`.
