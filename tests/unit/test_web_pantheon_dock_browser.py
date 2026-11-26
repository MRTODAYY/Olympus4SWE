"""Browser E2E tests for the 5-God Pantheon Dock and unified GodAvatar asset slot.

Run with:
  TMPDIR=/tmp uv run --with playwright pytest tests/unit/test_web_pantheon_dock_browser.py -q
"""

from __future__ import annotations

import importlib
import json
import os
import threading
import time
from pathlib import Path

import httpx
import pytest
import uvicorn

from olympus.core.contracts import (
    AcceptanceCheck,
    AmbiguityItem,
    ApprovalDecision,
    ApprovalRecord,
    ApprovalTarget,
    CheckKind,
    DesignSpec,
    GoalSpec,
    RequirementItem,
    RunStatus,
    TaskNode,
    TaskPlan,
    TaskStatus,
)
from olympus.core.store import RunStore
from olympus.web.server import AriadneApp, create_fastapi_app

playwright = (
    importlib.import_module("playwright.sync_api")
    if os.environ.get("OLYMPUS_REQUIRE_BROWSER_TESTS") == "1"
    else pytest.importorskip("playwright.sync_api")
)

IDLE_PORTRAIT_DATA_URI = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)
WORKING_ANIM_DATA_URI = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAQAAAABCAQAAABTNcdGAAAADklEQVR42mNgYGBgYAAAABAAAcqN53wAAAAASUVORK5CYII="
)


@pytest.fixture
def pantheon_server(tmp_path: Path):
    primary_repo = tmp_path / "olympus-repo"
    primary_repo.mkdir()
    store = RunStore(tmp_path / "runs.db")
    app = AriadneApp(store=store, workspace_root=primary_repo)
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
        yield store, primary_repo, tmp_path, f"http://127.0.0.1:{port}"
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


def _make_spec(spec_id: str, *, blocking_question: str | None = None) -> GoalSpec:
    ambiguities = (
        [
            AmbiguityItem(
                id="AMB-1",
                question=blocking_question,
                impact="Blocks target contract",
                blocking=True,
            )
        ]
        if blocking_question
        else []
    )
    return GoalSpec(
        spec_id=spec_id,
        goal=f"Goal for {spec_id}",
        requirements=[
            RequirementItem(
                id="R1",
                description="Ship deterministic behavior",
                acceptance_criteria=["Tests pass"],
            )
        ],
        open_ambiguities=ambiguities,
    )


def _make_design(spec: GoalSpec, design_id: str) -> DesignSpec:
    return DesignSpec.model_validate(
        {
            "design_id": design_id,
            "spec_hash": spec.content_hash,
            "architecture_summary": "Single bounded module with strict seam.",
            "modules": [
                {
                    "id": "CORE",
                    "name": "Core Module",
                    "responsibility": "Implements core contract",
                    "requirement_refs": ["R1"],
                    "target_paths": ["src/core.py"],
                }
            ],
            "data_models": [{"name": "Item", "fields": ["id"], "owner_module_id": "CORE"}],
            "interfaces": [
                {
                    "id": "IF-CORE",
                    "provider_module_id": "CORE",
                    "consumer_module_ids": [],
                    "signature": "run() -> bool",
                }
            ],
        }
    )


def _make_plan(
    spec: GoalSpec,
    plan_id: str,
    *,
    task_status: TaskStatus = TaskStatus.WAITING,
    attempt: int = 0,
) -> TaskPlan:
    return TaskPlan(
        plan_id=plan_id,
        spec_id=spec.spec_id,
        spec_hash=spec.content_hash,
        tasks=[
            TaskNode(
                task_id="T1",
                title="Implement core",
                objective="Ship src/core.py",
                write_scope=["src/core.py"],
                acceptance_checks=[
                    AcceptanceCheck(
                        id="T1-C1",
                        kind=CheckKind.COMMAND,
                        description="Run core tests",
                        command="pytest -q",
                    )
                ],
                status=task_status,
                attempt=attempt,
            )
        ],
    )


