#!/usr/bin/env python3
"""
Slash Command Validator

Validates that a slash command markdown file follows the required structure
and best practices for Claude Code custom commands.

Usage:
    python3 validate_command.py <command-file.md>
    python3 validate_command.py <command-file.md> --strict
"""

import sys
import re
import os
from pathlib import Path
from typing import List, Tuple, Optional


class CommandValidator:
    """Validates slash command files for proper structure and quality."""

    def __init__(self, filepath: str, strict: bool = False):
        self.filepath = Path(filepath)
        self.strict = strict
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.content = ""
        self.lines = []

    def validate(self) -> bool:
        """Run all validation checks. Returns True if valid."""
        if not self._read_file():
            return False

        self._check_file_exists()
        self._check_file_structure()
        self._check_sections()
        self._check_content_quality()

        return len(self.errors) == 0

    def _read_file(self) -> bool:
        """Read the file content."""
        try:
            with open(self.filepath, 'r', encoding='utf-8') as f:
                self.content = f.read()
                self.lines = self.content.split('\n')
            return True
        except FileNotFoundError:
            self.errors.append(f"File not found: {self.filepath}")
            return False
        except Exception as e:
            self.errors.append(f"Error reading file: {e}")
            return False

    def _check_file_exists(self) -> None:
        """Verify file exists and is readable."""
        if not self.filepath.exists():
            self.errors.append(f"File does not exist: {self.filepath}")
        if not self.filepath.is_file():
            self.errors.append(f"Path is not a file: {self.filepath}")

    def _check_file_structure(self) -> None:
        """Check for required file structure."""
        # Check for title (# heading)
        if not re.search(r'^#\s+', self.content, re.MULTILINE):
            self.errors.append("Missing title (# heading) at start of file")

        # Check for minimum content length
        if len(self.content.strip()) < 100:
            self.warnings.append("File content is very short (less than 100 characters)")

    def _check_sections(self) -> None:
        """Check for required sections based on command type."""
        content_lower = self.content.lower()

        # Determine command type
        is_workflow = any(phrase in content_lower for phrase in
                         ['steps', 'workflow', 'step 1', 'step 2'])
        is_utility = any(phrase in content_lower for phrase in
                        ['purpose', 'instructions', 'output format'])
        is_integration = 'prerequisites' in content_lower

        # Check for purpose/overview
        if not any(phrase in content_lower for phrase in
                  ['## overview', '## purpose']):
            self.warnings.append("Missing '## Overview' or '## Purpose' section")

        # Check for instructions or steps
        if not any(phrase in content_lower for phrase in
                  ['## instructions', '## steps', '## step 1']):
            if self.strict:
                self.errors.append("Missing '## Instructions' or '## Steps' section")
            else:
                self.warnings.append("Missing '## Instructions' or '## Steps' section")

        # Workflow-specific checks
        if is_workflow:
            if 'success criteria' not in content_lower:
                self.warnings.append("Workflow command should have '## Success Criteria' section")

        # Integration-specific checks
        if is_integration:
            if 'error handling' not in content_lower:
                self.warnings.append("Integration command should have '## Error Handling' section")

    def _check_content_quality(self) -> None:
        """Check for content quality issues."""
        # Check for descriptive headers
        headers = re.findall(r'^#+\s+(.*)$', self.content, re.MULTILINE)
        if headers:
            # First header should be descriptive
            if len(headers[0]) < 5:
                self.warnings.append("Title is too short/vague (less than 5 characters)")

        # Check for empty sections
        empty_sections = re.findall(r'^##\s+\w+\s*\n\s*\n+(?:##|$)', self.content, re.MULTILINE)
        if empty_sections:
            self.errors.append("Found empty section(s) - all sections should have content")

        # Check for minimum documentation
        if 'todo' in self.content.lower():
            self.warnings.append("Command contains TODO placeholders that should be completed")

        # Check for action items (good practice)
        if '- ' in self.content or '* ' in self.content:
            pass  # Good - has bullet points
        else:
            if self.strict and len(self.lines) > 10:
                self.warnings.append("Consider using bullet points for clarity")

        # Check for code examples
        if '```' not in self.content and self.strict:
            self.warnings.append("Consider including code examples for clarity")

    def report(self) -> None:
        """Print validation report."""
        print(f"\nValidation Report: {self.filepath.name}")
        print("=" * 60)

        if self.errors:
            print(f"\n❌ ERRORS ({len(self.errors)}):")
            for error in self.errors:
                print(f"  • {error}")

        if self.warnings:
            print(f"\n⚠️  WARNINGS ({len(self.warnings)}):")
            for warning in self.warnings:
                print(f"  • {warning}")

        if not self.errors and not self.warnings:
            print("\n✅ All checks passed!")

        # Summary
        print("\n" + "=" * 60)
        if self.errors:
            print(f"Result: INVALID - {len(self.errors)} error(s)")
        elif self.warnings:
            if self.strict:
                print(f"Result: INVALID (STRICT MODE) - {len(self.warnings)} issue(s)")
            else:
                print(f"Result: VALID - {len(self.warnings)} warning(s) for improvement")
        else:
            print("Result: VALID ✅")


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python3 validate_command.py <command-file.md> [--strict]")
        print("\nValidates slash command markdown files for proper structure.")
        print("\nOptions:")
        print("  --strict    Treat warnings as errors")
        sys.exit(1)

    filepath = sys.argv[1]
    strict = '--strict' in sys.argv

    validator = CommandValidator(filepath, strict=strict)

    if validator.validate():
        validator.report()
        sys.exit(0)
    else:
        validator.report()
        sys.exit(1)


if __name__ == '__main__':
    main()
