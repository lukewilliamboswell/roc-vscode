import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import {
	assignTreeSitterRoles,
	classifyRoles,
	createEngines,
	normalizeTextMateScope,
	repositoryRoot,
	vendorDirectory,
} from "./highlighting-oracle-lib.mjs";

const { INITIAL } = createRequire(import.meta.url)(path.join(vendorDirectory, "vscode-textmate.js"));

export const auditCorpusDirectory = path.join(repositoryRoot, "syntaxes", "semantic-audit", "corpus");

// VS Code's built-in fallback from semantic token types to TextMate scopes, used
// whenever a theme has no semanticTokenColors rule for the type.
export const SEMANTIC_FALLBACK_SCOPES = {
	comment: ["comment"],
	string: ["string"],
	keyword: ["keyword.control"],
	number: ["constant.numeric"],
	operator: ["keyword.operator"],
	namespace: ["entity.name.namespace"],
	type: ["entity.name.type", "support.type"],
	typeParameter: ["entity.name.type", "support.type"],
	function: ["entity.name.function", "support.function"],
	method: ["entity.name.function.member", "support.function"],
	variable: ["variable.other.readwrite", "entity.name.variable"],
	parameter: ["variable.parameter"],
	property: ["variable.other.property"],
	enumMember: ["variable.other.enummember"],
};

// Semantic token types expressed in the oracle's role vocabulary.
const SEMANTIC_ROLES = {
	comment: "comment",
	string: "string",
	keyword: "keyword.control",
	number: "number",
	operator: "operator",
	namespace: "namespace",
	type: "type",
	typeParameter: "type.parameter",
	function: "function",
	method: "function.method",
	variable: "variable",
	parameter: "variable.parameter",
	property: "variable.other.member",
	enumMember: "constructor",
};

export function semanticRole(type) {
	return SEMANTIC_ROLES[type] ?? null;
}

// The oracle separates tag roles that a language server cannot tell apart from
// other names in the same family, so compare at the precision both sides have.
const ROLE_EQUIVALENTS = new Map([
	["type.enum.variant", "constructor"],
	["type.definition", "type"],
	["type.builtin", "type"],
	["number.integer", "number"],
	["number.float", "number"],
	["character", "string"],
	["boolean", "constructor"],
	["function.method", "function"],
	["function.builtin", "function"],
	["variable.other.member.in-typedef", "variable.other.member"],
]);

export function comparableRole(role) {
	if (role === null) return null;
	if (role.startsWith("keyword.control")) return "keyword.control";
	return ROLE_EQUIVALENTS.get(role) ?? role;
}

export function decodeSemanticTokens(data, legend, modifierLegend = []) {
	const tokens = [];
	let line = 0;
	let column = 0;
	for (let index = 0; index + 4 < data.length; index += 5) {
		if (data[index] > 0) {
			line += data[index];
			column = data[index + 1];
		} else column += data[index + 1];
		const modifiers = modifierLegend.filter((_, bit) => (data[index + 4] & (1 << bit)) !== 0);
		tokens.push({ line, column, length: data[index + 2], type: legend[data[index + 3]], modifiers });
	}
	return tokens;
}