def _seed_oracle(
    store: RunStore,
    *,
    run_id: str,
    title: str,
    workspace_id: str,
    workspace_root: str,
    workflow_name: str = "full_sdlc_tdd",
    status: RunStatus = RunStatus.AWAITING_HUMAN,
    spec: GoalSpec | None = None,
    design: DesignSpec | None = None,
    plan: TaskPlan | None = None,
    approve: tuple[str, ...] = (),
) -> str:
    store.create_run(
        run_id=run_id,
        title=title,
        workspace_id=workspace_id,
        workspace_root=workspace_root,
        workspace_mode="brownfield",
        task_type="feature",
        workflow_name=workflow_name,
    )
    if spec is not None:
        store.save_spec(run_id, spec)
        if "spec" in approve:
            store.record_approval(
                ApprovalRecord(
                    run_id=run_id,
                    target=ApprovalTarget.GOAL_SPEC,
                    target_id=spec.spec_id,
                    target_hash=spec.content_hash,
                    approver="zeus",
                    decision=ApprovalDecision.APPROVED,
                )
            )
    if design is not None:
        store.save_design(run_id, design)
        if "design" in approve:
            store.record_approval(
                ApprovalRecord(
                    run_id=run_id,
                    target=ApprovalTarget.DESIGN_SPEC,
                    target_id=design.design_id,
                    target_hash=design.content_hash,
                    approver="zeus",
                    decision=ApprovalDecision.APPROVED,
                )
            )
    if plan is not None:
        store.save_plan(run_id, plan)
        if "plan" in approve:
            store.record_approval(
                ApprovalRecord(
                    run_id=run_id,
                    target=ApprovalTarget.TASK_PLAN,
                    target_id=plan.plan_id,
                    target_hash=plan.content_hash,
                    approver="zeus",
                    decision=ApprovalDecision.APPROVED,
                )
            )
    store.set_run_status(run_id, status)
    return run_id


