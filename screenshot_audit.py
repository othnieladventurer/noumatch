"""
NouMatch — Full App Screenshot Audit
Captures every screen from male user, female user, and admin perspectives.
Run: python screenshot_audit.py
"""

import asyncio
import os
from pathlib import Path
from playwright.async_api import async_playwright

BASE_URL = "https://noumatch.com"
ADMIN_URL = "http://localhost:5173/admin"
OUT_DIR = Path("screenshots_audit")

USERS = {
    "male_jean": {
        "email": "testmale@noumatch.com",
        "password": "JeanPierre-Test-2025!",
        "label": "01_MALE_Jean_Pierre",
    },
    "female_marie": {
        "email": "testfemale@noumatch.com",
        "password": "MarieClaire-Test-2025!",
        "label": "02_FEMALE_Marie_Claire",
    },
}

ADMIN = {
    "email": "admin@noumatch.com",
    "password": "N0uMatch-Admin-2025!",
    "url": "http://localhost:5173/admin",
}


async def ss(page, folder: Path, name: str):
    """Take a full-page screenshot."""
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"{name}.png"
    await page.screenshot(path=str(path), full_page=True)
    print(f"  ✓ {path}")


async def wait(page, ms=1500):
    await page.wait_for_timeout(ms)


async def capture_user(browser, user_key: str, creds: dict):
    label = creds["label"]
    folder = OUT_DIR / label
    print(f"\n{'='*50}")
    print(f"  Capturing: {label}")
    print(f"{'='*50}")

    context = await browser.new_context(
        viewport={"width": 1280, "height": 900},
        locale="fr-FR",
    )
    page = await context.new_page()

    # ── 1. Homepage / Landing ──────────────────────────────
    print("\n[Landing pages]")
    await page.goto(BASE_URL, wait_until="networkidle")
    await wait(page)
    await ss(page, folder, "01_homepage")

    await page.goto(f"{BASE_URL}/register", wait_until="networkidle")
    await wait(page)
    await ss(page, folder, "02_register_page")

    await page.goto(f"{BASE_URL}/login", wait_until="networkidle")
    await wait(page)
    await ss(page, folder, "03_login_page")

    # ── 2. Login ───────────────────────────────────────────
    print("\n[Logging in]")
    # Try common login field selectors
    try:
        await page.fill('input[type="email"], input[name="email"], input[placeholder*="mail" i]', creds["email"])
        await page.fill('input[type="password"], input[name="password"]', creds["password"])
        await ss(page, folder, "04_login_filled")
        await page.click('button[type="submit"], button:has-text("Connexion"), button:has-text("Login"), button:has-text("Se connecter")')
        await page.wait_for_load_state("networkidle")
        await wait(page, 2000)
        await ss(page, folder, "05_after_login")
        print("  ✓ Logged in")
    except Exception as e:
        print(f"  ⚠ Login error: {e}")
        await ss(page, folder, "05_login_error")

    # ── 3. Main app screens ────────────────────────────────
    print("\n[App screens]")
    pages_to_visit = [
        ("/discover",       "06_discover_feed"),
        ("/",               "07_home_logged_in"),
        ("/matches",        "08_matches"),
        ("/messages",       "09_messages"),
        ("/conversations",  "10_conversations"),
        ("/notifications",  "11_notifications"),
        ("/likes",          "12_likes_received"),
        ("/profile",        "13_my_profile"),
        ("/settings",       "14_settings"),
        ("/profile/edit",   "15_profile_edit"),
    ]

    for path, name in pages_to_visit:
        try:
            await page.goto(f"{BASE_URL}{path}", wait_until="networkidle")
            await wait(page)
            await ss(page, folder, name)
        except Exception as e:
            print(f"  ⚠ {path}: {e}")

    # ── 4. Mobile viewport ────────────────────────────────
    print("\n[Mobile view]")
    await context.close()
    mobile_ctx = await browser.new_context(
        viewport={"width": 390, "height": 844},
        locale="fr-FR",
        device_scale_factor=2,
    )
    mob_page = await mobile_ctx.new_page()

    await mob_page.goto(f"{BASE_URL}/login", wait_until="networkidle")
    await wait(mob_page)
    await ss(mob_page, folder / "mobile", "01_login_mobile")

    try:
        await mob_page.fill('input[type="email"], input[name="email"]', creds["email"])
        await mob_page.fill('input[type="password"]', creds["password"])
        await mob_page.click('button[type="submit"], button:has-text("Connexion"), button:has-text("Se connecter")')
        await mob_page.wait_for_load_state("networkidle")
        await wait(mob_page, 2000)

        mobile_screens = [
            ("/discover",       "02_discover_mobile"),
            ("/matches",        "03_matches_mobile"),
            ("/profile",        "04_profile_mobile"),
            ("/notifications",  "05_notifications_mobile"),
        ]
        for path, name in mobile_screens:
            try:
                await mob_page.goto(f"{BASE_URL}{path}", wait_until="networkidle")
                await wait(mob_page)
                await ss(mob_page, folder / "mobile", name)
            except Exception as e:
                print(f"  ⚠ mobile {path}: {e}")
    except Exception as e:
        print(f"  ⚠ Mobile login error: {e}")

    await mobile_ctx.close()


