import type { DesignSpec, GoalSpec, RunProjection } from "../api/types";
import { useT } from "../i18n";
import { localized } from "../i18n/localized";
import { unresolvedAmbiguities } from "../lib/labels";
import { Badge, Card, DataTable, KeyValues, Mono, Notice, Row } from "./ui";

type SchemaField = NonNullable<NonNullable<DesignSpec["interfaces"]>[number]["input_schema"]>[number];

function formatSchemaFields(fields: SchemaField[] | undefined): string {
  return (fields || [])
    .map(
      (field) =>
        `${field.name}: ${field.type_expr}${field.required === false ? "?" : ""}${
          field.constraints ? ` (${field.constraints})` : ""
        }`,
    )
    .join(", ");
}

export function DesignTradeoff({ choice, cost }: { choice: string; cost: string }) {
  const t = useT();
  return (
    <>
      <span>{t("选择：{choice}", { choice })}</span>
      <br />
      <span>{t("代价：{cost}", { cost })}</span>
    </>
  );
}

export function DesignStructure({ design }: { design: DesignSpec }) {
  const t = useT();
  const contracts = design.interfaces || [];
  return (
    <>
      <DataTable
        label={t("模块图")}
        caption={t("模块图 · 模块边界与独占写入路径")}
        columns={[
          t("模块"),
          t("名称"),
          t("职责"),
          t("关联需求"),
          t("目标路径"),
          t("依赖模块"),
        ]}
        rows={(design.modules || []).map((module) => {
          const providers = new Set(
            contracts
              .filter((iface) => (iface.consumer_module_ids || []).includes(module.id))
              .map((iface) => iface.provider_module_id),
          );
          return {
            key: module.id,
            cells: [
              <Mono>{module.id}</Mono>,
              module.name,
              module.responsibility,
              <Mono>{(module.requirement_refs || []).join(", ")}</Mono>,
              <Mono>{(module.target_paths || []).join(", ")}</Mono>,
              <Mono>{[...providers].join(", ") || "—"}</Mono>,
            ],
          };
        })}
      />
      <Card title={t("数据模型")}>
        <ul className="spec-list">
          {(design.data_models || []).length ? (
            (design.data_models || []).map((entity) => (
              <li key={entity.name}>
                <strong>{entity.name}</strong>{" "}
                <span className="card-note">
                  {t("owner {module}", { module: entity.owner_module_id })}
                </span>
                <br />
                <span className="mono">{(entity.fields || []).join(", ")}</span>
                {entity.notes ? (
                  <>
                    {" "}
                    <span className="card-note">{entity.notes}</span>
                  </>
                ) : null}
              </li>
            ))
          ) : (
            <li>{t("（无）")}</li>
          )}
        </ul>
      </Card>
      <Card title={t("接口契约")}>
        <ul className="spec-list">
          {contracts.length ? (
            contracts.map((iface) => {
              const inText = formatSchemaFields(iface.input_schema);
              const outText = formatSchemaFields(iface.output_schema);
              const refsText = (iface.data_entity_refs || []).join(", ");
              const errors = iface.error_cases || [];
              return (
                <li key={iface.id}>
                  <strong className="mono">{iface.id}</strong> <Badge>{iface.protocol || "http_or_fn"}</Badge>{" "}
                  <span className="mono">{iface.signature}</span>
                  <br />
                  <span className="card-note">
                    {iface.provider_module_id} → {(iface.consumer_module_ids || []).join(", ") || "external"}
                  </span>
                  {inText ? (
                    <>
                      <br />
                      <span className="card-note">
                        {t("入参：")}
                        <span className="mono">{inText}</span>
                      </span>
                    </>
                  ) : null}
                  {outText ? (
                    <>
                      <br />
                      <span className="card-note">
                        {t("出参：")}
                        <span className="mono">{outText}</span>
                      </span>
                    </>
                  ) : null}
                  {refsText ? (
                    <>
                      <br />
                      <span className="card-note">
                        {t("实体：")}
                        <span className="mono">{refsText}</span>
                      </span>
                    </>
                  ) : null}
                  {errors.length ? (
                    <>
                      <br />
                      <span className="card-note">
                        {t("错误：{errors}", { errors: errors.join(t("；")) })}
                      </span>
                    </>
                  ) : null}
                </li>
              );
            })
          ) : (
            <li>{t("（无）")}</li>
          )}
        </ul>
      </Card>
    </>
  );
}

function RequirementList({ spec }: { spec: GoalSpec }) {
  const t = useT();
  return (
    <>
      {(spec.requirements || []).map((req) => {
        const ears = req.ears_criteria || [];
        const criteria = req.acceptance_criteria || [];
        return (
          <article className="spec-requirement" key={req.id}>
            <div className="spec-requirement-head">
              <Badge>{req.id}</Badge>
              <span>{req.description}</span>
            </div>
            <ul className="spec-list">
              {ears.length
                ? ears.map((criterion, index) => (
                    <li key={criterion.id || index}>
                      <span className="card-note">{criterion.pattern || ""}</span>{" "}
                      {criterion.condition ? `${criterion.condition} → ${criterion.outcome}` : criterion.outcome}
                    </li>
                  ))
                : criteria.length
                  ? criteria.map((item, index) => <li key={index}>{item}</li>)
                  : <li>{t("（未声明验收标准）")}</li>}
            </ul>
          </article>
        );
      })}
    </>
  );
}