def test_pantheon_dock_renders_five_seats_in_order_with_live_states_and_workspace_sync(
    pantheon_server, browser
):
    store, primary_repo, tmp_path, url = pantheon_server
    default_ws = httpx.get(f"{url}/api/workspaces").json()["workspaces"][0]

    second_repo = tmp_path / "voice-cli"
    second_repo.mkdir()
    ws2 = httpx.post(
        f"{url}/api/workspaces",
        json={"name": "voice-cli", "root_path": str(second_repo)},
    ).json()["workspace"]

    prom_wait = _seed_oracle(
        store,
        run_id="run-prom-wait",
        title="Clarify write scope",
        workspace_id=default_ws["workspace_id"],
        workspace_root=str(primary_repo),
        status=RunStatus.AWAITING_HUMAN,
        spec=_make_spec("spec-pw", blocking_question="Target branch?"),
    )

    athena_spec = _make_spec("spec-aw")
    athena_wait = _seed_oracle(
        store,
        run_id="run-ath-wait",
        title="Approve white-box design",
        workspace_id=default_ws["workspace_id"],
        workspace_root=str(primary_repo),
        status=RunStatus.AWAITING_HUMAN,
        spec=athena_spec,
        design=_make_design(athena_spec, "design-aw"),
        approve=("spec",),
    )

    heph_spec = _make_spec("spec-hw")
    heph_design = _make_design(heph_spec, "design-hw")
    heph_plan = _make_plan(heph_spec, "plan-hw", task_status=TaskStatus.RUNNING, attempt=1)
    heph_work = _seed_oracle(
        store,
        run_id="run-heph-work",
        title="Build isolated worktree",
        workspace_id=default_ws["workspace_id"],
        workspace_root=str(primary_repo),
        status=RunStatus.RUNNING,
        spec=heph_spec,
        design=heph_design,
        plan=heph_plan,
        approve=("spec", "design", "plan"),
    )
    store.append_event(
        run_id=heph_work,
        stage="graph",
        event_type="graph.node_started",
        actor="supervisor",
        payload={"node": "execute"},
    )

    argus_spec = _make_spec("spec-ad")
    argus_design = _make_design(argus_spec, "design-ad")
    argus_plan = _make_plan(argus_spec, "plan-ad", task_status=TaskStatus.ACCEPTED, attempt=1)
    _seed_oracle(
        store,
        run_id="run-arg-done",
        title="Verified delivery",
        workspace_id=default_ws["workspace_id"],
        workspace_root=str(primary_repo),
        status=RunStatus.COMPLETED,
        spec=argus_spec,
        design=argus_design,
        plan=argus_plan,
        approve=("spec", "design", "plan"),
    )

    prom_work_ws2 = _seed_oracle(
        store,
        run_id="run-voice-align",
        title="Align voice slicer CLI",
        workspace_id=ws2["workspace_id"],
        workspace_root=str(second_repo),
        status=RunStatus.ALIGNING,
    )

    page = browser.new_page(viewport={"width": 1440, "height": 900})
    expect = playwright.expect
    page.goto(f"{url}/")

    dock = page.locator("#pantheon-dock")
    expect(dock).to_be_visible()

    seat_gods = dock.locator(".pantheon-seat").evaluate_all(
        "nodes => nodes.map(node => node.dataset.god)"
    )
    assert seat_gods == ["prometheus", "athena", "hephaestus", "momus", "argus"]

    prom_seat = dock.locator(".pantheon-seat[data-god='prometheus']")
    expect(prom_seat).to_have_attribute("data-state", "waiting_on_human")
    expect(prom_seat.locator("[data-count-kind='waiting']")).to_have_text("1")
    expect(prom_seat.locator("[data-count-kind='active']")).to_have_text("1")
    expect(prom_seat.locator(f"[data-oracle-id='{prom_wait}']")).to_be_visible()
    expect(prom_seat.locator(f"[data-oracle-id='{prom_work_ws2}']")).to_be_visible()

    athena_seat = dock.locator(".pantheon-seat[data-god='athena']")
    expect(athena_seat).to_have_attribute("data-state", "waiting_on_human")
    expect(athena_seat.locator("[data-count-kind='waiting']")).to_have_text("1")
    expect(athena_seat.locator(f"[data-oracle-id='{athena_wait}']")).to_be_visible()

    heph_seat = dock.locator(".pantheon-seat[data-god='hephaestus']")
    expect(heph_seat).to_have_attribute("data-state", "working")
    expect(heph_seat.locator("[data-count-kind='active']")).to_have_text("1")
    expect(heph_seat.locator(f"[data-oracle-id='{heph_work}']")).to_be_visible()

    momus_seat = dock.locator(".pantheon-seat[data-god='momus']")
    expect(momus_seat).to_have_attribute("data-state", "idle")
    expect(momus_seat.locator(".pantheon-count-badge")).to_have_count(0)

    argus_seat = dock.locator(".pantheon-seat[data-god='argus']")
    expect(argus_seat).to_have_attribute("data-state", "idle")

    expect(
        dock.locator(".god-avatar[data-size='lg'][data-avatar-mode='fallback-svg']")
    ).to_have_count(5)
    expect(dock.locator(".god-avatar-svg")).to_have_count(5)
    expect(
        page.locator(".oracle-card .god-avatar[data-size='sm'] .god-avatar-svg")
    ).to_have_count(5)

    page.locator("#workspace-switcher").select_option(ws2["workspace_id"])
    expect(prom_seat).to_have_attribute("data-state", "working")
    expect(prom_seat.locator("[data-count-kind='waiting']")).to_have_count(0)
    expect(prom_seat.locator("[data-count-kind='active']")).to_have_text("1")
    expect(prom_seat.locator(f"[data-oracle-id='{prom_work_ws2}']")).to_be_visible()
    expect(prom_seat.locator(f"[data-oracle-id='{prom_wait}']")).to_have_count(0)
    expect(athena_seat).to_have_attribute("data-state", "idle")
    expect(heph_seat).to_have_attribute("data-state", "idle")

    page.locator("#workspace-switcher").select_option("")
    expect(prom_seat).to_have_attribute("data-state", "waiting_on_human")
    expect(heph_seat).to_have_attribute("data-state", "working")
    page.close()


