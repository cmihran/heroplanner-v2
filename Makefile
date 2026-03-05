.PHONY: dev frontend build lint typecheck rustcheck migrate clean install

# Development
dev:                  ## Start Tauri dev (Rust + Vite with hot reload)
	DISPLAY=:0 GALLIUM_DRIVER=d3d12 npm run dev

frontend:             ## Start Vite frontend only (localhost:5173)
	npm run dev:frontend

# Build
build:                ## Production build (Tauri + Vite)
	npm run build

# Checks
lint:                 ## Run ESLint
	npm run lint

typecheck:            ## TypeScript type check
	npx tsc -b --noEmit

rustcheck:            ## Rust cargo check
	cd src-tauri && cargo check

check: lint typecheck rustcheck  ## Run all checks

sync:                 ## Sync project to Windows (C:\dev\heroplanner-v2)
	./scripts/sync-to-windows.sh

# Data
migrate:              ## Run zip-to-SQLite migration (auto-detects latest zip)
	python3 scripts/migrate-zip-to-sqlite.py

# Setup
install:              ## Install npm dependencies
	npm install

# Cleanup
clean:                ## Remove build artifacts
	rm -rf dist src-tauri/target

help:                 ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
