const assert = require("node:assert/strict");
const path = require("node:path");
const vscode = require("vscode");
const { activated, closeAllEditors, env, openFixture, product, serverPids, waitFor } = require("../helpers");

describe("installed extension", () => {
	after(closeAllEditors);

	it("is the VSIX under test, installed into the sandbox", () => {
		const extension = product();
		assert.ok(extension, `${env("ROC_VSIX_EXTENSION_ID")} is not installed`);
		assert.equal(extension.packageJSON.version, env("ROC_VSIX_EXTENSION_VERSION"));
		const relative = path.relative(env("ROC_VSIX_EXTENSIONS_DIR"), extension.extensionPath);
		assert.ok(!relative.startsWith(".."), `loaded from ${extension.extensionPath}, not from the sandbox's installed extensions`);
	});

	it("ships its bundle but not its sources", () => {
		const fs = require("node:fs");
		const root = product().extensionPath;
		assert.ok(fs.existsSync(path.join(root, "dist", "extension.js")));
		for (const leaked of ["src", "scripts", "test", "node_modules"]) assert.ok(!fs.existsSync(path.join(root, leaked)), `${leaked}/ was installed`);
	});

	it("stays inactive until a Roc document is opened", () => {
		assert.equal(product().isActive, false);
		assert.deepEqual(serverPids() ?? [], []);
	});

	it("recognises .roc files and activates", async () => {
		const { document } = await openFixture("Geometry.roc");
		assert.equal(document.languageId, "roc");
		// Opening the document must be enough: wait for VS Code to activate the extension by itself.
		await waitFor(() => product().isActive, { timeout: 20000, message: "VS Code to activate the extension for a .roc file" });
		assert.equal(product().isActive, true);
	});

	it("starts exactly one language server, using the configured roc.path", async function () {
		if (serverPids() === null) this.skip();
		assert.equal(vscode.workspace.getConfiguration("roc").get("path"), env("ROC_VSIX_ROC_PATH"));
		await activated();
		assert.equal(serverPids().length, 1);
	});

	it("does not start a second server for a second document", async function () {
		if (serverPids() === null) this.skip();
		const before = serverPids();
		await openFixture("Palette.roc");
		await new Promise((resolve) => setTimeout(resolve, 1000));
		assert.deepEqual(serverPids(), before);
	});

	it("contributes the restart command", async () => {
		assert.ok((await vscode.commands.getCommands(true)).includes("roc.restart"));
	});

	it("applies the packaged language configuration", async () => {
		const { document, editor } = await openFixture("Palette.roc");
		const line = document.lineAt(0).text;
		// Editor commands act on the focused editor and apply their edit asynchronously.
		await waitFor(() => vscode.window.activeTextEditor?.document === document, { message: "the fixture's editor to have focus" });
		editor.selection = new vscode.Selection(0, 0, 0, 0);
		await vscode.commands.executeCommand("editor.action.commentLine");
		await waitFor(() => document.lineAt(0).text !== line, { timeout: 5000, message: "Toggle Line Comment to edit the line" });
		assert.equal(document.lineAt(0).text, `# ${line}`);
		await vscode.commands.executeCommand("editor.action.commentLine");
		await waitFor(() => document.lineAt(0).text === line, { timeout: 5000, message: "Toggle Line Comment to restore the line" });
	});
});
