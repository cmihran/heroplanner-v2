#!/usr/bin/env python3
"""
AI upscale game icons. Supports multiple models with per-model output dirs.

Usage:
  python3 scripts/upscale-icons.py --all                              # Upscale all icons with default model
  python3 scripts/upscale-icons.py --all --model 4xNomos8kDAT         # Upscale with a specific model
  python3 scripts/upscale-icons.py --test flight_travelflight.png      # Single icon test
  python3 scripts/upscale-icons.py --activate realesrgan-x4plus-anime-TTA  # Copy model output to images/
  python3 scripts/upscale-icons.py --list                              # Show available models & progress

Models are stored in per-model subdirectories under images_upscaled/:
  public/images_upscaled/realesrgan-x4plus-anime-TTA/
  public/images_upscaled/4xNomos8kDAT/

Idempotent: skips icons that already have output in the model's directory.
"""

import argparse
import os
import shutil
import subprocess
import sys
import tempfile
import time

from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
IMAGES_DIR = PROJECT_ROOT / "public" / "images"
UPSCALED_BASE = PROJECT_ROOT / "public" / "images_upscaled"
REALESRGAN_BIN = PROJECT_ROOT / "tools" / "realesrgan" / "realesrgan-ncnn-vulkan"
REALESRGAN_MODELS = PROJECT_ROOT / "tools" / "realesrgan" / "models"
WAIFU2X_BIN = PROJECT_ROOT / "tools" / "waifu2x" / "waifu2x-ncnn-vulkan"
WAIFU2X_DIR = PROJECT_ROOT / "tools" / "waifu2x"
SPANDREL_MODELS = PROJECT_ROOT / "tools" / "models"

# ── Model Registry ────────────────────────────────────────────────────────────

MODELS = {
    "realesrgan-x4plus-anime": {
        "engine": "spandrel",
        "model_file": "RealESRGAN_x4plus_anime_6B.pth",
    },
    "realesrgan-x4plus-anime-TTA": {
        "engine": "spandrel-tta",
        "model_file": "RealESRGAN_x4plus_anime_6B.pth",
    },
    "realesrgan-x4plus": {
        "engine": "spandrel",
        "model_file": "realesrgan-x4plus.pth",
    },
    "4x-AnimeSharp": {
        "engine": "spandrel",
        "model_file": "4x-AnimeSharp.pth",
    },
    "4x-UltraSharp": {
        "engine": "spandrel",
        "model_file": "4x-UltraSharp.pth",
    },
    "4xNomos8kDAT": {
        "engine": "spandrel",
        "model_file": "4xNomos8kDAT.pth",
    },
    "4x-NMKD-Siax": {
        "engine": "spandrel",
        "model_file": "4x_NMKD-Siax_200k.pth",
    },
    "4x-Remacri": {
        "engine": "spandrel",
        "model_file": "4x_foolhardy_Remacri.pth",
    },
    "4x-UltraMix-Balanced": {
        "engine": "spandrel",
        "model_file": "4x-UltraMix_Balanced.pth",
    },
    "4x-Valar": {
        "engine": "spandrel",
        "model_file": "4x_Valar_v1.pth",
    },
    "4x-FatalAnime": {
        "engine": "spandrel",
        "model_file": "4x_fatal_Anime_500000_G.pth",
    },
    "waifu2x-cunet": {
        "engine": "ncnn-waifu2x",
        "ncnn_model": "models-cunet",
    },
}

DEFAULT_MODEL = "realesrgan-x4plus-anime-TTA"

# ── Upscale Engines ───────────────────────────────────────────────────────────


def upscale_ncnn_realesrgan(input_path, output_path, model_name, tta=False):
    cmd = [
        str(REALESRGAN_BIN),
        "-i", str(input_path),
        "-o", str(output_path),
        "-s", "4",
        "-n", model_name,
        "-m", str(REALESRGAN_MODELS),
    ]
    if tta:
        cmd.append("-x")
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    return result.returncode == 0


def upscale_ncnn_waifu2x(input_path, output_path, model_name):
    model_path = str(WAIFU2X_DIR / model_name)
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp_path = tmp.name
    try:
        cmd1 = [
            str(WAIFU2X_BIN), "-i", str(input_path), "-o", tmp_path,
            "-s", "2", "-n", "3", "-m", model_path,
        ]
        if subprocess.run(cmd1, capture_output=True, text=True, timeout=120).returncode != 0:
            return False
        cmd2 = [
            str(WAIFU2X_BIN), "-i", tmp_path, "-o", str(output_path),
            "-s", "2", "-n", "0", "-m", model_path,
        ]
        return subprocess.run(cmd2, capture_output=True, text=True, timeout=120).returncode == 0
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


