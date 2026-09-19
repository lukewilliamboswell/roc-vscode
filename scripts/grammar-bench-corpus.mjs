import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

function hashText(text) {
	return createHash("sha256").update(text).digest("hex");
}

function lineCount(text) {
	if (text.length === 0) return 0;
	return text.endsWith("\n") ? text.split("\n").length - 1 : text.split("\n").length;
}

function entry(name, source, text, filePath = null) {
	return Object.freeze({
		name,
		source,
		path: filePath,
		text,
		bytes: Buffer.byteLength(text),
		lines: lineCount(text),
		sha256: hashText(text),
	});
}

export function featureCorpus({ repositoryRoot = process.cwd() } = {}) {
	return projectCorpus("syntaxes/tests", { repositoryRoot }).map((item) =>
		Object.freeze({ ...item, source: "feature" }),
	);
}

export function stressDocument({ blocks = 1000 } = {}) {
	if (!Number.isInteger(blocks) || blocks < 1) throw new Error("stress blocks must be a positive integer");
	const sections = ['app [main!] { pf: platform "platform/main.roc" }\n'];
	for (let index = 0; index < blocks; index += 1) {
		sections.push(
			`render_${index} : { name : Str, count : U64 } -> Str\n` +
				`render_${index} = |model| if model.count > ${index} "${index}: $\{model.name}" else "none"\n`,
		);
	}
	return entry(`stress/generated-${blocks}.roc`, "stress", sections.join(""));
}

export function stressCorpus({ blocks = 1000 } = {}) {
	const width = Math.max(1000, blocks * 10);
	const depth = Math.max(50, Math.min(blocks, 2000));
	return [
		stressDocument({ blocks }),
		entry("stress/long-line.roc", "stress", `value = "${"x".repeat(width)}"\n`),
		entry("stress/unterminated-string.roc", "stress", `value = "${"x".repeat(width)}\n`),
		entry("stress/repeated-operators.roc", "stress", `value = 1 ${"|> identity ".repeat(blocks)}\n`),
		entry("stress/deep-nesting.roc", "stress", `value = ${"(".repeat(depth)}0${")".repeat(depth)}\n`),
		entry(
			"stress/near-matching-identifiers.roc",
			"stress",
			`${Array.from({ length: blocks }, (_, index) => `keywordish_${index} = platformish_${index}`).join("\n")}\n`,
		),
	];
}

function walkRocFiles(directory, files = []) {
	for (const item of readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
		a.name.localeCompare(b.name),
	)) {
		const itemPath = path.join(directory, item.name);
		if (item.isDirectory()) walkRocFiles(itemPath, files);
		else if (item.isFile() && item.name.endsWith(".roc")) files.push(itemPath);
	}
	return files;
}

export function projectCorpus(directory, { repositoryRoot = process.cwd() } = {}) {
	const absoluteDirectory = path.resolve(repositoryRoot, directory);
	if (!existsSync(absoluteDirectory) || !statSync(absoluteDirectory).isDirectory()) {
		throw new Error(`project corpus directory does not exist: ${absoluteDirectory}`);
	}
	return walkRocFiles(absoluteDirectory).map((filePath) => {
		const text = readFileSync(filePath, "utf8");
		const relative = path.relative(repositoryRoot, filePath).split(path.sep).join("/");
		return entry(relative, "project", text, filePath);
	});
}

export function corpusMetadata(entries) {
	const sorted = [...entries].sort((a, b) => a.name.localeCompare(b.name));
	const digest = createHash("sha256");
	for (const item of sorted) digest.update(`${item.name}\0${item.sha256}\n`);
	return {
		version: 1,
		sha256: digest.digest("hex"),
		files: sorted.length,
		bytes: sorted.reduce((sum, item) => sum + item.bytes, 0),
		lines: sorted.reduce((sum, item) => sum + item.lines, 0),
		sources: Object.fromEntries(
			[...new Set(sorted.map((item) => item.source))].map((source) => [
				source,
				sorted.filter((item) => item.source === source).length,
			]),
		),
		entries: sorted.map(({ name, source, bytes, lines, sha256 }) => ({
			name,
			source,
			bytes,
			lines,
			sha256,
		})),
	};
}
