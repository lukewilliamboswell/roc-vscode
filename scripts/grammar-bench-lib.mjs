import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { arch, cpus, platform, release } from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

import { corpusMetadata, featureCorpus, projectCorpus, stressCorpus } from "./grammar-bench-corpus.mjs";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vendor = path.join(root, "syntaxes", "oracle", "vendor");
const grammarPath = path.join(root, "syntaxes", "roc.tmLanguage.json");
const { loadWASM, OnigScanner, OnigString } = require(path.join(vendor, "vscode-oniguruma.js"));
const { INITIAL, Registry, parseRawGrammar } = require(path.join(vendor, "vscode-textmate.js"));

const quantile = (values, p) => {
	const ordered = [...values].sort((a, b) => a - b);
	return ordered[Math.min(ordered.length - 1, Math.floor(ordered.length * p))] ?? 0;
};
const stats = (values) => ({
	count: values.length,
	minMs: Math.min(...values),
	medianMs: quantile(values, 0.5),
	p90Ms: quantile(values, 0.9),
	p95Ms: quantile(values, 0.95),
	p99Ms: quantile(values, 0.99),
	maxMs: Math.max(...values),
	meanMs: values.reduce((a, b) => a + b, 0) / values.length,
});
const round = (value) => Math.round(value * 1000) / 1000;
const countStats = (values) => ({ count: values.length, min: Math.min(...values), median: quantile(values, 0.5), p90: quantile(values, 0.9), p95: quantile(values, 0.95), p99: quantile(values, 0.99), max: Math.max(...values), mean: round(values.reduce((a, b) => a + b, 0) / values.length) });

export function environmentMetadata() {
	let revision = null;
	try { revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(); } catch {}
	const processors = cpus();
	return { node: process.version, platform: platform(), release: release(), arch: arch(), cpus: processors.length, cpuModel: processors[0]?.model ?? null, revision };
}

export function loadCorpus({ corpus = "feature", stressBlocks = 1000, project = ".oracle-corpus" } = {}) {
	if (corpus === "feature") return featureCorpus({ repositoryRoot: root });
	if (corpus === "stress") return stressCorpus({ blocks: stressBlocks });
	if (corpus === "project") return projectCorpus(project, { repositoryRoot: root });
	if (corpus === "all") return [...featureCorpus({ repositoryRoot: root }), ...stressCorpus({ blocks: stressBlocks }), ...(existsSync(path.join(root, project)) ? projectCorpus(project, { repositoryRoot: root }) : [])];
	throw new Error(`unknown corpus: ${corpus}`);
}

async function loadGrammar(instrument = false) {
	const scanners = [];
	const wasm = readFileSync(path.join(vendor, "vscode-oniguruma.wasm"));
	await loadWASM(wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength));
	const registry = new Registry({ onigLib: Promise.resolve({
		createOnigString: (value) => new OnigString(value),
		createOnigScanner(patterns) {
			const scanner = new OnigScanner(patterns);
			if (!instrument) return scanner;
			const metric = { scanner: scanners.length, patterns, calls: 0, timeMs: 0, matched: 0, failed: 0, inputBytes: 0, matchIndexes: {}, slowFailures: [] };
			scanners.push(metric);
			return { findNextMatchSync(string, start, options) {
				const before = performance.now();
				let result;
				try { result = scanner.findNextMatchSync(string, start, options); return result; }
				finally {
					const elapsed = performance.now() - before;
					metric.calls += 1; metric.timeMs += elapsed; metric.inputBytes += string.content?.length ?? 0;
					if (result) { metric.matched += 1; metric.matchIndexes[result.index] = (metric.matchIndexes[result.index] ?? 0) + 1; }
					else { metric.failed += 1; metric.slowFailures.push({ timeMs: round(elapsed), inputLength: string.content?.length ?? null, start }); metric.slowFailures.sort((a, b) => b.timeMs - a.timeMs); metric.slowFailures.length = Math.min(metric.slowFailures.length, 5); }
				}
			} };
		},
	}) , loadGrammar: async (scope) => scope === "source.roc" ? parseRawGrammar(readFileSync(grammarPath, "utf8"), grammarPath) : null });
	return { grammar: await registry.loadGrammar("source.roc"), scanners };
}

