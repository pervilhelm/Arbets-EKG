"""Render public/strips as contact sheets (10 strips per image) for visual review.

Usage: scripts/ecg/.venv/bin/python scripts/ecg/contact_sheet.py [--only <prefix>]
Writes scripts/ecg/.cache/contact/sheet-<n>.png. The images are not committed.
12-lead strips use the standard 3 x 4 layout plus a lead II rhythm strip.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
STRIPS_DIR = ROOT / "public" / "strips"
OUT_DIR = Path(__file__).resolve().parent / ".cache" / "contact"
LAYOUT = [["I", "aVR", "V1", "V4"], ["II", "aVL", "V2", "V5"], ["III", "aVF", "V3", "V6"]]
PER_SHEET = 10
ROW_MV = 3.0  # vertical space per row


def draw(ax: plt.Axes, strip: dict) -> None:
    fs = strip["fs"]
    leads = strip["leads"]
    ax.set_title(f"{strip['id']}  ({strip['dataset']} {strip['record']} @{strip['startSec']}s)", fontsize=9, loc="left")
    ax.set_xticks(np.arange(0, 10.01, 0.2), minor=False)
    ax.set_yticks(np.arange(-20, 2, 0.5))
    ax.grid(True, color="#f2b8b8", linewidth=0.4)
    ax.tick_params(labelbottom=False, labelleft=False, length=0)
    if "I" in leads:
        rows = [*LAYOUT, ["II"]]
        for r, row in enumerate(rows):
            y0 = -r * ROW_MV
            seg = 10.0 / len(row)
            for c, lead in enumerate(row):
                x = np.asarray(leads[lead])
                i0, i1 = int(c * seg * fs), int((c + 1) * seg * fs)
                t = np.arange(i0, i1) / fs
                ax.plot(t, x[i0:i1] - np.median(x) + y0, color="black", linewidth=0.5)
                ax.text(c * seg + 0.05, y0 + 0.9, lead, fontsize=7)
        ax.set_ylim(-len(rows) * ROW_MV + 1.2, 1.6)
    else:
        (lead, values), *_ = leads.items()
        x = np.asarray(values)
        ax.plot(np.arange(len(x)) / fs, x - np.median(x), color="black", linewidth=0.6)
        ax.text(0.05, 1.2, lead, fontsize=7)
        ax.set_ylim(-2, 2)
    ax.set_xlim(0, 10)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--only", help="strip id prefix, e.g. ves-trioler")
    args = parser.parse_args()
    files = sorted(STRIPS_DIR.glob(f"{args.only or ''}*.json"))
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for old in OUT_DIR.glob("sheet-*.png"):
        old.unlink()
    for n in range(0, len(files), PER_SHEET):
        batch = [json.loads(f.read_text()) for f in files[n : n + PER_SHEET]]
        heights = [5 if "I" in s["leads"] else 1.6 for s in batch]
        fig, axes = plt.subplots(len(batch), 1, figsize=(16, sum(heights) * 1.1), gridspec_kw={"height_ratios": heights})
        for ax, strip in zip(np.atleast_1d(axes), batch):
            draw(ax, strip)
        fig.tight_layout()
        out = OUT_DIR / f"sheet-{n // PER_SHEET + 1}.png"
        fig.savefig(out, dpi=70)
        plt.close(fig)
        print(out)


if __name__ == "__main__":
    main()
