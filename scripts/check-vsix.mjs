#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { formatInspection, inspectVsix } from "./vsix-lib.mjs";
import { resolveVsix } from "./test-vsix-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
try {
	const file = resolveVsix(root, process.argv[2]);
	const sourceManifest = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
	const report = inspectVsix(file, { sourceManifest });
	console.log(formatInspection(report));
	process.exitCode = report.problems.length > 0 ? 1 : 0;
} catch (error) {
	console.error(`check-vsix: ${error.message}`);
	process.exitCode = 1;
}
