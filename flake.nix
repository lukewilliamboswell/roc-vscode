{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
    roc.url = "github:roc-lang/roc-overlay";
  };

  outputs =
    inputs:
    inputs.flake-parts.lib.mkFlake { inherit inputs; } {
      systems = [
        "aarch64-darwin"
        "aarch64-linux"
        "x86_64-linux"
      ];

      perSystem =
        {
          pkgs,
          self',
          inputs',
          ...
        }:
        {
          packages = {
            default = self'.packages.roc-vscode;

            roc-vscode = pkgs.vscode-utils.buildVscodeExtension (finalAttrs: {
              pname = "roc-vscode";
              version = finalAttrs.src.version;

              vscodeExtPublisher = "hannes";
              vscodeExtName = "roc";
              vscodeExtUniqueId = "${finalAttrs.vscodeExtPublisher}.${finalAttrs.vscodeExtName}";

              src = self'.packages.roc-vscode-vsix;
            });

            roc-vscode-vsix = pkgs.stdenv.mkDerivation (finalAttrs: {
              name = "roc-vscode.vsix";
              pname = "roc-vscode-vsix";
              version = "0.0.5";

              src = pkgs.lib.cleanSource ./.;
              sourceRoot = "source";

              npmDeps = pkgs.fetchNpmDeps {
                name = "${finalAttrs.pname}-npm-deps";
                src = finalAttrs.src;
                hash = "sha256-Vr6PLzaXPuCuHGVPBkQZCXEhP9hP839iVmw0PNyoBvQ=";
              };

              nativeBuildInputs = [
                # keep-sorted start
                pkgs.esbuild
                pkgs.inkscape
                pkgs.just
                pkgs.nodejs-slim
                pkgs.nodejs-slim.npm
                pkgs.nodejs-slim.python
                pkgs.npmHooks.npmConfigHook
                pkgs.pkg-config
                pkgs.vsce
                pkgs.writableTmpDirAsHomeHook
                # keep-sorted end
              ];
              buildInputs = pkgs.lib.optionals pkgs.stdenv.hostPlatform.isLinux [ pkgs.libsecret ];

              strictDeps = true;

              buildPhase = ''
                runHook preBuild
                just build
                runHook postBuild
              '';

              installPhase = ''
                runHook preInstall
                cp build/roc-vscode-${finalAttrs.version}.vsix $out
                runHook postInstall
              '';
            });
          };

          devShells.default = pkgs.mkShell {
            packages = self'.packages.roc-vscode-vsix.nativeBuildInputs ++ [
              # keep-sorted start
              inputs'.roc.packages.default
              pkgs.actionlint
              pkgs.biome
              pkgs.deadnix
              pkgs.jq
              pkgs.keep-sorted
              pkgs.nixfmt
              pkgs.pre-commit
              pkgs.python3Packages.pre-commit-hooks
              pkgs.ratchet
              pkgs.rumdl
              pkgs.sd
              pkgs.shellcheck
              pkgs.typescript
              pkgs.xvfb-run
              pkgs.yamlfix
              pkgs.zizmor
              # keep-sorted end
            ];
          };

          formatter = pkgs.nixfmt-tree;
        };
    };
}
