#!/usr/bin/env python3
"""
Blind A/B test for upscaler models.

Usage:
  python3 scripts/upscale-blind-test.py --generate          # Generate grid images
  python3 scripts/upscale-blind-test.py --vote               # Interactive voting
  python3 scripts/upscale-blind-test.py --tally              # Show results
  python3 scripts/upscale-blind-test.py --generate --icons fire_blast_blaze.png,dark_mastery_darkembrace.png

Requires: torch, spandrel, spandrel_extra_arches, Pillow
"""

import argparse
import hashlib
import json
import os
import random
import subprocess
import sys
import tempfile
import time

from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
IMAGES_DIR = PROJECT_ROOT / "public" / "images"
OUTPUT_DIR = PROJECT_ROOT / "public" / "images_upscaled" / "blind_test"
MODELS_DIR = PROJECT_ROOT / "tools" / "models"
REALESRGAN_BIN = PROJECT_ROOT / "tools" / "realesrgan" / "realesrgan-ncnn-vulkan"
REALESRGAN_MODELS = PROJECT_ROOT / "tools" / "realesrgan" / "models"
WAIFU2X_BIN = PROJECT_ROOT / "tools" / "waifu2x" / "waifu2x-ncnn-vulkan"
WAIFU2X_DIR = PROJECT_ROOT / "tools" / "waifu2x"

KEY_FILE = OUTPUT_DIR / "key.json"
VOTES_FILE = OUTPUT_DIR / "votes.json"

# ── Default test icons (diverse set) ──────────────────────────────────────────

DEFAULT_TEST_ICONS = [
    "flight_travelflight.png",                    # Simple, bright, movement
    "dark_mastery_darkembrace.png",               # Dark, detailed
    "illusions_phantomarmy.png",                  # Complex, multiple figures
    "inherent_brawl.png",                         # Simple melee icon
    "fireblast_blaze.png",                        # Bright fire effects
    "icearmor_glacialarmor.png",                  # Blue/cold tones
    "radiationpoisoning_radiationemission.png",   # Green glow effects
    "electricalbolt_balllightning.png",           # Electrical effects
    "48px-DropIcon-VR.png",                       # Enhancement icon (different style)
    "empathy_fortitude.png",                      # Buff icon
]

# ── Model Configurations ──────────────────────────────────────────────────────

MODEL_CONFIGS = [
    {
        "id": "A",
        "name": "realesrgan-x4plus-anime",
        "engine": "ncnn",
        "ncnn_model": "realesrgan-x4plus-anime",
        "ncnn_bin": "realesrgan",
        "tta": False,
    },
    {
        "id": "B",
        "name": "realesrgan-x4plus-anime-TTA",
        "engine": "ncnn",
        "ncnn_model": "realesrgan-x4plus-anime",
        "ncnn_bin": "realesrgan",
        "tta": True,
    },
    {
        "id": "C",
        "name": "realesrgan-x4plus",
        "engine": "ncnn",
        "ncnn_model": "realesrgan-x4plus",
        "ncnn_bin": "realesrgan",
        "tta": False,
    },
    {
        "id": "D",
        "name": "4x-AnimeSharp",
        "engine": "spandrel",
        "model_file": "4x-AnimeSharp.pth",
    },
    {
        "id": "E",
        "name": "4x-UltraSharp",
        "engine": "spandrel",
        "model_file": "4x-UltraSharp.pth",
    },
    {
        "id": "F",
        "name": "4x-NMKD-Siax",
        "engine": "spandrel",
        "model_file": "4x_NMKD-Siax_200k.pth",
    },
    {
        "id": "G",
        "name": "4x-Remacri",
        "engine": "spandrel",
        "model_file": "4x_foolhardy_Remacri.pth",
    },
    {
        "id": "H",
        "name": "4x-UltraMix-Balanced",
        "engine": "spandrel",
        "model_file": "4x-UltraMix_Balanced.pth",
    },
    {
        "id": "I",
        "name": "4xNomos8kDAT",
        "engine": "spandrel",
        "model_file": "4xNomos8kDAT.pth",
    },
    {
        "id": "J",
        "name": "waifu2x-cunet",
        "engine": "ncnn",
        "ncnn_model": "models-cunet",
        "ncnn_bin": "waifu2x",
        "tta": False,
    },
    {
        "id": "K",
        "name": "4x-FatalAnime",
        "engine": "spandrel",
        "model_file": "4x_fatal_Anime_500000_G.pth",
    },
    {
        "id": "L",
        "name": "CONTROL (nearest-neighbor)",
        "engine": "control",
    },
]

