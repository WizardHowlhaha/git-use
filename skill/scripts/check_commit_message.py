#!/usr/bin/env python3
"""Validate Linux-kernel-style commit message layout and trailers."""

from __future__ import annotations

import argparse
import re
import sys
import unicodedata
from pathlib import Path


TRAILER_RE = re.compile(r"^[A-Za-z][A-Za-z0-9-]*: \S(?:.*\S)?$")


def display_width(line: str) -> int:
    width = 0
    for char in line:
        if unicodedata.combining(char):
            continue
        width += 2 if unicodedata.east_asian_width(char) in {"W", "F"} else 1
    return width


def validate(message: str, require_signoff: bool) -> list[str]:
    errors: list[str] = []
    if "\r" in message:
        errors.append("CRLF is not allowed; use LF line endings")
    if not message.endswith("\n"):
        errors.append("commit message must end with a newline")

    # `git log --format=%B` and `git show --format=%B` print the stored message
    # and then one extra newline, so trailing blank lines are normalized away
    # before the line based checks run.
    lines = message.rstrip("\n").splitlines()
    if not lines or not lines[0].strip():
        errors.append("subject line is required")
        return errors
    subject = lines[0]
    if subject != subject.strip():
        errors.append("subject must not start or end with whitespace")
    if display_width(subject) > 50:
        errors.append(f"subject exceeds 50 display columns ({display_width(subject)})")
    if not re.match(r"^[^:\n]+: \S", subject):
        errors.append("subject must use '<subsystem>: <imperative summary>'")
    if subject.endswith("."):
        errors.append("subject must not end with a period")
    if "\t" in subject:
        errors.append("subject must not contain tabs")

    if len(lines) < 2 or lines[1] != "":
        errors.append("subject must be followed by exactly one blank line")
    for index, line in enumerate(lines):
        if line.endswith((" ", "\t")):
            errors.append(f"line {index + 1} has trailing whitespace")
        if "\t" in line:
            errors.append(f"line {index + 1} contains a tab; use spaces")
        if index > 1 and line == "" and lines[index - 1] == "":
            errors.append(f"line {index + 1} creates a consecutive blank line")

    trailer_start = len(lines)
    while trailer_start > 0 and TRAILER_RE.match(lines[trailer_start - 1]):
        trailer_start -= 1
    trailers = lines[trailer_start:]
    if trailers:
        if trailer_start == 0 or lines[trailer_start - 1] != "":
            errors.append("trailer block must be preceded by one blank line")
        keys = [line.split(":", 1)[0] for line in trailers]
        if require_signoff and "Signed-off-by" not in keys:
            errors.append("required trailer is missing: Signed-off-by")
    elif require_signoff:
        errors.append("required trailer is missing: Signed-off-by")

    for index, line in enumerate(lines[1:], start=2):
        if display_width(line) > 75:
            errors.append(f"line {index} exceeds 75 display columns ({display_width(line)})")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--require-signoff", action="store_true")
    parser.add_argument("message", nargs="?", default="-")
    args = parser.parse_args()
    content = sys.stdin.read() if args.message == "-" else Path(args.message).read_text(encoding="utf-8")
    errors = validate(content, args.require_signoff)
    if errors:
        for error in errors:
            print(f"commit-message: error: {error}", file=sys.stderr)
        return 1
    print("commit-message: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