function tokenizeFull(grammar, text, lineTimings = null, lineTimeLimitMs = 0) {
	let stack = INITIAL;
	let tokens = 0;
	for (const [lineNumber, line] of text.split("\n").entries()) { const before = performance.now(); const result = grammar.tokenizeLine2(line, stack); const elapsed = performance.now() - before; stack = result.ruleStack; tokens += result.tokens.length / 2; if (lineTimings) lineTimings.push({ line: lineNumber + 1, bytes: Buffer.byteLength(line), utf16Length: line.length, timeMs: round(elapsed), overTimeLimit: lineTimeLimitMs > 0 && elapsed > lineTimeLimitMs }); }
	return tokens;
}

function tokenizePerLine(grammar, text) {
	let tokens = 0;
	for (const line of text.split("\n")) tokens += grammar.tokenizeLine2(line, INITIAL).tokens.length / 2;
	return tokens;
}

function prepareIncremental(grammar, text) {
	const lines = text.split("\n");
	const old = [];
	let stack = INITIAL;
	for (const line of lines) { const result = grammar.tokenizeLine2(line, stack); old.push(result); stack = result.ruleStack; }
	return { lines, old, changed: Math.floor(lines.length / 2) };
}

function incrementalEdit(grammar, prepared) {
	const { old, changed } = prepared;
	const lines = [...prepared.lines];
	lines[changed] = `${lines[changed]} `;
	let stack = changed === 0 ? INITIAL : old[changed - 1].ruleStack;
	let invalidated = 0;
	let tokenCount = 0;
	for (let index = changed; index < lines.length; index += 1) {
		const result = grammar.tokenizeLine2(lines[index], stack);
		invalidated += 1; tokenCount += result.tokens.length / 2;
		const sameTokens = result.tokens.length === old[index].tokens.length && result.tokens.every((value, tokenIndex) => value === old[index].tokens[tokenIndex]);
		const stable = sameTokens && result.ruleStack.equals(old[index].ruleStack);
		stack = result.ruleStack;
		if (stable) break;
	}
	return { invalidated, tokenCount };
}

function measure(iterations, operation) {
	const samples = [];
	let result;
	for (let index = 0; index < iterations; index += 1) { const before = performance.now(); result = operation(); samples.push(performance.now() - before); }
	return { ...Object.fromEntries(Object.entries(stats(samples)).map(([key, value]) => [key, typeof value === "number" ? round(value) : value])), result };
}