# ── Upscale Engines ───────────────────────────────────────────────────────────


def upscale_ncnn_realesrgan(input_path, output_path, model_name, tta=False):
    """Upscale using realesrgan-ncnn-vulkan binary."""
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
    """Upscale using waifu2x-ncnn-vulkan (2x twice for 4x)."""
    model_path = str(WAIFU2X_DIR / model_name)

    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        # First 2x pass
        cmd1 = [
            str(WAIFU2X_BIN),
            "-i", str(input_path),
            "-o", tmp_path,
            "-s", "2",
            "-n", "3",  # denoise level 3
            "-m", model_path,
        ]
        r1 = subprocess.run(cmd1, capture_output=True, text=True, timeout=120)
        if r1.returncode != 0:
            return False

        # Second 2x pass
        cmd2 = [
            str(WAIFU2X_BIN),
            "-i", tmp_path,
            "-o", str(output_path),
            "-s", "2",
            "-n", "0",  # no denoise on second pass
            "-m", model_path,
        ]
        r2 = subprocess.run(cmd2, capture_output=True, text=True, timeout=120)
        return r2.returncode == 0
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


def upscale_control(input_path, output_path):
    """Nearest-neighbor 4x upscale (control/baseline)."""
    from PIL import Image
    img = Image.open(input_path)
    w, h = img.size
    img_up = img.resize((w * 4, h * 4), Image.NEAREST)
    img_up.save(output_path)
    return True


# Spandrel model cache (loaded lazily)
_spandrel_models = {}
_spandrel_extra_installed = False
_spandrel_device = None


def _get_spandrel_device():
    """Determine best device for spandrel (GPU if compatible, else CPU)."""
    global _spandrel_device
    if _spandrel_device is not None:
        return _spandrel_device

    import torch
    if torch.cuda.is_available():
        try:
            # Test if CUDA actually works with a small tensor op
            t = torch.zeros(1, device="cuda")
            _ = t + 1
            _spandrel_device = torch.device("cuda")
            print("  [spandrel] Using CUDA")
        except RuntimeError:
            _spandrel_device = torch.device("cpu")
            print("  [spandrel] CUDA available but incompatible (sm_120?), using CPU")
    else:
        _spandrel_device = torch.device("cpu")
        print("  [spandrel] Using CPU")
    return _spandrel_device


def _load_spandrel_model(model_file):
    """Load a spandrel model, cached."""
    global _spandrel_extra_installed

    if model_file in _spandrel_models:
        return _spandrel_models[model_file]

    import torch
    import spandrel

    if not _spandrel_extra_installed:
        try:
            import spandrel_extra_arches
            spandrel_extra_arches.install()
        except ImportError:
            pass
        _spandrel_extra_installed = True

    model_path = MODELS_DIR / model_file
    if not model_path.exists():
        print(f"  WARNING: Model file not found: {model_path}")
        return None

    device = _get_spandrel_device()
    print(f"  Loading model: {model_file}...")
    model = spandrel.ModelLoader(device=device).load_from_file(str(model_path))
    model.eval()
    _spandrel_models[model_file] = model
    return model


