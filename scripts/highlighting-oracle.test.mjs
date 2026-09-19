import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
	classifyRoles,
	normalizeTextMateScope,
	normalizeTreeSitterCapture,
	resolveInputFiles,
	runOracle,
	verifyVendor,
} from "./highlighting-oracle-lib.mjs";

test("classifies exact, coarse, missing, extra, and wrong roles", () => {
	assert.equal(classifyRoles("function.method", "function.method"), "exact");
	assert.equal(classifyRoles("function.method", "function"), "coarse");
	assert.equal(classifyRoles("operator", null), "missing");
	assert.equal(classifyRoles(null, "punctuation"), "extra");
	assert.equal(classifyRoles("constructor", "type"), "wrong");
	assert.equal(classifyRoles("constructor", "variable"), "wrong");
});

test("normalizes raw tree-sitter captures and TextMate scopes", () => {
	assert.equal(normalizeTreeSitterCapture("namespace.roc-special.builtin"), "namespace.builtin");
	assert.equal(normalizeTreeSitterCapture("keyword.operator"), "operator.keyword");
	assert.equal(normalizeTextMateScope("entity.name.function.method.roc"), "function.method");
	assert.equal(normalizeTextMateScope("comment.line.documentation.roc"), "comment.documentation");
});

test("validates the vendored oracle manifest", () => {
	assert.equal(verifyVendor().parserAbi, 15);
});

test("rejects a vendored file whose hash does not match", (context) => {
	const directory = mkdtempSync(path.join(tmpdir(), "roc-vscode-oracle-"));
	context.after(() => rmSync(directory, { recursive: true, force: true }));
	writeFileSync(path.join(directory, "artifact.wasm"), "corrupted");
	writeFileSync(
		path.join(directory, "manifest.json"),
		JSON.stringify({ files: { "artifact.wasm": "0".repeat(64) } }),
	);
	assert.throws(() => verifyVendor(directory), /hash mismatch/);
});

test("runs both engines over the committed Unicode-aware corpus", async () => {
	const files = resolveInputFiles([], false);
	const { results, report } = await runOracle({ files, maximumDiagnostics: 0 });
	assert.ok(results.length >= 5);
	assert.equal(report.problemCount, 0);
	assert.ok(Object.values(report.counts).reduce((sum, value) => sum + value, 0) > 0);
	assert.ok(report.counts.missing + report.counts.wrong + report.counts.coarse > 0);
});
