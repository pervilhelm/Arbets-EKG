"""Extract real ECG strips from PhysioNet for the finding cards.

Usage (from the repo root, with the venv in scripts/ecg/.venv):
  scripts/ecg/.venv/bin/python scripts/ecg/extract_strips.py --inventory mitdb
  scripts/ecg/.venv/bin/python scripts/ecg/extract_strips.py --inventory ptb-xl
  scripts/ecg/.venv/bin/python scripts/ecg/extract_strips.py

Selection is driven by scripts/ecg/strip_map.yaml. Output goes to
public/strips/<finding-id>-<n>.json and the stripIds of each finding are
updated. The selection uses a fixed seed, so re-running gives identical files.

strip_map.yaml maps each finding id to one selection, or a list of selections
whose strips are numbered in order. Keys per selection:
  dataset:   mitdb | ptb-xl
  count:     number of strips to extract
  mitdb, one of:
    rhythm:  rhythm code from aux_note, e.g. "(SVTA"
    beats:   beat symbol sequence, e.g. "NVVVN"; the window centres on its middle beat
  mitdb, optional:
    min_sec:   minimum rhythm episode length
    min_rate:  minimum mean rate (bpm) within a rhythm episode
    in_rhythm: rhythm that must be active at the window centre, e.g. "(N"
    multiform: true requires two ventricular beats with clearly different QRS shape
    records:   only use these records
    exclude_records: never use these records
    max_count: maximum number of beats per symbol in the window, e.g. {V: 1}
  ptb-xl:
    scp:       SCP code or list of codes; one must be present
    require_scp: codes that must all be present as well
    exclude_scp: codes that must not be present
"""

from __future__ import annotations

import argparse
import json
import random
import sys
import urllib.request
import zlib
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd
import wfdb
import yaml
from scipy.signal import resample_poly
from wfdb.io.annotation import ann_label_table, is_qrs

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
CACHE = HERE / ".cache"
STRIPS_DIR = ROOT / "public" / "strips"
FINDINGS_DIR = ROOT / "content" / "findings"
SOURCES_FILE = ROOT / "content" / "sources.json"

MITDB = "mitdb/1.0.0"
PTBXL = "ptb-xl/1.0.3"
PTBXL_FILES = f"https://physionet.org/files/{PTBXL}/"

SEED = 20260930
OUT_FS = 250
WINDOW_SEC = 10.0
# Records 102 and 104 have no MLII (modified V5 instead), see mitdbdir/intro.htm.
MITDB_RECORDS = [
    "100", "101", "102", "103", "104", "105", "106", "107", "108", "109", "111", "112", "113", "114",
    "115", "116", "117", "118", "119", "121", "122", "123", "124", "200", "201", "202", "203", "205",
    "207", "208", "209", "210", "212", "213", "214", "215", "217", "219", "220", "221", "222", "223",
    "228", "230", "231", "232", "233", "234",
]  # fmt: skip
BEAT_SYMBOLS = set(ann_label_table[ann_label_table.label_store.map(lambda s: is_qrs[s])].symbol)
QUALITY_SYMBOLS = {"~", "|"}
PTBXL_LEADS = {"AVR": "aVR", "AVL": "aVL", "AVF": "aVF"}


# --- MIT-BIH -------------------------------------------------------------------


@dataclass
class Episode:
    record: str
    rhythm: str
    start: float
    end: float


@dataclass
class MitRecord:
    name: str
    fs: float
    length: float
    has_mlii: bool
    beat_times: np.ndarray
    beat_symbols: list[str]
    episodes: list[Episode]
    quality_times: np.ndarray

    def rhythm_at(self, t: float) -> str | None:
        for e in self.episodes:
            if e.start <= t < e.end:
                return e.rhythm
        return None


_mit_cache: dict[str, MitRecord] = {}


def load_mit(name: str) -> MitRecord:
    if name in _mit_cache:
        return _mit_cache[name]
    header = wfdb.rdheader(name, pn_dir=MITDB)
    ann = wfdb.rdann(name, "atr", pn_dir=MITDB)
    fs = float(header.fs)
    length = header.sig_len / fs
    times = ann.sample / fs
    beats = [(t, s) for t, s in zip(times, ann.symbol) if s in BEAT_SYMBOLS]
    episodes: list[Episode] = []
    for t, s, aux in zip(times, ann.symbol, ann.aux_note):
        if s == "+" and aux.strip().startswith("("):
            if episodes:
                episodes[-1].end = t
            episodes.append(Episode(name, aux.strip().rstrip("\x00"), t, length))
    rec = MitRecord(
        name=name,
        fs=fs,
        length=length,
        has_mlii="MLII" in header.sig_name,
        beat_times=np.array([t for t, _ in beats]),
        beat_symbols=[s for _, s in beats],
        episodes=episodes,
        quality_times=np.array([t for t, s in zip(times, ann.symbol) if s in QUALITY_SYMBOLS]),
    )
    _mit_cache[name] = rec
    return rec


