import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
	discoverFixtures,
	findFixtureProblems,
	findStateGaps,
	loadVendoredGrammar,
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

test("fixture checks catch assertions the upstream tool accepts silently", () => {
	const header = '# SYNTAX TEST "source.roc" "probe"\n';
	const kinds = (body) => findFixtureProblems(header + body).map(({ kind }) => kind);
	assert.deepEqual(kinds("\t.args(x)\n#\t ^^^^ entity.name.function.roc\n"), ["drifted"]);
	assert.deepEqual(kinds("import Foo\n# <----- keyword.control.roc\n"), ["drifted"]);
	assert.deepEqual(kinds("    value = 1\n    # <~~-- variable.other.roc\n"), ["ignored"]);
	assert.deepEqual(kinds("value = 1\n# <~~ variable.other.roc\n"), ["empty"]);
	assert.deepEqual(kinds("import Foo\n# <------ keyword.control.roc\n#      ^^^ entity.name.namespace.roc\n"), []);
	assert.deepEqual(kinds("    value = 1\n#     ^^ variable.other.roc\n"), [], "a range wholly inside a word is deliberate");
	assert.deepEqual(kinds("# <- not an assertion, just a comment after the header\n").length, 0);
});

test("malformed fixtures fail the run before the upstream tool starts", () => {
	const root = repository();
	writeFileSync(path.join(root, "syntaxes/tests/drifted.roc"), '# SYNTAX TEST "source.roc" "probe"\nimport Foo\n# <----- keyword.control.roc\n');
	let spawned = false;
	let errors = "";
	const status = runTextmateGrammarTests({ repositoryRoot: root, spawn: () => { spawned = true; return { status: 0 }; }, stdout: { write() {} }, stderr: { write: (value) => { errors += value; } } });
	assert.equal(status, 1);
	assert.equal(spawned, false);
	assert.match(errors, /drifted\.roc:3: .*one column short/);
});

test("state gaps are reported when an unasserted line opens or closes a region", async () => {
	const root = path.resolve(import.meta.dirname, "..");
	const { grammar, initialStack } = await loadVendoredGrammar(root);
	const header = '# SYNTAX TEST "source.roc" "probe"\n\n';
	const open = 'app [main!] {\n# <--- keyword.control.roc\n    pf: platform "x",\n';
	const after = "\nimport Foo\n# <------ keyword.control.import.roc\n";
	assert.deepEqual(findStateGaps(`${header}${open}}\n${after}`, grammar, initialStack), [{ kind: "state-gap", line: 8 }]);
	assert.deepEqual(findStateGaps(`${header}${open}}\n# <- punctuation.brackets.curly.roc\n${after}`, grammar, initialStack), []);
	assert.deepEqual(findStateGaps(`${header}value = 1\n\nother = 2\n# <----- variable.other.roc\n`, grammar, initialStack), []);
});
