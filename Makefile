.PHONY: dev frontend build lint typecheck rustcheck migrate clean install \
       upscale upscale-dat upscale-tta upscale-list upscale-activate upscale-restore

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

# Upscaling
upscale-list:         ## Show upscale models and progress
	python3 scripts/upscale-icons.py --list

upscale-dat:          ## Upscale all icons with 4xNomos8kDAT (GPU)
	python3 scripts/upscale-icons.py --all --model 4xNomos8kDAT

upscale-tta:          ## Upscale all icons with realesrgan-x4plus-anime-TTA
	python3 scripts/upscale-icons.py --all --model realesrgan-x4plus-anime-TTA

upscale:              ## Upscale with a model: make upscale MODEL=4xNomos8kDAT
	python3 scripts/upscale-icons.py --all --model $(MODEL)

upscale-activate:     ## Activate a model: make upscale-activate MODEL=4xNomos8kDAT
	python3 scripts/upscale-icons.py --activate $(MODEL)

upscale-restore:      ## Restore original icons
	python3 scripts/upscale-icons.py --activate originals

# Setup
install:              ## Install npm dependencies
	npm install

# Cleanup
clean:                ## Remove build artifacts
	rm -rf dist src-tauri/target

help:                 ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
