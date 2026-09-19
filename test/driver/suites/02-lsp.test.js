const assert = require("node:assert/strict");
const vscode = require("vscode");
const { activated, assertRange, closeAllEditors, errorsFor, eventually, openFixture, positionOf, waitFor } = require("../helpers");

// Every request goes VS Code API -> packaged extension -> vscode-languageclient
// -> real Roc server and back. The assertions are about that bridge: a result
// arrives, is shaped like a VS Code object, and points into the document.
// Whether the compiler's answer is *right* is the compiler's business.
describe("language features through the VS Code API", () => {
	let document;
	let uri;

	before(async () => {
		({ document } = await openFixture("Geometry.roc"));
		uri = document.uri;
		await activated();
	});
	after(closeAllEditors);

	const locationsOf = (results) => results.map((item) => ({ uri: item.uri ?? item.targetUri, range: item.range ?? item.targetRange }));

	it("reports no errors for a valid file", async () => {
		// Hover only answers once the file has been analysed, so diagnostics are settled by then.
		await eventually("vscode.executeHoverProvider", uri, positionOf(document, "double(double"));
		assert.deepEqual(errorsFor(uri).map((item) => item.message), []);
	});

	it("hover", async () => {
		const hovers = await eventually("vscode.executeHoverProvider", uri, positionOf(document, "double(double", { within: 1 }));
		const text = hovers.flatMap((hover) => hover.contents).map((part) => (typeof part === "string" ? part : part.value)).join("\n");
		assert.match(text, /I64/, `hover should describe the function type, got: ${text}`);
	});

	it("go to definition", async () => {
		const results = await eventually("vscode.executeDefinitionProvider", uri, positionOf(document, "double(double", { within: 1 }));
		const [target] = locationsOf(results);
		assert.equal(target.uri.toString(), uri.toString());
		assertRange(target.range, document, "definition");
		assert.equal(target.range.start.line, positionOf(document, "double =").line);
	});

	it("find references", async () => {
		const results = await eventually("vscode.executeReferenceProvider", uri, positionOf(document, "double =", { within: 1 }));
		assert.ok(results.length >= 2, `expected the definition and its uses, got ${results.length}`);
		for (const location of results) assertRange(location.range, document, "reference");
	});

	it("document highlights", async () => {
		const results = await eventually("vscode.executeDocumentHighlights", uri, positionOf(document, "double =", { within: 1 }));
		for (const highlight of results) assertRange(highlight.range, document, "highlight");
	});

	it("document symbols", async () => {
		const symbols = await eventually("vscode.executeDocumentSymbolProvider", uri);
		const names = [];
		const visit = (symbol) => { names.push(symbol.name); assertRange(symbol.range ?? symbol.location.range, document, `symbol ${symbol.name}`); (symbol.children ?? []).forEach(visit); };
		symbols.forEach(visit);
		assert.ok(names.some((name) => name.includes("Geometry")), `symbols were: ${names.join(", ")}`);
	});

	it("completion, including after the '.' trigger", async () => {
		const general = await eventually("vscode.executeCompletionItemProvider", uri, positionOf(document, "double(double"));
		assert.ok(general.items.length > 0);
		const afterDot = await vscode.commands.executeCommand("vscode.executeCompletionItemProvider", uri, positionOf(document, "point.x", { within: 6 }), ".");
		assert.ok(afterDot.items.some((item) => (item.label.label ?? item.label) === "x"), `record fields offered: ${afterDot.items.map((item) => item.label.label ?? item.label).slice(0, 10).join(", ")}`);
	});

	it("rename produces a workspace edit that applies", async () => {
		// The server currently renames local bindings but declines methods; a parameter exercises the bridge.
		const edit = await eventually("vscode.executeDocumentRenameProvider", uri, positionOf(document, "amount| {", { within: 1 }), "distance");
		const changes = edit.entries().flatMap(([, edits]) => edits);
		assert.equal(changes.length, 3, "the parameter and both uses should change");
		for (const change of changes) { assertRange(change.range, document, "rename edit"); assert.equal(change.newText, "distance"); }
		assert.ok(await vscode.workspace.applyEdit(edit));
		assert.match(document.getText(), /\|point, distance\| \{ x: point\.x \+ distance, y: point\.y \+ distance \}/);
		await vscode.commands.executeCommand("workbench.action.files.revert");
	});

	it("folding ranges", async () => {
		const ranges = await eventually("vscode.executeFoldingRangeProvider", uri);
		for (const range of ranges) assert.ok(range.start < range.end && range.end < document.lineCount, `folding range ${range.start}-${range.end}`);
	});

	it("selection ranges", async () => {
		const [selection] = await eventually("vscode.executeSelectionRangeProvider", uri, [positionOf(document, "point.x", { within: 1 })]);
		assertRange(selection.range, document, "selection range");
		if (selection.parent) assert.ok(selection.parent.range.contains(selection.range), "parents must enclose their children");
	});

	it("inlay hints", async () => {
		const whole = new vscode.Range(0, 0, document.lineCount, 0);
		const hints = await vscode.commands.executeCommand("vscode.executeInlayHintProvider", uri, whole);
		assert.ok(Array.isArray(hints));
		for (const hint of hints) assert.ok(document.validatePosition(hint.position).isEqual(hint.position), "inlay hint position lies outside the document");
	});

	it("code actions", async () => {
		const range = new vscode.Range(positionOf(document, "double ="), positionOf(document, "n * 2"));
		const actions = await vscode.commands.executeCommand("vscode.executeCodeActionProvider", uri, range);
		assert.ok(Array.isArray(actions));
		for (const action of actions) assert.equal(typeof action.title, "string");
	});

	it("semantic tokens", async () => {
		const legend = await eventually("vscode.provideDocumentSemanticTokensLegend", uri);
		assert.ok(legend.tokenTypes.includes("function"));
		const tokens = await waitFor(async () => {
			const result = await vscode.commands.executeCommand("vscode.provideDocumentSemanticTokens", uri);
			return result?.data?.length ? result : null;
		}, { message: "semantic tokens" });
		assert.equal(tokens.data.length % 5, 0);
		let line = 0;
		for (let index = 0; index < tokens.data.length; index += 5) {
			line += tokens.data[index];
			assert.ok(line < document.lineCount, "semantic token beyond the end of the document");
			assert.ok(tokens.data[index + 3] < legend.tokenTypes.length, "semantic token type outside the legend");
		}
	});

	it("formatting returns edits that apply cleanly", async () => {
		const { document: messy, editor } = await openFixture("Unformatted.roc");
		const before = messy.getText();
		const edits = await eventually("vscode.executeFormatDocumentProvider", messy.uri, { tabSize: 4, insertSpaces: false });
		for (const edit of edits) assertRange(edit.range, messy, "formatting edit");
		const workspaceEdit = new vscode.WorkspaceEdit();
		workspaceEdit.set(messy.uri, edits);
		assert.ok(await vscode.workspace.applyEdit(workspaceEdit));
		assert.notEqual(editor.document.getText(), before);
		assert.match(editor.document.getText(), /increment = \|n\| n \+ 1/);
	});
});
