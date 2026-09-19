const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vscode = require("vscode");
const { activated, closeAllEditors, env, eventually, isAlive, openFixture, positionOf, serverPids, waitFor } = require("../helpers");

const setRocPath = (value) => vscode.workspace.getConfiguration("roc").update("path", value, vscode.ConfigurationTarget.Global);
const restart = () => vscode.commands.executeCommand("roc.restart");

describe("language server lifecycle", function () {
	let document;

	before(async function () {
		if (serverPids() === null) this.skip();
		({ document } = await openFixture("Geometry.roc"));
		await activated();
		await waitFor(() => serverPids().length === 1, { message: "one running server" });
	});
	after(async () => {
		await setRocPath(env("ROC_VSIX_ROC_PATH"));
		await closeAllEditors();
	});

	const hoverWorks = async () => assert.ok((await eventually("vscode.executeHoverProvider", document.uri, positionOf(document, "double =", { within: 1 }))).length > 0);

	it("restart replaces the server process with a working one", async () => {
		const [before] = serverPids();
		await restart();
		const [after] = await waitFor(() => (serverPids().length === 1 && serverPids()[0] !== before ? serverPids() : null), { message: "a new server process" });
		assert.notEqual(after, before);
		await waitFor(() => !isAlive(before), { message: "the old server to exit" });
		await hoverWorks();
	});

	it("repeated restarts do not leak processes", async () => {
		const seen = new Set(serverPids());
		for (let round = 0; round < 3; round += 1) {
			await restart();
			for (const pid of serverPids()) seen.add(pid);
		}
		await waitFor(() => serverPids().length === 1, { message: "exactly one server after restarting" });
		const [current] = serverPids();
		await waitFor(() => [...seen].every((pid) => pid === current || !isAlive(pid)), { message: "earlier servers to exit" });
		await hoverWorks();
	});

	it("a missing executable fails with an actionable message, then recovers", async () => {
		const missing = path.join(os.tmpdir(), "no-such-roc-binary");
		await setRocPath(missing);
		await assert.rejects(restart(), (error) => {
			assert.match(error.message, /no-such-roc-binary/, "the message should name the path that failed");
			assert.match(error.message, /roc\.path/, "the message should say which setting to fix");
			return true;
		});
		assert.deepEqual(serverPids(), [], "no server should be left running");

		await setRocPath(env("ROC_VSIX_ROC_PATH"));
		await restart();
		await waitFor(() => serverPids().length === 1, { message: "the server to come back" });
		await hoverWorks();
	});

	it("an executable that is not a language server fails rather than hanging", async () => {
		const impostor = path.join(os.tmpdir(), `not-roc-${process.pid}`);
		fs.writeFileSync(impostor, "#!/bin/sh\nexit 0\n", { mode: 0o755 });
		try {
			await setRocPath(impostor);
			await assert.rejects(restart(), /roc\.path/);
			await setRocPath(env("ROC_VSIX_ROC_PATH"));
			await restart();
			await hoverWorks();
		} finally {
			fs.rmSync(impostor, { force: true });
		}
	});

	it("picks up a changed roc.path on restart", async () => {
		const copy = path.join(os.tmpdir(), `roc-link-${process.pid}`);
		fs.symlinkSync(env("ROC_VSIX_ROC_PATH"), copy);
		try {
			await setRocPath(copy);
			await restart();
			const [pid] = await waitFor(() => (serverPids().length === 1 ? serverPids() : null), { message: "the server started from the new path" });
			assert.match(fs.readFileSync(`/proc/${pid}/cmdline`, "utf8"), new RegExp(path.basename(copy)));
		} finally {
			await setRocPath(env("ROC_VSIX_ROC_PATH"));
			await restart();
			fs.rmSync(copy, { force: true });
		}
	});

	it("records the running server so the harness can check it exits with VS Code", async () => {
		const pids = await waitFor(() => (serverPids().length === 1 ? serverPids() : null), { message: "one running server" });
		fs.writeFileSync(path.join(env("ROC_VSIX_WORKSPACE"), "..", "reports", "server-pids.json"), JSON.stringify(pids));
	});
});
