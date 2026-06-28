{
  description = "peak — VS Code extension dev shell (direnv)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            bun
            nodejs_24
          ];

          shellHook = ''
            echo " peak dev shell — Bun $(bun --version 2>/dev/null || echo n/a), Node $(node --version 2>/dev/null || echo n/a)"
          '';
        };
      }
    );
}
