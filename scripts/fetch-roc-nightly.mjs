#!/usr/bin/env node
// Download the Roc nightly pinned in test/roc-nightly.json, verify its digest,
// and print the path of its `roc` executable. The integration battery tests the
// extension against this exact server, locally and in CI alike.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
	const pin = JSON.parse(readFileSync(path.join(root, "test", "roc-nightly.json"), "utf8"));
	const platform = `${process.platform}-${process.arch}`;
	const asset = pin.assets[platform];
	if (!asset) throw new Error(`no pinned Roc nightly for ${platform}; pass --roc to test-vsix instead`);
	const directory = path.join(root, ".roc-nightly", pin.tag);
	const find = () => (existsSync(directory) ? readdirSync(directory, { recursive: true }).map((entry) => path.join(directory, String(entry))).find((entry) => path.basename(entry) === "roc") : undefined);
	if (!find()) {
		const url = `https://github.com/roc-lang/nightlies/releases/download/${pin.tag}/${asset.name}`;
		console.error(`Downloading ${url}`);
		const response = await fetch(url);
		if (!response.ok) throw new Error(`download failed: ${response.status} ${response.statusText}`);
		const archive = Buffer.from(await response.arrayBuffer());
		const digest = createHash("sha256").update(archive).digest("hex");
		if (digest !== asset.sha256) throw new Error(`${asset.name} has sha256 ${digest}, expected ${asset.sha256}`);
		rmSync(directory, { recursive: true, force: true });
		mkdirSync(directory, { recursive: true });
		const file = path.join(directory, asset.name);
		writeFileSync(file, archive);
		execFileSync("tar", ["-xzf", file, "-C", directory]);
		rmSync(file);
	}
	const roc = find();
	if (!roc) throw new Error(`no roc executable inside ${asset.name}`);
	console.log(roc);
} catch (error) {
	console.error(`fetch-roc-nightly: ${error.message}`);
	process.exitCode = 1;
}
