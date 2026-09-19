import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const TESTS_DIRECTORY = "syntaxes/tests";

function asRepositoryPath(value) {
	return value.split(path.sep).join("/");
}

export function discoverFixtures(repositoryRoot) {
	const root = path.join(repositoryRoot, TESTS_DIRECTORY);
	const fixtures = [];

	function visit(directory) {
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			const absolutePath = path.join(directory, entry.name);
			if (entry.isDirectory()) visit(absolutePath);
			else if (entry.isFile() && entry.name.endsWith(".roc")) {
				fixtures.push(asRepositoryPath(path.relative(repositoryRoot, absolutePath)));
			}
		}
	}

	visit(root);
	return fixtures.sort();
}

export function validateManifest(manifest, repositoryRoot) {
	if (!manifest || manifest.version !== 1 || !Array.isArray(manifest.skips)) {
		throw new Error("skipped-tests.json must have version 1 and a skips array");
	}

	const seen = new Set();
	return manifest.skips.map((entry, index) => {
		if (!entry || typeof entry.file !== "string") {
			throw new Error(`skip ${index + 1} must have a file`);
		}
		const file = entry.file.replaceAll("\\", "/");
		if (
			path.posix.isAbsolute(file) ||
			!file.startsWith(`${TESTS_DIRECTORY}/`) ||
			file.includes("/../") ||
			file.endsWith("/..")
		) {
			throw new Error(`skip path must be inside ${TESTS_DIRECTORY}: ${entry.file}`);
		}
		if (!file.endsWith(".roc")) throw new Error(`skip is not a .roc fixture: ${file}`);
		if (seen.has(file)) throw new Error(`duplicate skip path: ${file}`);
		seen.add(file);
		if (typeof entry.reason !== "string" || entry.reason.trim() === "") {
			throw new Error(`skip must have a non-empty reason: ${file}`);
		}
		if (entry.issue !== undefined && (typeof entry.issue !== "string" || entry.issue.trim() === "")) {
			throw new Error(`skip issue must be a non-empty string: ${file}`);
		}
		const absolutePath = path.resolve(repositoryRoot, ...file.split("/"));
		if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
			throw new Error(`skipped fixture does not exist: ${file}`);
		}
		return { file, reason: entry.reason.trim(), ...(entry.issue ? { issue: entry.issue.trim() } : {}) };
	}).sort((left, right) => left.file.localeCompare(right.file));
}

export function selectFixtures(fixtures, skips) {
	const skippedFiles = new Set(skips.map(({ file }) => file));
	return {
		active: fixtures.filter((file) => !skippedFiles.has(file)),
		skipped: skips,
	};
}

const isWord = (character) => character !== undefined && /[A-Za-z0-9_]/.test(character);

// Fixture mistakes that textmate-grammar-test accepts silently:
// - "drifted": a range that cuts into a word at one edge but not the other has
//   almost certainly slid sideways (tabs make this easy). A range wholly inside
//   a word is a deliberate partial assertion and is allowed.
// - "ignored": an indented `# <--` arrow still measures from column one of the
//   source line, not from the comment, so it rarely covers what was intended.
// - "unasserted": a fixture without any assertion always passes.
// - "empty": an arrow covers one column per dash, starting after one column
//   per tilde. The `<` itself covers nothing, so `# <~~` is an empty range.
export function findFixtureProblems(text) {
	const problems = [];
	let source = null;
	let assertions = 0;
	for (const [index, line] of text.split("\n").entries()) {
		const report = (kind, start, end) => problems.push({ kind, line: index + 1, start: start + 1, end: end + 1, text: source.slice(start, end) });
		const arrow = /^(\s*)#\s*<(~*)(-*)(?=\s|$)/.exec(line);
		const carets = /^\s*#\s*\^/.test(line);
		if (index === 0 || (!arrow && !carets)) { source = line; continue; }
		if (source === null) continue;
		assertions += 1;
		const ranges = [];
		if (arrow && arrow[1].length > 0) report("ignored", 0, 0);
		else if (arrow && arrow[3].length === 0) report("empty", arrow[2].length, arrow[2].length);
		else if (arrow) ranges.push([arrow[2].length, arrow[2].length + arrow[3].length]);
		else for (const match of line.matchAll(/\^+/g)) ranges.push([match.index, match.index + match[0].length]);
		for (const [start, end] of ranges) {
			const splitsStart = isWord(source[start - 1]) && isWord(source[start]);
			const splitsEnd = isWord(source[end - 1]) && isWord(source[end]);
			if (splitsStart !== splitsEnd) report("drifted", start, end);
		}
	}
	if (assertions === 0) problems.push({ kind: "unasserted", line: 1, start: 1, end: 1, text: "" });
	return problems;
}

// textmate-grammar-test only tokenizes source lines that carry assertions, and
// carries tokenizer state from one asserted line straight to the next. An
// unasserted line that opens or closes a region (a lone `}`, a multiline string)
// is therefore never seen, and later assertions run in the wrong state. Compare
// the tool's view with a full tokenization and report where they diverge.
const UPSTREAM_ASSERTION = /\s*#\s*(\^|<[~]*[-]+)/;

// StateStack.equals also compares match positions, which differ between the two
// walks; the sequence of open rules is what matters here.
function sameOpenRules(left, right) {
	let a = left;
	let b = right;
	while (a && b) {
		if (a.ruleId !== b.ruleId) return false;
		a = a.parent;
		b = b.parent;
	}
	return !a && !b;
}

