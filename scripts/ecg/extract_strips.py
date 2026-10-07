"""Extract real ECG strips from PhysioNet for the finding cards.

Usage (from the repo root, with the venv in scripts/ecg/.venv):
  scripts/ecg/.venv/bin/python scripts/ecg/extract_strips.py --inventory mitdb
  scripts/ecg/.venv/bin/python scripts/ecg/extract_strips.py --inventory ptb-xl
  scripts/ecg/.venv/bin/python scripts/ecg/extract_strips.py --inventory incartdb
  scripts/ecg/.venv/bin/python scripts/ecg/extract_strips.py

Selection is driven by scripts/ecg/strip_map.yaml. Output goes to
public/strips/<key>-<n>.json and the stripIds of each finding are updated. The
key "normal" holds normal ECGs that belong to no finding. The selection uses a
fixed seed, so re-running gives identical files.

strip_map.yaml maps each key to one selection, or a list of selections whose
strips are numbered in order. Keys per selection:
  dataset:   mitdb | incartdb | ptb-xl
  count:     number of strips to extract
  mitdb and incartdb (beat-annotated), one of:
    rhythm:  rhythm code from aux_note, e.g. "(SVTA" (mitdb only)
    beats:   beat symbol sequence, e.g. "NVVVN"; the window centres on its middle beat
  mitdb and incartdb, optional:
    min_sec:   minimum rhythm episode length
    min_rate:  minimum mean rate (bpm) within a rhythm episode or the matched beats
    in_rhythm: rhythm that must be active at the window centre, e.g. "(N" (mitdb only)
    multiform: true requires two ventricular beats with clearly different QRS shape
    records:   only use these records
    exclude_records: never use these records
    max_count: maximum number of beats per symbol in the window, e.g. {V: 1}
  incartdb, optional:
    clean:     true skips windows with baseline wander or high-frequency noise in any lead
  ptb-xl:
    scp:       SCP code or list of codes; one must be present
    require_scp: codes that must all be present as well
    exclude_scp: codes that must not be present
    rate_bins: [[lo, hi], ...] picks one record per heart-rate bin (bpm, lead II)

mitdb strips hold one lead (MLII). incartdb and ptb-xl strips hold the 12
standard leads I, II, III, aVR, aVL, aVF, V1-V6.
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
from scipy.ndimage import median_filter
from scipy.signal import find_peaks, resample_poly
from wfdb.io.annotation import ann_label_table, is_qrs

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
CACHE = HERE / ".cache"
STRIPS_DIR = ROOT / "public" / "strips"
FINDINGS_DIR = ROOT / "content" / "findings"
SOURCES_FILE = ROOT / "content" / "sources.json"

MITDB = "mitdb/1.0.0"
INCART = "incartdb/1.0.0"
PTBXL = "ptb-xl/1.0.3"
# PhysioNet's open-data mirror on S3: same files, much faster and steadier than physionet.org.
S3 = "https://physionet-open.s3.amazonaws.com"
PTBXL_FILES = f"{S3}/{PTBXL}/"

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
INCART_RECORDS = [f"I{i:02d}" for i in range(1, 76)]
# INCART has no noise annotations and no rhythm annotations. Records whose header
# describes noise, a non-sinus baseline rhythm or a conduction disorder that
# changes every QRS are skipped, so the finding is the only abnormality.
INCART_EXCLUDE_WORDS = ["noise", "baseline wander", "positional", "atrial fibrillation", "WPW", "bundle branch", "bundle-branch"]
PN_DIR = {"mitdb": MITDB, "incartdb": INCART}
RECORDS = {"mitdb": MITDB_RECORDS, "incartdb": INCART_RECORDS}
# Where a matched beat pattern lands in the window. 12-lead strips are shown as
# 3 x 4 columns of 2.5 s, so the event sits mid-column (V1-V3) instead of on the
# 5 s column boundary.
EVENT_AT = {"mitdb": WINDOW_SEC / 2, "incartdb": 6.25}
# Lead used for the multiform check and rate estimates.
RHYTHM_LEAD = {"mitdb": "MLII", "incartdb": "II"}
BEAT_SYMBOLS = set(ann_label_table[ann_label_table.label_store.map(lambda s: is_qrs[s])].symbol)
QUALITY_SYMBOLS = {"~", "|"}
LEAD_NAMES = {"AVR": "aVR", "AVL": "aVL", "AVF": "aVF"}


# --- Beat-annotated databases: MIT-BIH and INCART ----------------------------


@dataclass
class Episode:
    record: str
    rhythm: str
    start: float
    end: float


@dataclass
class MitRecord:
    dataset: str
    name: str
    fs: float
    length: float
    usable: bool
    beat_times: np.ndarray
    beat_symbols: list[str]
    episodes: list[Episode]
    quality_times: np.ndarray

    def rhythm_at(self, t: float) -> str | None:
        for e in self.episodes:
            if e.start <= t < e.end:
                return e.rhythm
        return None


_mit_cache: dict[tuple[str, str], MitRecord] = {}


def load_mit(name: str, dataset: str = "mitdb") -> MitRecord:
    if (dataset, name) in _mit_cache:
        return _mit_cache[(dataset, name)]
    local = local_record(PN_DIR[dataset], name)
    header = wfdb.rdheader(local)
    ann = wfdb.rdann(local, "atr")
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
    if dataset == "mitdb":
        usable = "MLII" in header.sig_name
    else:
        remarks = " ".join(header.comments).lower()
        usable = not any(w.lower() in remarks for w in INCART_EXCLUDE_WORDS)
    rec = MitRecord(
        dataset=dataset,
        name=name,
        fs=fs,
        length=length,
        usable=usable,
        beat_times=np.array([t for t, _ in beats]),
        beat_symbols=[s for _, s in beats],
        episodes=episodes,
        quality_times=np.array([t for t, s in zip(times, ann.symbol) if s in QUALITY_SYMBOLS]),
    )
    _mit_cache[(dataset, name)] = rec
    return rec


_signal_cache: dict[tuple[str, str], np.ndarray] = {}


def local_record(pn_dir: str, name: str, exts: tuple[str, ...] = ("hea", "dat", "atr")) -> str:
    """Download a record once to the cache and return its local path without extension."""
    for ext in exts:
        path = CACHE / pn_dir / f"{name}.{ext}"
        if not path.exists():
            path.parent.mkdir(parents=True, exist_ok=True)
            print(f"Downloading {pn_dir}/{name}.{ext}", file=sys.stderr)
            urllib.request.urlretrieve(f"{S3}/{pn_dir}/{name}.{ext}", path)
    return str(CACHE / pn_dir / name)


def read_record(dataset: str, name: str, **kwargs):
    return wfdb.rdrecord(local_record(PN_DIR[dataset], name), **kwargs)


def mit_signal(rec: MitRecord) -> np.ndarray:
    key = (rec.dataset, rec.name)
    if key not in _signal_cache:
        lead = RHYTHM_LEAD[rec.dataset]
        r = read_record(rec.dataset, rec.name, channel_names=[lead])
        _signal_cache[key] = r.p_signal[:, 0]
    return _signal_cache[key]


def inventory_mitdb() -> None:
    rhythms: dict[str, list[Episode]] = defaultdict(list)
    beat_counts: Counter[str] = Counter()
    runs: Counter[tuple[str, int]] = Counter()
    no_mlii = []
    for name in MITDB_RECORDS:
        rec = load_mit(name)
        if not rec.usable:
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


def inventory_incartdb() -> None:
    """Per record: header remarks, beat counts and runs of ectopic beats with their rate."""
    for name in INCART_RECORDS:
        rec = load_mit(name, "incartdb")
        header = wfdb.rdheader(local_record(INCART, name))
        seq = "".join(rec.beat_symbols)
        runs = []
        i = 0
        while i < len(seq):
            j = i
            while j < len(seq) and seq[j] == seq[i]:
                j += 1
            if seq[i] in "VAS" and j - i >= 3:
                t = rec.beat_times[i:j]
                runs.append(f"{seq[i]}x{j - i}@{60 * (j - i - 1) / (t[-1] - t[0]):.0f}")
            i = j
        flag = "" if rec.usable else "  [skipped]"
        print(f"{name} {dict(Counter(seq))} | {header.comments[-1]}{flag}")
        if runs:
            print(f"     runs of 3+: {' '.join(runs[:12])}{' ...' if len(runs) > 12 else ''}")


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


# Limits for "clean", set from the contact sheet: the 2 s running median of every
# lead may move at most MAX_BASELINE_MV, and the median absolute residual after a
# 35 ms median filter may be at most MAX_NOISE_MV.
MAX_BASELINE_MV = 1.0
MAX_NOISE_MV = 0.010


def is_clean(dataset: str, name: str, start: float) -> bool:
    rec = load_mit(name, dataset)
    i0 = int(round(start * rec.fs))
    x = read_record(dataset, name, sampfrom=i0, sampto=i0 + int(round(WINDOW_SEC * rec.fs))).p_signal
    baseline = median_filter(x, (int(2 * rec.fs), 1), mode="nearest")
    noise = np.median(np.abs(x - median_filter(x, (9, 1))), axis=0)
    return float(np.ptp(baseline, axis=0).max()) <= MAX_BASELINE_MV and float(noise.max()) <= MAX_NOISE_MV


def mit_candidates(cfg: dict) -> list[tuple[str, float]]:
    """Window start times (record, start sec) that contain the finding in the middle."""
    dataset = cfg["dataset"]
    excluded = {str(r) for r in cfg.get("exclude_records", [])}
    names = [str(r) for r in cfg.get("records", RECORDS[dataset]) if str(r) not in excluded]
    out: list[tuple[str, float]] = []
    for name in names:
        rec = load_mit(name, dataset)
        if not rec.usable:
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
                t = rec.beat_times[pos : pos + len(pattern)]
                rate = 60 * (len(t) - 1) / float(t[-1] - t[0]) if len(t) > 1 else 0.0
                in_rhythm = "in_rhythm" not in cfg or rec.rhythm_at(centre) == cfg["in_rhythm"]
                if in_rhythm and rate >= cfg.get("min_rate", 0):
                    starts.append(centre - EVENT_AT[dataset])
                pos = seq.find(pattern, pos + 1)
        for s in starts:
            if not within_max_count(rec, s, cfg.get("max_count", {})):
                continue
            if clean_window(rec, s) and (not cfg.get("multiform") or is_multiform(rec, s)):
                out.append((name, round(s, 3)))
    return out


def extract_mit(name: str, start: float, dataset: str = "mitdb") -> tuple[dict[str, list[float]], float]:
    rec = load_mit(name, dataset)
    i0 = int(round(start * rec.fs))
    i1 = i0 + int(round(WINDOW_SEC * rec.fs))
    channels = ["MLII"] if dataset == "mitdb" else None
    r = read_record(dataset, name, sampfrom=i0, sampto=i1, channel_names=channels)
    assert all(u == "mV" for u in r.units), r.units
    leads = {}
    for i, lead in enumerate(r.sig_name):
        x = resample_poly(r.p_signal[:, i], OUT_FS, int(rec.fs))
        leads[LEAD_NAMES.get(lead.upper(), lead.upper()) if dataset != "mitdb" else lead] = to_mv_list(x)
    return leads, i0 / rec.fs


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


def heart_rate(lead_ii: list[float]) -> float:
    """Rough rate from R peaks in lead II at OUT_FS; good enough to bin normal ECGs."""
    x = np.asarray(lead_ii)
    x = x - np.median(x)
    peaks, _ = find_peaks(np.abs(x), height=0.6 * np.percentile(np.abs(x), 99.5), distance=int(0.33 * OUT_FS))
    return 60 / float(np.median(np.diff(peaks)) / OUT_FS) if len(peaks) > 2 else 0.0


def pick_by_rate(candidates: list[tuple[str, float]], bins: list[list[float]], key: str) -> list[tuple[str, float]]:
    """One ptb-xl record per heart-rate bin, in a deterministic order."""
    rng = random.Random(SEED + zlib.crc32(key.encode()))
    pool = sorted(candidates)
    rng.shuffle(pool)
    chosen: list[tuple[str, float]] = []
    for lo, hi in bins:
        for rec, start in pool:
            if (rec, start) in chosen:
                continue
            if lo <= heart_rate(extract_ptb(rec)[0]["II"]) < hi:
                chosen.append((rec, start))
                break
    return chosen


_ptb_cache: dict[str, dict[str, list[float]]] = {}


def extract_ptb(ecg_id: str) -> tuple[dict[str, list[float]], float]:
    if ecg_id in _ptb_cache:
        return _ptb_cache[ecg_id], 0.0
    db = pd.read_csv(ptbxl_file("ptbxl_database.csv"), index_col="ecg_id")
    path = db.loc[int(ecg_id), "filename_hr"]
    subdir, name = path.rsplit("/", 1)
    r = wfdb.rdrecord(local_record(f"{PTBXL}/{subdir}", name, ("hea", "dat")))
    assert int(r.fs) == 500 and all(u == "mV" for u in r.units), (r.fs, r.units)
    leads = {}
    for i, name in enumerate(r.sig_name):
        leads[LEAD_NAMES.get(name.upper(), name.upper())] = to_mv_list(resample_poly(r.p_signal[:, i], 1, 2))
    _ptb_cache[ecg_id] = leads
    return leads, 0.0


# --- Output ------------------------------------------------------------------


def to_mv_list(x: np.ndarray) -> list[float]:
    return [float(v) + 0.0 for v in np.round(x, 2)]  # + 0.0 turns -0.0 into 0.0


def pick(
    candidates: list[tuple[str, float]], count: int, finding_id: str, accept=lambda rec, start: True
) -> list[tuple[str, float]]:
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
            if not accept(rec, start):
                continue
            chosen.append((rec, start))
    return chosen


def citation_for(sources: list[dict], dataset: str) -> tuple[str, str]:
    src = next(s for s in sources if s["id"] == dataset)
    return src["license"], src["citation"]


NON_FINDING_KEYS = {"normal"}


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
            candidates = ptb_candidates(cfg) if dataset == "ptb-xl" else mit_candidates(cfg)
            key = f"{finding_id}-{len(strip_ids)}"
            if "rate_bins" in cfg:
                chosen = pick_by_rate(candidates, cfg["rate_bins"], key)
                count = len(cfg["rate_bins"])
            elif cfg.get("clean"):
                chosen = pick(candidates, count, key, lambda rec, start: is_clean(dataset, rec, start))
            else:
                chosen = pick(candidates, count, key)
            license_, citation = citation_for(sources, dataset)
            for record, start in chosen:
                if dataset == "ptb-xl":
                    leads, start_sec = extract_ptb(record)
                else:
                    leads, start_sec = extract_mit(record, start, dataset)
                strip_id = f"{finding_id}-{len(strip_ids) + 1}"
                strip = {
                    "id": strip_id,
                    **({} if finding_id in NON_FINDING_KEYS else {"findingId": finding_id}),
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
        if finding_id not in NON_FINDING_KEYS:
            update_finding(finding_id, strip_ids)
    if missing:
        print(f"\nToo few segments for: {', '.join(missing)}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--inventory", choices=["mitdb", "incartdb", "ptb-xl"], help="list annotation codes and exit")
    parser.add_argument("--only", help="extract a single finding id")
    args = parser.parse_args()
    if args.inventory == "mitdb":
        inventory_mitdb()
    elif args.inventory == "incartdb":
        inventory_incartdb()
    elif args.inventory == "ptb-xl":
        inventory_ptbxl()
    else:
        extract(args.only)


if __name__ == "__main__":
    main()
