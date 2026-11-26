from __future__ import annotations

import importlib
import os
import subprocess
import threading
import time
from pathlib import Path

import httpx
import pytest
import uvicorn

from olympus.core.store import RunStore
from olympus.providers.base import MockLLMProvider
from olympus.web.demos import seed_demo_runs
from olympus.web.server import AriadneApp, create_fastapi_app
from olympus.web.supervisor import RunSupervisor

playwright = (
    importlib.import_module("playwright.sync_api")
    if os.environ.get("OLYMPUS_REQUIRE_BROWSER_TESTS") == "1"
    else pytest.importorskip("playwright.sync_api")
)


def _git(cwd: Path, *args: str) -> None:
    env = {
        **os.environ,
        "GIT_AUTHOR_NAME": "Olympus Test",
        "GIT_AUTHOR_EMAIL": "test@olympus.local",
        "GIT_COMMITTER_NAME": "Olympus Test",
        "GIT_COMMITTER_EMAIL": "test@olympus.local",
    }
    subprocess.run(
        ["git", *args],
        cwd=cwd,
        env=env,
        check=True,
        capture_output=True,
        text=True,
        timeout=30,
    )


def _init_git_repo(repo_dir: Path, branch: str = "main") -> None:
    repo_dir.mkdir(parents=True, exist_ok=True)
    _git(repo_dir, "init", "-b", branch)
    (repo_dir / "README.md").write_text(f"# {repo_dir.name}\n", encoding="utf-8")
    _git(repo_dir, "add", "README.md")
    _git(repo_dir, "commit", "-m", "initial commit")


def _create_bare_fixture(tmp_path: Path) -> Path:
    seed_dir = tmp_path / "seed-src"
    _init_git_repo(seed_dir, branch="main")
    bare_dir = tmp_path / "fixture-origin.git"
    subprocess.run(
        ["git", "clone", "--bare", str(seed_dir), str(bare_dir)],
        check=True,
        capture_output=True,
        text=True,
        timeout=30,
    )
    return bare_dir


@pytest.fixture
def picker_server(tmp_path: Path):
    projects_dir = tmp_path / "projects"
    projects_dir.mkdir()

    primary_repo = projects_dir / "primary-repo"
    _init_git_repo(primary_repo, branch="main")

    alpha_git = projects_dir / "alpha-git"
    _init_git_repo(alpha_git, branch="main")
    (alpha_git / "nested-pkg").mkdir()

    beta_plain = projects_dir / "beta-plain"
    beta_plain.mkdir()

    sandbox_dir = projects_dir / "sandbox"
    sandbox_dir.mkdir()

    hidden_dir = projects_dir / ".secret-vault"
    hidden_dir.mkdir()

    store = RunStore(tmp_path / "runs.db")
    seed_demo_runs(store, primary_repo)
    supervisor = RunSupervisor(
        store=store,
        workspace_root=primary_repo,
        provider_builder=lambda **kwargs: MockLLMProvider(),
    )
    app = AriadneApp(store=store, workspace_root=primary_repo, supervisor=supervisor)
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
        yield {
            "app": app,
            "store": store,
            "url": f"http://127.0.0.1:{port}",
            "projects": projects_dir,
            "primary_repo": primary_repo,
            "alpha_git": alpha_git,
            "beta_plain": beta_plain,
            "sandbox": sandbox_dir,
            "hidden_dir": hidden_dir,
            "tmp_path": tmp_path,
        }
    finally:
        server.should_exit = True
        thread.join(timeout=10.0)
        supervisor.shutdown()


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