export function findStateGaps(text, grammar, initialStack) {
	const lines = text.split(/\r\n|\n/);
	const asserted = new Set();
	let source = 0;
	for (let index = 1; index < lines.length; index += 1) {
		if (UPSTREAM_ASSERTION.test(lines[index])) asserted.add(source);
		else source = index;
	}
	const gaps = [];
	// INITIAL is a placeholder; one empty line resolves it to the real root rule.
	let full = grammar.tokenizeLine("", initialStack).ruleStack;
	let upstream = full;
	for (let index = 1; index < lines.length; index += 1) {
		if (UPSTREAM_ASSERTION.test(lines[index])) continue;
		if (asserted.has(index) && !sameOpenRules(full, upstream)) {
			gaps.push({ kind: "state-gap", line: index + 1 });
			upstream = full;
		}
		full = grammar.tokenizeLine(lines[index], full).ruleStack;
		if (asserted.has(index)) upstream = grammar.tokenizeLine(lines[index], upstream).ruleStack;
	}
	return gaps;
}

export async function loadVendoredGrammar(root) {
	const require = createRequire(import.meta.url);
	const vendor = path.join(root, "syntaxes", "oracle", "vendor");
	const { loadWASM, OnigScanner, OnigString } = require(path.join(vendor, "vscode-oniguruma.js"));
	const { INITIAL, Registry, parseRawGrammar } = require(path.join(vendor, "vscode-textmate.js"));
	const wasm = readFileSync(path.join(vendor, "vscode-oniguruma.wasm"));
	await loadWASM(wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength));
	const grammarPath = path.join(root, "syntaxes", "roc.tmLanguage.json");
	const registry = new Registry({
		onigLib: Promise.resolve({ createOnigString: (value) => new OnigString(value), createOnigScanner: (patterns) => new OnigScanner(patterns) }),
		loadGrammar: async () => parseRawGrammar(readFileSync(grammarPath, "utf8"), grammarPath),
	});
	return { grammar: await registry.loadGrammar("source.roc"), initialStack: INITIAL };
}

export async function checkStateGaps({ repositoryRoot, stderr = process.stderr } = {}) {
	const root = repositoryRoot ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
	const { grammar, initialStack } = await loadVendoredGrammar(root);
	let count = 0;
	for (const file of discoverFixtures(root)) {
		for (const gap of findStateGaps(readFileSync(path.join(root, file), "utf8"), grammar, initialStack)) {
			count += 1;
			stderr.write(`${file}:${gap.line}: unasserted lines above change tokenizer state, but textmate-grammar-test skips lines without assertions; assert on each line that opens or closes a region\n`);
		}
	}
	return count;
}

const PROBLEM_MESSAGES = {
	drifted: ({ start, end, text }) => `assertion columns ${start}-${end} cover "${text}", cutting through a word at one edge; the range has probably drifted or is one column short`,
	ignored: () => "indented `# <` arrows still measure from column one, not from the comment; use carets for indented code",
	unasserted: () => "fixture has no assertions, so it passes whatever the grammar does",
	empty: () => "arrow assertion has no dashes, so it covers nothing; each dash covers one column",
};

export function formatSkipSummary(activeCount, skips, passed) {
	const lines = [
		`${passed ? `${activeCount} passed` : `${activeCount} active tests`}, ${skips.length} known unsupported tests skipped`,
	];
	for (const skip of skips) {
		lines.push("", `  ${skip.file}`, `    ${skip.reason}`);
		if (skip.issue) lines.push(`    ${skip.issue}`);
	}
	return lines.join("\n");
}

export function runTextmateGrammarTests({
	repositoryRoot,
	spawn = spawnSync,
	stdout = process.stdout,
	stderr = process.stderr,
} = {}) {
	const root = repositoryRoot ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
	const manifestPath = path.join(root, "syntaxes/skipped-tests.json");
	const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
	const skips = validateManifest(manifest, root);
	const fixtures = discoverFixtures(root);
	const { active } = selectFixtures(fixtures, skips);
	const problems = fixtures.flatMap((file) => findFixtureProblems(readFileSync(path.join(root, file), "utf8")).map((problem) => ({ file, ...problem })));
	if (problems.length > 0) {
		for (const problem of problems) stderr.write(`${problem.file}:${problem.line}: ${PROBLEM_MESSAGES[problem.kind](problem)}\n`);
		stderr.write(`\n${problems.length} malformed fixture assertions\n`);
		return 1;
	}
	const executable = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "textmate-grammar-test.cmd" : "textmate-grammar-test");

	stdout.write(`TextMate grammar tests\n\nRunning ${active.length} tests with textmate-grammar-test...\n\n`);
	let status = 0;
	if (active.length > 0) {
		const result = spawn(executable, active, { cwd: root, encoding: "utf8", shell: false });
		if (result.stdout) stdout.write(result.stdout);
		if (result.stderr) stderr.write(result.stderr);
		if (result.error) throw result.error;
		status = result.status ?? 1;
	}
	stdout.write(`${formatSkipSummary(active.length, skips, status === 0)}\n`);
	return status;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
	try {
		const gaps = await checkStateGaps();
		process.exitCode = gaps > 0 ? 1 : runTextmateGrammarTests();
	} catch (error) {
		console.error(`TextMate grammar test runner: ${error.message}`);
		process.exitCode = 1;
	}
}
