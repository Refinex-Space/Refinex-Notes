#!/usr/bin/env python3
"""
Harness Engineering control plane validator.

Validates that all control plane artifacts listed in the harness manifest
exist, are non-empty, and have been verified within the staleness threshold.

Usage:
    python3 scripts/check_harness.py [--stale-days N] [--manifest PATH]

Exit codes:
    0  All checks passed (warnings are allowed)
    1  One or more errors found
"""

import argparse
import os
import re
import sys
from datetime import datetime
from pathlib import Path


# ---------------------------------------------------------------------------
# Repo root discovery
# ---------------------------------------------------------------------------


def find_repo_root() -> Path:
    """Walk up from script location to find the repo root (.git directory)."""
    current = Path(__file__).resolve().parent
    while current != current.parent:
        if (current / ".git").exists():
            return current
        current = current.parent
    # Fallback: assume scripts/ is one level below repo root
    return Path(__file__).resolve().parent.parent


# ---------------------------------------------------------------------------
# Manifest parsing
# ---------------------------------------------------------------------------

_ROW_RE = re.compile(
    r"^\|\s*(.+?)\s*\|\s*([\w-]+)\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|$"
)


def parse_manifest(manifest_path: Path) -> list:
    """Parse the Control Plane Artifacts table from the harness manifest.

    Returns a list of dicts with keys: path, type, created, last_verified.
    """
    artifacts = []
    in_section = False

    with open(manifest_path, "r", encoding="utf-8") as fh:
        for line in fh:
            stripped = line.strip()

            # Detect start of artifacts section
            if stripped.startswith("## Control Plane Artifacts"):
                in_section = True
                continue

            # Detect end of section (next heading)
            if in_section and stripped.startswith("## "):
                break

            if not in_section:
                continue

            m = _ROW_RE.match(stripped)
            if m:
                artifacts.append(
                    {
                        "path": m.group(1),
                        "type": m.group(2),
                        "created": m.group(3),
                        "last_verified": m.group(4),
                    }
                )

    return artifacts


# ---------------------------------------------------------------------------
# Checks
# ---------------------------------------------------------------------------


def check_existence(repo_root: Path, artifacts: list) -> list:
    """Verify every artifact exists on disk and files are non-empty."""
    errors = []
    for a in artifacts:
        target = repo_root / a["path"]
        if a["type"] == "directory":
            if not target.is_dir():
                errors.append(f"MISSING directory: {a['path']}")
        else:
            if not target.is_file():
                errors.append(f"MISSING file: {a['path']}")
            elif target.stat().st_size == 0:
                errors.append(f"EMPTY file: {a['path']}")
    return errors


def check_staleness(artifacts: list, stale_days: int) -> list:
    """Warn about artifacts whose Last Verified date exceeds the threshold."""
    warnings = []
    today = datetime.now()

    for a in artifacts:
        try:
            last = datetime.strptime(a["last_verified"], "%Y-%m-%d")
        except ValueError:
            warnings.append(
                f"INVALID DATE in manifest for {a['path']}: {a['last_verified']}"
            )
            continue

        age = (today - last).days
        if age > stale_days:
            warnings.append(
                f"STALE ({age}d): {a['path']}  "
                f"(last verified {a['last_verified']}, threshold {stale_days}d)"
            )

    return warnings


_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")


def check_agents_md_links(repo_root: Path) -> list:
    """Verify that markdown links in root AGENTS.md resolve to real files."""
    agents_md = repo_root / "AGENTS.md"
    if not agents_md.is_file():
        return ["Root AGENTS.md not found"]

    errors = []
    content = agents_md.read_text(encoding="utf-8")

    for match in _LINK_RE.finditer(content):
        text, target = match.groups()

        # Skip external and anchor-only links
        if target.startswith(("http://", "https://", "mailto:", "#")):
            continue

        # Strip in-page anchors
        file_part = target.split("#")[0]
        if not file_part:
            continue

        resolved = repo_root / file_part
        if not resolved.exists():
            errors.append(f"BROKEN LINK in AGENTS.md: [{text}]({target}) → not found")

    return errors


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Validate Harness Engineering control plane"
    )
    parser.add_argument(
        "--stale-days",
        type=int,
        default=30,
        help="Days before a doc is considered stale (default: 30)",
    )
    parser.add_argument(
        "--manifest",
        type=str,
        default=None,
        help="Path to harness-manifest.md (default: docs/generated/harness-manifest.md)",
    )
    args = parser.parse_args()

    repo_root = find_repo_root()
    manifest_path = (
        Path(args.manifest)
        if args.manifest
        else repo_root / "docs" / "generated" / "harness-manifest.md"
    )

    print(f"Harness Validator")
    print(f"  repo root : {repo_root}")
    print(f"  manifest  : {manifest_path}")
    print()

    # --- Manifest existence ---
    if not manifest_path.is_file():
        print("✗ Manifest not found. Run harness-bootstrap first.")
        sys.exit(1)

    # --- Parse ---
    artifacts = parse_manifest(manifest_path)
    if not artifacts:
        print("✗ No artifacts found in manifest. Check format.")
        sys.exit(1)

    print(f"Found {len(artifacts)} artifact(s) in manifest.\n")

    all_errors: list = []
    all_warnings: list = []

    # 1. Existence
    all_errors.extend(check_existence(repo_root, artifacts))

    # 2. Staleness
    all_warnings.extend(check_staleness(artifacts, args.stale_days))

    # 3. AGENTS.md links
    all_errors.extend(check_agents_md_links(repo_root))

    # --- Report ---
    if all_warnings:
        print("Warnings:")
        for w in all_warnings:
            print(f"  ⚠ {w}")
        print()

    if all_errors:
        print("Errors:")
        for e in all_errors:
            print(f"  ✗ {e}")
        print()
        print(f"FAILED — {len(all_errors)} error(s), {len(all_warnings)} warning(s)")
        sys.exit(1)

    if all_warnings:
        print(f"PASSED with {len(all_warnings)} warning(s)")
    else:
        print("✓ All checks passed.")

    sys.exit(0)


if __name__ == "__main__":
    main()