/** Ask a real `roc experimental-lsp` for the semantic tokens of each file. */
export async function fetchSemanticTokens(rocPath, files, { settleMs = 1500, timeoutMs = 60_000 } = {}) {
	const server = spawn(rocPath, ["experimental-lsp"], { stdio: ["pipe", "pipe", "ignore"] });
	const spawned = new Promise((resolve, reject) => {
		server.once("spawn", resolve);
		server.once("error", (error) => reject(new Error(`Unable to start ${rocPath}: ${error.message}`)));
	});
	await spawned;

	let buffer = Buffer.alloc(0);
	const waiting = new Map();
	let nextId = 0;
	server.stdout.on("data", (chunk) => {
		buffer = Buffer.concat([buffer, chunk]);
		for (;;) {
			const headerEnd = buffer.indexOf("\r\n\r\n");
			if (headerEnd < 0) return;
			const length = Number(/Content-Length: (\d+)/i.exec(buffer.subarray(0, headerEnd).toString())[1]);
			if (buffer.length < headerEnd + 4 + length) return;
			const message = JSON.parse(buffer.subarray(headerEnd + 4, headerEnd + 4 + length).toString());
			buffer = buffer.subarray(headerEnd + 4 + length);
			if (message.id !== undefined && waiting.has(message.id)) {
				waiting.get(message.id)(message);
				waiting.delete(message.id);
			}
		}
	});
	const send = (message) => {
		const body = JSON.stringify({ jsonrpc: "2.0", ...message });
		server.stdin.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
	};
	const request = (method, params) =>
		new Promise((resolve, reject) => {
			nextId += 1;
			const timer = setTimeout(() => reject(new Error(`${method} timed out`)), timeoutMs);
			waiting.set(nextId, (message) => {
				clearTimeout(timer);
				resolve(message);
			});
			send({ id: nextId, method, params });
		});

	try {
		const initialized = await request("initialize", {
			processId: process.pid,
			rootUri: pathToFileURL(path.dirname(path.resolve(files[0]))).href,
			capabilities: {
				textDocument: {
					semanticTokens: {
						requests: { full: true },
						tokenTypes: [],
						tokenModifiers: [],
						formats: ["relative"],
					},
				},
			},
		});
		const provider = initialized.result?.capabilities?.semanticTokensProvider;
		const legend = provider?.legend?.tokenTypes;
		const modifierLegend = provider?.legend?.tokenModifiers ?? [];
		if (!Array.isArray(legend)) throw new Error("The server did not advertise a semantic token legend");
		send({ method: "initialized", params: {} });

		const results = new Map();
		for (const file of files) {
			const uri = pathToFileURL(path.resolve(file)).href;
			send({
				method: "textDocument/didOpen",
				params: { textDocument: { uri, languageId: "roc", version: 1, text: readFileSync(file, "utf8") } },
			});
			await new Promise((resolve) => setTimeout(resolve, settleMs));
			const response = await request("textDocument/semanticTokens/full", { textDocument: { uri } });
			if (response.error) throw new Error(`${file}: ${response.error.message}`);
			results.set(file, decodeSemanticTokens(response.result?.data ?? [], legend, modifierLegend));
		}
		return { legend, results };
	} finally {
		server.kill();
	}
}

function stripJsonComments(text) {
	return text
		.replace(/("(?:[^"\\]|\\.)*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (_, string) => string ?? "")
		.replace(/,(\s*[}\]])/g, "$1");
}

export function loadTheme(file) {
	const theme = JSON.parse(stripJsonComments(readFileSync(file, "utf8")));
	let rules = [];
	let semantic = {};
	let foreground = "default";
	if (theme.include) {
		({ rules, semantic, foreground } = loadTheme(path.join(path.dirname(file), theme.include)));
	}
	for (const rule of theme.tokenColors ?? []) {
		if (!rule.settings?.foreground) continue;
		const selectors = Array.isArray(rule.scope) ? rule.scope : (rule.scope ?? "").split(",");
		for (const selector of selectors) {
			rules.push({
				selector: selector.trim().split(/\s+/),
				foreground: rule.settings.foreground.toLowerCase(),
			});
		}
	}
	return {
		rules,
		semantic: { ...semantic, ...(theme.semanticTokenColors ?? {}) },
		foreground: (theme.colors?.["editor.foreground"] ?? foreground).toLowerCase(),
	};
}

const selects = (selector, scope) => scope === selector || scope.startsWith(`${selector}.`);

/** Foreground for a scope stack: deepest matching scope, then the most specific selector, then the later rule. */
export function textMateColor(theme, scopes) {
	let best = null;
	theme.rules.forEach((rule, order) => {
		const last = rule.selector[rule.selector.length - 1];
		for (let index = scopes.length - 1; index >= 0; index -= 1) {
			if (!selects(last, scopes[index])) continue;
			let ancestor = index - 1;
			let matched = true;
			for (let part = rule.selector.length - 2; part >= 0; part -= 1) {
				while (ancestor >= 0 && !selects(rule.selector[part], scopes[ancestor])) ancestor -= 1;
				if (ancestor < 0) {
					matched = false;
					break;
				}
				ancestor -= 1;
			}
			if (!matched) continue;
			const key = [index, last.length, rule.selector.length, order];
			const differs = best === null ? 0 : key.findIndex((value, n) => value !== best.key[n]);
			if (best === null || (differs >= 0 && key[differs] > best.key[differs])) {
				best = { key, foreground: rule.foreground };
			}
			break;
		}
	});
	return best?.foreground ?? theme.foreground;
}