def test_pantheon_dock_click_and_hover_cross_column_highlight_and_clear(pantheon_server, browser):
    store, primary_repo, _, url = pantheon_server
    default_ws = httpx.get(f"{url}/api/workspaces").json()["workspaces"][0]

    prom_human = _seed_oracle(
        store,
        run_id="run-p-human",
        title="Prometheus waiting card",
        workspace_id=default_ws["workspace_id"],
        workspace_root=str(primary_repo),
        status=RunStatus.AWAITING_HUMAN,
        spec=_make_spec("spec-ph", blocking_question="Need scope decision?"),
    )
    prom_agent = _seed_oracle(
        store,
        run_id="run-p-agent",
        title="Prometheus aligning card",
        workspace_id=default_ws["workspace_id"],
        workspace_root=str(primary_repo),
        status=RunStatus.ALIGNING,
    )

    heph_spec = _make_spec("spec-ha")
    heph_design = _make_design(heph_spec, "design-ha")
    heph_plan = _make_plan(heph_spec, "plan-ha", task_status=TaskStatus.RUNNING, attempt=1)
    heph_agent = _seed_oracle(
        store,
        run_id="run-h-agent",
        title="Hephaestus building card",
        workspace_id=default_ws["workspace_id"],
        workspace_root=str(primary_repo),
        status=RunStatus.RUNNING,
        spec=heph_spec,
        design=heph_design,
        plan=heph_plan,
        approve=("spec", "design", "plan"),
    )
    store.append_event(
        run_id=heph_agent,
        stage="graph",
        event_type="graph.node_started",
        actor="supervisor",
        payload={"node": "execute"},
    )

    arg_spec = _make_spec("spec-ad2")
    arg_design = _make_design(arg_spec, "design-ad2")
    arg_plan = _make_plan(arg_spec, "plan-ad2", task_status=TaskStatus.ACCEPTED, attempt=1)
    arg_done = _seed_oracle(
        store,
        run_id="run-a-done",
        title="Argus verified card",
        workspace_id=default_ws["workspace_id"],
        workspace_root=str(primary_repo),
        status=RunStatus.COMPLETED,
        spec=arg_spec,
        design=arg_design,
        plan=arg_plan,
        approve=("spec", "design", "plan"),
    )

    page = browser.new_page(viewport={"width": 1440, "height": 900})
    expect = playwright.expect
    page.goto(f"{url}/")

    prom_seat = page.locator("#pantheon-dock .pantheon-seat[data-god='prometheus']")
    heph_seat = page.locator("#pantheon-dock .pantheon-seat[data-god='hephaestus']")
    arg_seat = page.locator("#pantheon-dock .pantheon-seat[data-god='argus']")

    card_ph = page.locator(f".oracle-card[data-run-id='{prom_human}']")
    card_pa = page.locator(f".oracle-card[data-run-id='{prom_agent}']")
    card_ha = page.locator(f".oracle-card[data-run-id='{heph_agent}']")
    card_ad = page.locator(f".oracle-card[data-run-id='{arg_done}']")

    heph_seat.hover()
    expect(card_ha).to_have_attribute("data-highlight", "true")
    expect(card_ph).to_have_attribute("data-dimmed", "true")
    expect(card_pa).to_have_attribute("data-dimmed", "true")
    expect(card_ad).to_have_attribute("data-dimmed", "true")
    expect(heph_seat).to_have_attribute("aria-pressed", "false")

    page.locator(".board-title").hover()
    expect(page.locator(".oracle-card[data-highlight='true']")).to_have_count(0)
    expect(page.locator(".oracle-card[data-dimmed='true']")).to_have_count(0)

    prom_seat.click()
    expect(prom_seat).to_have_attribute("aria-pressed", "true")
    expect(prom_seat).to_have_attribute("data-selected", "true")
    expect(card_ph).to_have_attribute("data-highlight", "true")
    expect(card_pa).to_have_attribute("data-highlight", "true")
    expect(card_ha).to_have_attribute("data-dimmed", "true")
    expect(card_ad).to_have_attribute("data-dimmed", "true")

    clear_btn = page.get_by_role("button", name="Clear filter")
    expect(clear_btn).to_be_visible()
    clear_btn.click()
    expect(prom_seat).to_have_attribute("aria-pressed", "false")
    expect(page.locator(".oracle-card[data-highlight='true']")).to_have_count(0)
    expect(page.locator(".oracle-card[data-dimmed='true']")).to_have_count(0)

    arg_seat.click()
    expect(arg_seat).to_have_attribute("aria-pressed", "true")
    expect(card_ad).to_have_attribute("data-highlight", "true")
    expect(card_ph).to_have_attribute("data-dimmed", "true")
    expect(card_ha).to_have_attribute("data-dimmed", "true")

    arg_seat.click()
    expect(arg_seat).to_have_attribute("aria-pressed", "false")
    expect(page.locator(".oracle-card[data-highlight='true']")).to_have_count(0)
    expect(page.locator(".oracle-card[data-dimmed='true']")).to_have_count(0)
    page.close()


