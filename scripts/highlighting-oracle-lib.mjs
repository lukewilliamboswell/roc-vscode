import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = path.resolve(scriptDirectory, "..");
export const oracleDirectory = path.join(repositoryRoot, "syntaxes", "oracle");
export const vendorDirectory = path.join(oracleDirectory, "vendor");
export const externalCorpusDirectory = path.join(repositoryRoot, ".oracle-corpus");
const { Language, Parser, Query } = require(path.join(vendorDirectory, "web-tree-sitter.cjs"));
const { loadWASM, OnigScanner, OnigString } = require(
	path.join(vendorDirectory, "vscode-oniguruma.js"),
);
const { INITIAL, Registry, parseRawGrammar } = require(
	path.join(vendorDirectory, "vscode-textmate.js"),
);

const roleFamilies = new Map([
	["boolean", "constant"],
	["character", "string"],
	["escape", "string"],
]);

function familyForRole(role) {
	if (role === null) return null;
	const root = role.split(".")[0];
	return roleFamilies.get(root) ?? root;
}

export function classifyRoles(expected, actual) {
	if (expected === actual) return "exact";
	if (expected === null) return "extra";
	if (actual === null) return "missing";
	if (familyForRole(expected) === familyForRole(actual)) return "coarse";
	return "wrong";
}

export function normalizeTreeSitterCapture(capture) {
	const normalized = capture.replaceAll(".roc-special", "");
	if (normalized === "ignoreme.module" || normalized === "module") return "namespace";
	if (normalized === "comment.block.documentation") return "comment.documentation";
	if (normalized.startsWith("comment")) return "comment";
	if (normalized === "constant.builtin.boolean") return "boolean";
	if (normalized === "constant.character.escape") return "escape";
	if (normalized === "constant.character") return "character";
	if (normalized === "constant.numeric.float") return "number.float";
	if (normalized === "constant.numeric.integer") return "number.integer";
	if (normalized === "keyword.operator") return "operator.keyword";
	return normalized;
}

export function normalizeTextMateScope(scope) {
	const value = scope.replace(/\.roc$/, "");

	if (value.startsWith("comment.line.documentation")) return "comment.documentation";
	if (value.startsWith("comment")) return "comment";
	if (value.startsWith("constant.language.boolean")) return "boolean";
	if (value.startsWith("constant.language")) return "boolean";
	if (value.startsWith("constant.character.escape")) return "escape";
	if (value.startsWith("constant.character")) return "character";
	if (value.startsWith("constant.numeric.float")) return "number.float";
	if (value.startsWith("constant.numeric.integer")) return "number.integer";
	if (value.startsWith("constant.numeric")) return "number";
	if (value.startsWith("string.quoted.single.char")) return "character";
	if (value.startsWith("string.special.url")) return "string.special.url";
	if (value.startsWith("string")) return "string";
	if (value.startsWith("meta.interpolation")) return "meta.interpolation";

	if (value.startsWith("keyword.operator.question")) return "operator.keyword";
	if (value.startsWith("keyword.operator")) return "operator";
	if (value.startsWith("keyword.control.conditional")) return "keyword.control.conditional";
	if (value.startsWith("keyword.control.import")) return "keyword.control.import";
	if (value.startsWith("keyword.control.repeat")) return "keyword.control.repeat";
	if (value.startsWith("keyword.control.return")) return "keyword.control.return";
	if (value.startsWith("keyword.control")) return "keyword.control";

	if (value.startsWith("support.function.builtin")) return "function.builtin";
	if (value.startsWith("support.function.method")) return "function.method";
	if (value.startsWith("entity.name.function.method")) return "function.method";
	if (value.startsWith("entity.name.function") || value.startsWith("support.function")) {
		return "function";
	}

	if (value.startsWith("variable.parameter")) return "variable.parameter";
	if (value.startsWith("variable.other.member")) return "variable.other.member";
	if (value.startsWith("variable.language") || value.startsWith("variable.builtin")) {
		return "variable.builtin";
	}
	if (value.startsWith("variable")) return "variable";

	if (value.startsWith("entity.name.type.constructor")) return "constructor";
	if (value.startsWith("entity.name.type.variant")) return "type.enum.variant";
	if (value.startsWith("entity.name.type.definition")) return "type.definition";
	if (value.startsWith("support.type") || value.startsWith("storage.type.builtin")) {
		return "type.builtin";
	}
	if (value.startsWith("variable.other.type") || value.startsWith("storage.type.parameter")) {
		return "type.parameter";
	}
	if (value.startsWith("storage.type") || value.startsWith("entity.name.type")) return "type";

	if (value.startsWith("entity.name.namespace.builtin")) return "namespace.builtin";
	if (value.startsWith("entity.name.namespace")) return "namespace";
	if (value.startsWith("punctuation.definition.interpolation")) return "punctuation.special";
	if (value.startsWith("punctuation.comma") || value.startsWith("punctuation.colon")) {
		return "punctuation.delimiter";
	}
	if (value.startsWith("punctuation.brackets") || value.startsWith("punctuation.other")) {
		return "punctuation.bracket";
	}
	if (value.startsWith("punctuation.section")) return "punctuation.bracket";
	if (value.startsWith("punctuation.separator")) return "punctuation.delimiter";
	if (value.startsWith("punctuation")) return "punctuation";
	if (value.startsWith("entity.other.attribute-name")) return "attribute";
	if (value.startsWith("meta.exposed")) return "special.exposed";
	if (value.startsWith("meta.provided")) return "special.provided";
	if (value.startsWith("meta.package")) return "special.package";

	return null;
}

