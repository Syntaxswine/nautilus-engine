"""Read immutable Git objects; write review metadata and an optional ignored probe cache.

No checkout, fetch, donor modification, or runtime import is performed. Paths supplied
on the command line identify local Git databases, not runtime URLs. Python 3.11+.
"""
import argparse
import hashlib
import json
import posixpath
import re
import subprocess
from pathlib import Path

BASE = "ddfd43cf4b156eeb82b5c27772fe977ec10b0633"
AFT = "781246a668c723d5a4c5463e70534cc04b6a5641"
FARM = "279d2d34786b3e6e5c5baeeac6898e60030afdbe"
TALL = "43337a33ddfe4dff6849654c827c56e1f24e1acc"
VENDOR = f"vendor/aft/{AFT}/dist/tactics/"
LIVE = "sites/tactical-animal/dist/aft/tactics/"
STUDY = "sites/tactical-animal/dist/designer/a20b343a0234/tactics/"
ADMIN = "assets/art/exposition-administration/"
IMPORT = re.compile(r"(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)[\"'](\.[^\"']+)[\"']")
IMAGE = re.compile(r"[\"'](\.{1,2}/[^\"'`]+\.(?:png|jpe?g|webp))[\"']")
ACTORS = [
    ("horse", "horse-light-model.js", "horse-10k-data.json", "horse-worker-model-paint-v1.png"),
    ("goat", "goat-worker.js", "goat-10k-data.json", "goat-worker-model-paint-v1.png"),
    ("bull", "bull-worker.js", "bull-10k-data.json", "bull-worker-model-paint-v2.png"),
    ("cow", "cow-worker.js", "cow-10k-data.json", "cow-woman-model-paint-v1.png"),
    ("donkey", "donkey-worker.js", "donkey-10k-data.json", "donkey-worker-model-paint-v1.png"),
    ("sheep", "sheep-worker.js", "sheep-10k-data.json", "sheep-worker-model-paint-v1.png"),
    ("skunk", "skunk-worker.js", "skunk-10k-data.json", "skunk-worker-model-paint-v1.png"),
    ("pig-foreman", "pig-foreman.js", "pig-foreman-10k-data.json", "pig-foreman-model-paint-v1.png"),
    ("pig-director", "pig-director.js", "pig-director-10k-data.json", "pig-director-model-paint-v1.png"),
    ("rabbit", "rabbit-worker.js", "rabbit-10k-data.json", "rabbit-woman-model-paint-v1.png"),
    ("dog", "dog-guard.js", "dog-guard-10k-data.json", "dog-woman-model-paint-v1.png"),
    ("hen", "hen-worker.js", "hen-10k-data.json", "hen-model-paint-v1.png"),
]
AUX = {
    "cow": ["cow-neck-detail-v1.png"],
    "sheep": ["sheep-underlay-paint-v1.png"],
    "skunk": ["skunk-tail-paint-v1.png"],
    "rabbit": ["rabbit-eye-detail-v1.png"],
    "dog": ["dog-eye-detail-v1.png"],
    "hen": ["hen-underlay-paint-v1.png", "hen-tail-paint-v1.png"],
}


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")


class Source:
    def __init__(self, identity, repo, commit, url):
        self.id, self.repo, self.commit, self.url = identity, Path(repo).resolve(), commit, url
        assert re.fullmatch(r"[0-9a-f]{40}", commit)
        self.index, self.cache = {}, {}
        for row in self.git("ls-tree", "-rlz", commit).split(b"\0"):
            if not row:
                continue
            header, name = row.split(b"\t", 1)
            mode, kind, blob, size = header.decode().split()
            if kind == "blob":
                self.index[name.decode()] = (blob, int(size))

    def git(self, *args):
        return subprocess.check_output(["git", "-c", "safe.directory=" + self.repo.as_posix(),
                                        "-C", str(self.repo), *args], creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))

    def read(self, path):
        if path not in self.index:
            raise ValueError(f"Missing pinned file: {self.id}:{path}")
        if path not in self.cache:
            self.cache[path] = self.git("show", self.commit + ":" + path)
        return self.cache[path]

    def closure(self, entries, resources=(), literal_images=True):
        seen, edges = set(), []

        def visit(path):
            if path in seen:
                return
            data = self.read(path)
            seen.add(path)
            if path.endswith((".js", ".mjs")):
                code = data.decode("utf-8")
                for spec in IMPORT.findall(code):
                    child = posixpath.normpath(posixpath.join(posixpath.dirname(path), spec))
                    if child.startswith("../"):
                        raise ValueError("Escaping dependency: " + path)
                    edges.append({"from": path, "specifier": spec, "to": child, "kind": "module"})
                    visit(child)
                if literal_images:
                    for spec in IMAGE.findall(code):
                        child = posixpath.normpath(posixpath.join(posixpath.dirname(path), spec))
                        edges.append({"from": path, "specifier": spec, "to": child, "kind": "literal-image-envelope"})
                        visit(child)

        for path in [*entries, *resources]:
            visit(path)
        return sorted(seen), sorted(edges, key=lambda e: (e["from"], e["to"]))

    def describe(self, path):
        blob, size = self.index[path]
        data = self.read(path)
        assert size == len(data)
        return {"path": path, "gitBlob": blob, "bytes": size, "sha256": hashlib.sha256(data).hexdigest()}