def test_directory_picker_navigation_autocomplete_badges_and_hidden_toggle(picker_server, browser):
    url = picker_server["url"]
    projects = picker_server["projects"]
    alpha_git = picker_server["alpha_git"]
    primary_repo = picker_server["primary_repo"]

    page = browser.new_page(viewport={"width": 1440, "height": 900})
    expect = playwright.expect
    page.goto(f"{url}/?lang=zh")

    page.locator("#nav-workspaces").click()
    dialog = page.locator("#workspace-manager-dialog")
    expect(dialog).to_be_visible()

    picker = dialog.locator("#workspace-open-picker")
    expect(picker.locator("[data-quick-root='Projects']")).to_be_visible()
    expect(picker.locator("[data-quick-root='Home']")).to_be_visible()

    primary_row = picker.locator("[data-entry-name='primary-repo']")
    alpha_row = picker.locator("[data-entry-name='alpha-git']")
    beta_row = picker.locator("[data-entry-name='beta-plain']")
    expect(primary_row).to_be_visible()
    expect(primary_row.locator("[data-badge-kind='git']")).to_contain_text("git · main")
    expect(primary_row.locator("[data-badge-kind='registered']")).to_have_text("Registered")
    expect(alpha_row.locator("[data-badge-kind='git']")).to_contain_text("git · main")
    expect(alpha_row.locator("[data-badge-kind='registered']")).to_have_count(0)
    expect(beta_row).to_be_visible()
    expect(beta_row.locator("[data-badge-kind='git']")).to_have_count(0)

    expect(picker.locator("[data-entry-name='.secret-vault']")).to_have_count(0)
    picker.locator("#workspace-open-show-hidden").check()
    expect(picker.locator("[data-entry-name='.secret-vault']")).to_be_visible()
    picker.locator("#workspace-open-show-hidden").uncheck()
    expect(picker.locator("[data-entry-name='.secret-vault']")).to_have_count(0)

    path_input = dialog.locator("#workspace-root-input")
    path_input.fill(f"{projects}/alp")
    expect(picker.locator("[data-picker-prefix='alp']")).to_be_visible()
    expect(picker.locator(".picker-entry")).to_have_count(1)
    expect(alpha_row).to_be_visible()

    path_input.press("ArrowDown")
    expect(alpha_row).to_have_attribute("data-active", "true")
    path_input.press("Enter")
    expect(path_input).to_have_value(str(alpha_git))
    expect(picker.locator("[data-entry-name='nested-pkg']")).to_be_visible()

    picker.locator("[data-entry-name='nested-pkg']").click()
    expect(path_input).to_have_value(str(alpha_git / "nested-pkg"))

    picker.locator("#workspace-open-up").click()
    expect(path_input).to_have_value(str(alpha_git))

    picker.locator(f"[data-crumb-path='{projects}']").click()
    expect(path_input).to_have_value(str(projects))
    expect(beta_row).to_be_visible()

    path_input.fill(str(projects / "missing-branch" / "deep"))
    expect(picker.locator("[data-picker-state='missing']")).to_be_visible()

    picker.locator("[data-quick-root='Projects']").click()
    expect(alpha_row).to_be_visible()
    alpha_row.click()
    expect(path_input).to_have_value(str(alpha_git))
    dialog.locator("#btn-register-workspace").click()
    expect(dialog.locator("#workspace-list")).to_contain_text("alpha-git")

    expect(
        picker.locator("[data-entry-name='alpha-git'] [data-badge-kind='registered']")
    ).to_have_text("Registered")
    expect(
        picker.locator(f"[data-entry-path='{primary_repo}'] [data-badge-kind='registered']")
    ).to_have_text("Registered")
    page.close()


def test_workspace_dialog_new_project_creates_directory_and_inits_git(picker_server, browser):
    url = picker_server["url"]
    sandbox = picker_server["sandbox"]

    page = browser.new_page(viewport={"width": 1440, "height": 900})
    expect = playwright.expect
    page.goto(f"{url}/?lang=zh")

    page.locator("#nav-workspaces").click()
    dialog = page.locator("#workspace-manager-dialog")
    expect(dialog).to_be_visible()

    dialog.locator("[data-workspace-tab='new']").click()
    parent_picker = dialog.locator("#workspace-new-parent-picker")
    expect(parent_picker.locator("[data-entry-name='sandbox']")).to_be_visible()
    parent_picker.locator("[data-entry-name='sandbox']").click()
    expect(dialog.locator("#workspace-new-parent-input")).to_have_value(str(sandbox))

    dialog.locator("#workspace-new-folder").fill("nebula-api")
    expected_target = sandbox / "nebula-api"
    expect(dialog.locator("#workspace-new-preview")).to_contain_text(f"Creates {expected_target}")
    dialog.locator("#workspace-new-init-git").check()

    with page.expect_response(
        lambda res: res.url.endswith("/api/workspaces") and res.request.method == "POST"
    ) as create_resp:
        dialog.locator("#btn-create-workspace").click()
    assert create_resp.value.status == 200
    assert expected_target.is_dir()
    assert (expected_target / ".git").exists()

    ws_row = dialog.locator("#workspace-list .workspace-row", has_text="nebula-api")
    expect(ws_row).to_be_visible()
    expect(ws_row).to_contain_text("git")
    page.close()