_signal_cache: dict[str, np.ndarray] = {}


def mit_signal(rec: MitRecord) -> np.ndarray:
    if rec.name not in _signal_cache:
        r = wfdb.rdrecord(rec.name, pn_dir=MITDB, channel_names=["MLII"])
        _signal_cache[rec.name] = r.p_signal[:, 0]
    return _signal_cache[rec.name]


def inventory_mitdb() -> None:
    rhythms: dict[str, list[Episode]] = defaultdict(list)
    beat_counts: Counter[str] = Counter()
    runs: Counter[tuple[str, int]] = Counter()
    no_mlii = []
    for name in MITDB_RECORDS:
        rec = load_mit(name)
        if not rec.has_mlii:
            no_mlii.append(name)
        for e in rec.episodes:
            rhythms[e.rhythm].append(e)
        beat_counts.update(rec.beat_symbols)
        seq = "".join(rec.beat_symbols)
        i = 0
        while i < len(seq):
            j = i
            while j < len(seq) and seq[j] == seq[i]:
                j += 1
            if seq[i] in "VAS":
                runs[(seq[i], min(j - i, 5))] += 1
            i = j
    print(f"Records without MLII: {', '.join(no_mlii)}\n")
    print("Rhythm codes (aux_note): episodes, total s, longest s, records")
    for code, eps in sorted(rhythms.items()):
        durs = [e.end - e.start for e in eps]
        recs = sorted({e.record for e in eps})
        print(f"  {code:8} {len(eps):5} {sum(durs):8.0f} {max(durs):8.1f}  {' '.join(recs)}")
    print("\nBeat symbols: count")
    for sym, n in beat_counts.most_common():
        print(f"  {sym:3} {n:7}")
    print("\nRuns of identical ectopic beats (length 5 means 5 or more): count")
    for (sym, n), c in sorted(runs.items()):
        print(f"  {sym * n:6} {c:6}")


def clean_window(rec: MitRecord, start: float) -> bool:
    end = start + WINDOW_SEC
    if start < 0 or end > rec.length:
        return False
    q = rec.quality_times
    return not np.any((q >= start) & (q < end))


def episode_rate(rec: MitRecord, e: Episode) -> float:
    t = rec.beat_times[(rec.beat_times >= e.start) & (rec.beat_times < e.end)]
    return 60 / float(np.mean(np.diff(t))) if len(t) > 2 else 0.0


def within_max_count(rec: MitRecord, start: float, limits: dict[str, int]) -> bool:
    in_window = (rec.beat_times >= start) & (rec.beat_times < start + WINDOW_SEC)
    counts = Counter(sym for sym, inside in zip(rec.beat_symbols, in_window) if inside)
    return all(counts[sym] <= n for sym, n in limits.items())


def is_multiform(rec: MitRecord, start: float) -> bool:
    """True when two ventricular beats in the window have clearly different QRS shapes."""
    sig = mit_signal(rec)
    half = int(0.06 * rec.fs)
    shapes = []
    for t, s in zip(rec.beat_times, rec.beat_symbols):
        if s == "V" and start + 0.2 <= t < start + WINDOW_SEC - 0.2:
            i = int(round(t * rec.fs))
            seg = sig[i - half : i + half]
            shapes.append(seg - seg.mean())
    for a in range(len(shapes)):
        for b in range(a + 1, len(shapes)):
            if np.corrcoef(shapes[a], shapes[b])[0, 1] < 0.5:
                return True
    return False


