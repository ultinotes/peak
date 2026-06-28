# Repo-root commands. Convention: docs/adr/0001-dev-tooling-direnv-flake-make.md

.DEFAULT_GOAL := help

.PHONY: help
help: ## List repo-root commands
	@grep -E '^[a-zA-Z0-9_.-]+:.*##' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-24s\033[0m %s\n", $$1, $$2}'

.PHONY: install
install: ## Install npm dependencies (after yo code scaffold)
	@test -f package.json || (echo "Run yo code first — no package.json yet." && exit 1)
	npm install

.PHONY: compile
compile: ## Compile TypeScript extension
	@test -f package.json || (echo "Run yo code first — no package.json yet." && exit 1)
	npm run compile

.PHONY: watch
watch: ## Watch and compile TypeScript
	@test -f package.json || (echo "Run yo code first — no package.json yet." && exit 1)
	npm run watch

.PHONY: test
test: ## Run unit tests
	@test -f package.json || (echo "Run yo code first — no package.json yet." && exit 1)
	npm test

.PHONY: lint
lint: ## Run lint / type checks
	@test -f package.json || (echo "Run yo code first — no package.json yet." && exit 1)
	npm run lint

.PHONY: package
package: ## Build .vsix marketplace bundle
	@test -f package.json || (echo "Run yo code first — no package.json yet." && exit 1)
	npx @vscode/vsce package

.PHONY: dev
dev: compile ## Launch Cursor dev host with Peak loaded (see SETUP.md)
	node scripts/dev-host.js
