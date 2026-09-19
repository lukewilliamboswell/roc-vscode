#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

import {
	externalCorpusDirectory,
	oracleDirectory,
	repositoryRoot,
} from "./highlighting-oracle-lib.mjs";

function git(arguments_, options = {}) {
	const output = execFileSync("git", arguments_, {
		cwd: repositoryRoot,
		encoding: "utf8",
		stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
	});
	return typeof output === "string" ? output.trim() : "";
}

function verifyLicense(checkout, source) {
	const licensePath = path.join(checkout, source.licenseFile);
	if (!existsSync(licensePath)) throw new Error(`${source.name} has no ${source.licenseFile}`);
	const license = readFileSync(licensePath, "utf8");
	if (!license.includes(source.licenseMarker)) {
		throw new Error(`${source.name} no longer matches the expected ${source.license} license`);
	}
}

try {
	const manifest = JSON.parse(readFileSync(path.join(oracleDirectory, "sources.json"), "utf8"));
	mkdirSync(externalCorpusDirectory, { recursive: true });
	for (const source of manifest.repositories) {
		const checkout = path.join(externalCorpusDirectory, source.name);
		if (!existsSync(checkout)) {
			console.log(`Cloning ${source.name}...`);
			git(["clone", "--depth", "1", source.url, checkout]);
		} else {
			const dirty = git(["-C", checkout, "status", "--porcelain"], { capture: true });
			if (dirty !== "") {
				throw new Error(`${source.name} has local changes; preserve or remove them before refreshing`);
			}
			console.log(`Refreshing ${source.name}...`);
			git(["-C", checkout, "fetch", "--depth", "1", "origin", "HEAD"]);
			git(["-C", checkout, "checkout", "--detach", "FETCH_HEAD"]);
		}
		verifyLicense(checkout, source);
		const revision = git(["-C", checkout, "rev-parse", "HEAD"], { capture: true });
		const fileCount = git(["-C", checkout, "ls-files", "--", "*.roc"], { capture: true })
			.split("\n")
			.filter((file) => file !== "").length;
		console.log(`${source.name}: ${revision} (${fileCount} Roc files, ${source.license})`);
	}
} catch (error) {
	console.error(`oracle-fetch: ${error instanceof Error ? error.message : String(error)}`);
	process.exitCode = 1;
}