# Spandrel state
_spandrel_model = None
_spandrel_model_file = None
_spandrel_device = None


def _get_device():
    global _spandrel_device
    if _spandrel_device is not None:
        return _spandrel_device
    import torch
    if torch.cuda.is_available():
        try:
            t = torch.zeros(1, device="cuda")
            _ = t + 1
            _spandrel_device = torch.device("cuda")
            print("  [spandrel] Using CUDA")
        except RuntimeError:
            _spandrel_device = torch.device("cpu")
            print("  [spandrel] CUDA incompatible, using CPU")
    else:
        _spandrel_device = torch.device("cpu")
        print("  [spandrel] Using CPU")
    return _spandrel_device


def _load_spandrel(model_file):
    global _spandrel_model, _spandrel_model_file
    if _spandrel_model_file == model_file:
        return _spandrel_model

    import spandrel
    try:
        import spandrel_extra_arches
        spandrel_extra_arches.install()
    except (ImportError, RuntimeError):
        pass

    path = SPANDREL_MODELS / model_file
    if not path.exists():
        print(f"  ERROR: Model not found: {path}")
        return None

    device = _get_device()
    print(f"  Loading {model_file}...")
    _spandrel_model = spandrel.ModelLoader(device=device).load_from_file(str(path))
    _spandrel_model.eval()
    _spandrel_model_file = model_file
    return _spandrel_model


def upscale_spandrel(input_path, output_path, model_file):
    import torch
    import numpy as np
    from PIL import Image

    model = _load_spandrel(model_file)
    if model is None:
        return False

    device = _get_device()
    img = Image.open(input_path).convert("RGBA")
    arr = np.array(img)
    rgb = arr[:, :, :3]
    alpha = arr[:, :, 3]

    rgb_tensor = torch.from_numpy(rgb).permute(2, 0, 1).unsqueeze(0).float().to(device) / 255.0
    with torch.no_grad():
        out_tensor = model(rgb_tensor)

    out_rgb = out_tensor.squeeze(0).permute(1, 2, 0).clamp(0, 1).cpu().numpy()
    out_rgb = (out_rgb * 255).round().astype(np.uint8)

    out_h, out_w = out_rgb.shape[:2]
    alpha_up = np.array(Image.fromarray(alpha).resize((out_w, out_h), Image.NEAREST))

    out_img = Image.fromarray(np.dstack([out_rgb, alpha_up]), "RGBA")
    out_img.save(output_path)
    return True


def upscale_spandrel_tta(input_path, output_path, model_file):
    """Upscale with 8-fold TTA (test-time augmentation): 4 rotations x 2 flips, averaged."""
    import torch
    import numpy as np
    from PIL import Image

    model = _load_spandrel(model_file)
    if model is None:
        return False

    device = _get_device()
    img = Image.open(input_path).convert("RGBA")
    arr = np.array(img)
    rgb = arr[:, :, :3]
    alpha = arr[:, :, 3]

    rgb_tensor = torch.from_numpy(rgb).permute(2, 0, 1).unsqueeze(0).float().to(device) / 255.0

    # 8 augmentations: 4 rotations x 2 (original + horizontal flip)
    accum = None
    with torch.no_grad():
        for rot in range(4):
            for flip in [False, True]:
                t = torch.rot90(rgb_tensor, rot, [2, 3])
                if flip:
                    t = torch.flip(t, [3])

                out = model(t)

                # Undo augmentation
                if flip:
                    out = torch.flip(out, [3])
                out = torch.rot90(out, -rot, [2, 3])

                if accum is None:
                    accum = out
                else:
                    accum += out

    accum /= 8.0
    out_rgb = accum.squeeze(0).permute(1, 2, 0).clamp(0, 1).cpu().numpy()
    out_rgb = (out_rgb * 255).round().astype(np.uint8)

    out_h, out_w = out_rgb.shape[:2]
    alpha_up = np.array(Image.fromarray(alpha).resize((out_w, out_h), Image.NEAREST))

    out_img = Image.fromarray(np.dstack([out_rgb, alpha_up]), "RGBA")
    out_img.save(output_path)
    return True


