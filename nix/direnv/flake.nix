{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-24.11";
  };

  outputs = { self, nixpkgs }:
    let
      forAllSystems = function:
        nixpkgs.lib.genAttrs [
          "x86_64-linux"
          "x86_64-darwin"
          "aarch64-linux"
        ] (system:
          function (import nixpkgs {
            inherit system;
          }));
    in {
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = with pkgs; [
            android-tools
            git
            nodejs_23
            scrcpy
            usbutils
            wmctrl
          ];

          shellHook = ''
            export REPO_DIR="$PWD/../../app"

            export PATH="$REPO_DIR:$PATH"

            cd "$REPO_DIR"

            echo "Installing dependencies..."
            npm install

            # echo "Starting development server..."
            npm run dev
          '';
        };
      });
    };
}