async def capture_admin(browser):
    print(f"\n{'='*50}")
    print("  Capturing: ADMIN DASHBOARD (localhost:5173)")
    print(f"{'='*50}")
    folder = OUT_DIR / "03_ADMIN_Dashboard"

    context = await browser.new_context(viewport={"width": 1440, "height": 900})
    page = await context.new_page()

    # Go to admin login (custom React admin, not Django admin)
    await page.goto(ADMIN["url"], wait_until="networkidle")
    await wait(page, 2000)
    await ss(page, folder, "01_admin_login")

    # Custom admin login — uses email/password fields with "→ Login" button
    try:
        await page.fill('input[type="email"], input[placeholder*="admin" i], input[name="email"]', ADMIN["email"])
        await page.fill('input[type="password"], input[placeholder*="password" i], input[name="password"]', ADMIN["password"])
        await ss(page, folder, "01b_admin_filled")
        await page.click('button:has-text("Login"), button[type="submit"]')
        await page.wait_for_load_state("networkidle")
        await wait(page, 2500)
        await ss(page, folder, "02_admin_dashboard_home")
        print("  ✓ Admin logged in")
    except Exception as e:
        print(f"  ⚠ Admin login error: {e}")
        await ss(page, folder, "02_admin_login_error")

    # Admin sections — use localhost:5173 paths
    admin_local = ADMIN["url"].rsplit("/dashboard", 1)[0]  # http://localhost:5173/admin
    admin_sections = [
        ("/dashboard",          "02_admin_dashboard_home"),
        ("/users",              "03_admin_users"),
        ("/users?page=1",       "03b_admin_users_p1"),
        ("/matches",            "04_admin_matches"),
        ("/messages",           "05_admin_messages"),
        ("/reports",            "06_admin_reports"),
        ("/blocks",             "07_admin_blocks"),
        ("/notifications",      "08_admin_notifications"),
        ("/analytics",          "09_admin_analytics"),
        ("/settings",           "10_admin_settings"),
    ]

    for path, name in admin_sections:
        try:
            await page.goto(f"{admin_local}{path}", wait_until="networkidle")
            await wait(page, 1500)
            await ss(page, folder, name)
        except Exception as e:
            print(f"  ⚠ admin{path}: {e}")

    # Try to click into a user detail if table exists
    try:
        await page.goto(f"{admin_local}/users", wait_until="networkidle")
        await wait(page)
        row = await page.query_selector('table tbody tr:first-child td a, tbody tr:first-child, [class*="row"]:first-child [class*="name"], [class*="user"]:first-child')
        if row:
            await row.click()
            await page.wait_for_load_state("networkidle")
            await wait(page)
            await ss(page, folder, "11_admin_user_detail")
    except Exception as e:
        print(f"  ⚠ User detail click: {e}")

    await context.close()


async def main():
    OUT_DIR.mkdir(exist_ok=True)
    print(f"\nNouMatch Screenshot Audit — {BASE_URL}")
    print(f"Output: {OUT_DIR.resolve()}\n")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, slow_mo=200)

        for user_key, creds in USERS.items():
            await capture_user(browser, user_key, creds)

        await capture_admin(browser)

        await browser.close()

    print(f"\n{'='*50}")
    print(f"  Done. Screenshots saved to: {OUT_DIR.resolve()}")
    print(f"{'='*50}\n")


if __name__ == "__main__":
    asyncio.run(main())