export async function benchmark(options = {}) {
	const iterations = options.iterations ?? 10;
	if (!Number.isInteger(iterations) || iterations < 1) throw new Error("iterations must be a positive integer");
	const entries = loadCorpus(options);
	const lineTimeLimitMs = options.lineTimeLimitMs ?? 0;
	const beforeMemory = process.memoryUsage();
	const coldStart = performance.now();
	const { grammar } = await loadGrammar(false);
	const coldLoadMs = round(performance.now() - coldStart);
	for (const item of entries) tokenizeFull(grammar, item.text);
	const perFile = entries.map((item) => {
		const lineTimings = [];
		const before = performance.now();
		const tokenCount = tokenizeFull(grammar, item.text, lineTimings, lineTimeLimitMs);
		const timeMs = performance.now() - before;
		return { name: item.name, bytes: item.bytes, lines: item.lines, tokenCount, tokenizerCalls: item.text.split("\n").length, timeMs: round(timeMs), mibPerSecond: round(item.bytes / 1048576 / (timeMs / 1000)), linesPerSecond: round(item.lines / (timeMs / 1000)), nsPerByte: round(timeMs * 1e6 / Math.max(1, item.bytes)), linesOverTimeLimit: lineTimings.filter((line) => line.overTimeLimit).length, lineTimings, slowLines: [...lineTimings].sort((a, b) => b.timeMs - a.timeMs).slice(0, 10) };
	});
	const full = measure(iterations, () => entries.reduce((sum, item) => sum + tokenizeFull(grammar, item.text), 0));
	const totalBytes = entries.reduce((sum, item) => sum + item.bytes, 0);
	const totalLines = entries.reduce((sum, item) => sum + item.lines, 0);
	full.mibPerSecond = round(totalBytes / 1048576 / (full.medianMs / 1000));
	full.linesPerSecond = round(totalLines / (full.medianMs / 1000));
	full.nsPerByte = round(full.medianMs * 1e6 / Math.max(1, totalBytes));
	full.tokenizerCalls = entries.reduce((sum, item) => sum + item.text.split("\n").length, 0);
	const perLine = measure(iterations, () => entries.reduce((sum, item) => sum + tokenizePerLine(grammar, item.text), 0));
	const incrementalBaselines = entries.map((item) => prepareIncremental(grammar, item.text));
	const incrementalInvalidated = [];
	const incremental = measure(iterations, () => incrementalBaselines.reduce((sum, baseline) => {
		const result = incrementalEdit(grammar, baseline);
		incrementalInvalidated.push(result.invalidated);
		return sum + result.tokenCount;
	}, 0));
	const afterMemory = process.memoryUsage();
	return {
		schemaVersion: 1, kind: "roc-textmate-benchmark", createdAt: new Date().toISOString(),
			environment: environmentMetadata(), runtime: { vscodeTextmate: "9.3.2", vscodeOniguruma: "2.0.1" }, grammar: { path: "syntaxes/roc.tmLanguage.json", sha256: createHash("sha256").update(readFileSync(grammarPath)).digest("hex") },
		corpus: corpusMetadata(entries), configuration: { iterations, corpus: options.corpus ?? "feature", stressBlocks: options.stressBlocks ?? 1000, lineTimeLimitMs },
			metrics: { coldLoadMs, warmFullDocument: full, perLineColdState: perLine, incrementalSingleLine: { ...incremental, linesInvalidated: countStats(incrementalInvalidated) }, perFile, totals: { tokenizerCalls: perFile.reduce((sum, item) => sum + item.tokenizerCalls, 0), tokenCount: perFile.reduce((sum, item) => sum + item.tokenCount, 0) }, memory: { rssBefore: beforeMemory.rss, rssAfter: afterMemory.rss, rssDelta: afterMemory.rss - beforeMemory.rss, heapUsedDelta: afterMemory.heapUsed - beforeMemory.heapUsed } },
	};
}

export async function diagnose(options = {}) {
	const entries = loadCorpus(options);
	const { grammar, scanners } = await loadGrammar(true);
	const started = performance.now();
	for (const item of entries) tokenizeFull(grammar, item.text);
	return { schemaVersion: 1, kind: "roc-textmate-diagnostic", createdAt: new Date().toISOString(), environment: environmentMetadata(), corpus: corpusMetadata(entries), elapsedMs: round(performance.now() - started), attribution: "Scanner call timings aggregate all patterns in a compiled Oniguruma scanner; match indexes identify the selected pattern but elapsed calls do not identify an individual regular expression.", scanners: scanners.map((item) => ({ ...item, timeMs: round(item.timeMs) })).sort((a, b) => b.timeMs - a.timeMs) };
}