def mit_candidates(cfg: dict) -> list[tuple[str, float]]:
    """Window start times (record, start sec) that contain the finding in the middle."""
    excluded = {str(r) for r in cfg.get("exclude_records", [])}
    names = [str(r) for r in cfg.get("records", MITDB_RECORDS) if str(r) not in excluded]
    out: list[tuple[str, float]] = []
    for name in names:
        rec = load_mit(name)
        if not rec.has_mlii:
            continue
        starts: list[float] = []
        if "rhythm" in cfg:
            for e in rec.episodes:
                dur = e.end - e.start
                if e.rhythm != cfg["rhythm"] or dur < cfg.get("min_sec", 0):
                    continue
                if episode_rate(rec, e) < cfg.get("min_rate", 0):
                    continue
                # Short episodes are centred. Long ones get a window starting 2 s
                # before onset (transition plus 8 s of the finding) and windows
                # that lie entirely inside the episode.
                if dur < 8:
                    starts.append(e.start + dur / 2 - WINDOW_SEC / 2)
                else:
                    starts.append(e.start - 2)
                    inner = e.start + 8
                    while inner + WINDOW_SEC <= e.end:
                        starts.append(inner)
                        inner += WINDOW_SEC
        else:
            pattern = cfg["beats"]
            seq = "".join(rec.beat_symbols)
            mid = len(pattern) // 2
            pos = seq.find(pattern)
            while pos >= 0:
                centre = float(rec.beat_times[pos + mid])
                if "in_rhythm" not in cfg or rec.rhythm_at(centre) == cfg["in_rhythm"]:
                    starts.append(centre - WINDOW_SEC / 2)
                pos = seq.find(pattern, pos + 1)
        for s in starts:
            if not within_max_count(rec, s, cfg.get("max_count", {})):
                continue
            if clean_window(rec, s) and (not cfg.get("multiform") or is_multiform(rec, s)):
                out.append((name, round(s, 3)))
    return out


def extract_mit(name: str, start: float) -> tuple[dict[str, list[float]], float]:
    rec = load_mit(name)
    i0 = int(round(start * rec.fs))
    i1 = i0 + int(round(WINDOW_SEC * rec.fs))
    r = wfdb.rdrecord(name, pn_dir=MITDB, sampfrom=i0, sampto=i1, channel_names=["MLII"])
    assert r.units[0] == "mV", r.units
    x = resample_poly(r.p_signal[:, 0], OUT_FS, int(rec.fs))
    return {"MLII": to_mv_list(x)}, i0 / rec.fs


# --- PTB-XL ------------------------------------------------------------------


def ptbxl_file(name: str) -> Path:
    path = CACHE / "ptb-xl" / name
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        print(f"Downloading {name}", file=sys.stderr)
        urllib.request.urlretrieve(PTBXL_FILES + name, path)
    return path


def ptbxl_eligible() -> pd.DataFrame:
    """Folds 9 and 10, validated by a human, no quality remarks."""
    db = pd.read_csv(ptbxl_file("ptbxl_database.csv"), index_col="ecg_id")
    db["scp"] = db.scp_codes.map(lambda s: eval(s, {}, {}))  # dict literal from the dataset
    ok = db.strat_fold.isin([9, 10]) & db.validated_by_human.astype(bool)
    for col in ["baseline_drift", "static_noise", "burst_noise", "electrodes_problems", "pacemaker"]:
        ok &= db[col].isna()
    return db[ok]


def inventory_ptbxl() -> None:
    scp = pd.read_csv(ptbxl_file("scp_statements.csv"), index_col=0)
    db = ptbxl_eligible()
    counts: Counter[str] = Counter()
    for codes in db.scp:
        counts.update(codes.keys())
    print(f"Eligible records (fold 9-10, validated_by_human, no quality remarks): {len(db)}\n")
    print("SCP code, eligible records, statement category, description")
    for code, row in scp.iterrows():
        kind = "diag" if row.diagnostic == 1 else "form" if row.form == 1 else "rhythm" if row.rhythm == 1 else "-"
        print(f"  {code:8} {counts.get(code, 0):5}  {kind:6} {row.description}")


def ptb_candidates(cfg: dict) -> list[tuple[str, float]]:
    wanted = cfg["scp"] if isinstance(cfg["scp"], list) else [cfg["scp"]]
    excluded = set(cfg.get("exclude_scp", []))
    required = set(cfg.get("require_scp", []))
    db = ptbxl_eligible()
    rows = []
    for ecg_id, codes in db.scp.items():
        if excluded & codes.keys() or not required <= codes.keys():
            continue
        hit = [codes[c] for c in wanted if c in codes]
        if hit:
            rows.append((max(hit), int(ecg_id)))
    if not rows:
        return []
    best = max(likelihood for likelihood, _ in rows)  # prefer the most certain labels
    return [(str(ecg_id), 0.0) for likelihood, ecg_id in sorted(rows) if likelihood == best]