def test_god_avatar_asset_slot_working_animation_reduced_motion_and_fallback(
    pantheon_server, browser
):
    store, primary_repo, _, url = pantheon_server
    default_ws = httpx.get(f"{url}/api/workspaces").json()["workspaces"][0]

    _seed_oracle(
        store,
        run_id="run-av-prom",
        title="Avatar test waiting",
        workspace_id=default_ws["workspace_id"],
        workspace_root=str(primary_repo),
        status=RunStatus.AWAITING_HUMAN,
        spec=_make_spec("spec-av-p", blocking_question="Need answer"),
    )
    heph_spec = _make_spec("spec-av-h")
    heph_design = _make_design(heph_spec, "design-av-h")
    heph_plan = _make_plan(heph_spec, "plan-av-h", task_status=TaskStatus.RUNNING, attempt=1)
    heph_run = _seed_oracle(
        store,
        run_id="run-av-heph",
        title="Avatar test working",
        workspace_id=default_ws["workspace_id"],
        workspace_root=str(primary_repo),
        status=RunStatus.RUNNING,
        spec=heph_spec,
        design=heph_design,
        plan=heph_plan,
        approve=("spec", "design", "plan"),
    )
    store.append_event(
        run_id=heph_run,
        stage="graph",
        event_type="graph.node_started",
        actor="supervisor",
        payload={"node": "execute"},
    )

    expect = playwright.expect

    page = browser.new_page(viewport={"width": 1440, "height": 900})
    manifest = {
        "prometheus": {
            "idleSrc": IDLE_PORTRAIT_DATA_URI,
            "workingSrc": WORKING_ANIM_DATA_URI,
        },
        "hephaestus": {
            "idleSrc": IDLE_PORTRAIT_DATA_URI,
            "workingSrc": WORKING_ANIM_DATA_URI,
            "frames": 4,
            "fps": 8,
        },
        "athena": {
            "idleSrc": "/static/non-existent-athena-portrait.webp",
        },
        "momus": {
            "workingSrc": "/static/non-existent-momus-loop.webp",
        },
    }
    page.add_init_script(f"window.__OLYMPUS_AVATAR_MANIFEST__ = {json.dumps(manifest)};")
    page.goto(f"{url}/")

    prom_avatar = page.locator("#pantheon-dock .pantheon-seat[data-god='prometheus'] .god-avatar")
    heph_avatar = page.locator("#pantheon-dock .pantheon-seat[data-god='hephaestus'] .god-avatar")
    athena_avatar = page.locator("#pantheon-dock .pantheon-seat[data-god='athena'] .god-avatar")

    expect(prom_avatar).to_have_attribute("data-state", "waiting_on_human")
    expect(prom_avatar).to_have_attribute("data-avatar-mode", "idle-image")
    expect(prom_avatar.locator("img")).to_have_attribute("src", IDLE_PORTRAIT_DATA_URI)

    expect(heph_avatar).to_have_attribute("data-state", "working")
    expect(heph_avatar).to_have_attribute("data-avatar-mode", "working-sprite")
    expect(heph_avatar).to_have_attribute("data-reduced-motion", "false")
    anim_name = heph_avatar.locator(".god-avatar-sprite-strip").evaluate(
        "el => getComputedStyle(el).animationName"
    )
    assert anim_name == "pantheon-sprite-play"

    expect(athena_avatar).to_have_attribute("data-avatar-mode", "fallback-svg")
    expect(athena_avatar).to_have_attribute("data-asset-fallback", "true")
    expect(athena_avatar.locator(".god-avatar-svg")).to_be_visible()
    expect(athena_avatar.locator("img")).to_have_count(0)

    page.emulate_media(reduced_motion="reduce")
    expect(heph_avatar).to_have_attribute("data-reduced-motion", "true")
    expect(heph_avatar).to_have_attribute("data-avatar-mode", "idle-image")
    expect(heph_avatar.locator("img")).to_have_attribute("src", IDLE_PORTRAIT_DATA_URI)

    page.emulate_media(reduced_motion="no-preference")
    page.evaluate(
        """(uri) => {
            window.__OLYMPUS_AVATAR_MANIFEST__ = {
              hephaestus: { workingSrc: uri }
            };
            window.dispatchEvent(new Event('olympus:avatar-manifest-change'));
        }""",
        WORKING_ANIM_DATA_URI,
    )
    expect(heph_avatar).to_have_attribute("data-avatar-mode", "working-image")
    expect(heph_avatar.locator("img")).to_have_attribute("src", WORKING_ANIM_DATA_URI)

    page.emulate_media(reduced_motion="reduce")
    expect(heph_avatar).to_have_attribute("data-avatar-mode", "fallback-svg")
    expect(heph_avatar.locator(".god-avatar-svg")).to_be_visible()
    page.close()


