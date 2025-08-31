#!/usr/bin/env python3
"""Automated coding agent that applies a maintenance plan.

This stub demonstrates how a coding service could automate
implementation:
- read a plan file
- run backend and frontend tests
- commit the results to a new branch
- push and open a pull request (using gh CLI)
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def run(cmd: list[str]) -> None:
    """Run a shell command, printing it first."""
    print("+", " ".join(cmd))
    subprocess.run(cmd, check=True)


def main(plan_path: str) -> None:
    plan = Path(plan_path)
    if not plan.exists():
        raise SystemExit(f"Plan not found: {plan}")

    branch = f"auto/{plan.stem}"
    run(["git", "checkout", "-b", branch])

    # TODO: Call a coding LLM here to implement the plan.
    # For now we simply run the test suites.
    run(["pytest"])
    run(["npm", "test", "--prefix", "frontend"])

    run(["git", "add", "-A"])
    run(["git", "commit", "-m", f"Automated changes for {plan.name}"])

    try:
        run(["git", "push", "-u", "origin", branch])
        run(["gh", "pr", "create", "--fill"])
    except subprocess.CalledProcessError:
        print("Warning: push or PR creation failed; ensure gh is configured.")

    run(["git", "checkout", "main"])


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: auto_coder.py <plan_path>")
        raise SystemExit(1)
    main(sys.argv[1])
