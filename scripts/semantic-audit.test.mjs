import assert from "node:assert/strict";
import { test } from "node:test";
import {
	comparableRole,
	decodeSemanticTokens,
	semanticColor,
	semanticRole,
	textMateColor,
} from "./semantic-audit-lib.mjs";

const theme = {
	foreground: "#000000",
	semantic: {},
	rules: [
		{ selector: ["entity.name.type"], foreground: "#111111" },
		{ selector: ["entity.name.type.definition"], foreground: "#222222" },
		{ selector: ["storage.type"], foreground: "#333333" },
		{ selector: ["string", "variable"], foreground: "#444444" },
		{ selector: ["variable"], foreground: "#555555" },
	],
};

test("semantic tokens decode from relative positions and modifier bits", () => {
	const data = [0, 2, 3, 1, 1, 0, 4, 2, 0, 0, 2, 1, 5, 1, 0];
	assert.deepEqual(decodeSemanticTokens(data, ["variable", "type"], ["declaration"]), [
		{ line: 0, column: 2, length: 3, type: "type", modifiers: ["declaration"] },
		{ line: 0, column: 6, length: 2, type: "variable", modifiers: [] },
		{ line: 2, column: 1, length: 5, type: "type", modifiers: [] },
	]);
});

test("the most specific selector on the innermost scope wins", () => {
	assert.equal(textMateColor(theme, ["source.roc", "entity.name.type.definition.roc"]), "#222222");
	assert.equal(textMateColor(theme, ["source.roc", "entity.name.type.variant.roc"]), "#111111");
	assert.equal(textMateColor(theme, ["source.roc", "punctuation.comma.roc"]), "#000000");
});

test("a descendant selector needs its ancestor", () => {
	assert.equal(textMateColor(theme, ["source.roc", "string.quoted.roc", "variable.other.roc"]), "#444444");
	assert.equal(textMateColor(theme, ["source.roc", "variable.other.roc"]), "#555555");
});

test("semantic colours use contributed scopes before VS Code's fallback", () => {
	assert.equal(semanticColor(theme, "type"), "#111111");
	assert.equal(semanticColor(theme, "type", { type: ["storage.type.roc"] }), "#333333");
});

test("a scope contributed for a modifier beats the bare type", () => {
	const scopes = { type: ["storage.type.roc"], "type.declaration": ["entity.name.type.definition.roc"] };
	assert.equal(semanticColor(theme, "type", scopes, ["declaration"]), "#222222");
	assert.equal(semanticColor(theme, "type", scopes, []), "#333333");
});

test("a theme's own semantic rule wins, and no rule keeps the TextMate colour", () => {
	assert.equal(semanticColor({ ...theme, semantic: { type: "#ABCDEF" } }, "type"), "#abcdef");
	assert.equal(semanticColor(theme, "operator"), null);
});

test("roles are compared at the precision a language server has", () => {
	assert.equal(comparableRole("type.enum.variant"), comparableRole(semanticRole("enumMember")));
	assert.equal(comparableRole("keyword.control.repeat"), comparableRole(semanticRole("keyword")));
	assert.equal(comparableRole("type.builtin"), comparableRole(semanticRole("type")));
	assert.equal(comparableRole(null), null);
});