def test_workspace_dialog_clone_url_derivation_errors_and_bare_repo_clone(
    picker_server, browser, monkeypatch: pytest.MonkeyPatch
):
    app = picker_server["app"]
    url = picker_server["url"]
    sandbox = picker_server["sandbox"]
    bare_fixture = _create_bare_fixture(picker_server["tmp_path"])

    cloned_remotes: list[str] = []

    def fake_run_git_clone(remote_url: str, destination: Path) -> None:
        cloned_remotes.append(remote_url)
        subprocess.run(
            ["git", "clone", "--", str(bare_fixture), str(destination)],
            check=True,
            capture_output=True,
            text=True,
            timeout=30,
        )

    monkeypatch.setattr(app, "_run_git_clone", fake_run_git_clone)

    page = browser.new_page(viewport={"width": 1440, "height": 900})
    expect = playwright.expect
    page.goto(f"{url}/?lang=zh")

    page.locator("#nav-workspaces").click()
    dialog = page.locator("#workspace-manager-dialog")
    expect(dialog).to_be_visible()

    dialog.locator("[data-workspace-tab='clone']").click()
    clone_picker = dialog.locator("#workspace-clone-parent-picker")
    expect(clone_picker.locator("[data-entry-name='sandbox']")).to_be_visible()
    clone_picker.locator("[data-entry-name='sandbox']").click()

    url_input = dialog.locator("#workspace-clone-url")
    folder_input = dialog.locator("#workspace-clone-folder")
    preview = dialog.locator("#workspace-clone-preview")

    url_input.fill("acme/shorthand-demo")
    expect(folder_input).to_have_value("shorthand-demo")
    expect(preview).to_contain_text(f"Clones into {sandbox / 'shorthand-demo'}")

    url_input.fill("https://github.com/acme/real-widget.git")
    expect(folder_input).to_have_value("real-widget")
    expect(preview).to_contain_text(f"Clones into {sandbox / 'real-widget'}")

    url_input.fill("file:///etc/passwd")
    with page.expect_response(
        lambda res: res.url.endswith("/api/workspaces/clone") and res.request.method == "POST"
    ) as bad_clone:
        dialog.locator("#btn-clone-workspace").click()
    assert bad_clone.value.status == 400
    expect(dialog.locator("#workspace-dialog-error")).to_be_visible()
    expect(dialog.locator("#workspace-dialog-error")).to_contain_text(
        "Unsupported clone URL scheme"
    )
    assert cloned_remotes == []

    url_input.fill("https://github.com/acme/real-widget.git")
    folder_input.fill("widget-local")
    expect(preview).to_contain_text(f"Clones into {sandbox / 'widget-local'}")

    with page.expect_response(
        lambda res: res.url.endswith("/api/workspaces/clone") and res.request.method == "POST"
    ) as ok_clone:
        dialog.locator("#btn-clone-workspace").click()
    assert ok_clone.value.status == 200
    assert cloned_remotes == ["https://github.com/acme/real-widget.git"]

    dest = sandbox / "widget-local"
    assert dest.is_dir()
    assert (dest / ".git").exists()
    assert (dest / "README.md").is_file()

    ws_row = dialog.locator("#workspace-list .workspace-row", has_text="widget-local")
    expect(ws_row).to_be_visible()
    expect(ws_row).to_contain_text("git · main")
    page.close()


def test_issue_oracle_picker_greenfield_and_brownfield_without_typing_absolute_paths(
    picker_server, browser
):
    url = picker_server["url"]
    alpha_git = picker_server["alpha_git"]
    sandbox = picker_server["sandbox"]

    page = browser.new_page(viewport={"width": 1440, "height": 900})
    expect = playwright.expect
    page.goto(f"{url}/?lang=zh")

    page.locator("#btn-issue-oracle").click()
    dialog = page.locator("#new-run-dialog")
    expect(dialog).to_be_visible()

    dialog.locator("#new-run-workspace").select_option("__custom__")
    custom_picker = dialog.locator("#new-run-custom-picker")
    expect(custom_picker.locator("[data-entry-name='alpha-git']")).to_be_visible()
    custom_picker.locator("[data-entry-name='alpha-git']").click()
    expect(dialog.locator("#new-run-workspace-root")).to_have_value(str(alpha_git))

    dialog.locator("[data-scope-mode='greenfield']").click()
    gf_picker = dialog.locator("#new-run-greenfield-parent-picker")
    expect(gf_picker.locator("[data-entry-name='sandbox']")).to_be_visible()
    gf_picker.locator("[data-entry-name='sandbox']").click()
    dialog.locator("#new-run-greenfield-name").fill("oracle-gf-app")

    expected_gf = sandbox / "oracle-gf-app"
    expect(dialog.locator("#new-run-greenfield-path")).to_have_value(str(expected_gf))
    dialog.locator("#new-run-greenfield-init-git").check()

    dialog.locator("#new-run-title").fill("Build Greenfield CLI")
    dialog.locator("#new-run-input").fill("Create a clean greenfield CLI scaffold with tests.")
    with page.expect_response(
        lambda res: res.url.endswith("/api/runs") and res.request.method == "POST"
    ) as create_run_resp:
        dialog.locator("#new-run-submit").click()
    assert create_run_resp.value.status == 200
    run_id = create_run_resp.value.json()["run_id"]
    expect(dialog).to_be_hidden()

    assert expected_gf.is_dir()
    assert (expected_gf / ".git").exists()

    card = page.locator(f".oracle-card[data-run-id='{run_id}']")
    expect(card).to_be_visible()
    expect(card).to_have_attribute("data-mode", "greenfield")

    workspaces = httpx.get(f"{url}/?lang=zh").json()["workspaces"]
    created_ws = next(ws for ws in workspaces if ws["name"] == "oracle-gf-app")
    assert created_ws["root_path"] == str(expected_gf)
    assert created_ws["is_git_repo"] is True
    page.close()
