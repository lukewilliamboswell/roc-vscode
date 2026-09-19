import type { ExtensionContext } from "vscode";
import { CancellationTokenSource, commands, window, workspace } from "vscode";
import {
	type Executable,
	LanguageClient,
	type LanguageClientOptions,
} from "vscode-languageclient/node";

// The language client will only exist while a server is running
let client: LanguageClient | undefined;

// A server bug must not leave VS Code's hover widget displaying "Loading..."
// forever. This is deliberately longer than a normal hover can reasonably take,
// while still giving the experimental server time to finish initial analysis.
const HOVER_TIMEOUT_MS = 10_000;

function configuredRocPath(): string {
	return (workspace.getConfiguration("roc").get("path") as string | undefined) || "roc";
}

async function startClient() {
	// Read the setting on every start so that a restart picks up a changed `roc.path`
	const rocPath = configuredRocPath();
	const serverOptions: Executable = { command: rocPath, args: ["experimental-lsp"] };
	const clientOptions: LanguageClientOptions = {
		documentSelector: [{ scheme: "file", language: "roc" }],
		middleware: {
			provideHover: async (document, position, token, next) => {
				const request = new CancellationTokenSource();
				const cancellation = token.onCancellationRequested(() => request.cancel());
				let timer: ReturnType<typeof setTimeout> | undefined;
				try {
					return await Promise.race([
						next(document, position, request.token),
						new Promise<undefined>((resolve) => {
							timer = setTimeout(() => {
								request.cancel();
								resolve(undefined);
							}, HOVER_TIMEOUT_MS);
						}),
					]);
				} finally {
					if (timer !== undefined) clearTimeout(timer);
					cancellation.dispose();
					request.dispose();
				}
			},
		},
	};
	const starting = new LanguageClient("roc", "Roc", serverOptions, clientOptions);
	try {
		await starting.start();
	} catch (error) {
		await starting.dispose().catch(() => {});
		const reason = error instanceof Error ? error.message : String(error);
		throw new Error(
			`Could not start the Roc language server with "${rocPath} experimental-lsp": ${reason}. Check the "roc.path" setting, then run "Roc: Restart".`,
		);
	}
	client = starting;
}

async function stopClient() {
	const stopping = client;
	client = undefined;
	// A server that has already died cannot be stopped cleanly; that must not block a restart
	await stopping?.dispose().catch(() => {});
}

export async function activate(context: ExtensionContext) {
	// Register the command before starting, so that it is available to recover from a failed start
	context.subscriptions.push(
		commands.registerCommand("roc.restart", async () => {
			await stopClient();
			try {
				await startClient();
			} catch (error) {
				window.showErrorMessage((error as Error).message);
				throw error;
			}
			window.showInformationMessage("Roc LSP has restarted.");
		}),
	);

	try {
		await startClient();
	} catch (error) {
		window.showErrorMessage((error as Error).message);
	}
}

export async function deactivate() {
	await stopClient();
}