function sha256(filePath) {
	return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

export function verifyVendor(directory = vendorDirectory) {
	const manifestPath = path.join(directory, "manifest.json");
	const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
	for (const [name, expectedHash] of Object.entries(manifest.files)) {
		const filePath = path.join(directory, name);
		const actualHash = sha256(filePath);
		if (actualHash !== expectedHash) {
			throw new Error(
				`Vendored oracle hash mismatch for ${name}: expected ${expectedHash}, got ${actualHash}`,
			);
		}
	}
	return manifest;
}

function collectRocFiles(inputPath) {
	const resolved = path.resolve(repositoryRoot, inputPath);
	if (!statSync(resolved).isDirectory()) return resolved.endsWith(".roc") ? [resolved] : [];

	const files = [];
	for (const entry of readdirSync(resolved, { withFileTypes: true })) {
		const child = path.join(resolved, entry.name);
		if (entry.isDirectory()) files.push(...collectRocFiles(child));
		else if (entry.isFile() && child.endsWith(".roc")) files.push(child);
	}
	return files;
}

function externalRocFiles() {
	const sources = JSON.parse(readFileSync(path.join(oracleDirectory, "sources.json"), "utf8"));
	const files = [];
	for (const source of sources.repositories) {
		const checkout = path.join(externalCorpusDirectory, source.name);
		try {
			const output = execFileSync("git", ["-C", checkout, "ls-files", "-z", "--", "*.roc"], {
				encoding: "utf8",
			});
			for (const relativePath of output.split("\0")) {
				if (relativePath !== "") files.push(path.join(checkout, relativePath));
			}
		} catch {
			throw new Error(`External corpus ${source.name} is missing; run \`just oracle-fetch\` first`);
		}
	}
	return files;
}

export function resolveInputFiles(inputs, includeExternal) {
	const selected =
		inputs.length === 0 && !includeExternal ? [path.join(oracleDirectory, "corpus")] : inputs;
	const files = selected.flatMap(collectRocFiles);
	if (includeExternal) files.push(...externalRocFiles());
	return [...new Set(files)].sort();
}

function mostSpecificTextMateRole(scopes) {
	for (let index = scopes.length - 1; index >= 0; index -= 1) {
		const role = normalizeTextMateScope(scopes[index]);
		if (role !== null) return { role, scope: scopes[index] };
	}
	return { role: null, scope: null };
}

function assignTreeSitterRoles(source, captures) {
	const roles = new Array(source.length).fill(null);
	const rawScopes = new Array(source.length).fill(null);
	const priorities = new Int32Array(source.length);
	priorities.fill(-1);
	const widths = new Int32Array(source.length);
	widths.fill(2_147_483_647);
	const orders = new Int32Array(source.length);

	for (let order = 0; order < captures.length; order += 1) {
		const capture = captures[order];
		const role = normalizeTreeSitterCapture(capture.name);
		const width = capture.node.endIndex - capture.node.startIndex;
		for (let index = capture.node.startIndex; index < capture.node.endIndex; index += 1) {
			const takesPriority =
				capture.patternIndex > priorities[index] ||
				(capture.patternIndex === priorities[index] && width < widths[index]) ||
				(capture.patternIndex === priorities[index] &&
					width === widths[index] &&
					order >= orders[index]);
			if (takesPriority) {
				roles[index] = role;
				rawScopes[index] = capture.name;
				priorities[index] = capture.patternIndex;
				widths[index] = width;
				orders[index] = order;
			}
		}
	}
	return { roles, rawScopes };
}

function tokenizeTextMate(source, grammar) {
	const roles = new Array(source.length).fill(null);
	const rawScopes = new Array(source.length).fill(null);
	let offset = 0;
	let ruleStack = INITIAL;

	while (offset < source.length) {
		const newlineIndex = source.indexOf("\n", offset);
		const fullEnd = newlineIndex === -1 ? source.length : newlineIndex + 1;
		let contentEnd = newlineIndex === -1 ? source.length : newlineIndex;
		if (contentEnd > offset && source[contentEnd - 1] === "\r") contentEnd -= 1;
		const line = source.slice(offset, contentEnd);
		const result = grammar.tokenizeLine(line, ruleStack);
		ruleStack = result.ruleStack;
		for (const token of result.tokens) {
			const normalized = mostSpecificTextMateRole(token.scopes);
			for (let index = token.startIndex; index < token.endIndex; index += 1) {
				roles[offset + index] = normalized.role;
				rawScopes[offset + index] = normalized.scope;
			}
		}
		offset = fullEnd;
	}
	return { roles, rawScopes };
}

function parseProblems(rootNode, sourceLength) {
	const masked = new Uint8Array(sourceLength);
	const problems = [];
	const nodes = [rootNode];
	while (nodes.length > 0) {
		const node = nodes.pop();
		if (node.isError || node.isMissing) {
			problems.push({
				type: node.isMissing ? `missing ${node.type}` : node.type,
				start: node.startPosition,
				end: node.endPosition,
			});
			for (let index = node.startIndex; index < node.endIndex; index += 1) masked[index] = 1;
		}
		for (const child of node.children) nodes.push(child);
	}
	return { masked, problems };
}

function sourceLineStarts(source) {
	const starts = [0];
	for (let index = 0; index < source.length; index += 1) {
		if (source[index] === "\n") starts.push(index + 1);
	}
	return starts;
}

function sourceLocation(lineStarts, index) {
	let low = 0;
	let high = lineStarts.length;
	while (low + 1 < high) {
		const middle = Math.floor((low + high) / 2);
		if (lineStarts[middle] <= index) low = middle;
		else high = middle;
	}
	return { line: low + 1, column: index - lineStarts[low] + 1 };
}

function matchesRoleFilter(filter, expected, actual) {
	if (filter === null) return true;
	return [expected, actual].some(
		(role) => role !== null && (role === filter || role.startsWith(`${filter}.`)),
	);
}

function compareRoles(source, treeRoles, textMateRoles, masked, roleFilter) {
	const segments = [];
	let index = 0;
	while (index < source.length) {
		const expected = treeRoles.roles[index];
		const actual = textMateRoles.roles[index];
		const isMasked = masked[index] === 1;
		let end = index + 1;
		while (
			end < source.length &&
			treeRoles.roles[end] === expected &&
			textMateRoles.roles[end] === actual &&
			treeRoles.rawScopes[end] === treeRoles.rawScopes[index] &&
			textMateRoles.rawScopes[end] === textMateRoles.rawScopes[index] &&
			(masked[end] === 1) === isMasked
		) {
			end += 1;
		}

		if (
			!isMasked &&
			!/^\s+$/u.test(source.slice(index, end)) &&
			(expected !== null || actual !== null) &&
			matchesRoleFilter(roleFilter, expected, actual)
		) {
			segments.push({
				startIndex: index,
				endIndex: end,
				expected,
				actual,
				expectedScope: treeRoles.rawScopes[index],
				actualScope: textMateRoles.rawScopes[index],
				classification: classifyRoles(expected, actual),
			});
		}
		index = end;
	}
	return segments;
}

async function createEngines() {
	verifyVendor();
	await Parser.init({
		locateFile() {
			return path.join(vendorDirectory, "web-tree-sitter.wasm");
		},
	});
	const language = await Language.load(path.join(vendorDirectory, "tree-sitter-roc.wasm"));
	const parser = new Parser();
	parser.setLanguage(language);
	const query = new Query(language, readFileSync(path.join(vendorDirectory, "highlights.scm"), "utf8"));

	const onigWasm = readFileSync(path.join(vendorDirectory, "vscode-oniguruma.wasm"));
	const onigArrayBuffer = onigWasm.buffer.slice(
		onigWasm.byteOffset,
		onigWasm.byteOffset + onigWasm.byteLength,
	);
	await loadWASM(onigArrayBuffer);
	const registry = new Registry({
		onigLib: Promise.resolve({
			createOnigScanner(patterns) {
				return new OnigScanner(patterns);
			},
			createOnigString(value) {
				return new OnigString(value);
			},
		}),
		loadGrammar: async (scopeName) => {
			if (scopeName !== "source.roc") return null;
			const grammarPath = path.join(repositoryRoot, "syntaxes", "roc.tmLanguage.json");
			return parseRawGrammar(readFileSync(grammarPath, "utf8"), grammarPath);
		},
	});
	const grammar = await registry.loadGrammar("source.roc");
	if (grammar === null) throw new Error("Unable to load source.roc TextMate grammar");

	return { parser, query, grammar };
}

export async function compareFile(filePath, engines, roleFilter = null) {
	const source = readFileSync(filePath, "utf8");
	const tree = engines.parser.parse(source);
	try {
		const captures = engines.query.captures(tree.rootNode);
		const treeRoles = assignTreeSitterRoles(source, captures);
		const textMateRoles = tokenizeTextMate(source, engines.grammar);
		const { masked, problems } = parseProblems(tree.rootNode, source.length);
		const segments = compareRoles(source, treeRoles, textMateRoles, masked, roleFilter);
		return { filePath, source, segments, problems };
	} finally {
		tree.delete();
	}
}

function emptyCounts() {
	return { exact: 0, coarse: 0, missing: 0, extra: 0, wrong: 0 };
}

function addCount(counts, classification) {
	counts[classification] += 1;
}

function displayPath(filePath) {
	return path.relative(repositoryRoot, filePath) || filePath;
}

function sourceName(filePath) {
	const relativePath = displayPath(filePath);
	const parts = relativePath.split(path.sep);
	return parts[0] === ".oracle-corpus" && parts.length > 1 ? parts[1] : "committed-corpus";
}

function diagnosticText(source, start, end) {
	const text = source.slice(start, end).replaceAll("\r", "\\r").replaceAll("\n", "\\n");
	return JSON.stringify(text.length > 80 ? `${text.slice(0, 77)}...` : text);
}

export function formatReport(results, maximumDiagnostics) {
	const counts = emptyCounts();
	const byRole = new Map();
	const bySource = new Map();
	const byFile = new Map();
	let problemCount = 0;
	let diagnosticCount = 0;
	const diagnostics = [];
	const addDiagnostic = (createDiagnostic) => {
		diagnosticCount += 1;
		if (diagnostics.length < maximumDiagnostics) diagnostics.push(createDiagnostic());
	};

	for (const result of results) {
		const lineStarts = sourceLineStarts(result.source);
		const fileCounts = emptyCounts();
		const source = sourceName(result.filePath);
		const sourceCounts = bySource.get(source) ?? emptyCounts();
		problemCount += result.problems.length;
		for (const problem of result.problems) {
			addDiagnostic(() =>
				`${displayPath(result.filePath)}:${problem.start.row + 1}:${problem.start.column + 1} parser ${problem.type}`,
			);
		}
		for (const segment of result.segments) {
			addCount(counts, segment.classification);
			addCount(fileCounts, segment.classification);
			addCount(sourceCounts, segment.classification);
			const role = segment.expected ?? segment.actual ?? "unscoped";
			const roleCounts = byRole.get(role) ?? emptyCounts();
			addCount(roleCounts, segment.classification);
			byRole.set(role, roleCounts);
			if (segment.classification !== "exact") {
				addDiagnostic(() => {
					const location = sourceLocation(lineStarts, segment.startIndex);
					return (
						`${displayPath(result.filePath)}:${location.line}:${location.column} ${segment.classification} ` +
						`${diagnosticText(result.source, segment.startIndex, segment.endIndex)} ` +
						`tree=${segment.expected ?? "none"} (${segment.expectedScope ?? "none"}) ` +
						`textmate=${segment.actual ?? "none"} (${segment.actualScope ?? "none"})`
					);
				});
			}
		}
		byFile.set(displayPath(result.filePath), fileCounts);
		bySource.set(source, sourceCounts);
	}

	const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
	const exactPercent = total === 0 ? 100 : (counts.exact / total) * 100;
	const compatiblePercent = total === 0 ? 100 : ((counts.exact + counts.coarse) / total) * 100;
	const lines = [
		`Highlighting oracle: ${results.length} files, ${total} compared spans, ${problemCount} parser problems`,
		`  exact ${counts.exact} (${exactPercent.toFixed(1)}%), coarse ${counts.coarse}, ` +
			`missing ${counts.missing}, extra ${counts.extra}, wrong ${counts.wrong}`,
		`  exact-or-coarse ${compatiblePercent.toFixed(1)}%`,
		"",
		"By source:",
	];
	for (const [source, sourceCounts] of [...bySource].sort(([left], [right]) =>
		left.localeCompare(right),
	)) {
		lines.push(
			`  ${source}: exact ${sourceCounts.exact}, coarse ${sourceCounts.coarse}, ` +
				`missing ${sourceCounts.missing}, extra ${sourceCounts.extra}, wrong ${sourceCounts.wrong}`,
		);
	}
	lines.push("", "Files with most non-exact spans:");
	for (const [file, fileCounts] of [...byFile]
		.sort(([, left], [, right]) => {
			const leftGaps = left.coarse + left.missing + left.extra + left.wrong;
			const rightGaps = right.coarse + right.missing + right.extra + right.wrong;
			return rightGaps - leftGaps;
		})
		.slice(0, 20)) {
		const gaps = fileCounts.coarse + fileCounts.missing + fileCounts.extra + fileCounts.wrong;
		lines.push(`  ${file}: ${gaps} non-exact spans`);
	}
	lines.push(
		"",
		"By expected role:",
	);
	for (const [role, roleCounts] of [...byRole].sort(([left], [right]) => left.localeCompare(right))) {
		lines.push(
			`  ${role}: exact ${roleCounts.exact}, coarse ${roleCounts.coarse}, ` +
				`missing ${roleCounts.missing}, extra ${roleCounts.extra}, wrong ${roleCounts.wrong}`,
		);
	}

	if (diagnosticCount > 0 && maximumDiagnostics > 0) {
		lines.push("", `Diagnostics (showing ${diagnostics.length} of ${diagnosticCount}):`);
		lines.push(...diagnostics.map((diagnostic) => `  ${diagnostic}`));
	}

	return { text: lines.join("\n"), counts, problemCount, diagnosticCount, diagnostics };
}

export async function runOracle({ files, roleFilter = null, maximumDiagnostics = 80 }) {
	const engines = await createEngines();
	try {
		const results = [];
		for (const file of files) results.push(await compareFile(file, engines, roleFilter));
		return { results, report: formatReport(results, maximumDiagnostics) };
	} finally {
		engines.query.delete();
		engines.parser.delete();
	}
}
