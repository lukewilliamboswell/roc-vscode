const fs = require("node:fs");
const path = require("node:path");
const Mocha = require("mocha");

// Entry point for @vscode/test-electron: runs inside the extension host of the
// sandboxed VS Code that has the VSIX installed.
exports.run = async () => {
	const mocha = new Mocha({ ui: "bdd", color: true, timeout: 60000, slow: 5000, bail: false });
	if (process.env.ROC_VSIX_GREP) mocha.grep(new RegExp(process.env.ROC_VSIX_GREP));
	const suites = path.join(__dirname, "suites");
	// Numeric prefixes order the suites: lifecycle tests disturb the server, so they run last.
	for (const file of fs.readdirSync(suites).filter((name) => name.endsWith(".test.js")).sort()) mocha.addFile(path.join(suites, file));
	const failures = await new Promise((resolve) => mocha.run(resolve));
	if (failures > 0) throw new Error(`${failures} integration test${failures === 1 ? "" : "s"} failed`);
};