def upscale_spandrel(input_path, output_path, model_file):
    """Upscale using spandrel (PyTorch) with alpha handling."""
    import torch
    import numpy as np
    from PIL import Image

    model = _load_spandrel_model(model_file)
    if model is None:
        return False

    device = _get_spandrel_device()

    img = Image.open(input_path).convert("RGBA")
    w, h = img.size
    arr = np.array(img)

    # Split RGB and Alpha
    rgb = arr[:, :, :3]
    alpha = arr[:, :, 3]

    # Upscale RGB with model
    rgb_tensor = torch.from_numpy(rgb).permute(2, 0, 1).unsqueeze(0).float().to(device) / 255.0

    with torch.no_grad():
        out_tensor = model(rgb_tensor)

    out_rgb = out_tensor.squeeze(0).permute(1, 2, 0).clamp(0, 1).cpu().numpy()
    out_rgb = (out_rgb * 255).round().astype(np.uint8)

    # Upscale alpha with nearest-neighbor (sharp edges)
    out_h, out_w = out_rgb.shape[:2]
    alpha_img = Image.fromarray(alpha)
    alpha_up = alpha_img.resize((out_w, out_h), Image.NEAREST)
    alpha_arr = np.array(alpha_up)

    # Recombine RGBA
    out_rgba = np.dstack([out_rgb, alpha_arr])
    out_img = Image.fromarray(out_rgba, "RGBA")
    out_img.save(output_path)
    return True


# ── Grid Composition ──────────────────────────────────────────────────────────