def extract_ptb(ecg_id: str) -> tuple[dict[str, list[float]], float]:
    db = pd.read_csv(ptbxl_file("ptbxl_database.csv"), index_col="ecg_id")
    path = db.loc[int(ecg_id), "filename_hr"]
    subdir, name = path.rsplit("/", 1)
    r = wfdb.rdrecord(name, pn_dir=f"{PTBXL}/{subdir}")
    assert int(r.fs) == 500 and all(u == "mV" for u in r.units), (r.fs, r.units)
    leads = {}
    for i, name in enumerate(r.sig_name):
        leads[PTBXL_LEADS.get(name.upper(), name.upper())] = to_mv_list(resample_poly(r.p_signal[:, i], 1, 2))
    return leads, 0.0


# --- Output ------------------------------------------------------------------


def to_mv_list(x: np.ndarray) -> list[float]:
    return [float(v) + 0.0 for v in np.round(x, 3)]  # + 0.0 turns -0.0 into 0.0


def pick(candidates: list[tuple[str, float]], count: int, finding_id: str) -> list[tuple[str, float]]:
    """Deterministic pick that spreads strips over different records and never overlaps."""
    rng = random.Random(SEED + zlib.crc32(finding_id.encode()))
    pool = sorted(candidates)
    rng.shuffle(pool)
    chosen: list[tuple[str, float]] = []
    for distinct_records in (True, False):
        for rec, start in pool:
            if len(chosen) >= count:
                break
            if distinct_records and any(r == rec for r, _ in chosen):
                continue
            if any(r == rec and abs(s - start) < WINDOW_SEC for r, s in chosen):
                continue
            chosen.append((rec, start))
    return chosen


def citation_for(sources: list[dict], dataset: str) -> tuple[str, str]:
    src = next(s for s in sources if s["id"] == dataset)
    return src["license"], src["citation"]


def update_finding(finding_id: str, strip_ids: list[str]) -> None:
    path = FINDINGS_DIR / f"{finding_id}.json"
    finding = json.loads(path.read_text())
    if "ecg" not in finding:
        finding["ecg"] = {"stripIds": []}
    if finding["ecg"]["stripIds"] == strip_ids:
        return  # leave the file untouched so formatting stays stable
    finding["ecg"]["stripIds"] = strip_ids
    path.write_text(json.dumps(finding, ensure_ascii=False, indent=2) + "\n")


def extract(only: str | None) -> None:
    strip_map = yaml.safe_load((HERE / "strip_map.yaml").read_text())
    sources = json.loads(SOURCES_FILE.read_text())
    STRIPS_DIR.mkdir(parents=True, exist_ok=True)
    missing = []
    for finding_id, entry in strip_map.items():
        if only and finding_id != only:
            continue
        for old in STRIPS_DIR.glob(f"{finding_id}-*.json"):
            old.unlink()
        strip_ids: list[str] = []
        for cfg in entry if isinstance(entry, list) else [entry]:
            dataset = cfg["dataset"]
            count = cfg.get("count", 1)
            candidates = mit_candidates(cfg) if dataset == "mitdb" else ptb_candidates(cfg)
            chosen = pick(candidates, count, f"{finding_id}-{len(strip_ids)}")
            license_, citation = citation_for(sources, dataset)
            for record, start in chosen:
                leads, start_sec = extract_mit(record, start) if dataset == "mitdb" else extract_ptb(record)
                strip_id = f"{finding_id}-{len(strip_ids) + 1}"
                strip = {
                    "id": strip_id,
                    "findingId": finding_id,
                    "dataset": dataset,
                    "record": record,
                    "startSec": round(start_sec, 3),
                    "fs": OUT_FS,
                    "leads": leads,
                    "license": license_,
                    "citation": citation,
                    "review": {"status": "utkast"},
                }
                out = json.dumps(strip, ensure_ascii=False, separators=(",", ":")) + "\n"
                (STRIPS_DIR / f"{strip_id}.json").write_text(out)
                strip_ids.append(strip_id)
            where = ", ".join(f"{r}@{s:.1f}s" for r, s in chosen)
            print(f"{finding_id:20} {dataset:7} candidates {len(candidates):5}  chosen {len(chosen)}/{count}  {where}")
            if len(chosen) < count:
                missing.append(finding_id)
        update_finding(finding_id, strip_ids)
    if missing:
        print(f"\nToo few segments for: {', '.join(missing)}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--inventory", choices=["mitdb", "ptb-xl"], help="list annotation codes and exit")
    parser.add_argument("--only", help="extract a single finding id")
    args = parser.parse_args()
    if args.inventory == "mitdb":
        inventory_mitdb()
    elif args.inventory == "ptb-xl":
        inventory_ptbxl()
    else:
        extract(args.only)


if __name__ == "__main__":
    main()
