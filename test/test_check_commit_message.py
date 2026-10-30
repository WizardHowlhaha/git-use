#!/usr/bin/env python3
"""Tests for skill/scripts/check_commit_message.py."""

import importlib.util
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / "skill" / "scripts" / "check_commit_message.py"

spec = importlib.util.spec_from_file_location("check_commit_message", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

VALID = """\
net: prevent retry loop after peer reset

The reconnect path treated a reset peer as a transient timeout and
requeued the same request without changing state. Stop retrying after the
reset is recorded so the caller receives the original failure.

Signed-off-by: Ethan Liu <ethan.liu.wiz@gmail.com>
"""


class ValidateTest(unittest.TestCase):
    def test_valid_message_has_no_errors(self):
        self.assertEqual(module.validate(VALID, True), [])

    def test_valid_message_without_disclosure_requirement(self):
        message = "net: fix retry loop\n\nBody line.\n"
        self.assertEqual(module.validate(message, False), [])

    def test_subject_length_is_limited_to_50_columns(self):
        subject = "net: " + "a" * 60
        errors = module.validate(f"{subject}\n\nBody.\n", False)
        self.assertTrue(any("50 display columns" in error for error in errors))

    def test_subject_must_use_subsystem_prefix(self):
        errors = module.validate("prevent retry loop after peer reset\n\nBody.\n", False)
        self.assertTrue(any("<subsystem>: <imperative summary>" in error for error in errors))

    def test_subject_must_not_end_with_period(self):
        errors = module.validate("net: fix retry loop.\n\nBody.\n", False)
        self.assertTrue(any("must not end with a period" in error for error in errors))

    def test_body_line_width_is_limited_to_75_columns(self):
        errors = module.validate("net: fix\n\n" + "b" * 80 + "\n", False)
        self.assertTrue(any("75 display columns" in error for error in errors))

    def test_trailing_whitespace_is_rejected(self):
        errors = module.validate("net: fix\n\nBody with space \n", False)
        self.assertTrue(any("trailing whitespace" in error for error in errors))

    def test_tabs_are_rejected(self):
        errors = module.validate("net: fix\n\n\tBody.\n", False)
        self.assertTrue(any("contains a tab" in error for error in errors))

    def test_crlf_is_rejected(self):
        errors = module.validate("net: fix\r\n\r\nBody.\r\n", False)
        self.assertTrue(any("CRLF" in error for error in errors))

    def test_trailing_newline_artifact_from_git_is_accepted(self):
        # `git log --format=%B` prints the stored message plus one extra newline.
        errors = module.validate(VALID + "\n", True)
        self.assertEqual(errors, [])

    def test_missing_final_newline_is_rejected(self):
        errors = module.validate("net: fix\n\nBody.", False)
        self.assertTrue(any("must end with a newline" in error for error in errors))

    def test_consecutive_blank_lines_are_rejected(self):
        errors = module.validate("net: fix\n\nBody.\n\n\nMore.\n", False)
        self.assertTrue(any("consecutive blank line" in error for error in errors))

    def test_trailer_block_requires_a_preceding_blank_line(self):
        message = (
            "net: fix\n\nBody.\nAI-Assisted-By: MiniMax Code\n"
            "AI-Model: MiniMax-M3\nSigned-off-by: Ethan Liu <ethan.liu.wiz@gmail.com>\n"
        )
        errors = module.validate(message, True)
        self.assertTrue(any("preceded by one blank line" in error for error in errors))

    def test_east_asian_width_is_measured_in_display_columns(self):
        self.assertEqual(module.display_width("中文"), 4)
        self.assertEqual(module.display_width("abc"), 3)


if __name__ == "__main__":
    unittest.main()