def make_checkerboard(w, h, cell_size=8):
    """Create a checkerboard pattern for transparency visualization."""
    from PIL import Image
    img = Image.new("RGB", (w, h))
    pixels = img.load()
    c1 = (180, 180, 180)
    c2 = (220, 220, 220)
    for y in range(h):
        for x in range(w):
            if ((x // cell_size) + (y // cell_size)) % 2 == 0:
                pixels[x, y] = c1
            else:
                pixels[x, y] = c2
    return img


def compose_grid(upscaled_images, icon_name, order, original_path, cols=4, rows=3):
    """
    Compose a grid of upscaled images with numbered labels.

    upscaled_images: dict of model_id -> PIL Image (128x128)
    order: list of model_ids in display order (randomized)
    """
    from PIL import Image, ImageDraw, ImageFont

    cell_w, cell_h = 160, 170  # image + padding + label
    img_size = 128
    padding = (cell_w - img_size) // 2

    # Extra space: header for original + title, footer for nothing
    header_h = 64
    grid_w = cols * cell_w
    grid_h = header_h + rows * cell_h

    # Create grid with dark background
    grid = Image.new("RGB", (grid_w, grid_h), (40, 40, 40))
    draw = ImageDraw.Draw(grid)

    # Try to load a nice font, fall back to default
    try:
        font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
        font_num = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 14)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 11)
    except (OSError, IOError):
        font_large = ImageFont.load_default()
        font_num = font_large
        font_small = font_large

    # Header: title + original image
    title = icon_name.replace(".png", "").replace("_", " ")
    draw.text((10, 5), f"Blind Test: {title}", fill=(255, 255, 200), font=font_large)

    # Draw original at actual size in top-right area
    if original_path and os.path.exists(original_path):
        orig = Image.open(original_path).convert("RGBA")
        # Show original at actual size (e.g. 32x32)
        orig_w, orig_h = orig.size
        # Place checkerboard behind it
        checker = make_checkerboard(orig_w, orig_h, cell_size=4)
        checker.paste(orig, mask=orig.split()[3] if orig.mode == "RGBA" else None)
        # Position in header, right-aligned
        ox = grid_w - orig_w - 10
        oy = (header_h - orig_h) // 2
        grid.paste(checker, (ox, oy))
        draw.text((ox - 60, oy + orig_h // 2 - 6), f"Original\n{orig_w}x{orig_h}", fill=(180, 180, 180), font=font_small)

    # Draw separator line
    draw.line([(0, header_h - 2), (grid_w, header_h - 2)], fill=(80, 80, 80), width=1)

    # Draw each cell
    for idx, model_id in enumerate(order):
        col = idx % cols
        row = idx // cols
        x = col * cell_w + padding
        y = header_h + row * cell_h + 5

        cell_num = idx + 1

        if model_id in upscaled_images and upscaled_images[model_id] is not None:
            img = upscaled_images[model_id]
            # Ensure 128x128
            if img.size != (img_size, img_size):
                img = img.resize((img_size, img_size), Image.LANCZOS)

            # Checkerboard background for alpha
            checker = make_checkerboard(img_size, img_size, cell_size=8)
            if img.mode == "RGBA":
                checker.paste(img, mask=img.split()[3])
            else:
                checker.paste(img)
            grid.paste(checker, (x, y))
        else:
            # Failed model — red X
            draw.rectangle([x, y, x + img_size, y + img_size], fill=(60, 20, 20))
            draw.text((x + 40, y + 50), "FAILED", fill=(255, 80, 80), font=font_num)

        # Number label (yellow circle with number)
        label_x = x + 2
        label_y = y + 2
        draw.ellipse([label_x, label_y, label_x + 22, label_y + 22], fill=(200, 180, 0))
        # Center the number text
        num_text = str(cell_num)
        bbox = draw.textbbox((0, 0), num_text, font=font_num)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        draw.text((label_x + 11 - tw // 2, label_y + 11 - th // 2 - 1), num_text, fill=(0, 0, 0), font=font_num)

    return grid


# ── Generate Mode ─────────────────────────────────────────────────────────────


def run_upscaler(config, input_path, output_path):
    """Run a single upscaler config, return True on success."""
    engine = config["engine"]
    try:
        if engine == "control":
            return upscale_control(input_path, output_path)
        elif engine == "ncnn":
            if config["ncnn_bin"] == "realesrgan":
                return upscale_ncnn_realesrgan(
                    input_path, output_path,
                    config["ncnn_model"],
                    tta=config.get("tta", False),
                )
            elif config["ncnn_bin"] == "waifu2x":
                return upscale_ncnn_waifu2x(input_path, output_path, config["ncnn_model"])
        elif engine == "spandrel":
            return upscale_spandrel(input_path, output_path, config["model_file"])
    except Exception as e:
        print(f"  ERROR [{config['name']}]: {e}")
        return False
    return False


def cmd_generate(test_icons, active_configs=None):
    """Generate blind test grid images."""
    from PIL import Image
    import math

    if active_configs is None:
        active_configs = MODEL_CONFIGS

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Validate test icons exist
    valid_icons = []
    for icon in test_icons:
        icon_path = IMAGES_DIR / icon
        if icon_path.exists():
            valid_icons.append(icon)
        else:
            print(f"WARNING: Icon not found, skipping: {icon}")

    if not valid_icons:
        print("ERROR: No valid test icons found.")
        sys.exit(1)

    n = len(active_configs)
    print(f"Generating blind test for {len(valid_icons)} icons x {n} models")
    print(f"Models: {', '.join(c['name'] for c in active_configs)}")
    print(f"Output: {OUTPUT_DIR}")
    print()

    # Check which engines are available
    has_realesrgan = REALESRGAN_BIN.exists() and os.access(REALESRGAN_BIN, os.X_OK)
    has_waifu2x = WAIFU2X_BIN.exists() and os.access(WAIFU2X_BIN, os.X_OK)
    if not has_realesrgan:
        print("WARNING: realesrgan-ncnn-vulkan not found, ncnn realesrgan models will fail")
    if not has_waifu2x:
        print("WARNING: waifu2x-ncnn-vulkan not found, waifu2x models will fail")

    # Compute grid dimensions
    cols = min(n, 4)
    rows = math.ceil(n / cols)

    key_data = {}
    t0 = time.time()

    for icon_idx, icon_name in enumerate(valid_icons):
        icon_path = IMAGES_DIR / icon_name
        icon_stem = icon_name.replace(".png", "")
        print(f"\n[{icon_idx + 1}/{len(valid_icons)}] {icon_name}")

        # Deterministic shuffle seed based on icon name
        seed = int(hashlib.md5(icon_name.encode()).hexdigest()[:8], 16)
        rng = random.Random(seed)

        # Shuffle model order
        order = [c["id"] for c in active_configs]
        rng.shuffle(order)

        # Run each model
        upscaled = {}
        with tempfile.TemporaryDirectory() as tmpdir:
            for config in active_configs:
                mid = config["id"]
                tmp_out = os.path.join(tmpdir, f"{mid}.png")
                print(f"  {mid}: {config['name']}...", end=" ", flush=True)

                t1 = time.time()
                ok = run_upscaler(config, str(icon_path), tmp_out)
                elapsed = time.time() - t1

                if ok and os.path.exists(tmp_out):
                    img = Image.open(tmp_out).convert("RGBA")
                    # Resize to 128x128 if not already
                    if img.size != (128, 128):
                        img = img.resize((128, 128), Image.LANCZOS)
                    upscaled[mid] = img
                    print(f"OK ({elapsed:.1f}s)")
                else:
                    upscaled[mid] = None
                    print(f"FAILED ({elapsed:.1f}s)")

        # Compose grid
        grid = compose_grid(upscaled, icon_name, order, str(icon_path), cols=cols, rows=rows)
        grid_path = OUTPUT_DIR / f"grid_{icon_stem}.png"
        grid.save(grid_path)
        print(f"  -> {grid_path}")

        # Save key mapping for this icon
        key_data[icon_name] = {}
        config_by_id = {c["id"]: c["name"] for c in active_configs}
        for idx, mid in enumerate(order):
            key_data[icon_name][str(idx + 1)] = {"id": mid, "model": config_by_id[mid]}

    # Write key file
    with open(KEY_FILE, "w") as f:
        json.dump(key_data, f, indent=2)

    elapsed_total = time.time() - t0
    print(f"\nDone in {elapsed_total:.1f}s")
    print(f"Grids: {OUTPUT_DIR}/grid_*.png")
    print(f"Key:   {KEY_FILE}")
    print(f"\nOpen the grid images in an image viewer, then run --vote")


# ── Vote Mode ─────────────────────────────────────────────────────────────────


def cmd_vote():
    """Interactive voting on grid images."""
    if not KEY_FILE.exists():
        print("ERROR: key.json not found. Run --generate first.")
        sys.exit(1)

    with open(KEY_FILE) as f:
        key_data = json.load(f)

    # Load existing votes
    votes = {}
    if VOTES_FILE.exists():
        with open(VOTES_FILE) as f:
            votes = json.load(f)

    icons = list(key_data.keys())
    print(f"Voting on {len(icons)} icons. Enter your favorite number(s), comma-separated.")
    print("Press Enter to skip, 'q' to quit and save.\n")

    for icon_name in icons:
        icon_stem = icon_name.replace(".png", "")
        grid_path = OUTPUT_DIR / f"grid_{icon_stem}.png"

        existing = votes.get(icon_name)
        if existing:
            print(f"  {icon_name}: already voted [{', '.join(str(v) for v in existing)}] (press Enter to keep, or enter new)")
        else:
            print(f"  {icon_name}: ({grid_path.name})")

        try:
            inp = input("  Your pick(s): ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nSaving...")
            break

        if inp.lower() == "q":
            break
        if inp:
            try:
                picks = [int(x.strip()) for x in inp.split(",") if x.strip()]
                valid = [p for p in picks if 1 <= p <= len(MODEL_CONFIGS)]
                if valid:
                    votes[icon_name] = valid
                else:
                    print("    Invalid numbers, skipping")
            except ValueError:
                print("    Invalid input, skipping")
        print()

    with open(VOTES_FILE, "w") as f:
        json.dump(votes, f, indent=2)
    print(f"Votes saved to {VOTES_FILE}")


# ── Tally Mode ────────────────────────────────────────────────────────────────


def cmd_tally():
    """Tally votes and show ranked results."""
    if not KEY_FILE.exists():
        print("ERROR: key.json not found. Run --generate first.")
        sys.exit(1)
    if not VOTES_FILE.exists():
        print("ERROR: votes.json not found. Run --vote first.")
        sys.exit(1)

    with open(KEY_FILE) as f:
        key_data = json.load(f)
    with open(VOTES_FILE) as f:
        votes = json.load(f)

    # Tally: model_name -> vote count
    tally = {}
    per_icon = {}

    for icon_name, picks in votes.items():
        if icon_name not in key_data:
            continue
        mapping = key_data[icon_name]
        per_icon[icon_name] = []
        for pick in picks:
            pick_str = str(pick)
            if pick_str in mapping:
                model_name = mapping[pick_str]["model"]
                tally[model_name] = tally.get(model_name, 0) + 1
                per_icon[icon_name].append(model_name)

    # Sort by votes descending
    ranked = sorted(tally.items(), key=lambda x: -x[1])
    total_votes = sum(v for _, v in ranked)

    print(f"\n{'='*50}")
    print(f"  BLIND TEST RESULTS ({total_votes} votes across {len(votes)} icons)")
    print(f"{'='*50}\n")

    for i, (model, count) in enumerate(ranked):
        bar = "#" * count
        pct = count / total_votes * 100 if total_votes > 0 else 0
        medal = ["  1st", "  2nd", "  3rd"][i] if i < 3 else f"  {i+1}th"
        print(f"{medal}  {bar:<20s} {count:>2d} votes ({pct:4.1f}%)  {model}")

    # Models with 0 votes (from models in the key, not hardcoded)
    all_models = set()
    for mapping in key_data.values():
        for info in mapping.values():
            all_models.add(info["model"])
    voted_models = set(tally.keys())
    unvoted = all_models - voted_models
    if unvoted:
        print(f"\n  No votes: {', '.join(sorted(unvoted))}")

    # Per-icon breakdown
    print(f"\n{'─'*50}")
    print("  Per-icon winners:")
    for icon_name, models in per_icon.items():
        icon_short = icon_name.replace(".png", "").replace("_", " ")
        print(f"    {icon_short}: {', '.join(models)}")

    print()


# ── Comparison Mode ───────────────────────────────────────────────────────────


def cmd_comparison(test_icons, active_configs):
    """Generate a single labelled comparison image: rows of Original | Model1 | Model2 ..."""
    from PIL import Image, ImageDraw, ImageFont

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Validate icons
    valid_icons = []
    for icon in test_icons:
        if (IMAGES_DIR / icon).exists():
            valid_icons.append(icon)
        else:
            print(f"WARNING: Icon not found, skipping: {icon}")

    if not valid_icons:
        print("ERROR: No valid test icons found.")
        sys.exit(1)

    n_models = len(active_configs)
    n_cols = 1 + n_models  # original + models
    img_size = 128
    cell_w = img_size + 16  # image + padding
    header_h = 30
    label_col_w = 200  # left label column for icon name
    row_h = img_size + 8

    grid_w = label_col_w + n_cols * cell_w
    grid_h = header_h + len(valid_icons) * row_h

    grid = Image.new("RGB", (grid_w, grid_h), (40, 40, 40))
    draw = ImageDraw.Draw(grid)

    try:
        font_header = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 12)
        font_label = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 10)
    except (OSError, IOError):
        font_header = ImageFont.load_default()
        font_label = font_header

    # Column headers
    x = label_col_w + (cell_w - img_size) // 2
    draw.text((x, 8), "Original", fill=(180, 180, 180), font=font_header)
    for i, config in enumerate(active_configs):
        x = label_col_w + (1 + i) * cell_w + 4
        # Truncate long names
        name = config["name"]
        if len(name) > 18:
            name = name[:17] + ".."
        draw.text((x, 8), name, fill=(255, 255, 200), font=font_header)

    # Separator
    draw.line([(0, header_h - 1), (grid_w, header_h - 1)], fill=(80, 80, 80))

    print(f"Generating comparison: {len(valid_icons)} icons x {n_models} models")
    print(f"Models: {', '.join(c['name'] for c in active_configs)}")

    t0 = time.time()

    for row_idx, icon_name in enumerate(valid_icons):
        icon_path = IMAGES_DIR / icon_name
        icon_stem = icon_name.replace(".png", "").replace("_", " ")
        y = header_h + row_idx * row_h + 4
        print(f"  [{row_idx + 1}/{len(valid_icons)}] {icon_name}...", end=" ", flush=True)

        # Row label
        draw.text((4, y + img_size // 2 - 6), icon_stem[:25], fill=(160, 160, 160), font=font_label)

        # Alternating row background
        if row_idx % 2 == 1:
            draw.rectangle(
                [label_col_w, y - 4, grid_w, y + img_size + 4],
                fill=(50, 50, 50),
            )

        # Original (scaled up with nearest-neighbor to 128x128 for visibility)
        orig = Image.open(icon_path).convert("RGBA")
        orig_up = orig.resize((img_size, img_size), Image.NEAREST)
        checker = make_checkerboard(img_size, img_size, cell_size=8)
        checker.paste(orig_up, mask=orig_up.split()[3])
        ox = label_col_w + (cell_w - img_size) // 2
        grid.paste(checker, (ox, y))

        # Each model
        with tempfile.TemporaryDirectory() as tmpdir:
            for i, config in enumerate(active_configs):
                tmp_out = os.path.join(tmpdir, f"{config['id']}.png")
                ok = run_upscaler(config, str(icon_path), tmp_out)

                cx = label_col_w + (1 + i) * cell_w + (cell_w - img_size) // 2

                if ok and os.path.exists(tmp_out):
                    img = Image.open(tmp_out).convert("RGBA")
                    if img.size != (img_size, img_size):
                        img = img.resize((img_size, img_size), Image.LANCZOS)
                    checker = make_checkerboard(img_size, img_size, cell_size=8)
                    checker.paste(img, mask=img.split()[3])
                    grid.paste(checker, (cx, y))
                else:
                    draw.rectangle([cx, y, cx + img_size, y + img_size], fill=(60, 20, 20))
                    draw.text((cx + 30, y + 55), "FAILED", fill=(255, 80, 80), font=font_label)

        print("OK")

    out_path = OUTPUT_DIR / "comparison.png"
    grid.save(out_path)
    elapsed = time.time() - t0
    print(f"\nDone in {elapsed:.1f}s -> {out_path}")


# ── Main ──────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(description="Blind A/B test for upscaler models")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--generate", action="store_true", help="Generate grid comparison images")
    group.add_argument("--vote", action="store_true", help="Interactive voting on grids")
    group.add_argument("--tally", action="store_true", help="Tally votes and show results")
    parser.add_argument("--icons", type=str, help="Comma-separated list of icon filenames to test")
    parser.add_argument("--models", type=str, help="Comma-separated exact model names to include")
    group.add_argument("--comparison", action="store_true", help="Generate labelled side-by-side comparison image")

    args = parser.parse_args()

    if args.comparison:
        if args.icons:
            icons = [i.strip() for i in args.icons.split(",")]
        else:
            icons = DEFAULT_TEST_ICONS

        if args.models:
            filters = [m.strip() for m in args.models.split(",")]
            active = [c for c in MODEL_CONFIGS if c["name"] in filters]
            if not active:
                print(f"ERROR: No models matched: {filters}")
                print(f"Available: {', '.join(c['name'] for c in MODEL_CONFIGS)}")
                sys.exit(1)
        else:
            active = MODEL_CONFIGS

        cmd_comparison(icons, active)
    elif args.generate:
        if args.icons:
            icons = [i.strip() for i in args.icons.split(",")]
        else:
            icons = DEFAULT_TEST_ICONS

        if args.models:
            filters = [m.strip() for m in args.models.split(",")]
            active = [c for c in MODEL_CONFIGS if c["name"] in filters]
            if not active:
                print(f"ERROR: No models matched filters: {filters}")
                print(f"Available: {', '.join(c['name'] for c in MODEL_CONFIGS)}")
                sys.exit(1)
        else:
            active = MODEL_CONFIGS

        cmd_generate(icons, active)
    elif args.vote:
        cmd_vote()
    elif args.tally:
        cmd_tally()


if __name__ == "__main__":
    main()
