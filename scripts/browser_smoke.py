"""Headless-browser smoke test for the Quarry review UI.

Verifies the UI renders, has no console/page errors, and the resolve flow works end to end.
Run (Postgres + backend + Vite dev all up):
    uv run --with playwright python -m playwright install chromium   # once
    uv run uvicorn quarry.api:app --port 8000                        # terminal 1
    (cd frontend && npm run dev)                                     # terminal 2
    uv run --with playwright python scripts/browser_smoke.py         # terminal 3

Exits nonzero on any uncaught page error or if the resolve flow neither returns cards nor a
clear error notice. Screenshots are written to /tmp/quarry-ui-*.png. Works as a render+console
check even if the backend is down (it reports the surfaced error honestly).
"""

from __future__ import annotations

import sys

from playwright.sync_api import sync_playwright

URL = "http://localhost:5173/"


def main() -> int:
    console_errors: list[str] = []
    page_errors: list[str] = []

    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: page_errors.append(str(e)))

        page.goto(URL, wait_until="networkidle")
        page.wait_for_selector('form[aria-label="Compose a BOQ line"]', timeout=10_000)
        page.screenshot(path="/tmp/quarry-ui-1-form.png")

        # Compose a styled task-chair BOQ line.
        page.select_option("#category", "ffe/seating/task-chair")
        page.fill("#budget", "15000")
        page.fill("#style", "black mesh office chair")
        page.locator('form button[type="submit"]').first.click()

        # Either ranked cards or an error notice should appear.
        page.wait_for_selector(".cards .card, .notice.is-error", timeout=20_000)
        page.screenshot(path="/tmp/quarry-ui-2-result.png", full_page=True)

        cards = page.locator(".cards .card")
        n = cards.count()
        if n:
            first_name = page.locator(".card .product-name").first.inner_text()
            first_score = page.locator(".card .score").first.inner_text()
            print(f"[ui] {n} candidate cards rendered. top: {first_name!r} score={first_score!r}")
        else:
            notice = page.locator(".notice.is-error").inner_text()
            print(f"[ui] no cards — error notice shown: {notice!r} (backend reachable?)")

        browser.close()

    print(f"[ui] console errors: {len(console_errors)} | page errors: {len(page_errors)}")
    for e in console_errors + page_errors:
        print("   !", e[:200])
    print("[ui] screenshots: /tmp/quarry-ui-1-form.png, /tmp/quarry-ui-2-result.png")

    ok = not page_errors and not console_errors
    print("[ui] RESULT:", "PASS" if ok else "FAIL (errors above)")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