function ListOrNone({ items }: { items: string[] | undefined }) {
  const t = useT();
  return (
    <ul className="spec-list">
      {(items || []).length ? (items || []).map((item, index) => <li key={index}>{item}</li>) : <li>{t("（无）")}</li>}
    </ul>
  );
}

export function GoalSpecCard({ spec, projection }: { spec: GoalSpec; projection: RunProjection }) {
  const t = useT();
  const blockers = unresolvedAmbiguities(projection.spec);
  return (
    <Card
      title={t("GoalSpec · 需求冻结")}
      note={t("目标与验收标准")}
      id="run-spec-detail"
    >
      <KeyValues>
        <Row label={t("目标")}>
          {spec.goal} <Badge variant={projection.spec_approved ? "ok" : "warn"}>{spec.status || "draft"}</Badge>
        </Row>
        <Row label={t("交付形态")} mono>
          {spec.deliverable_kind || t("（未声明）")}
        </Row>
        <Row label={t("可观察面")}>
          {(spec.observable_surfaces || []).join(", ") || t("（未声明）")}
        </Row>
        <Row label={t("参与者")}>{(spec.actors || []).join(", ") || t("（未声明）")}</Row>
        <Row label={t("指纹")} mono>
          {`${String(spec.content_hash || "").slice(0, 16)}… · v${spec.version || 1}`}
        </Row>
      </KeyValues>
      {blockers.length ? (
        <Notice level="warn">
          {t("仍有 {count} 个阻断歧义未回答，批准前需澄清或显式接受风险。", {
            count: blockers.length,
          })}
        </Notice>
      ) : null}
      <Card title={t("需求与 EARS 验收")}>
        <div className="spec-requirements">
          <RequirementList spec={spec} />
        </div>
      </Card>
      <Card title={t("范围外")}>
        <ListOrNone items={spec.out_of_scope} />
      </Card>
      <Card title={t("约束")}>
        <ListOrNone items={spec.constraints} />
      </Card>
    </Card>
  );
}

const IMPACTS: Record<string, string> = localized({
  existing_system: "现有系统",
  deployment: "部署",
  rollback: "回滚",
});

export function DesignSpecCard({ design, projection }: { design: DesignSpec; projection: RunProjection }) {
  const t = useT();
  const invariants = design.shared_invariants || [];
  const tradeoffs = design.design_tradeoffs || [];
  const risks = design.risks_and_tradeoffs || [];
  const strategy = design.execution_strategy;
  const strategyBadge =
    strategy === "contract_first_parallel" ? (
      <Badge variant="ok">{t("契约先行并发")}</Badge>
    ) : strategy === "serial_handoff" ? (
      <Badge variant="warn">{t("串行顺序接力")}</Badge>
    ) : null;
  const contractPaths = (design.shared_contract_paths || []).join(", ");
  return (
    <Card
      title={t("DesignSpec · 白盒设计")}
      note={t("{count} 个模块", { count: (design.modules || []).length })}
      id="run-design-detail"
    >
      <KeyValues>
        <Row label={t("架构摘要")}>
          {design.architecture_summary}{" "}
          <Badge variant={projection.design_approved ? "ok" : "warn"}>{design.status || "draft"}</Badge>
        </Row>
        {strategyBadge ? (
          <Row label={t("执行策略")}>
            {strategyBadge}
            {design.strategy_rationale ? (
              <>
                {" "}
                <span className="card-note">{design.strategy_rationale}</span>
              </>
            ) : null}
          </Row>
        ) : null}
        {contractPaths ? (
          <Row label={t("共享契约域")} mono>
            {contractPaths} <Badge>{t("W0 写 · W1 只读")}</Badge>
          </Row>
        ) : null}
        <Row label={t("绑定需求")} mono>
          {design.spec_id || t("（未绑定）")}
        </Row>
        <Row label={t("指纹")} mono>
          {`${String(design.content_hash || "").slice(0, 16)}… · v${design.version || 1}`}
        </Row>
      </KeyValues>
      {invariants.length ? (
        <DataTable
          caption={t("全局不变量（防跨模块隐性漂移）")}
          columns={[t("编号"), t("类别"), t("全局规则"), t("适用范围 / 提示")]}
          rows={invariants.map((inv) => ({
            key: inv.id,
            cells: [
              <Mono>{inv.id}</Mono>,
              <Badge>{inv.category || "rule"}</Badge>,
              inv.rule,
              <>
                {(inv.applies_to || []).join(", ") || t("全局")}
                {inv.enforcement_hint ? (
                  <>
                    {" · "}
                    <span className="card-note">{inv.enforcement_hint}</span>
                  </>
                ) : null}
              </>,
            ],
          }))}
        />
      ) : (
        <Card title={t("全局不变量")}>
          <p className="view-note">
            {t("v1 规格未声明结构化全局不变量（DesignSpec v2 新建架构将强制校验）。")}
          </p>
        </Card>
      )}
      <DesignStructure design={design} />
      <Card title={t("风险与取舍")}>
        <ul className="spec-list">
          {tradeoffs.length || risks.length ? (
            <>
              {tradeoffs.map(({ impact, choice, cost }, index) => (
                <li key={`t${index}`}>
                  <strong>{IMPACTS[impact]}</strong>
                  <br />
                  <DesignTradeoff choice={choice} cost={cost} />
                </li>
              ))}
              {risks.map((risk, index) => (
                <li key={`r${index}`}>{risk}</li>
              ))}
            </>
          ) : (
            <li>{t("（无）")}</li>
          )}
        </ul>
      </Card>
    </Card>
  );
}