export function compareReports(base, current) {
	const names = ["coldLoadMs", "warmFullDocument.medianMs", "warmFullDocument.p95Ms", "perLineColdState.medianMs", "incrementalSingleLine.medianMs", "memory.rssDelta"];
	const read = (object, name) => name.split(".").reduce((value, key) => value?.[key], object.metrics);
	const baseLines = new Map(base.metrics.perFile.flatMap((file) => file.lineTimings.map((line) => [`${file.name}:${line.line}`, { ...line, file: file.name }])));
	const lineRegressions = current.metrics.perFile.flatMap((file) => file.lineTimings.map((line) => {
		const before = baseLines.get(`${file.name}:${line.line}`);
		if (!before) return null;
		return { file: file.name, line: line.line, utf16Length: line.utf16Length, beforeMs: before.timeMs, afterMs: line.timeMs, deltaMs: round(line.timeMs - before.timeMs), percent: before.timeMs === 0 ? null : round(((line.timeMs - before.timeMs) / before.timeMs) * 100) };
	})).filter(Boolean).sort((left, right) => right.deltaMs - left.deltaMs).slice(0, 20);
	return { schemaVersion: 1, kind: "roc-textmate-comparison", compatibleCorpus: base.corpus.sha256 === current.corpus.sha256, base: base.createdAt, current: current.createdAt, changes: names.map((name) => { const before = read(base, name); const after = read(current, name); return { metric: name, before, after, delta: after - before, percent: before === 0 ? null : round(((after - before) / before) * 100) }; }), incrementalLinesInvalidated: { baseMax: base.metrics.incrementalSingleLine.linesInvalidated.max, currentMax: current.metrics.incrementalSingleLine.linesInvalidated.max }, lineRegressions };
}

export function markdownReport(report) {
	if (report.kind === "roc-textmate-comparison") return `# Roc TextMate benchmark comparison\n\nCorpus compatible: **${report.compatibleCorpus ? "yes" : "no"}**\n\n| Metric | Before | After | Change |\n|---|---:|---:|---:|\n${report.changes.map((x) => `| ${x.metric} | ${x.before} | ${x.after} | ${x.percent === null ? "n/a" : `${x.percent}%`} |`).join("\n")}\n\nMaximum incremental lines rescanned: ${report.incrementalLinesInvalidated.baseMax} → ${report.incrementalLinesInvalidated.currentMax}.\n\n## Slowest line regressions\n\n| Location | Before (ms) | After (ms) | Change | UTF-16 length |\n|---|---:|---:|---:|---:|\n${report.lineRegressions.slice(0, 10).map((line) => `| ${line.file}:${line.line} | ${line.beforeMs} | ${line.afterMs} | ${line.percent === null ? "n/a" : `${line.percent}%`} | ${line.utf16Length} |`).join("\n")}\n`;
	if (report.kind === "roc-textmate-diagnostic") return `# Roc TextMate scanner diagnostics\n\n${report.attribution}\n\n| Scanner | Patterns | Calls | Time (ms) |\n|---:|---:|---:|---:|\n${report.scanners.slice(0, 30).map((x) => `| ${x.scanner} | ${x.patterns.length} | ${x.calls} | ${x.timeMs} |`).join("\n")}\n`;
	return `# Roc TextMate benchmark\n\n- Corpus: ${report.corpus.files} files, ${report.corpus.lines} lines (${report.corpus.sha256})\n- Environment: Node ${report.environment.node}, ${report.environment.platform}/${report.environment.arch}\n- Cold grammar load: ${report.metrics.coldLoadMs} ms\n\n| Mode | Median (ms) | p95 (ms) |\n|---|---:|---:|\n| Warm full document | ${report.metrics.warmFullDocument.medianMs} | ${report.metrics.warmFullDocument.p95Ms} |\n| Per-line cold state | ${report.metrics.perLineColdState.medianMs} | ${report.metrics.perLineColdState.p95Ms} |\n| Incremental single line | ${report.metrics.incrementalSingleLine.medianMs} | ${report.metrics.incrementalSingleLine.p95Ms} |\n\nRSS delta: ${report.metrics.memory.rssDelta} bytes.\n`;
}

export function writeReport(report, output) {
	mkdirSync(path.dirname(output), { recursive: true });
	writeFileSync(output, output.endsWith(".md") ? markdownReport(report) : `${JSON.stringify(report, null, 2)}\n`);
}

export function readReport(file) { return JSON.parse(readFileSync(file, "utf8")); }
export { root as repositoryRoot };