def upscale_file(input_path, output_path, model_config):
    """Route to the correct engine. Writes to temp file, renames on success (atomic)."""
    engine = model_config["engine"]
    # Write to a temp .png in the same directory, rename on success — safe against Ctrl+C
    out_dir = os.path.dirname(output_path)
    tmp_fd, tmp_path = tempfile.mkstemp(suffix=".png", dir=out_dir)
    os.close(tmp_fd)
    try:
        ok = False
        if engine == "ncnn-realesrgan":
            ok = upscale_ncnn_realesrgan(
                input_path, tmp_path,
                model_config["ncnn_model"],
                tta=model_config.get("tta", False),
            )
        elif engine == "ncnn-waifu2x":
            ok = upscale_ncnn_waifu2x(input_path, tmp_path, model_config["ncnn_model"])
        elif engine == "spandrel":
            ok = upscale_spandrel(input_path, tmp_path, model_config["model_file"])
        elif engine == "spandrel-tta":
            ok = upscale_spandrel_tta(input_path, tmp_path, model_config["model_file"])

        if ok and os.path.exists(tmp_path) and os.path.getsize(tmp_path) > 0:
            os.replace(tmp_path, output_path)  # atomic on same filesystem
            return True
        return False
    except Exception as e:
        print(f"  ERROR: {e}")
        return False
    finally:
        # Clean up partial temp file on failure/interrupt
        if os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


# ── Commands ──────────────────────────────────────────────────────────────────


ORIGINALS_DIR = UPSCALED_BASE / "originals"


def _source_dir():
    """Always read originals when upscaling — never the active (possibly already-upscaled) images."""
    if ORIGINALS_DIR.is_dir() and any(ORIGINALS_DIR.iterdir()):
        return ORIGINALS_DIR
    return IMAGES_DIR


def get_png_files():
    return sorted(f for f in os.listdir(_source_dir()) if f.lower().endswith(".png"))


def get_model_dir(model_name):
    return UPSCALED_BASE / model_name


def ensure_originals_backup():
    """Back up original icons once. Never overwrites existing backup."""
    if ORIGINALS_DIR.is_dir() and any(ORIGINALS_DIR.iterdir()):
        return  # already backed up

    ORIGINALS_DIR.mkdir(parents=True, exist_ok=True)
    files = get_png_files()
    print(f"Backing up {len(files)} original icons to {ORIGINALS_DIR}...")
    for f in files:
        src = IMAGES_DIR / f
        dst = ORIGINALS_DIR / f
        if not dst.exists():
            shutil.copy2(src, dst)
    print("  Backup complete.")


def cmd_test(filename, model_name):
    ensure_originals_backup()
    config = MODELS[model_name]
    out_dir = get_model_dir(model_name)
    out_dir.mkdir(parents=True, exist_ok=True)

    input_path = _source_dir() / filename
    output_path = out_dir / filename

    print(f"Upscaling {filename} with {model_name}...")
    t0 = time.time()
    ok = upscale_file(str(input_path), str(output_path), config)
    elapsed = time.time() - t0

    if ok:
        print(f"Done in {elapsed:.1f}s -> {output_path}")
    else:
        print("FAILED")
        sys.exit(1)


def _upscale_one(args):
    """Worker function for parallel upscaling (ncnn only)."""
    input_path, output_path, config = args
    ok = upscale_file(input_path, output_path, config)
    return output_path, ok


BATCH_SIZE = 32


