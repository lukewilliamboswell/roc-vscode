#!/usr/bin/env node
// Test what you fly: install a built VSIX into an isolated VS Code and drive it,
// through VS Code's public API, against a real Roc language server. Nothing here
// loads the extension from the source tree.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath, runTests } from "@vscode/test-electron";
import { formatInspection, inspectVsix } from "./vsix-lib.mjs";
import { createSandbox, installVsix, minimumVscodeVersion, parseArguments, resolveRoc, resolveVsix } from "./test-vsix-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const USAGE = `Usage: node scripts/test-vsix.mjs [VSIX] [options]

Installs the VSIX (default: the only one in build/) into a throwaway VS Code
profile and runs the integration battery in test/driver against it.

Options:
  --vscode-version V   VS Code to test with: stable (default), insiders, an
                       exact version, or "minimum" for the oldest version the
                       VSIX's engines.vscode promises to support
  --roc PATH|pinned    Roc executable (default: $ROC_PATH, then roc on PATH);
                       "pinned" fetches the nightly in test/roc-nightly.json
  --grep PATTERN       Only run tests whose title matches
  --keep               Keep the sandbox directory for inspection
`;

async function main() {
	const options = parseArguments(process.argv.slice(2));
	if (options.help) return console.log(USAGE);

	const vsix = resolveVsix(root, options.vsix);
	const sourceManifest = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
	const inspection = inspectVsix(vsix, { sourceManifest });
	console.log(formatInspection(inspection));
	if (inspection.problems.length > 0) throw new Error("the VSIX failed its artifact checks; not launching VS Code");

	// "pinned" downloads (once) the nightly named in test/roc-nightly.json.
	const pinned = options.roc === "pinned" ? execFileSync(process.execPath, [path.join(root, "scripts", "fetch-roc-nightly.mjs")], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }).trim() : null;
	const roc = resolveRoc(pinned ?? options.roc);
	console.log(`Roc       ${roc.path} (${roc.version})`);

	const version = options.vscodeVersion ?? minimumVscodeVersion(inspection.engine);
	const vscodeExecutablePath = await downloadAndUnzipVSCode({ version, cachePath: path.join(root, ".vscode-test") });
	const [cli, ...cliArguments] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);
	console.log(`VS Code   ${version} (${vscodeExecutablePath})`);

	const sandbox = createSandbox({ fixtureWorkspace: path.join(root, "test", "fixtures", "workspace"), rocPath: roc.path });
	try {
		const installed = installVsix({ cli, cliArguments, vsix, sandbox });
		console.log(`Installed ${installed.join(", ") || "(nothing)"}`);
		const expected = `${inspection.id}@${inspection.version}`.toLowerCase();
		if (installed.length !== 1 || installed[0].toLowerCase() !== expected) {
			throw new Error(`expected the sandbox to contain only ${expected}, found: ${installed.join(", ") || "nothing"}`);
		}

		await runTests({
			vscodeExecutablePath,
			// Only the driver is loaded from source; the product comes from the VSIX.
			extensionDevelopmentPath: path.join(root, "test", "driver"),
			extensionTestsPath: path.join(root, "test", "driver", "index.js"),
			launchArgs: [sandbox.workspace, `--extensions-dir=${sandbox.extensions}`, `--user-data-dir=${sandbox.userData}`, "--disable-workspace-trust", "--skip-welcome", "--skip-release-notes"],
			extensionTestsEnv: {
				ROC_VSIX_EXTENSION_ID: inspection.id,
				ROC_VSIX_EXTENSION_VERSION: inspection.version,
				ROC_VSIX_EXTENSIONS_DIR: sandbox.extensions,
				ROC_VSIX_ROC_PATH: roc.path,
				ROC_VSIX_WORKSPACE: sandbox.workspace,
				ROC_VSIX_GREP: options.grep ?? "",
			},
		});
		await assertServersExited(path.join(sandbox.reports, "server-pids.json"));
		console.log(`\nPassed against ${path.basename(vsix)} sha256:${inspection.sha256}`);
	} finally {
		if (options.keep) console.log(`Sandbox kept at ${sandbox.root}`);
		else rmSync(sandbox.root, { recursive: true, force: true, maxRetries: 3 });
	}
}

// The driver records the server it left running; once VS Code has gone, so must the server.
async function assertServersExited(report) {
	if (!existsSync(report)) return;
	const pids = JSON.parse(readFileSync(report, "utf8"));
	const alive = () => pids.filter((pid) => { try { process.kill(pid, 0); return true; } catch { return false; } });
	for (let waited = 0; alive().length > 0 && waited < 10000; waited += 250) await new Promise((resolve) => setTimeout(resolve, 250));
	if (alive().length > 0) {
		for (const pid of alive()) try { process.kill(pid, "SIGKILL"); } catch {}
		throw new Error(`the language server (pid ${pids.join(", ")}) outlived VS Code`);
	}
	console.log(`Language server ${pids.join(", ")} exited with VS Code`);
}

main().catch((error) => {
	console.error(`\ntest-vsix: ${error.message ?? error}`);
	process.exitCode = 1;
});
