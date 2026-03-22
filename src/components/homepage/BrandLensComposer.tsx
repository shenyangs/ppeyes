import { useEffect, useState } from "react";
import type { BrandProfile } from "@/lib/brand";

type BrandLensComposerProps = {
  draft: BrandProfile;
  appliedProfile: BrandProfile | null;
  isAutofilling: boolean;
  autofillError: string | null;
  onChange: (profile: BrandProfile) => void;
  onAutofill: () => void;
  onApply: () => void;
  onClear: () => void;
};

export function BrandLensComposer({
  draft,
  appliedProfile,
  isAutofilling,
  autofillError,
  onChange,
  onAutofill,
  onApply,
  onClear
}: BrandLensComposerProps) {
  const [isExpanded, setIsExpanded] = useState(!appliedProfile);

  useEffect(() => {
    setIsExpanded(!appliedProfile);
  }, [appliedProfile]);

  function handleClear() {
    onClear();
    setIsExpanded(true);
  }

  return (
    <section className="panel brandLensPanel">
      <div className="panelHeader">
        <div>
          <p className="panelKicker">Brand Lens</p>
          <h2>品牌视角</h2>
        </div>
        <div className="panelActionRow">
          {appliedProfile ? <span className="brandLensState">已启用品牌判断</span> : null}
          {appliedProfile && !isExpanded ? (
            <button className="ghostButton compact" type="button" onClick={() => setIsExpanded(true)}>
              修改
            </button>
          ) : null}
          <button className="ghostButton compact" type="button" disabled={isAutofilling} onClick={onAutofill}>
            {isAutofilling ? "Gemini 填写中..." : "Gemini 一键填写"}
          </button>
          <button className="ghostButton compact" type="button" onClick={handleClear}>
            清空
          </button>
          {isExpanded ? (
            <button className="primaryButton" type="button" onClick={onApply}>
              应用品牌视角
            </button>
          ) : null}
        </div>
      </div>

      {isExpanded ? (
        <>
          <div className="brandLensGrid">
            <label className="field">
              <span>品牌名</span>
              <input
                placeholder="比如：WPS"
                value={draft.name}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    name: event.target.value
                  })
                }
              />
            </label>

            <label className="field">
              <span>产品/方案名</span>
              <input
                placeholder="比如：WPS365 / WPS AI"
                value={draft.product}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    product: event.target.value
                  })
                }
              />
            </label>

            <label className="field">
              <span>品牌一句话</span>
              <input
                placeholder="卖什么，给谁，用在什么场景，比如面向企业协同办公"
                value={draft.brief}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    brief: event.target.value
                  })
                }
              />
            </label>

            <label className="field fieldFull">
              <span>核心能力/卖点</span>
              <textarea
                placeholder="比如：企业协同、文档/表格/会议一体化、AI 写作总结、知识库问答、多人协作"
                rows={2}
                value={draft.capabilities}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    capabilities: event.target.value
                  })
                }
              />
            </label>

            <label className="field fieldFull">
              <span>当前传播目标</span>
              <textarea
                placeholder="比如：借热点证明 WPS365 / WPS AI 真能解决什么办公问题，并给销售线索预热"
                rows={2}
                value={draft.objective}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    objective: event.target.value
                  })
                }
              />
            </label>

            <label className="field fieldFull">
              <span>禁碰边界</span>
              <textarea
                placeholder="比如：不碰灾难事故，不做功效夸大，不下场站队争议"
                rows={2}
                value={draft.guardrails}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    guardrails: event.target.value
                  })
                }
              />
            </label>
          </div>

          <p className="brandLensHint">
            这里不是搜索关键词，而是给系统一张品牌和产品 brief。之后每条热点都会先按你的产品能力来做策划，不只说品牌态度，而是要落到具体产品方案。
          </p>
          {autofillError ? <p className="brandLensHint brandLensError">{autofillError}</p> : null}
        </>
      ) : (
        <div className="brandLensSummary">
          <div className="brandLensSummaryGrid">
            <div className="brandLensSummaryItem">
              <span>品牌</span>
              <strong>{appliedProfile?.name || "未填写"}</strong>
            </div>
            <div className="brandLensSummaryItem">
              <span>产品</span>
              <strong>{appliedProfile?.product || "未填写"}</strong>
            </div>
            <div className="brandLensSummaryItem brandLensSummaryItemWide">
              <span>能力</span>
              <strong>{appliedProfile?.capabilities || "未填写"}</strong>
            </div>
            <div className="brandLensSummaryItem brandLensSummaryItemWide">
              <span>目标</span>
              <strong>{appliedProfile?.objective || "未填写"}</strong>
            </div>
          </div>
          {autofillError ? <p className="brandLensHint brandLensError">{autofillError}</p> : null}
        </div>
      )}
    </section>
  );
}