def _run_batched_spandrel(todo, out_dir, config, remaining, t0, progress_bar):
    """Process spandrel models in batches grouped by image size."""
    import torch
    import numpy as np
    from PIL import Image

    model_file = config["model_file"]
    is_tta = config["engine"] == "spandrel-tta"

    model = _load_spandrel(model_file)
    if model is None:
        return 0, len(todo)

    device = _get_device()

    # Group files by image dimensions (most will be 32x32)
    size_groups = {}
    for f in todo:
        img = Image.open(_source_dir() / f)
        size_groups.setdefault(img.size, []).append(f)
        img.close()

    done = 0
    failed = 0

    for (w, h), files in size_groups.items():
        for batch_start in range(0, len(files), BATCH_SIZE):
            batch_files = files[batch_start:batch_start + BATCH_SIZE]

            # Load batch: separate RGB and alpha
            rgb_list = []
            alpha_list = []
            for f in batch_files:
                img = Image.open(_source_dir() / f).convert("RGBA")
                arr = np.array(img)
                rgb_list.append(arr[:, :, :3])
                alpha_list.append(arr[:, :, 3])

            # Stack into batch tensor [B, 3, H, W]
            rgb_batch = np.stack(rgb_list)
            batch_tensor = torch.from_numpy(rgb_batch).permute(0, 3, 1, 2).float().to(device) / 255.0

            try:
                with torch.no_grad():
                    if is_tta:
                        # 8-fold TTA: 4 rotations x 2 flips
                        accum = None
                        for rot in range(4):
                            for flip in [False, True]:
                                t = torch.rot90(batch_tensor, rot, [2, 3])
                                if flip:
                                    t = torch.flip(t, [3])
                                out = model(t)
                                if flip:
                                    out = torch.flip(out, [3])
                                out = torch.rot90(out, -rot, [2, 3])
                                if accum is None:
                                    accum = out
                                else:
                                    accum += out
                        out_batch = accum / 8.0
                    else:
                        out_batch = model(batch_tensor)

                # Save each result
                out_np = out_batch.clamp(0, 1).cpu().numpy()
                out_h, out_w = out_np.shape[2], out_np.shape[3]

                for i, f in enumerate(batch_files):
                    out_rgb = (out_np[i].transpose(1, 2, 0) * 255).round().astype(np.uint8)
                    alpha_up = np.array(Image.fromarray(alpha_list[i]).resize((out_w, out_h), Image.NEAREST))
                    out_img = Image.fromarray(np.dstack([out_rgb, alpha_up]), "RGBA")

                    # Atomic write
                    tmp_fd, tmp_path = tempfile.mkstemp(suffix=".png", dir=str(out_dir))
                    os.close(tmp_fd)
                    try:
                        out_img.save(tmp_path)
                        os.replace(tmp_path, str(out_dir / f))
                        done += 1
                    except Exception:
                        failed += 1
                        if os.path.exists(tmp_path):
                            os.unlink(tmp_path)

                    progress_bar(done, failed, remaining, t0)

            except Exception as e:
                print(f"\n  BATCH ERROR: {e}")
                failed += len(batch_files)
                progress_bar(done, failed, remaining, t0)

            # Free GPU memory
            del batch_tensor
            if is_tta:
                del accum
            del out_batch

    return done, failed


def cmd_all(model_name, workers=1):
    from concurrent.futures import ThreadPoolExecutor, as_completed

    ensure_originals_backup()
    config = MODELS[model_name]
    out_dir = get_model_dir(model_name)
    out_dir.mkdir(parents=True, exist_ok=True)

    files = get_png_files()
    total = len(files)

    # Filter to remaining work
    todo = []
    skipped = 0
    for f in files:
        output_path = out_dir / f
        if output_path.exists():
            skipped += 1
        else:
            todo.append(f)

    remaining = len(todo)

    # Auto-select workers: ncnn models benefit from parallelism, spandrel doesn't
    is_ncnn = config["engine"].startswith("ncnn")
    if workers <= 0:
        workers = os.cpu_count() or 4
        if not is_ncnn:
            workers = 1  # spandrel/GPU shares one model, no benefit from threading
    if not is_ncnn and workers > 1:
        print(f"NOTE: GPU models use a shared model; forcing workers=1")
        workers = 1

    print(f"Model: {model_name} ({config['engine']})")
    print(f"Output: {out_dir}")
    print(f"Total: {total}, Already done: {skipped}, Remaining: {remaining}, Workers: {workers}")

    if remaining == 0:
        print("All icons already upscaled. Nothing to do.")
        return

    print()

    done = 0
    failed = 0
    t0 = time.time()

    def progress_bar(done, failed, remaining, t0):
        processed = done + failed
        elapsed = time.time() - t0
        rate = processed / elapsed if elapsed > 0 else 0
        eta = (remaining - processed) / rate if rate > 0 else 0

        pct = processed / remaining if remaining > 0 else 1
        bar_w = 30
        filled = int(bar_w * pct)
        bar = "█" * filled + "░" * (bar_w - filled)

        eta_str = f"{int(eta//60)}m{int(eta%60):02d}s" if eta >= 60 else f"{int(eta)}s"
        fail_str = f" {failed} failed" if failed else ""

        line = f"\r  {bar} {processed}/{remaining} ({rate:.1f}/s) ETA {eta_str}{fail_str}"
        sys.stdout.write(f"{line:<80}")
        sys.stdout.flush()

    is_spandrel = config["engine"].startswith("spandrel")

    if is_spandrel:
        # Batched GPU execution
        done, failed = _run_batched_spandrel(
            todo, out_dir, config, remaining, t0, progress_bar,
        )
    elif workers > 1 and is_ncnn:
        # Parallel execution for ncnn models
        tasks = [
            (str(_source_dir() / f), str(out_dir / f), config)
            for f in todo
        ]
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = {pool.submit(_upscale_one, t): t for t in tasks}
            for future in as_completed(futures):
                out_path, ok = future.result()
                if ok:
                    done += 1
                else:
                    failed += 1
                progress_bar(done, failed, remaining, t0)
    else:
        # Sequential execution
        for i, f in enumerate(todo):
            input_path = _source_dir() / f
            output_path = out_dir / f
            ok = upscale_file(str(input_path), str(output_path), config)
            if ok:
                done += 1
            else:
                failed += 1
            progress_bar(done, failed, remaining, t0)

    elapsed = time.time() - t0
    # Clear progress bar line and print summary
    sys.stdout.write("\r" + " " * 80 + "\r")
    print(f"Finished in {elapsed:.1f}s")
    print(f"  Done: {done}, Failed: {failed}, Skipped: {skipped}")
    print(f"  Output: {out_dir}")


