import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { deflateRawSync } from "node:zlib";
import { minimumVscodeVersion, parseArguments, resolveVsix } from "./test-vsix-lib.mjs";
import { formatInspection, inspectVsix, readZip } from "./vsix-lib.mjs";

// A minimal zip writer, so the reader is tested against archives built here
// (stored and deflated) rather than against itself.
function zip(files) {
	const locals = [];
	const central = [];
	let offset = 0;
	for (const [name, { text, store = false }] of Object.entries(files)) {
		const raw = Buffer.from(text);
		const data = store ? raw : deflateRawSync(raw);
		const nameBuffer = Buffer.from(name);
		const local = Buffer.alloc(30);
		local.writeUInt32LE(0x04034b50, 0);
		local.writeUInt16LE(store ? 0 : 8, 8);
		local.writeUInt32LE(data.length, 18);
		local.writeUInt32LE(raw.length, 22);
		local.writeUInt16LE(nameBuffer.length, 26);
		const header = Buffer.alloc(46);
		header.writeUInt32LE(0x02014b50, 0);
		header.writeUInt16LE(store ? 0 : 8, 10);
		header.writeUInt32LE(data.length, 20);
		header.writeUInt32LE(raw.length, 24);
		header.writeUInt16LE(nameBuffer.length, 28);
		header.writeUInt32LE(offset, 42);
		locals.push(local, nameBuffer, data);
		central.push(header, nameBuffer);
		offset += 30 + nameBuffer.length + data.length;
	}
	const directory = Buffer.concat(central);
	const end = Buffer.alloc(22);
	end.writeUInt32LE(0x06054b50, 0);
	end.writeUInt16LE(Object.keys(files).length, 8);
	end.writeUInt16LE(Object.keys(files).length, 10);
	end.writeUInt32LE(directory.length, 12);
	end.writeUInt32LE(offset, 16);
	return Buffer.concat([...locals, directory, end]);
}

const manifest = (overrides = {}) => ({
	name: "roc-vscode", publisher: "hannes", version: "1.2.3", main: "./dist/extension.js", icon: "./images/logo.png", engines: { vscode: "^1.82.0" },
	contributes: { languages: [{ id: "roc", configuration: "./language-configuration.json" }], grammars: [{ language: "roc", scopeName: "source.roc", path: "./syntaxes/roc.tmLanguage.json" }] },
	...overrides,
});

function vsix(overrides = {}, { name = "roc-vscode-1.2.3.vsix", manifestOverrides = {} } = {}) {
	const files = {
		"extension.vsixmanifest": { text: '<Identity Version="1.2.3" />' },
		"extension/package.json": { text: JSON.stringify(manifest(manifestOverrides)) },
		"extension/readme.md": { text: "# Roc" },
		"extension/changelog.md": { text: "# Changes" },
		"extension/LICENCE.txt": { text: "UPL", store: true },
		"extension/dist/extension.js": { text: "module.exports = {}" },
		"extension/images/logo.png": { text: "png" },
		"extension/language-configuration.json": { text: "{}" },
		"extension/syntaxes/roc.tmLanguage.json": { text: JSON.stringify({ scopeName: "source.roc" }) },
		...overrides,
	};
	for (const [key, value] of Object.entries(files)) if (value === null) delete files[key];
	const file = path.join(mkdtempSync(path.join(tmpdir(), "roc-vsix-test-")), name);
	writeFileSync(file, zip(files));
	return file;
}

test("the zip reader reads stored and deflated entries", () => {
	const archive = readZip(zip({ "a.txt": { text: "stored", store: true }, "dir/b.txt": { text: "deflated ".repeat(50) } }));
	assert.deepEqual(archive.names, ["a.txt", "dir/b.txt"]);
	assert.equal(archive.read("a.txt").toString(), "stored");
	assert.equal(archive.read("dir/b.txt").toString(), "deflated ".repeat(50));
	assert.throws(() => readZip(Buffer.from("not a zip")), /not a zip/);
});

test("a well-formed VSIX passes and reports its identity and digest", () => {
	const report = inspectVsix(vsix(), { sourceManifest: manifest() });
	assert.deepEqual(report.problems, []);
	assert.equal(report.id, "hannes.roc-vscode");
	assert.equal(report.version, "1.2.3");
	assert.match(report.sha256, /^[0-9a-f]{64}$/);
	assert.match(formatInspection(report), /Artifact checks passed/);
});

test("missing declared files are reported", () => {
	const problems = (overrides) => inspectVsix(vsix(overrides)).problems.join("\n");
	assert.match(problems({ "extension/dist/extension.js": null }), /main entry point .* is not in the VSIX/);
	assert.match(problems({ "extension/dist/extension.js": { text: "" } }), /main entry point .* is empty/);
	assert.match(problems({ "extension/syntaxes/roc.tmLanguage.json": null }), /grammar source\.roc/);
	assert.match(problems({ "extension/language-configuration.json": null }), /language configuration for roc/);
	assert.match(problems({ "extension/images/logo.png": null }), /icon/);
	assert.match(problems({ "extension/readme.md": null }), /missing a README/);
	assert.match(problems({ "extension/LICENCE.txt": null }), /missing a licence/);
	assert.match(problems({ "extension/syntaxes/roc.tmLanguage.json": { text: "{" } }), /not valid JSON/);
});

test("leaked development files are reported", () => {
	for (const leaked of ["extension/src/extension.ts", "extension/syntaxes/tests/a.roc", "extension/syntaxes/skipped-tests.json", "extension/scripts/x.mjs", "extension/node_modules/x/index.js", "extension/dist/extension.js.map"]) {
		assert.match(inspectVsix(vsix({ [leaked]: { text: "x" } })).problems.join("\n"), /development file packaged/, leaked);
	}
});

test("version mismatches and stale artifacts are reported", () => {
	assert.match(inspectVsix(vsix({}, { name: "roc-vscode-9.9.9.vsix" })).problems.join("\n"), /file name says 9\.9\.9/);
	assert.match(inspectVsix(vsix(), { expectedVersion: "2.0.0" }).problems.join("\n"), /expected 2\.0\.0/);
	assert.match(inspectVsix(vsix(), { sourceManifest: manifest({ version: "1.2.4" }) }).problems.join("\n"), /stale/);
	assert.match(inspectVsix(vsix({ "extension.vsixmanifest": { text: '<Identity Version="0.0.1" />' } })).problems.join("\n"), /vsixmanifest version differs/);
});

test("arguments and the minimum VS Code version are derived predictably", () => {
	assert.deepEqual(parseArguments(["a.vsix", "--vscode-version", "1.90.0", "--grep", "hover", "--keep"]), { vscodeVersion: "1.90.0", grep: "hover", keep: true, vsix: "a.vsix", roc: null });
	assert.equal(parseArguments(["--vscode-version", "minimum"]).vscodeVersion, null);
	assert.throws(() => parseArguments(["--nope"]), /unknown option/);
	assert.equal(minimumVscodeVersion("^1.82.0"), "1.82.0");
	assert.throws(() => minimumVscodeVersion("*"), /cannot derive/);
});

test("the VSIX to test must be unambiguous", () => {
	const root = mkdtempSync(path.join(tmpdir(), "roc-vsix-root-"));
	assert.throws(() => resolveVsix(root), /no VSIX in build/);
	assert.throws(() => resolveVsix(root, "missing.vsix"), /does not exist/);
	const file = vsix();
	assert.equal(resolveVsix(root, file), file);
});
