import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
	discoverFixtures,
	formatSkipSummary,
	runTextmateGrammarTests,
	selectFixtures,
	validateManifest,
} from "./test-textmate-grammar.mjs";

function repository(manifest = { version: 1, skips: [] }) {
	const root = mkdtempSync(path.join(tmpdir(), "roc-vscode-textmate-"));
	mkdirSync(path.join(root, "syntaxes/tests/unsupported"), { recursive: true });
	writeFileSync(path.join(root, "syntaxes/tests/active.roc"), "# active\n");
	writeFileSync(path.join(root, "syntaxes/tests/unsupported/known.roc"), "# skipped\n");
	writeFileSync(path.join(root, "syntaxes/skipped-tests.json"), JSON.stringify(manifest));
	return root;
}

const knownSkip = {
	file: "syntaxes/tests/unsupported/known.roc",
	reason: "Not supported yet.",
	issue: "https://example.com/issue/1",
};

test("active fixtures pass through and skipped fixtures are excluded", () => {
	const root = repository({ version: 1, skips: [knownSkip] });
	const skips = validateManifest({ version: 1, skips: [knownSkip] }, root);
	assert.deepEqual(selectFixtures(discoverFixtures(root), skips).active, ["syntaxes/tests/active.roc"]);
});

test("skip report includes reasons and issue links", () => {
	const report = formatSkipSummary(1, [knownSkip], true);
	assert.match(report, /1 passed, 1 known unsupported tests skipped/);
	assert.match(report, /Not supported yet/);
	assert.match(report, /https:\/\/example.com\/issue\/1/);
});

for (const [name, manifest, pattern] of [
	["nonexistent fixtures", { version: 1, skips: [{ file: "syntaxes/tests/missing.roc", reason: "Missing." }] }, /does not exist/],
	["empty reasons", { version: 1, skips: [{ ...knownSkip, reason: " " }] }, /non-empty reason/],
	["duplicate entries", { version: 1, skips: [knownSkip, knownSkip] }, /duplicate skip path/],
	["paths outside the test directory", { version: 1, skips: [{ file: "other/test.roc", reason: "No." }] }, /must be inside/],
]) {
	test(`${name} fail validation`, () => {
		const root = repository();
		assert.throws(() => validateManifest(manifest, root), pattern);
	});
}

test("upstream failures propagate", () => {
	const root = repository({ version: 1, skips: [knownSkip] });
	const output = { value: "", write(text) { this.value += text; } };
	let receivedArguments;
	const status = runTextmateGrammarTests({
		repositoryRoot: root,
		stdout: output,
		stderr: output,
		spawn(_executable, args) {
			receivedArguments = args;
			return { status: 7, stdout: "failure\n", stderr: "" };
		},
	});
	assert.equal(status, 7);
	assert.deepEqual(receivedArguments, ["syntaxes/tests/active.roc"]);
	assert.match(output.value, /1 active tests, 1 known unsupported tests skipped/);
});