def cmd_activate(model_name):
    ensure_originals_backup()

    src_dir = get_model_dir(model_name)
    if not src_dir.is_dir():
        print(f"ERROR: No images for '{model_name}'")
        print(f"  Expected: {src_dir}")
        if model_name != "originals":
            print(f"  Run: python3 scripts/upscale-icons.py --all --model {model_name}")
        sys.exit(1)

    src_files = sorted(f for f in os.listdir(src_dir) if f.lower().endswith(".png"))
    if not src_files:
        print(f"ERROR: {src_dir} is empty.")
        sys.exit(1)

    total = len(get_png_files())
    is_restore = (model_name == "originals")

    print(f"{'Restore' if is_restore else 'Activate'}: {model_name}")
    print(f"  Source: {src_dir}")
    print(f"  Target: {IMAGES_DIR}")
    print(f"  Files: {len(src_files)}/{total} icons")

    copied = 0
    for f in src_files:
        src = src_dir / f
        dst = IMAGES_DIR / f
        shutil.copy2(src, dst)
        copied += 1

    print(f"Copied {copied} images from {model_name} into public/images/.")


def cmd_list():
    print("Available models:\n")
    source_icons = get_png_files()
    total = len(source_icons)

    # Show originals backup status
    if ORIGINALS_DIR.is_dir():
        count = sum(1 for f in os.listdir(ORIGINALS_DIR) if f.lower().endswith(".png"))
        print(f"  {'originals':<35s} {'backup':<18s} {count}/{total}")
    else:
        print(f"  {'originals':<35s} {'backup':<18s} not yet backed up")

    print()

    for name, config in MODELS.items():
        out_dir = get_model_dir(name)
        if out_dir.is_dir():
            count = sum(1 for f in os.listdir(out_dir) if f.lower().endswith(".png"))
            status = f"{count}/{total}"
            if count == total:
                status += " (complete)"
        else:
            count = 0
            status = "not started"

        engine = config["engine"]
        marker = " *" if name == DEFAULT_MODEL else ""
        print(f"  {name:<35s} {engine:<18s} {status}{marker}")

    print(f"\n  * = default model")
    print(f"  Source icons: {total}")


# ── Main ──────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(
        description="AI upscale game icons (multi-model, idempotent)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="Examples:\n"
               "  %(prog)s --all                              # Default model\n"
               "  %(prog)s --all --model 4xNomos8kDAT         # Specific model\n"
               "  %(prog)s --activate realesrgan-x4plus-anime-TTA\n"
               "  %(prog)s --list",
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--test", metavar="FILENAME", help="Upscale a single icon")
    group.add_argument("--all", action="store_true", help="Batch upscale all icons")
    group.add_argument("--activate", metavar="MODEL", help="Copy model output over originals")
    group.add_argument("--list", action="store_true", help="Show models and progress")
    parser.add_argument(
        "--model", default=DEFAULT_MODEL,
        help=f"Model name (default: {DEFAULT_MODEL})",
    )
    parser.add_argument(
        "--workers", type=int, default=0,
        help="Parallel workers for ncnn models (0=auto, default: 0)",
    )

    args = parser.parse_args()

    if args.list:
        cmd_list()
        return

    if args.activate:
        if args.activate != "originals" and args.activate not in MODELS:
            print(f"ERROR: Unknown model '{args.activate}'")
            print(f"Available: originals, {', '.join(MODELS.keys())}")
            sys.exit(1)
        cmd_activate(args.activate)
        return

    # Validate model
    if args.model not in MODELS:
        print(f"ERROR: Unknown model '{args.model}'")
        print(f"Available: {', '.join(MODELS.keys())}")
        sys.exit(1)

    if args.test:
        cmd_test(args.test, args.model)
    elif args.all:
        cmd_all(args.model, workers=args.workers)


if __name__ == "__main__":
    main()
