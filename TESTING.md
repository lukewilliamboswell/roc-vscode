# Testing

Run the extension and grammar test suites with:

```sh
just test
```

## TextMate grammar tests

Add ordinary grammar fixtures under `syntaxes/tests/`. A new test should fail before it is recorded in `syntaxes/skipped-tests.json`, and only behavior that is currently unsupported should be skipped. Give each skipped fixture one focused purpose, a concrete reason, and preferably a tracking issue.

Skipped fixtures are visible technical debt, not an alternative assertion mode. After implementing support, remove the fixture's manifest entry; the fixture itself does not need to change. The local runner validates the manifest and always reports the number of known unsupported tests skipped.
