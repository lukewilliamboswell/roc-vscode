import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
	corpusMetadata,
	featureCorpus,
	projectCorpus,
	stressCorpus,
	stressDocument,
} from "./grammar-bench-corpus.mjs";

test("feature corpus is deterministic and covers distinct syntax families", () => {
	const first = featureCorpus();
	const second = featureCorpus();
	assert.deepEqual(first, second);
	assert.ok(first.length >= 40);
	assert.ok(first.some(({ name }) => name === "syntaxes/tests/functions.roc"));
	assert.ok(first.every(({ source }) => source === "feature"));
	assert.ok(first.every(({ sha256 }) => /^[a-f0-9]{64}$/.test(sha256)));
});

test("stress corpus covers independent pathological input families", () => {
	const corpus = stressCorpus({ blocks: 2 });
	assert.deepEqual(corpus.map(({ name }) => name), [
		"stress/generated-2.roc",
		"stress/long-line.roc",
		"stress/unterminated-string.roc",
		"stress/repeated-operators.roc",
		"stress/deep-nesting.roc",
		"stress/near-matching-identifiers.roc",
	]);
	assert.deepEqual(corpus, stressCorpus({ blocks: 2 }));
});

test("stress corpus has stable, configurable size", () => {
	const small = stressDocument({ blocks: 2 });
	assert.equal(small.lines, 5);
	assert.match(small.text, /render_0/);
	assert.match(small.text, /render_1/);
	assert.deepEqual(small, stressDocument({ blocks: 2 }));
	assert.throws(() => stressDocument({ blocks: 0 }), /positive integer/);
});

test("project corpus recursively discovers Roc files in stable order", (context) => {
	const root = mkdtempSync(path.join(tmpdir(), "roc-grammar-corpus-"));
	context.after(() => rmSync(root, { recursive: true, force: true }));
	mkdirSync(path.join(root, "project", "nested"), { recursive: true });
	writeFileSync(path.join(root, "project", "z.roc"), "z = 1\n");
	writeFileSync(path.join(root, "project", "nested", "a.roc"), "a = 1\n");
	writeFileSync(path.join(root, "project", "ignored.txt"), "ignored");
	assert.deepEqual(
		projectCorpus("project", { repositoryRoot: root }).map(({ name }) => name),
		["project/nested/a.roc", "project/z.roc"],
	);
});

test("metadata changes when corpus content changes", () => {
	const feature = featureCorpus();
	const first = corpusMetadata(feature);
	const second = corpusMetadata([...feature, stressDocument({ blocks: 1 })]);
	assert.equal(first.version, 1);
	assert.equal(first.files, feature.length);
	assert.notEqual(first.sha256, second.sha256);
	assert.equal(Object.values(first.sources).reduce((sum, count) => sum + count, 0), first.files);
});
