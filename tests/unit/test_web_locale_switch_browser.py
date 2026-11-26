"""Locale switch behaviour: English by default, ``?lang=`` override, persisted choice.

Complements the existing browser specs (which pin ``?lang=zh`` to keep asserting the
original Chinese copy) by covering the switch itself.
"""

from __future__ import annotations

import importlib
import os
import threading
import time
from pathlib import Path

import pytest
import uvicorn

from olympus.core.store import RunStore
from olympus.web.server import AriadneApp, create_fastapi_app

playwright = (
    importlib.import_module("playwright.sync_api")
    if os.environ.get("OLYMPUS_REQUIRE_BROWSER_TESTS") == "1"
    else pytest.importorskip("playwright.sync_api")
)


@pytest.fixture
def locale_server(tmp_path: Path):
    repo = tmp_path / "olympus-repo"
    repo.mkdir()
    store = RunStore(tmp_path / "runs.db")
    app = AriadneApp(store=store, workspace_root=repo)
    server = uvicorn.Server(
        uvicorn.Config(
            create_fastapi_app(app),
            host="127.0.0.1",
            port=0,
            log_level="warning",
        )
    )
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    deadline = time.monotonic() + 10.0
    while not server.started:
        if time.monotonic() > deadline:
            raise RuntimeError("uvicorn server did not start within 10s")
        time.sleep(0.01)
    assert server.servers
    port = server.servers[0].sockets[0].getsockname()[1]
    try:
        yield f"http://127.0.0.1:{port}"
    finally:
        server.should_exit = True
        thread.join(timeout=10.0)


@pytest.fixture
def browser():
    with playwright.sync_playwright() as runtime:
        chrome_path = os.environ.get("CHROME_PATH")
        if chrome_path:
            launched = runtime.chromium.launch(executable_path=chrome_path)
        else:
            try:
                launched = runtime.chromium.launch()
            except playwright.Error:
                if os.environ.get("OLYMPUS_REQUIRE_BROWSER_TESTS") == "1":
                    raise
                existing = sorted(
                    Path.home().glob(".cache/ms-playwright/chromium-*/chrome-linux*/chrome")
                )
                if not existing:
                    raise
                launched = runtime.chromium.launch(executable_path=str(existing[-1]))
        try:
            yield launched
        finally:
            launched.close()


def test_default_locale_is_english_and_toggle_persists(locale_server, browser) -> None:
    url = locale_server
    expect = playwright.expect
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto(f"{url}/")

    # First visit: no stored choice, no ?lang= — the console renders English.
    expect(page.locator("html")).to_have_attribute("lang", "en")
    expect(page.locator(".board-title")).to_have_text("Oracle Board")
    toggle = page.locator("#locale-toggle")
    expect(toggle).to_have_attribute("data-locale", "en")
    expect(toggle).to_have_text("EN")

    toggle.click()

    expect(page.locator("html")).to_have_attribute("lang", "zh-CN")
    expect(page.locator(".board-title")).to_have_text("Oracle 看板")
    expect(toggle).to_have_attribute("data-locale", "zh")
    assert page.evaluate("() => localStorage.getItem('olympus-locale')") == "zh"

    # The choice survives a reload.
    page.reload()
    expect(page.locator("html")).to_have_attribute("lang", "zh-CN")
    expect(page.locator(".board-title")).to_have_text("Oracle 看板")
    expect(page.locator("#locale-toggle")).to_have_text("中")
    page.close()


def test_lang_query_overrides_stored_locale(locale_server, browser) -> None:
    url = locale_server
    expect = playwright.expect
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto(f"{url}/")
    page.evaluate("() => localStorage.setItem('olympus-locale', 'zh')")

    page.goto(f"{url}/?lang=en")

    expect(page.locator("html")).to_have_attribute("lang", "en")
    expect(page.locator(".board-title")).to_have_text("Oracle Board")
    expect(page.locator("#locale-toggle")).to_have_text("EN")
    page.close()
