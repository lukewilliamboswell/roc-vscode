#!/usr/bin/env node

import { resolveInputFiles, runOracle } from "./highlighting-oracle-lib.mjs";

function usage() {
	return `Usage: node scripts/highlighting-oracle.mjs [options] [paths...]

Compare Roc TextMate highlighting with the vendored tree-sitter oracle.

Options:
  --external             Include repositories fetched by just oracle-fetch
  --role ROLE            Report only a role and its children (for example, function)
  --max-diagnostics N    Limit printed parser problems and differences (default: 80)
  --strict               Exit unsuccessfully if any result is not an exact match
  --help                  Show this help`;
}

function parseArguments(arguments_) {
	const options = {
		includeExternal: false,
		strict: false,
		roleFilter: null,
		maximumDiagnostics: 80,
		inputs: [],
	};

	for (let index = 0; index < arguments_.length; index += 1) {
		const argument = arguments_[index];
		if (argument === "--external") options.includeExternal = true;
		else if (argument === "--strict") options.strict = true;
		else if (argument === "--help") {
			console.log(usage());
			process.exit(0);
		} else if (argument === "--role") {
			index += 1;
			if (index >= arguments_.length) throw new Error("--role requires a value");
			options.roleFilter = arguments_[index];
		} else if (argument === "--max-diagnostics") {
			index += 1;
			const value = Number(arguments_[index]);
			if (!Number.isInteger(value) || value < 0) {
				throw new Error("--max-diagnostics requires a non-negative integer");
			}
			options.maximumDiagnostics = value;
		} else if (argument.startsWith("--")) throw new Error(`Unknown option: ${argument}`);
		else options.inputs.push(argument);
	}
	return options;
}

try {
	const options = parseArguments(process.argv.slice(2));
	const files = resolveInputFiles(options.inputs, options.includeExternal);
	if (files.length === 0) throw new Error("No Roc files found");
	const { report } = await runOracle({
		files,
		roleFilter: options.roleFilter,
		maximumDiagnostics: options.maximumDiagnostics,
	});
	console.log(report.text);
	if (
		options.strict &&
		(report.problemCount > 0 ||
			report.counts.coarse > 0 ||
			report.counts.missing > 0 ||
			report.counts.extra > 0 ||
			report.counts.wrong > 0)
	) {
		process.exitCode = 1;
	}
} catch (error) {
	console.error(`highlighting-oracle: ${error instanceof Error ? error.message : String(error)}`);
	process.exitCode = 1;
}
