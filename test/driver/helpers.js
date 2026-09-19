const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const vscode = require("vscode");

const env = (name) => {
	const value = process.env[name];
	assert.ok(value, `${name} must be set by scripts/test-vsix.mjs`);
	return value;
};

const extensionId = () => env("ROC_VSIX_EXTENSION_ID");
const workspaceRoot = () => env("ROC_VSIX_WORKSPACE");
const product = () => vscode.extensions.getExtension(extensionId());
const fixtureUri = (name) => vscode.Uri.file(path.join(workspaceRoot(), name));

async function waitFor(probe, { timeout = 30000, interval = 100, message = "condition" } = {}) {
	const deadline = Date.now() + timeout;
	let last;
	for (;;) {
		last = await probe();
		if (last) return last;
		if (Date.now() > deadline) throw new Error(`timed out after ${timeout} ms waiting for ${message}`);
		await new Promise((resolve) => setTimeout(resolve, interval));
	}
}

async function openFixture(name) {
	const document = await vscode.workspace.openTextDocument(fixtureUri(name));
	const editor = await vscode.window.showTextDocument(document, { preview: false });
	return { document, editor };
}

// Write a scratch file into the sandbox workspace and open it.
async function openScratch(name, text) {
	fs.writeFileSync(path.join(workspaceRoot(), name), text);
	return openFixture(name);
}

// Every suite needs the product running. If it cannot activate, say why once and
// fail the remaining suites immediately instead of timing each of them out.
let activationFailure = null;
async function activated() {
	if (activationFailure) throw activationFailure;
	const extension = product();
	assert.ok(extension, `${extensionId()} is not installed`);
	try {
		// activate() resolves when the extension is ready, and rejects with its real error.
		await Promise.race([
			extension.activate(),
			new Promise((_, reject) => setTimeout(() => reject(new Error("activation did not finish within 60 s")), 60000)),
		]);
	} catch (error) {
		activationFailure = new Error(`the Roc extension failed to activate on VS Code ${vscode.version}: ${error.message}`);
		throw activationFailure;
	}
	await serverStarted();
	return extension;
}

// Activation resolves even when the server could not be started (the extension
// reports that to the user instead). Nothing else can work without a server, so
// establish it once and let every later suite fail at once rather than time out.
let serverFailure = null;
let serverSeen = false;
async function serverStarted() {
	if (serverFailure) throw serverFailure;
	if (serverSeen || serverPids() === null) return;
	try {
		await waitFor(() => serverPids().length > 0, { timeout: 30000, message: "the language server process" });
		serverSeen = true;
	} catch {
		serverFailure = new Error(`the Roc extension activated on VS Code ${vscode.version} but did not start a language server`);
		throw serverFailure;
	}
}

// The position of `needle` in the document; `within` moves inside the match.
function positionOf(document, needle, { occurrence = 0, within = 0 } = {}) {
	const text = document.getText();
	let index = -1;
	for (let count = 0; count <= occurrence; count += 1) {
		index = text.indexOf(needle, index + 1);
		assert.notEqual(index, -1, `"${needle}" (occurrence ${occurrence}) is not in ${path.basename(document.fileName)}`);
	}
	return document.positionAt(index + within);
}

// Language servers started by this window are children of this extension host.
function serverPids() {
	if (process.platform === "win32") return null;
	const table = execFileSync("ps", ["-eo", "pid=,ppid=,args="], { encoding: "utf8" });
	return table.split("\n").map((line) => /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(line)).filter(Boolean)
		.filter(([, , ppid, args]) => Number(ppid) === process.pid && args.includes("experimental-lsp"))
		.map(([, pid]) => Number(pid));
}

const isAlive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };

// Requests sent while the server is still analysing may come back empty; ask until it answers.
function eventually(command, ...args) {
	return waitFor(async () => {
		const result = await vscode.commands.executeCommand(command, ...args);
		if (Array.isArray(result)) return result.length > 0 ? result : null;
		return result ?? null;
	}, { message: `${command} to return a result` });
}

const errorsFor = (uri) => vscode.languages.getDiagnostics(uri).filter((item) => item.severity === vscode.DiagnosticSeverity.Error);

function assertRange(range, document, what) {
	assert.ok(range instanceof vscode.Range, `${what} should have a vscode.Range`);
	assert.ok(document.validateRange(range).isEqual(range), `${what} range ${JSON.stringify(range)} lies outside the document`);
}

async function replaceAll(editor, text) {
	const document = editor.document;
	const whole = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
	assert.ok(await editor.edit((builder) => builder.replace(whole, text)), "the edit should be applied");
}

// Closing a dirty editor normally opens a save prompt, which would hang the run.
async function closeAllEditors() {
	for (let guard = 0; vscode.window.activeTextEditor && guard < 20; guard += 1) {
		await vscode.commands.executeCommand("workbench.action.revertAndCloseActiveEditor");
	}
}

module.exports = { activated, assertRange, closeAllEditors, env, errorsFor, eventually, extensionId, fixtureUri, isAlive, openFixture, openScratch, positionOf, product, replaceAll, serverPids, waitFor, workspaceRoot };
