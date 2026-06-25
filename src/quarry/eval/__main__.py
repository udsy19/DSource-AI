"""``python -m quarry.eval`` — run the golden eval against the live seeded DB, print the
scorecard, and exit nonzero on any hard-constraint violation."""

from __future__ import annotations

import sys

from .run import format_scorecard, run_eval, total_violations


def main() -> int:
    results = run_eval()
    print(format_scorecard(results))
    return 1 if total_violations(results) > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
