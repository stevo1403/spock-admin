# To learn more about how to use Nix to configure your environment
# see: https://firebase.google.com/docs/studio/customize-workspace
{ pkgs, ... }: {
  # Which nixpkgs channel to use.
  channel = "unstable";
  # Use https://search.nixos.org/packages to find packages
  packages = [
    # pkgs.python3
    pkgs.go
    pkgs.sudo
    pkgs.python311
    pkgs.python3
    pkgs.python311Packages.pip
    pkgs.nodejs_20
    pkgs.nodePackages.nodemon
    pkgs.python311Packages.flask
    pkgs.python311Packages.flask-api
    pkgs.python311Packages.flask-admin
    pkgs.python311Packages.gunicorn
    pkgs.python311Packages.requests
    pkgs.python311Packages.sqlalchemy
    pkgs.python311Packages.psycopg2
    pkgs.python311Packages.flask_sqlalchemy
    pkgs.python311Packages.flask_migrate
    pkgs.python311Packages.flask_wtf
    pkgs.python311Packages.flask_login
    pkgs.postgresql
    pkgs.nodejs
    pkgs.yarn
    pkgs.tailwindcss
  ];

    # Configure PostgreSQL service
  services.postgres = {
    enable = true;
    enableTcp = true;
    package = pkgs.postgresql;
  };

  idx = {
    # Search for extensions on https://open-vsx.org/ and use "publisher.id"
    extensions = [
      "ms-python.python"
      "rangav.vscode-thunder-client"
      "esbenp.prettier-vscode" # formatter:q
      "dbaeumer.vscode-eslint" # linter
      # "streetsidesoftware.code-spell-checker" # spell checker
      "visualstudioexptteam.vscodeintellicode" #ai autocomplete
    ];
    workspace = {
      # Runs when a workspace is first created with this `dev.nix` file
      onCreate = {
        setup-db = "psql -h localhost -U postgres -d spock_db -f backend/init.sql";
      };
      # Runs when a workspace is (re)started
      onStart = {
        # Open editors for the following files by default, if they exist:
        default.openFiles = [
          "backend/.env"
          "backend/main.py"
        ];
        run-frontend = "cd frontend && yarn run dev";
        run-backend = "cd backend && poetry run gunicorn app:app --bind localhost:8000 --reload";
      };
    };
  };
}
