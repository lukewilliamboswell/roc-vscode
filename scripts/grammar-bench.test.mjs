import assert from "node:assert/strict";
import test from "node:test";
import { ablate, benchmark, compareReports, diagnose, lintGrammar, markdownReport } from "./grammar-bench-lib.mjs";

test("benchmark reports performance modes and metadata", async () => {
	const report = await benchmark({ corpus: "feature", iterations: 1 });
	assert.ok(report.corpus.files >= 40);
	assert.ok(report.metrics.warmFullDocument.p99Ms >= 0);
	assert.ok(report.metrics.totals.tokenizerCalls > 0);
	assert.ok(report.metrics.perFile.every((file) => file.slowLines.length > 0));
	assert.ok(report.metrics.perFile.every((file) => file.lineTimings.length > 0));
	assert.ok(report.metrics.incrementalSingleLine.linesInvalidated.mean >= 1);
	assert.ok(report.metrics.warmFullDocument.mibPerSecond > 0);
	assert.match(markdownReport(report), /Warm full document/);
});

test("comparison checks compatibility and computes changes", async () => {
	const report = await benchmark({ corpus: "feature", iterations: 1 });
	const comparison = compareReports(report, report);
	assert.equal(comparison.compatibleCorpus, true);
	assert.ok(comparison.changes.every(({ delta }) => delta === 0));
	assert.ok(comparison.lineRegressions.every(({ deltaMs }) => deltaMs === 0));
	assert.equal(
		comparison.incrementalLinesInvalidated.baseMax,
		comparison.incrementalLinesInvalidated.currentMax,
	);
});

test("diagnostics disclose scanner attribution and pattern sets", async () => {
	const report = await diagnose({ corpus: "feature" });
	assert.match(report.attribution, /do not identify an individual regular expression/);
	assert.ok(report.scanners.some(({ patterns }) => patterns.length > 0));
	assert.ok(report.scanners.every(({ matchIndexes, slowFailures }) => matchIndexes && slowFailures));
});

test("token counts reflect scope tokens rather than merged metadata runs", async () => {
	const report = await benchmark({ corpus: "feature", iterations: 1 });
	assert.ok(report.metrics.totals.tokenCount > report.corpus.lines * 2);
	assert.ok(report.metrics.perFile.every((file) => file.minMs <= file.medianMs));
	assert.ok(report.grammar.regexCount > 0);
});

test("comparison reports per-file changes and a noise floor", async () => {
	const report = await benchmark({ corpus: "feature", iterations: 2 });
	const comparison = compareReports(report, report);
	assert.equal(comparison.perFile.length, report.metrics.perFile.length);
	assert.ok(comparison.perFile.every(({ deltaMs }) => deltaMs === 0));
	assert.ok(comparison.noisePercent >= 0);
	assert.match(markdownReport(comparison), /Per file/);
});

test("lint flags the regex shapes known to be slow", () => {
	const report = lintGrammar({
		patterns: [{ include: "#a" }, { include: "#b" }],
		repository: {
			a: { patterns: [{ name: "x.roc", match: "foo" }, { name: "x.roc", match: "bar" }] },
			b: { patterns: [
				{ name: "y.roc", match: "(?<=^\\s*[A-Z]\\w*)\\(" },
				{ name: "z.roc", match: "(?<=\\.)[a-z]+" },
				{ name: "w.roc", match: "[A-Z]\\w*(?=.*=>)" },
				{ name: "v.roc", match: "^\\s*[A-Z]\\w*(?=.*=>)" },
			] },
		},
	});
	const codes = report.findings.map(({ code }) => code).sort();
	assert.deepEqual(codes, ["leading-lookbehind", "mergeable-siblings", "unanchored-line-scan", "variable-length-lookbehind"]);
	assert.equal(report.regexCount, 6);
	assert.equal(report.topLevelScannerPatterns, 6);
	assert.match(markdownReport(report), /variable-length-lookbehind/);
});

test("the shipped grammar has no lint errors", () => {
	assert.deepEqual(lintGrammar().findings.filter(({ severity }) => severity === "error"), []);
});

test("ablation attributes cost to individual rules", async () => {
	const report = await ablate({ corpus: "feature", iterations: 1, rule: "strings" });
	assert.equal(report.rows.length, 3);
	assert.ok(report.rows.every((row) => Number.isFinite(row.deltaMs) && Object.keys(row.perFileDeltaMs).length > 0));
	assert.match(markdownReport(report), /Most affected file/);
	await assert.rejects(ablate({ corpus: "feature", iterations: 1, rule: "missing" }), /no patterns array/);
});
