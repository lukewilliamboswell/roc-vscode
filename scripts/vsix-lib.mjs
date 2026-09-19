import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { inflateRawSync } from "node:zlib";

// A VSIX is a zip archive. Reading it here, rather than trusting the source
// tree, is the point: these checks describe the bytes that will be installed.
export function readZip(buffer) {
	let end = buffer.length - 22;
	while (end >= 0 && buffer.readUInt32LE(end) !== 0x06054b50) end -= 1;
	if (end < 0) throw new Error("not a zip archive: end of central directory not found");
	const count = buffer.readUInt16LE(end + 10);
	let offset = buffer.readUInt32LE(end + 16);
	const entries = new Map();
	for (let index = 0; index < count; index += 1) {
		if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error("corrupt zip central directory");
		const method = buffer.readUInt16LE(offset + 10);
		const compressedSize = buffer.readUInt32LE(offset + 20);
		const size = buffer.readUInt32LE(offset + 24);
		const nameLength = buffer.readUInt16LE(offset + 28);
		const extraLength = buffer.readUInt16LE(offset + 30);
		const commentLength = buffer.readUInt16LE(offset + 32);
		const localOffset = buffer.readUInt32LE(offset + 42);
		const name = buffer.toString("utf8", offset + 46, offset + 46 + nameLength);
		entries.set(name, { name, method, compressedSize, size, localOffset });
		offset += 46 + nameLength + extraLength + commentLength;
	}
	return {
		names: [...entries.keys()].sort(),
		has: (name) => entries.has(name),
		size: (name) => entries.get(name)?.size ?? null,
		read(name) {
			const entry = entries.get(name);
			if (!entry) throw new Error(`${name} is not in the archive`);
			const start = entry.localOffset + 30 + buffer.readUInt16LE(entry.localOffset + 26) + buffer.readUInt16LE(entry.localOffset + 28);
			const data = buffer.subarray(start, start + entry.compressedSize);
			if (entry.method === 0) return Buffer.from(data);
			if (entry.method === 8) return inflateRawSync(data);
			throw new Error(`${name} uses unsupported zip compression method ${entry.method}`);
		},
	};
}

// vsce normalises the names of these files, so match them loosely.
const REQUIRED = [
	["extension/package.json", /^extension\/package\.json$/],
	["a README", /^extension\/readme\.md$/i],
	["a changelog", /^extension\/changelog\.md$/i],
	["a licence", /^extension\/licen[cs]e(?:\.txt|\.md)?$/i],
	["extension.vsixmanifest", /^extension\.vsixmanifest$/],
];

// Anything matching these has leaked out of the development tree.
const FORBIDDEN = [
	/^extension\/(?:src|scripts|test|benchmarks|node_modules|\.github|\.vscode-test|\.oracle-corpus)\//,
	/^extension\/syntaxes\/(?:tests|oracle|snapshots)\//,
	/^extension\/syntaxes\/skipped-tests\.json$/,
	/\.(?:ts|map|roc|nix|vsix)$/,
	/^extension\/(?:Justfile|flake\.lock|tsconfig\.json|biome\.json|package-lock\.json)$/,
];

const inArchive = (relative) => path.posix.join("extension", path.posix.normalize(relative.replaceAll("\\", "/")));

export function inspectVsix(file, { expectedVersion = null, sourceManifest = null } = {}) {
	const buffer = readFileSync(file);
	const problems = [];
	const report = { file, bytes: buffer.length, sha256: createHash("sha256").update(buffer).digest("hex"), problems };
	if (buffer.length === 0) {
		problems.push("the VSIX is empty");
		return report;
	}
	const zip = readZip(buffer);
	report.files = zip.names;
	for (const [what, pattern] of REQUIRED) if (!zip.names.some((name) => pattern.test(name))) problems.push(`missing ${what}`);
	for (const name of zip.names) if (FORBIDDEN.some((pattern) => pattern.test(name))) problems.push(`development file packaged: ${name}`);
	if (!zip.has("extension/package.json")) return report;

	const manifest = JSON.parse(zip.read("extension/package.json").toString("utf8"));
	report.id = `${manifest.publisher}.${manifest.name}`;
	report.version = manifest.version;
	report.engine = manifest.engines?.vscode ?? null;

	const requireFile = (relative, what) => {
		if (typeof relative !== "string" || relative === "") return problems.push(`${what} is not declared`);
		const name = inArchive(relative);
		// `main` may omit the .js extension.
		if (!zip.has(name) && !(what === "main entry point" && zip.has(`${name}.js`))) problems.push(`${what} ${relative} is not in the VSIX`);
		else if ((zip.size(name) ?? zip.size(`${name}.js`)) === 0) problems.push(`${what} ${relative} is empty`);
		return null;
	};
	requireFile(manifest.main, "main entry point");
	requireFile(manifest.icon, "icon");
	for (const grammar of manifest.contributes?.grammars ?? []) requireFile(grammar.path, `grammar ${grammar.scopeName}`);
	for (const language of manifest.contributes?.languages ?? []) {
		requireFile(language.configuration, `language configuration for ${language.id}`);
		for (const icon of Object.values(language.icon ?? {})) requireFile(icon, `icon for ${language.id}`);
	}
	for (const grammar of manifest.contributes?.grammars ?? []) {
		const name = inArchive(grammar.path);
		if (!zip.has(name)) continue;
		try {
			const parsed = JSON.parse(zip.read(name).toString("utf8"));
			if (parsed.scopeName !== grammar.scopeName) problems.push(`grammar ${grammar.path} declares ${parsed.scopeName}, manifest says ${grammar.scopeName}`);
		} catch (error) {
			problems.push(`grammar ${grammar.path} is not valid JSON: ${error.message}`);
		}
	}

	if (!manifest.engines?.vscode) problems.push("engines.vscode is not declared");
	if (expectedVersion !== null && manifest.version !== expectedVersion) problems.push(`VSIX contains version ${manifest.version}, expected ${expectedVersion}`);
	const named = /-(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\.vsix$/.exec(path.basename(file));
	if (named && named[1] !== manifest.version) problems.push(`file name says ${named[1]} but the VSIX contains ${manifest.version}`);
	if (sourceManifest) {
		for (const key of ["name", "publisher", "version", "main"]) {
			if (sourceManifest[key] !== manifest[key]) problems.push(`packaged ${key} "${manifest[key]}" differs from the source manifest "${sourceManifest[key]}"; the VSIX is stale`);
		}
	}
	const vsixManifest = zip.has("extension.vsixmanifest") ? zip.read("extension.vsixmanifest").toString("utf8") : "";
	if (vsixManifest && !vsixManifest.includes(`Version="${manifest.version}"`)) problems.push("extension.vsixmanifest version differs from package.json");
	return report;
}

export function formatInspection(report) {
	const lines = [
		`VSIX      ${report.file}`,
		`SHA-256   ${report.sha256}`,
		`Size      ${report.bytes} bytes${report.files ? `, ${report.files.length} files` : ""}`,
	];
	if (report.id) lines.push(`Extension ${report.id} ${report.version} (VS Code ${report.engine})`);
	if (report.problems.length === 0) lines.push("Artifact checks passed");
	else lines.push("", `${report.problems.length} artifact problems:`, ...report.problems.map((problem) => `  - ${problem}`));
	return lines.join("\n");
}
