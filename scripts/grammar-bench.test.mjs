import assert from "node:assert/strict";
import test from "node:test";
import { benchmark, compareReports, diagnose, markdownReport } from "./grammar-bench-lib.mjs";

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