def paints(prefix, actors):
    base = posixpath.normpath(prefix + "../assets/characters/lowpoly-proof/") + "/"
    result = []
    for species, factory, data, main in actors:
        result += [base + main, *(base + p for p in AUX.get(species, []))]
        if species == "pig-foreman":
            result.append(posixpath.normpath(prefix + "../assets/characters/model-references/pig-foreman-turnaround-v2.png"))
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--farmyard-repo", required=True)
    parser.add_argument("--tinderbox-repo", required=True)
    parser.add_argument("--cache", type=Path, help="Optional audit-only source cache; must be under this checkout's artifacts/.")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[3]
    sources = {
        "nautilus": Source("nautilus", root, BASE, "https://github.com/Syntaxswine/nautilus-engine"),
        "farmyard": Source("farmyard", args.farmyard_repo, FARM, "https://github.com/Syntaxswine/farmyard-commando"),
        "administration": Source("administration", args.tinderbox_repo, TALL, "https://github.com/Syntaxswine/tinderbox"),
    }
    one = [next(a for a in ACTORS if a[0] == "donkey")]
    actor_entries = ["animal-motion-catalog.js", "animal-motion-paint.js", "weapon-models.js"]
    live_entries = actor_entries + ["worker-locomotion.js", "battle-posture.js", "armed-idle-motion.js", "animal-motion.js", "animal-prone-motion.js"]
    outfits = ["red-hat-uniform-paint-v1.png", "hen-red-hat-paint-v1.png", "pig-director-red-hat-paint-v1.png"]
    specs = [
        ("existing-nautilus-actor-library", "nautilus", [VENDOR + e for e in actor_entries],
         [VENDOR + a[2] for a in ACTORS] + paints(VENDOR, ACTORS) + [posixpath.normpath(VENDOR + "../assets/characters/lowpoly-proof/" + f) for f in outfits], True),
        ("farmyard-all-actors-and-motion", "farmyard", [LIVE + e for e in live_entries],
         [LIVE + a[2] for a in ACTORS] + paints(LIVE, ACTORS) + [posixpath.normpath(LIVE + "../assets/characters/lowpoly-proof/" + f) for f in outfits], True),
        ("farmyard-misha-normal", "farmyard", [LIVE + e for e in ["donkey-worker.js", "animal-motion-paint.js", "weapon-models.js", "worker-locomotion.js", "battle-posture.js"]],
         [LIVE + one[0][2]] + paints(LIVE, one), False),
        ("farmyard-throw-study", "farmyard", [STUDY + "grenade-throw-motion.js"], [], False),
        ("administration-runtime", "administration", [ADMIN + "index.js"], [], False),
    ]
    groups, referenced = [], {s: set() for s in sources}
    for identity, sid, entries, resource, literal_images in specs:
        paths, edges = sources[sid].closure(entries, resource, literal_images=literal_images)
        referenced[sid].update(paths)
        files = [sources[sid].describe(p) for p in paths]
        renderer = [f for f in files if "/vendor/three." in f["path"]]
        groups.append({"id": identity, "source": sid, "entries": entries,
                       "explicitResourceEnvelope": sorted(resource), "files": paths, "edges": edges,
                       "fileCount": len(files), "bytes": sum(f["bytes"] for f in files),
                       "threeModuleBytes": sum(f["bytes"] for f in renderer),
                       "nonThreeBytes": sum(f["bytes"] for f in files if f not in renderer),
                       "literalImageEnvelope": literal_images,
                       "note": "Raw Git bytes, not compressed transfer, GPU allocation, or measured frame cost. Literal image constants, when enabled, form a conservative resource envelope. Otherwise only explicitly selected skin/data resources are included."})
    evidence = {
        "nautilus": ["NOTICE.md", "upstream.json", f"vendor/aft/{AFT}/provenance.json", VENDOR + "vendor/THREE-LICENSE.txt"],
        "farmyard": ["sites/tactical-animal/aft-provenance.json", "sites/tactical-animal/designer-provenance.json", LIVE + "vendor/THREE-LICENSE.txt", STUDY + "vendor/THREE-LICENSE.txt", LIVE + "quickplay-presets.js", "sites/tactical-animal/dist/field-view.js", "sites/tactical-animal/dist/solo-game.js"],
        "administration": [ADMIN + p for p in ["metadata.json", "manifest.json", "nautilus-assembly.json"]] + ["art/source/exposition-administration/measurements.json", "art/source/exposition-administration/sources.json", "art/source/exposition-administration/preserved-and-engine.json", "docs/art/exposition-administration/handoff.md", "docs/art/exposition-administration/check-results.json", "docs/art/exposition-administration/offline-review.json", "docs/art/exposition-administration/previews/front-isometric.jpg", "docs/art/exposition-administration/previews/structural-cutaway.jpg", "docs/art/exposition-administration/previews/stair-detail.jpg"],
    }
    for sid, paths in evidence.items():
        for path in paths:
            sources[sid].read(path)
            referenced[sid].add(path)
    for sid, source in sources.items():
        # Actual license/notice files in the selected repository are recorded;
        # their existence never implies a blanket license for every asset.
        notices = [p for p in source.index if "/" not in p and re.search(r"(?i)^(license|notice|copying)(\.|$)", p)]
        referenced[sid].update(notices)
    result = {"schemaVersion": 1, "status": "review-proposal-only", "reviewedDate": "2026-10-29", "baselineCommit": BASE,
              "donorRuntimeBytesImported": 0, "upstreamPinsChanged": False, "consumerPinsChanged": False,
              "sources": [], "closures": groups,
              "rights": "Retain embedded notices and exact provenance. Third-party Three.js is MIT; asset/code licensing is mixed or unspecified. This inventory grants no new redistribution rights.",
              "scope": "Existing art and immutable source references only; no public loader/export, cast, gameplay behavior, vendor rewrite, root build or version change."}
    for sid, source in sources.items():
        rows = [source.describe(p) for p in sorted(referenced[sid])]
        if sid == "farmyard":
            for row in rows:
                if row["path"].startswith(LIVE):
                    baseline_path = VENDOR + row["path"][len(LIVE):]
                    if baseline_path in sources["nautilus"].index:
                        old = sources["nautilus"].describe(baseline_path)
                        prior = sources["nautilus"].read(baseline_path)
                        current = source.read(row["path"])
                        row["baselineComparison"] = {"path": baseline_path, "identical": old["sha256"] == row["sha256"], "sha256": old["sha256"],
                                                     "equalAfterCRLFToLF": prior.replace(b"\r\n", b"\n") == current.replace(b"\r\n", b"\n")}
        result["sources"].append({"id": sid, "repository": source.url, "commit": source.commit, "fileCount": len(rows), "bytes": sum(r["bytes"] for r in rows), "files": rows})
    out = root / "docs/reviews/actor-height-intake/sources.json"
    write_json(out, result)
    if args.cache:
        cache = args.cache.resolve()
        if not cache.is_relative_to((root / "artifacts").resolve()):
            raise ValueError("Probe cache must remain under ignored artifacts/.")
        for sid, source in sources.items():
            for path in sorted(referenced[sid]):
                target = cache / sid / path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(source.read(path))
            write_json(cache / sid / "package.json", {"type": "module", "private": True})
    print(json.dumps({"sources": [{"id": s["id"], "files": s["fileCount"], "bytes": s["bytes"]} for s in result["sources"]], "closures": [{k: c[k] for k in ("id", "fileCount", "bytes", "nonThreeBytes")} for c in groups], "output": out.relative_to(root).as_posix()}, indent=2))


if __name__ == "__main__":
    main()
