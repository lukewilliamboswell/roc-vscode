import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export function resolveVsix(root, requested) {
	if (requested) {
		const file = path.resolve(requested);
		if (!existsSync(file)) throw new Error(`${requested} does not exist`);
		return file;
	}
	const directory = path.join(root, "build");
	const candidates = existsSync(directory) ? readdirSync(directory).filter((name) => name.endsWith(".vsix")) : [];
	if (candidates.length === 0) throw new Error("no VSIX in build/; run `just build` or pass a path");
	if (candidates.length > 1) throw new Error(`several VSIX files in build/ (${candidates.join(", ")}); pass the one to test`);
	return path.join(directory, candidates[0]);
}

// The server under test is part of "what you fly": resolve it once, prove it
// speaks LSP, and record exactly which build ran.
export function resolveRoc(requested) {
	const candidate = requested || process.env.ROC_PATH || "roc";
	const located = candidate.includes(path.sep) ? path.resolve(candidate) : spawnSync("which", [candidate], { encoding: "utf8" }).stdout.trim();
	if (!located || !existsSync(located)) throw new Error(`Roc executable not found: ${candidate}. Pass --roc or set ROC_PATH.`);
	const help = spawnSync(located, ["experimental-lsp", "--help"], { encoding: "utf8", timeout: 30000 });
	if (help.status !== 0) throw new Error(`${located} does not support \`experimental-lsp\`; a recent nightly is required`);
	const version = spawnSync(located, ["version"], { encoding: "utf8", timeout: 30000 });
	return { path: located, version: (version.stdout || version.stderr || "unknown").trim().split("\n")[0] };
}

export function parseArguments(argv) {
	const options = { vscodeVersion: "stable", grep: null, keep: false, vsix: null, roc: null };
	for (let index = 0; index < argv.length; index += 1) {
		const argument = argv[index];
		if (argument === "--vscode-version") options.vscodeVersion = argv[++index];
		else if (argument === "--roc") options.roc = argv[++index];
		else if (argument === "--grep") options.grep = argv[++index];
		else if (argument === "--keep") options.keep = true;
		else if (argument === "--help") options.help = true;
		else if (argument.startsWith("--")) throw new Error(`unknown option ${argument}`);
		else if (options.vsix === null) options.vsix = argument;
		else throw new Error(`unexpected argument ${argument}`);
	}
	if (options.vscodeVersion === "minimum") options.vscodeVersion = null;
	return options;
}

// "^1.82.0" -> "1.82.0": the oldest VS Code the manifest promises to support.
export function minimumVscodeVersion(engine) {
	const match = /(\d+)\.(\d+)\.(\d+)/.exec(engine ?? "");
	if (!match) throw new Error(`cannot derive a minimum VS Code version from engines.vscode "${engine}"`);
	return `${match[1]}.${match[2]}.${match[3]}`;
}

// A throwaway profile: nothing from the developer's own VS Code can leak in, and
// the only extension present is the one installed from the VSIX.
export function createSandbox({ fixtureWorkspace, rocPath }) {
	const root = mkdtempSync(path.join(tmpdir(), "roc-vsix-"));
	const sandbox = { root, userData: path.join(root, "user-data"), extensions: path.join(root, "extensions"), workspace: path.join(root, "workspace"), reports: path.join(root, "reports") };
	for (const directory of [sandbox.extensions, sandbox.reports, path.join(sandbox.userData, "User")]) mkdirSync(directory, { recursive: true });
	cpSync(fixtureWorkspace, sandbox.workspace, { recursive: true });
	writeFileSync(path.join(sandbox.userData, "User", "settings.json"), `${JSON.stringify({
		"roc.path": rocPath,
		"editor.formatOnSave": false,
		"[roc]": { "editor.formatOnSave": false },
		"files.autoSave": "off",
		"telemetry.telemetryLevel": "off",
		"update.mode": "none",
		"extensions.autoUpdate": false,
		"extensions.autoCheckUpdates": false,
		"workbench.startupEditor": "none",
		"security.workspace.trust.enabled": false,
	}, null, "\t")}\n`);
	return sandbox;
}

export function installVsix({ cli, cliArguments, vsix, sandbox }) {
	const shared = [`--extensions-dir=${sandbox.extensions}`, `--user-data-dir=${sandbox.userData}`];
	execFileSync(cli, [...cliArguments, ...shared, "--install-extension", vsix, "--force"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
	const listed = execFileSync(cli, [...cliArguments, ...shared, "--list-extensions", "--show-versions"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
	return listed.split("\n").map((line) => line.trim()).filter((line) => /^[\w-]+\.[\w-]+@/.test(line));
}
