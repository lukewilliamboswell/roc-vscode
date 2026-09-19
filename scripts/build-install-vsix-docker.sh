#!/usr/bin/env bash

set -euo pipefail

repo_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
output_dir="$repo_dir/build"
vsix="$output_dir/roc-vscode-dev.vsix"
nix_image=${NIX_IMAGE:-nixos/nix:latest}
nix_store_volume=${NIX_STORE_VOLUME:-roc-vscode-nix}

if ! command -v docker >/dev/null 2>&1; then
	echo "error: Docker is not installed or is not on PATH" >&2
	exit 1
fi

# Allow users of VS Code variants to override this, for example:
# VSCODE_COMMAND=code-insiders ./scripts/build-install-vsix-docker.sh
vscode_command=${VSCODE_COMMAND:-code}
if ! command -v "$vscode_command" >/dev/null 2>&1; then
	echo "error: '$vscode_command' is not on PATH" >&2
	echo "Set VSCODE_COMMAND to your editor's CLI command and try again." >&2
	exit 1
fi

mkdir -p "$output_dir"
rm -f "$vsix"

echo "Building the VSIX with $nix_image ..."
docker run --rm \
	--volume "$repo_dir:/workspace" \
	--volume "$nix_store_volume:/nix" \
	--workdir /workspace \
	"$nix_image" \
	sh -eu -c '
		mkdir /tmp/source
		cp --recursive --no-preserve=ownership /workspace/. /tmp/source/
		cd /tmp/source
		nix --extra-experimental-features "nix-command flakes" \
			build .#roc-vscode-vsix --out-link /tmp/roc-vscode-result
		cp --dereference /tmp/roc-vscode-result /workspace/build/roc-vscode-dev.vsix
	'

echo "Installing $vsix ..."
"$vscode_command" --install-extension "$vsix" --force

echo "Installed successfully. Reload the VS Code window to activate this build."