/** Foreground VS Code gives a semantic token, or null when it would keep the TextMate colour. */
export function semanticColor(theme, type, scopeOverrides = {}, modifiers = []) {
	const rule = theme.semantic[type] ?? theme.semantic[`${type}:roc`];
	if (rule) return (typeof rule === "string" ? rule : (rule.foreground ?? theme.foreground)).toLowerCase();
	// A selector naming a modifier is more specific than the bare type.
	const modified = modifiers.flatMap((modifier) => scopeOverrides[`${type}.${modifier}`] ?? []);
	for (const scope of [...modified, ...(scopeOverrides[type] ?? []), ...(SEMANTIC_FALLBACK_SCOPES[type] ?? [])]) {
		const color = textMateColor(theme, ["source.roc", scope]);
		if (color !== theme.foreground) return color;
	}
	return null;
}

const STOCK_THEMES = {
	"Dark+": "theme-defaults/themes/dark_plus.json",
	"Dark Modern": "theme-defaults/themes/dark_modern.json",
	"Light+": "theme-defaults/themes/light_plus.json",
	"Light Modern": "theme-defaults/themes/light_modern.json",
	Monokai: "theme-monokai/themes/monokai-color-theme.json",
	"Solarized Dark": "theme-solarized-dark/themes/solarized-dark-color-theme.json",
	Abyss: "theme-abyss/themes/abyss-color-theme.json",
};

/** The extensions directory of the newest VS Code downloaded by the VSIX tests, if any. */
export function findVsCodeExtensionsDirectory() {
	const downloads = path.join(repositoryRoot, ".vscode-test");
	if (!existsSync(downloads)) return null;
	const version = (name) => name.match(/(\d+)\.(\d+)\.(\d+)/)?.slice(1).map(Number) ?? [0, 0, 0];
	const candidates = readdirSync(downloads)
		.filter((name) => existsSync(path.join(downloads, name, "resources/app/extensions/theme-defaults")))
		.sort((a, b) => {
			const [x, y] = [version(a), version(b)];
			return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
		});
	const newest = candidates.at(-1);
	return newest ? path.join(downloads, newest, "resources/app/extensions") : null;
}

export function loadStockThemes(extensionsDirectory) {
	const themes = {};
	for (const [name, relative] of Object.entries(STOCK_THEMES)) {
		const file = path.join(extensionsDirectory, relative);
		if (existsSync(file)) themes[name] = loadTheme(file);
	}
	return themes;
}

function tokenizeLines(source, grammar) {
	let ruleStack = INITIAL;
	return source.split("\n").map((line) => {
		const result = grammar.tokenizeLine(line.replace(/\r$/, ""), ruleStack);
		ruleStack = result.ruleStack;
		return result.tokens;
	});
}

function lineStarts(source) {
	const starts = [0];
	for (let index = 0; index < source.length; index += 1) if (source[index] === "\n") starts.push(index + 1);
	return starts;
}

/**
 * Compare the language server's semantic tokens with the TextMate grammar and
 * the tree-sitter oracle, span by span.
 */
