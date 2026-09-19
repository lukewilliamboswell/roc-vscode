#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { benchmark, compareReports, diagnose, markdownReport, readReport, repositoryRoot, writeReport } from "./grammar-bench-lib.mjs";

function parse(args) {
	const options = { command: "bench" };
	if (args[0] && !args[0].startsWith("--")) options.command = args.shift();
	for (let i = 0; i < args.length; i += 1) {
		const arg = args[i];
		if (arg === "--corpus") options.corpus = args[++i];
		else if (arg === "--project") options.project = args[++i];
		else if (arg === "--iterations") options.iterations = Number(args[++i]);
		else if (arg === "--stress-blocks") options.stressBlocks = Number(args[++i]);
		else if (arg === "--line-time-limit-ms") options.lineTimeLimitMs = Number(args[++i]);
		else if (arg === "--output") options.output = args[++i];
		else if (arg === "--name") options.name = args[++i];
		else if (arg === "--tool") options.tool = args[++i];
		else options.files = [...(options.files ?? []), arg];
	}
	return options;
}
const options = parse(process.argv.slice(2));
const emit = (report) => options.output ? writeReport(report, path.resolve(options.output)) : console.log(options.command === "report" ? markdownReport(report) : JSON.stringify(report, null, 2));

if (options.command === "bench") emit(await benchmark(options));
else if (options.command === "diagnose") emit(await diagnose(options));
else if (options.command === "save") {
	const report = await benchmark(options); const target = path.join(repositoryRoot, "benchmarks", "baselines", `${options.name ?? "local"}.json`); writeReport(report, target); console.log(target);
} else if (options.command === "report") emit(readReport(options.files?.[0]));
else if (options.command === "compare") emit(compareReports(readReport(options.files?.[0]), readReport(options.files?.[1])));
else if (options.command === "profile-loop") { const report = await benchmark({ ...options, iterations: options.iterations ?? 100 }); console.error(`profile loop complete: ${report.corpus.files} files`); }
else if (options.command === "profile") {
	const tool = options.tool ?? (spawnSync("samply", ["--version"]).status === 0 ? "samply" : spawnSync("perf", ["--version"]).status === 0 ? "perf" : null);
	if (!tool) throw new Error("Neither samply nor perf is available; pass --tool or run the profile-loop command directly");
	const child = [process.execPath, new URL(import.meta.url).pathname, "profile-loop", "--corpus", options.corpus ?? "stress", "--iterations", String(options.iterations ?? 100)];
	const args = tool === "samply" ? ["record", ...child] : ["record", "-g", "--", ...child];
	execFileSync(tool, args, { stdio: "inherit", cwd: repositoryRoot });
} else throw new Error(`unknown command: ${options.command}`);
