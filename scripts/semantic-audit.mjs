#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { repositoryRoot } from "./highlighting-oracle-lib.mjs";
import {
	audit,
	auditCorpusDirectory,
	findVsCodeExtensionsDirectory,
	formatAudit,
	loadStockThemes,
} from "./semantic-audit-lib.mjs";

const usage = `Usage: node scripts/semantic-audit.mjs [options] [file-or-directory ...]

Compare the semantic tokens of a real Roc language server with the TextMate
grammar and the tree-sitter oracle, and report where colours would change.

Options:
  --roc PATH        Roc executable (default: $ROC_PATH, then roc on PATH)
  --themes DIR      A VS Code resources/app/extensions directory
                    (default: the newest VS Code under .vscode-test)
  --scopes FILE     JSON of semanticTokenScopes to simulate, {type: [scope]}
                    (default: the ones package.json contributes for roc)
  --no-scopes       Ignore semanticTokenScopes, as if the extension had none
  --output FILE     Write the full report as JSON
  --baseline FILE   A report written earlier by --output, for comparison
  --max-rows N      Limit each printed table (default: 60)
  --help            Show this help`;

function collect(input) {
	if (statSync(input).isFile()) return [input];
	return readdirSync(input, { withFileTypes: true })
		.flatMap((entry) => {
			const child = path.join(input, entry.name);
			if (entry.isDirectory()) return collect(child);
			return entry.name.endsWith(".roc") ? [child] : [];
		})
		.sort();
}

function parseArguments(arguments_) {
	const options = { roc: process.env.ROC_PATH || "roc", inputs: [], maximumRows: 60 };
	for (let index = 0; index < arguments_.length; index += 1) {
		const argument = arguments_[index];
		const value = () => {
			index += 1;
			if (index >= arguments_.length) throw new Error(`${argument} requires a value`);
			return arguments_[index];
		};
		if (argument === "--help") {
			console.log(usage);
			process.exit(0);
		} else if (argument === "--roc") options.roc = value();
		else if (argument === "--themes") options.themes = value();
		else if (argument === "--scopes") options.scopes = value();
		else if (argument === "--no-scopes") options.noScopes = true;
		else if (argument === "--output") options.output = value();
		else if (argument === "--baseline") options.baseline = value();
		else if (argument === "--max-rows") options.maximumRows = Number(value());
		else if (argument.startsWith("--")) throw new Error(`Unknown option: ${argument}`);
		else options.inputs.push(argument);
	}
	return options;
}

const options = parseArguments(process.argv.slice(2));
const inputs =
	options.inputs.length > 0
		? options.inputs
		: [
				auditCorpusDirectory,
				path.join(repositoryRoot, "syntaxes", "oracle", "corpus"),
				path.join(repositoryRoot, "test", "fixtures", "workspace"),
				path.join(repositoryRoot, "syntaxes", "snapshots", "all-syntax.roc"),
			];
const files = inputs.flatMap(collect);
const extensions = options.themes ?? findVsCodeExtensionsDirectory();
const themes = extensions && existsSync(extensions) ? loadStockThemes(extensions) : {};
function contributedScopes() {
	const manifest = JSON.parse(readFileSync(path.join(repositoryRoot, "package.json"), "utf8"));
	const entries = manifest.contributes?.semanticTokenScopes ?? [];
	return Object.assign({}, ...entries.filter((entry) => entry.language === "roc").map((entry) => entry.scopes));
}
let scopeOverrides = contributedScopes();
if (options.noScopes) scopeOverrides = {};
else if (options.scopes) scopeOverrides = JSON.parse(readFileSync(options.scopes, "utf8"));

const report = await audit({ rocPath: options.roc, files, themes, scopeOverrides });
const baseline = options.baseline ? JSON.parse(readFileSync(options.baseline, "utf8")) : null;
console.log(`Roc: ${options.roc}\nFiles: ${files.length}\n`);
console.log(formatAudit(report, { maximumRows: options.maximumRows, baseline }));
if (options.output) writeFileSync(options.output, `${JSON.stringify(report, null, "\t")}\n`);