export async function audit({ rocPath, files, themes = {}, scopeOverrides = {} }) {
	const engines = await createEngines();
	const { legend, results } = await fetchSemanticTokens(rocPath, files);

	const pairs = new Map();
	const verdicts = { agree: 0, "server-differs": 0, "grammar-differs": 0, "oracle-differs": 0, "all-differ": 0 };
	const disagreements = [];
	let spans = 0;
	let jumps = 0;

	for (const file of files) {
		const source = readFileSync(file, "utf8");
		const lines = source.split("\n");
		const starts = lineStarts(source);
		const textMateLines = tokenizeLines(source, engines.grammar);
		const tree = engines.parser.parse(source);
		let treeRoles;
		try {
			treeRoles = assignTreeSitterRoles(source, engines.query.captures(tree.rootNode)).roles;
		} finally {
			tree.delete();
		}

		for (const token of results.get(file)) {
			for (const textMate of textMateLines[token.line] ?? []) {
				const start = Math.max(textMate.startIndex, token.column);
				const end = Math.min(textMate.endIndex, token.column + token.length);
				if (start >= end) continue;
				const text = lines[token.line].slice(start, end);
				if (text.trim() === "") continue;
				spans += 1;

				const scope = textMate.scopes.length > 1 ? textMate.scopes.at(-1) : "(none)";
				const changed = Object.entries(themes)
					.filter(([, theme]) => {
						const color = semanticColor(theme, token.type, scopeOverrides, token.modifiers);
						return color !== null && color !== textMateColor(theme, textMate.scopes);
					})
					.map(([name]) => name);
				if (changed.length > 0) jumps += 1;

				const key = `${token.type} <- ${scope}`;
				const entry = pairs.get(key) ?? { type: token.type, scope, count: 0, themes: new Set(), examples: [] };
				entry.count += 1;
				for (const name of changed) entry.themes.add(name);
				const where = `${path.relative(repositoryRoot, file)}:${token.line + 1}`;
				if (entry.examples.length < 3 && !entry.examples.some((example) => example.text === text)) {
					entry.examples.push({ text, where });
				}
				pairs.set(key, entry);

				let textMateRole = null;
				for (let index = textMate.scopes.length - 1; index >= 0 && textMateRole === null; index -= 1) {
					textMateRole = normalizeTextMateScope(textMate.scopes[index]);
				}
				const roles = {
					server: comparableRole(semanticRole(token.type)),
					grammar: comparableRole(textMateRole),
					oracle: comparableRole(treeRoles[starts[token.line] + start]),
				};
				const same = (a, b) => ["exact", "coarse"].includes(classifyRoles(a, b)) && a !== null && b !== null;
				const [sg, so, go] = [same(roles.server, roles.grammar), same(roles.server, roles.oracle), same(roles.grammar, roles.oracle)];
				let verdict = "all-differ";
				if (sg && so) verdict = "agree";
				else if (go) verdict = "server-differs";
				else if (so) verdict = "grammar-differs";
				else if (sg) verdict = "oracle-differs";
				verdicts[verdict] += 1;
				if (verdict !== "agree") disagreements.push({ verdict, text, where, ...roles });
			}
		}
	}

	return {
		legend,
		spans,
		jumps,
		themeNames: Object.keys(themes),
		verdicts,
		disagreements,
		pairs: [...pairs.values()]
			.map((entry) => ({ ...entry, themes: [...entry.themes] }))
			.sort((a, b) => (b.themes.length > 0) - (a.themes.length > 0) || b.count - a.count),
	};
}

export function formatAudit(report, { maximumRows = 60, baseline = null } = {}) {
	const out = [];
	const percent = (n) => (report.spans === 0 ? "0" : ((100 * n) / report.spans).toFixed(1));
	out.push(`Legend: ${report.legend.join(", ")}`);
	const unused = report.legend.filter((type) => !report.pairs.some((pair) => pair.type === type));
	if (unused.length > 0) out.push(`Never emitted: ${unused.join(", ")}`);
	out.push("");
	out.push(`Spans covered by semantic tokens: ${report.spans}`);
	if (report.themeNames.length > 0) {
		out.push(`Colour changes when semantic tokens arrive: ${report.jumps} (${percent(report.jumps)}%) across ${report.themeNames.join(", ")}`);
	} else out.push("Colour analysis skipped: no VS Code themes found (run the VSIX tests once, or pass --themes).");
	if (baseline) {
		out.push(`Baseline: ${baseline.jumps} colour changes of ${baseline.spans} spans; server-differs ${baseline.verdicts["server-differs"]}`);
	}
	out.push("");
	out.push("Three-way roles (server / TextMate grammar / tree-sitter oracle):");
	for (const [name, count] of Object.entries(report.verdicts)) out.push(`  ${name.padEnd(16)} ${String(count).padStart(6)}  ${percent(count)}%`);
	out.push("");
	out.push("Semantic type <- TextMate scope");
	for (const pair of report.pairs.slice(0, maximumRows)) {
		out.push(`  ${pair.themes.length > 0 ? "JUMP" : "ok  "} ${String(pair.count).padStart(5)}  ${pair.type} <- ${pair.scope}`);
		if (pair.themes.length > 0) out.push(`              themes: ${pair.themes.join(", ")}`);
		out.push(`              e.g. ${pair.examples.map((example) => `${JSON.stringify(example.text)} ${example.where}`).join(" | ")}`);
	}

	const grouped = new Map();
	for (const item of report.disagreements) {
		const key = `${item.verdict}: server=${item.server} grammar=${item.grammar} oracle=${item.oracle}`;
		const entry = grouped.get(key) ?? { count: 0, example: item };
		entry.count += 1;
		grouped.set(key, entry);
	}
	out.push("");
	out.push("Role disagreements");
	for (const [key, entry] of [...grouped.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, maximumRows)) {
		out.push(`  ${String(entry.count).padStart(5)}  ${key}   e.g. ${JSON.stringify(entry.example.text)} ${entry.example.where}`);
	}
	return out.join("\n");
}