def test_pantheon_dock_updates_live_via_board_sse(pantheon_server, browser):
    store, primary_repo, _, url = pantheon_server
    default_ws = httpx.get(f"{url}/api/workspaces").json()["workspaces"][0]

    live_run = _seed_oracle(
        store,
        run_id="run-live-sse",
        title="Live SSE Pantheon test",
        workspace_id=default_ws["workspace_id"],
        workspace_root=str(primary_repo),
        status=RunStatus.ALIGNING,
    )

    page = browser.new_page(viewport={"width": 1440, "height": 900})
    expect = playwright.expect
    page.goto(f"{url}/")

    prom_seat = page.locator("#pantheon-dock .pantheon-seat[data-god='prometheus']")
    expect(prom_seat).to_have_attribute("data-state", "working")
    expect(prom_seat.locator("[data-count-kind='active']")).to_have_text("1")
    expect(prom_seat.locator("[data-count-kind='waiting']")).to_have_count(0)

    store.save_spec(live_run, _make_spec("spec-sse-wait", blocking_question="Approve base ref?"))
    store.set_run_status(live_run, RunStatus.AWAITING_HUMAN)

    expect(prom_seat).to_have_attribute("data-state", "waiting_on_human")
    expect(prom_seat.locator("[data-count-kind='waiting']")).to_have_text("1")
    expect(prom_seat.locator("[data-count-kind='active']")).to_have_count(0)
    page.close()
