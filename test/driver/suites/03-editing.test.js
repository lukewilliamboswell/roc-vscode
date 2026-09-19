const assert = require("node:assert/strict");
const vscode = require("vscode");
const { activated, closeAllEditors, errorsFor, eventually, openFixture, openScratch, positionOf, replaceAll, waitFor } = require("../helpers");

const MODULE = (name, body) => `${name} := [${name}].{\n${body}\n}\n`;
const hoverText = async (uri, position) => (await eventually("vscode.executeHoverProvider", uri, position))
	.flatMap((hover) => hover.contents).map((part) => (typeof part === "string" ? part : part.value)).join("\n");

// Document synchronisation is where integrations usually break: each feature
// can work on a freshly opened file and still be wrong after an edit.
describe("editing unsaved documents", () => {
	before(activated);
	afterEach(closeAllEditors);

	it("reports an error introduced by an unsaved edit, and clears it when repaired", async () => {
		const valid = MODULE("Scratch", "\tanswer : I64\n\tanswer = 42");
		const { document, editor } = await openScratch("Scratch.roc", valid);
		await hoverText(document.uri, positionOf(document, "answer =", { within: 1 }));
		assert.deepEqual(errorsFor(document.uri), []);

		await replaceAll(editor, valid.replace("answer = 42", "answer = missing_name"));
		assert.ok(document.isDirty, "the edit must stay unsaved for this test to mean anything");
		const errors = await waitFor(() => (errorsFor(document.uri).length > 0 ? errorsFor(document.uri) : null), { message: "a diagnostic for the undefined name" });
		assert.ok(document.validateRange(errors[0].range).isEqual(errors[0].range));

		await replaceAll(editor, valid);
		await waitFor(() => errorsFor(document.uri).length === 0, { message: "the diagnostic to clear" });
	});

	it("survives broken syntax and recovers", async () => {
		const valid = MODULE("Broken", "\tanswer : I64\n\tanswer = 42");
		const { document, editor } = await openScratch("Broken.roc", valid);
		await replaceAll(editor, valid.replace("answer = 42", "answer = (("));
		await waitFor(() => errorsFor(document.uri).length > 0, { message: "a syntax error" });
		await replaceAll(editor, valid);
		await waitFor(() => errorsFor(document.uri).length === 0, { message: "the syntax error to clear" });
		assert.match(await hoverText(document.uri, positionOf(document, "answer =", { within: 1 })), /I64/);
	});

	it("answers from the edited text, not the file on disk", async () => {
		const { document, editor } = await openScratch("Fresh.roc", MODULE("Fresh", "\tanswer : I64\n\tanswer = 42"));
		await replaceAll(editor, MODULE("Fresh", "\tanswer : I64\n\tanswer = 42\n\n\tgreeting : Str\n\tgreeting = \"hello\""));
		assert.match(await hoverText(document.uri, positionOf(document, "greeting =", { within: 1 })), /Str/);
	});

	it("keeps positions right after non-ASCII text", async () => {
		// "é" is 2 bytes in UTF-8, the emoji is 2 UTF-16 units: a server counting either wrongly lands elsewhere.
		const { document } = await openScratch("Unicode.roc", MODULE("Unicode", "\tlabel : Str\n\tlabel = \"café \u{1F600}\"\n\n\tcount : I64\n\tcount = 1\n\n\ttotal : I64\n\ttotal = count + count"));
		const results = await eventually("vscode.executeDefinitionProvider", document.uri, positionOf(document, "count + count", { within: 1 }));
		const range = results[0].range ?? results[0].targetSelectionRange ?? results[0].targetRange;
		assert.equal(range.start.line, positionOf(document, "count =").line);
		assert.deepEqual(errorsFor(document.uri), []);
	});

	it("handles CRLF line endings", async () => {
		const { document } = await openScratch("Windows.roc", MODULE("Windows", "\tanswer : I64\n\tanswer = 42\n\n\tdouble : I64\n\tdouble = answer + answer").replaceAll("\n", "\r\n"));
		assert.equal(document.eol, vscode.EndOfLine.CRLF);
		const results = await eventually("vscode.executeDefinitionProvider", document.uri, positionOf(document, "answer + answer", { within: 1 }));
		const range = results[0].range ?? results[0].targetSelectionRange ?? results[0].targetRange;
		assert.equal(range.start.line, positionOf(document, "answer =").line);
	});

	it("serves a document again after it is closed and reopened", async () => {
		const first = await openFixture("Palette.roc");
		assert.match(await hoverText(first.document.uri, positionOf(first.document, "to_str =", { within: 1 })), /Str/);
		await closeAllEditors();
		const second = await openFixture("Palette.roc");
		assert.match(await hoverText(second.document.uri, positionOf(second.document, "to_str =", { within: 1 })), /Str/);
	});

	it("keeps two open documents apart", async () => {
		const geometry = await openFixture("Geometry.roc");
		const palette = await openFixture("Palette.roc");
		assert.match(await hoverText(geometry.document.uri, positionOf(geometry.document, "quadruple =", { within: 1 })), /I64/);
		assert.match(await hoverText(palette.document.uri, positionOf(palette.document, "to_str =", { within: 1 })), /Palette/);
	});

	it("stays consistent under rapid edits and requests", async () => {
		const body = (value) => MODULE("Rapid", `\tanswer : I64\n\tanswer = ${value}`);
		const { document, editor } = await openScratch("Rapid.roc", body(0));
		const pending = [];
		for (let value = 1; value <= 15; value += 1) {
			await replaceAll(editor, body(value));
			pending.push(vscode.commands.executeCommand("vscode.executeHoverProvider", document.uri, positionOf(document, "answer =", { within: 1 })));
		}
		// Requests overtaken by a later edit may be cancelled; none may wedge the server.
		await Promise.allSettled(pending);
		assert.match(document.getText(), /answer = 15/);
		assert.match(await hoverText(document.uri, positionOf(document, "answer =", { within: 1 })), /I64/);
		assert.deepEqual(errorsFor(document.uri), []);
	});
});
