import React, { useEffect, useMemo, useRef, useState } from "react";
import { EquityCounterfactualCanvas } from "./components/EquityCounterfactualCanvas";
import {
  AA_PLAYBOOK_RECONCILIATIONS,
  COMPETITION_EQUITY_CURVE,
  EquityCurvePoint,
  HistoricalAuditDecisionRow,
  INITIAL_PORTFOLIO_CONTEXT,
  PRESET_TRADE_PROPOSALS,
  SPY_BENCHMARK_RETURNS,
  US_11_SECTORS_RAW,
} from "./engine/marketDataset";
import {
  QCA_MULTI_AGENT_FLEET,
  QCA_SCHEDULE_TEMPLATES,
  buildCoordinatorApiCreationCurl,
} from "./engine/qcaPackager";
import {
  MarketRegimePosture,
  classifyMarketRegime,
  computeSectorRelativeStrength,
} from "./engine/quantIndicators";
import {
  PortfolioRuntimeContext,
  SgtSessionWindow,
  TradeProposalInput,
  evaluateProposalThroughGate,
} from "./engine/riskGate";
import {
  DEFAULT_MOMEN_PROJECT_EX_ID,
  MomenRealtimeWsEngine,
  WsFrameLog,
  loadPersistedDecisions,
  momenGraphql,
  savePersistedDecisions,
} from "./momenClient";

type ActiveMode = "TERMINAL" | "LEDGER" | "REGIME" | "QCA";

interface QcaSkillsManifest {
  generatedAtUtc: string;
  sourceRepo: string;
  sourceCommit: string;
  totalSkills: number;
  allValid: boolean;
  skills: Array<{
    slug: string;
    category: string;
    version: string;
    description: string;
    zipFile: string;
    sizeBytes: number;
    fileCount: number;
    repairedRelativeLinks: number;
  }>;
}

export const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<ActiveMode>("TERMINAL");

  // Portfolio Runtime Context
  const [portfolioCtx, setPortfolioCtx] = useState<PortfolioRuntimeContext>(
    INITIAL_PORTFOLIO_CONTEXT
  );

  // Active Proposal State
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    PRESET_TRADE_PROPOSALS[0].id
  );
  const [proposal, setProposal] = useState<TradeProposalInput>(
    PRESET_TRADE_PROPOSALS[0]
  );

  // Editable Form Overrides for Live Interactive Evaluation & Invalid-Input Testing
  const [symbolInput, setSymbolInput] = useState<string>(
    PRESET_TRADE_PROPOSALS[0].symbol
  );
  const [sideInput, setSideInput] = useState<"BUY" | "SELL_SHORT">(
    PRESET_TRADE_PROPOSALS[0].side
  );
  const [orderTypeInput, setOrderTypeInput] = useState<"LIMIT" | "MARKET">(
    PRESET_TRADE_PROPOSALS[0].orderType
  );
  const [entryPriceInput, setEntryPriceInput] = useState<string>(
    String(PRESET_TRADE_PROPOSALS[0].entryPrice)
  );
  const [stopPriceInput, setStopPriceInput] = useState<string>(
    String(PRESET_TRADE_PROPOSALS[0].stopPrice)
  );
  const [targetPriceInput, setTargetPriceInput] = useState<string>(
    String(PRESET_TRADE_PROPOSALS[0].targetPrice)
  );
  const [daysToErInput, setDaysToErInput] = useState<string>(
    String(PRESET_TRADE_PROPOSALS[0].daysToEarnings)
  );
  const [allocOverrideInput, setAllocOverrideInput] = useState<string>(
    PRESET_TRADE_PROPOSALS[0].requestedAllocationOverridePct
      ? String(PRESET_TRADE_PROPOSALS[0].requestedAllocationOverridePct)
      : ""
  );

  // Persisted Decision & Rejection Ledger
  const [ledgerRows, setLedgerRows] = useState<HistoricalAuditDecisionRow[]>(
    () => loadPersistedDecisions()
  );
  const [equityPoints, setEquityPoints] = useState<EquityCurvePoint[]>(
    COMPETITION_EQUITY_CURVE
  );

  // Ledger Filtering & Inspection
  const [ledgerFilter, setLedgerFilter] = useState<
    "ALL" | "APPROVED" | "REJECTED" | "R03" | "R09" | "R11"
  >("ALL");
  const [ledgerSearch, setLedgerSearch] = useState<string>("");
  const [selectedLedgerRowId, setSelectedLedgerRowId] = useState<string>(
    INITIAL_PORTFOLIO_CONTEXT ? "DEC-20261120-004" : ""
  );

  // Regime Inputs (Tab 03)
  const [qqqPriceInput, setQqqPriceInput] = useState<number>(508.4);
  const [qqqEma10Input, setQqqEma10Input] = useState<number>(504.2);
  const [qqqEma20Input, setQqqEma20Input] = useState<number>(498.6);
  const [spyPriceInput, setSpyPriceInput] = useState<number>(598.5);
  const [spySma50Input, setSpySma50Input] = useState<number>(584.0);
  const [wedgeDropFlag, setWedgeDropFlag] = useState<boolean>(false);

  // QCA Skills Manifest (Tab 04)
  const [skillsManifest, setSkillsManifest] =
    useState<QcaSkillsManifest | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Action Status States (Loading, Success, Error)
  const [actionState, setActionState] = useState<{
    status: "IDLE" | "LOADING" | "SUCCESS" | "ERROR";
    message: string;
  }>({ status: "IDLE", message: "" });

  // Momen WebSocket & Telemetry Frame Log
  const [wsFrames, setWsFrames] = useState<WsFrameLog[]>([]);
  const wsEngineRef = useRef<MomenRealtimeWsEngine | null>(null);

  useEffect(() => {
    const engine = new MomenRealtimeWsEngine((frame) => {
      setWsFrames((prev) => [frame, ...prev.slice(0, 14)]);
    });
    wsEngineRef.current = engine;
    engine.connect(DEFAULT_MOMEN_PROJECT_EX_ID);

    // Load QCA packaged skills manifest
    fetch("./qca-skills/manifest.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.skills) setSkillsManifest(data);
      })
      .catch(() => {
        // fallback if manifest not fetched
      });
  }, []);

  // Select Preset Handler
  const handleSelectPreset = (preset: TradeProposalInput) => {
    setSelectedPresetId(preset.id);
    setProposal(preset);
    setSymbolInput(preset.symbol);
    setSideInput(preset.side);
    setOrderTypeInput(preset.orderType);
    setEntryPriceInput(String(preset.entryPrice));
    setStopPriceInput(String(preset.stopPrice));
    setTargetPriceInput(String(preset.targetPrice));
    setDaysToErInput(String(preset.daysToEarnings));
    setAllocOverrideInput(
      preset.requestedAllocationOverridePct
        ? String(preset.requestedAllocationOverridePct)
        : ""
    );
    setActionState({ status: "IDLE", message: "" });
  };

  // Validate Numeric Form Inputs
  const parsedEntry = Number(entryPriceInput);
  const parsedStop = Number(stopPriceInput);
  const parsedTarget = Number(targetPriceInput);
  const parsedDaysToEr = Number(daysToErInput);
  const parsedOverride =
    allocOverrideInput.trim() === "" ? undefined : Number(allocOverrideInput);

  const inputErrors: Record<string, string> = {};
  if (!symbolInput.trim() || !/^[A-Z]{2}\.[A-Z0-9.]+$/i.test(symbolInput.trim())) {
    inputErrors.symbol =
      "Use Moomoo MARKET.CODE format (e.g. US.NVDA, US.PLTR, US.SPY).";
  }
  if (!Number.isFinite(parsedEntry) || parsedEntry <= 0) {
    inputErrors.entry = "Entry price must be a positive number (> $0.00).";
  }
  if (!Number.isFinite(parsedStop) || parsedStop < 0) {
    inputErrors.stop = "Stop price must be >= $0.00.";
  } else if (
    Number.isFinite(parsedEntry) &&
    parsedEntry > 0 &&
    ((sideInput === "BUY" && parsedStop >= parsedEntry) ||
      (sideInput === "SELL_SHORT" && parsedStop <= parsedEntry))
  ) {
    inputErrors.stop =
      sideInput === "BUY"
        ? `Stop ($${parsedStop.toFixed(2)}) must be strictly below Entry ($${parsedEntry.toFixed(2)}) for a BUY.`
        : `Stop ($${parsedStop.toFixed(2)}) must be strictly above Entry ($${parsedEntry.toFixed(2)}) for a SHORT.`;
  }
  if (
    !Number.isFinite(parsedTarget) ||
    parsedTarget <= 0 ||
    (sideInput === "BUY" && parsedTarget <= parsedEntry) ||
    (sideInput === "SELL_SHORT" && parsedTarget >= parsedEntry)
  ) {
    inputErrors.target =
      sideInput === "BUY"
        ? "Target price must be strictly above Entry price for a BUY."
        : "Target price must be strictly below Entry price for a SHORT.";
  }

  // Build effective proposal from form controls
  const effectiveProposal: TradeProposalInput = useMemo(() => {
    const safeEntry =
      Number.isFinite(parsedEntry) && parsedEntry > 0
        ? parsedEntry
        : proposal.entryPrice;
    const safeStop =
      Number.isFinite(parsedStop) && parsedStop >= 0
        ? parsedStop
        : proposal.stopPrice;
    const safeTarget =
      Number.isFinite(parsedTarget) && parsedTarget > 0
        ? parsedTarget
        : proposal.targetPrice;
    const safeEr = Number.isFinite(parsedDaysToEr)
      ? Math.max(0, Math.round(parsedDaysToEr))
      : proposal.daysToEarnings;

    return {
      ...proposal,
      symbol: symbolInput.trim().toUpperCase() || proposal.symbol,
      side: sideInput,
      orderType: orderTypeInput,
      entryPrice: safeEntry,
      stopPrice: safeStop,
      targetPrice: safeTarget,
      bidPrice:
        proposal.instrumentType === "LONG_CALL_OPTION"
          ? proposal.bidPrice
          : Number((safeEntry - 0.05).toFixed(2)),
      askPrice:
        proposal.instrumentType === "LONG_CALL_OPTION"
          ? proposal.askPrice
          : Number((safeEntry + 0.05).toFixed(2)),
      daysToEarnings: safeEr,
      requestedAllocationOverridePct:
        parsedOverride !== undefined && Number.isFinite(parsedOverride)
          ? parsedOverride
          : undefined,
    };
  }, [
    proposal,
    symbolInput,
    sideInput,
    orderTypeInput,
    parsedEntry,
    parsedStop,
    parsedTarget,
    parsedDaysToEr,
    parsedOverride,
  ]);

  // Live Deterministic Gate Evaluation
  const gateReport = useMemo(
    () => evaluateProposalThroughGate(effectiveProposal, portfolioCtx),
    [effectiveProposal, portfolioCtx]
  );

  // Live 11-Sector Relative Strength & Regime Diagnosis
  const rankedSectors = useMemo(
    () =>
      computeSectorRelativeStrength(US_11_SECTORS_RAW, SPY_BENCHMARK_RETURNS),
    []
  );

  const regimeDiagnosis = useMemo(
    () =>
      classifyMarketRegime(
        qqqPriceInput,
        qqqEma10Input,
        qqqEma20Input,
        spyPriceInput,
        spySma50Input,
        wedgeDropFlag
      ),
    [
      qqqPriceInput,
      qqqEma10Input,
      qqqEma20Input,
      spyPriceInput,
      spySma50Input,
      wedgeDropFlag,
    ]
  );

  // Ledger Summary Metrics
  const ledgerSummary = useMemo(() => {
    const approvedRows = ledgerRows.filter(
      (r) => r.gateVerdict === "APPROVED"
    );
    const rejectedRows = ledgerRows.filter(
      (r) => r.gateVerdict === "REJECTED"
    );
    const realizedAlphaUsd = approvedRows.reduce(
      (acc, r) => acc + r.realizedOrSavedUsd,
      0
    );
    const savedDrawdownUsd = rejectedRows.reduce(
      (acc, r) => acc + Math.max(0, r.realizedOrSavedUsd),
      0
    );
    const expectancyPerTradeUsd =
      approvedRows.length > 0 ? realizedAlphaUsd / approvedRows.length : 0;

    return {
      totalCount: ledgerRows.length,
      approvedCount: approvedRows.length,
      rejectedCount: rejectedRows.length,
      realizedAlphaUsd: Number(realizedAlphaUsd.toFixed(2)),
      savedDrawdownUsd: Number(savedDrawdownUsd.toFixed(2)),
      expectancyPerTradeUsd: Number(expectancyPerTradeUsd.toFixed(2)),
    };
  }, [ledgerRows]);

  const filteredLedgerRows = useMemo(() => {
    return ledgerRows.filter((row) => {
      if (ledgerFilter === "APPROVED" && row.gateVerdict !== "APPROVED")
        return false;
      if (ledgerFilter === "REJECTED" && row.gateVerdict !== "REJECTED")
        return false;
      if (
        (ledgerFilter === "R03" ||
          ledgerFilter === "R09" ||
          ledgerFilter === "R11") &&
        !row.failedRules.includes(ledgerFilter)
      ) {
        return false;
      }
      if (ledgerSearch.trim() !== "") {
        const q = ledgerSearch.trim().toLowerCase();
        const hay =
          `${row.id} ${row.symbol} ${row.setup} ${row.auditRationale} ${row.failedRules.join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [ledgerRows, ledgerFilter, ledgerSearch]);

  // Primary Action 01: Commit Proposal through R01-R11 Gate
  const handleCommitProposal = async () => {
    if (Object.keys(inputErrors).length > 0) {
      setActionState({
        status: "ERROR",
        message: `Cannot commit proposal: fix invalid input field (${Object.values(inputErrors)[0]})`,
      });
      return;
    }

    setActionState({
      status: "LOADING",
      message: `Auditing ${effectiveProposal.symbol} through R01–R11 Deterministic Gate & syncing Momen/JSONL Audit Ledger...`,
    });

    await new Promise((r) => setTimeout(r, 180));

    const newDecisionId = `DEC-20261123-${String(ledgerRows.length + 1).padStart(3, "0")}`;
    const isApproved = gateReport.gateVerdict === "APPROVED";
    const impactUsd = isApproved
      ? gateReport.counterfactualImpactUsd
      : Math.abs(gateReport.counterfactualImpactUsd);

    const newRow: HistoricalAuditDecisionRow = {
      id: newDecisionId,
      timestampSGT: "2026-11-23 23:02 SGT",
      sessionWindow: portfolioCtx.sgtSessionWindow,
      symbol: effectiveProposal.symbol,
      side: effectiveProposal.side,
      setup: effectiveProposal.setup,
      regime: portfolioCtx.regimePosture,
      entryPrice: effectiveProposal.entryPrice,
      stopPrice: effectiveProposal.stopPrice,
      targetPrice: effectiveProposal.targetPrice,
      units: gateReport.sizing.finalUnits,
      notionalUsd: gateReport.sizing.notionalUsd,
      weightPct: gateReport.sizing.postTradeSymbolWeightPct,
      riskPctEquity: gateReport.sizing.actualTradeRiskPctEquity,
      anomalyScore: gateReport.anomalyConvergenceScore,
      gateVerdict: gateReport.gateVerdict,
      failedRules: gateReport.failedRuleIds,
      realizedOrCounterfactualPct: effectiveProposal.counterfactual5dOutcomePct,
      realizedOrSavedUsd: impactUsd,
      moomooOrderId: isApproved
        ? `MM-SIM-${904100 + ledgerRows.length}`
        : "BLOCKED-BY-AEGIS-GATE",
      auditRationale: isApproved
        ? `Passed 11/11 rules. Queued 3-Rung Limit Ladder (${gateReport.sizing.finalUnits} ${gateReport.sizing.unitLabel} @ $${gateReport.limitLadder[0].limitPrice.toFixed(2)} midpoint).`
        : `VETOED by ${gateReport.failedRuleIds.join(", ")}. ${gateReport.advisorRedTeamNote}`,
    };

    const updatedLedger = [newRow, ...ledgerRows];
    setLedgerRows(updatedLedger);
    savePersistedDecisions(updatedLedger);
    setSelectedLedgerRowId(newRow.id);

    // Update Equity Curve & Portfolio Context
    const lastPt = equityPoints[equityPoints.length - 1];
    const nextGuarded = isApproved
      ? Math.round(lastPt.guardedEquityUsd + impactUsd)
      : lastPt.guardedEquityUsd;
    const nextUngated = isApproved
      ? Math.round(lastPt.ungatedCounterfactualUsd + impactUsd)
      : Math.round(lastPt.ungatedCounterfactualUsd - impactUsd);
    const nextSaved = isApproved
      ? lastPt.savedDrawdownCumulativeUsd
      : Math.round(lastPt.savedDrawdownCumulativeUsd + impactUsd);

    setEquityPoints((prev) => [
      ...prev,
      {
        dayLabel: `D${prev.length} // Live`,
        dateStr: "2026-11-23",
        sessionNote: isApproved
          ? `Approved ${effectiveProposal.symbol} (${gateReport.sizing.finalUnits} ${gateReport.sizing.unitLabel})`
          : `Blocked ${effectiveProposal.symbol} [${gateReport.failedRuleIds.join(",")}] (Saved $${impactUsd.toFixed(0)})`,
        guardedEquityUsd: nextGuarded,
        ungatedCounterfactualUsd: nextUngated,
        qqqBenchmarkUsd: lastPt.qqqBenchmarkUsd + 180,
        savedDrawdownCumulativeUsd: nextSaved,
        openHeatPct: isApproved
          ? gateReport.sizing.postTradePortfolioHeatPct
          : lastPt.openHeatPct,
      },
    ]);

    if (isApproved) {
      setPortfolioCtx((prev) => ({
        ...prev,
        netAssetsUsd: nextGuarded,
        ordersExecutedToday: prev.ordersExecutedToday + 1,
        currentOpenHeatPct: gateReport.sizing.postTradePortfolioHeatPct,
      }));
    }

    // Best-effort Momen GraphQL sync if live projectExId is configured
    if (DEFAULT_MOMEN_PROJECT_EX_ID !== "aegisgate_moomoo_qoder_v1") {
      try {
        await momenGraphql(
          `mutation LogTradeDecision($obj: trade_decision_insert_input!) {
            insert_trade_decision_one(object: $obj) { id symbol gate_verdict }
          }`,
          {
            obj: {
              symbol: newRow.symbol,
              side: newRow.side,
              strategy_setup: newRow.setup,
              entry_price: newRow.entryPrice,
              stop_price: newRow.stopPrice,
              target_price: newRow.targetPrice,
              shares: newRow.units,
              notional_usd: newRow.notionalUsd,
              position_weight_pct: newRow.weightPct,
              risk_pct_equity: newRow.riskPctEquity,
              anomaly_score: newRow.anomalyScore,
              regime_posture: newRow.regime,
              gate_verdict: newRow.gateVerdict,
              failed_rules_csv: newRow.failedRules.join(","),
              counterfactual_pnl_usd: newRow.realizedOrSavedUsd,
              session_window: newRow.sessionWindow,
            },
          }
        );
      } catch {
        // Local persistence already succeeded
      }
    }

    setActionState({
      status: "SUCCESS",
      message: isApproved
        ? `COMMITTED ${newRow.id}: ${effectiveProposal.symbol} passed 11/11 rules -> 3-Rung Limit Order (${newRow.moomooOrderId}) queued.`
        : `VETO LOGGED ${newRow.id}: ${effectiveProposal.symbol} blocked by [${gateReport.failedRuleIds.join(", ")}] -> Counterfactual Saved Drawdown (+$${impactUsd.toLocaleString()}) recorded in Audit Ledger.`,
    });
  };

  // Primary Action 02: Export Decision & Rejection Ledger (JSONL + CSV)
  const handleExportLedger = () => {
    const jsonlContent = ledgerRows.map((r) => JSON.stringify(r)).join("\n");
    const blob = new Blob([jsonlContent], { type: "application/x-ndjson" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aegisgate-decisions-audit.jsonl";
    a.click();
    URL.revokeObjectURL(url);
    setActionState({
      status: "SUCCESS",
      message: `Exported ${ledgerRows.length} structured decisions (${ledgerSummary.approvedCount} APPROVED, ${ledgerSummary.rejectedCount} REJECTED) to aegisgate-decisions-audit.jsonl.`,
    });
  };

  // Primary Action 03: Apply Regime Posture to Portfolio Guard
  const handleApplyRegimeToGuard = () => {
    setPortfolioCtx((prev) => ({
      ...prev,
      regimePosture: regimeDiagnosis.posture,
    }));
    setActionState({
      status: "SUCCESS",
      message: `Synced Market Regime Posture [${regimeDiagnosis.posture}] to Portfolio Guard: Per-Trade Risk Budget set to ${regimeDiagnosis.perTradeRiskBudgetPct.toFixed(3)}%, Max Exposure ${regimeDiagnosis.localDeskMaxExposurePct}%.`,
    });
  };

  // Primary Action 04: Download Complete QCA Multi-Agent & Skill Bundle
  const handleDownloadQcaBundle = () => {
    const bundle = {
      bundleName: "AegisGate-Moomoo-x-Qoder-Runnable-Package",
      version: "1.0.0",
      generatedAtUtc: new Date().toISOString(),
      competitionAccount: portfolioCtx.accountName,
      qcaMultiAgentFleet: QCA_MULTI_AGENT_FLEET,
      forwardModeSchedules: QCA_SCHEDULE_TEMPLATES,
      reconciledPlaybookRules: AA_PLAYBOOK_RECONCILIATIONS,
      packagedMoomooSkills: skillsManifest?.skills || [],
      decisionAuditLogSample: ledgerRows,
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aegisgate-qca-multiagent-bundle.json";
    a.click();
    URL.revokeObjectURL(url);
    setActionState({
      status: "SUCCESS",
      message:
        "Downloaded aegisgate-qca-multiagent-bundle.json (4-Thread QCA Coordinator + 3 Schedules + 12 Skill Manifest + Decision Log).",
    });
  };

  const handleCopyText = (key: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const inspectedLedgerRow =
    ledgerRows.find((r) => r.id === selectedLedgerRowId) ||
    filteredLedgerRows[0] ||
    ledgerRows[0];

  return (
    <div>
      {/* Top Industrial Exchange & Competition Telemetry Ribbon */}
      <header className="top-telemetry-ribbon" role="banner">
        <div className="ribbon-cluster">
          <span className="status-pill live">
            ● AEGISGATE // MOOMOO × QODER CHALLENGE
          </span>
          <span>
            ACCOUNT: <strong>{portfolioCtx.accountId} ($100K PAPER US)</strong>
          </span>
          <span>
            SGT SESSION:{" "}
            <strong>
              {portfolioCtx.sgtSessionWindow.replace(/_/g, " ")}
            </strong>
          </span>
        </div>
        <div className="ribbon-cluster">
          <span className="status-pill amber">
            REGIME: {portfolioCtx.regimePosture} (QQQ &gt; 20 EMA)
          </span>
          <span>
            QCA FLEET: <strong>4 THREADS + ADVISOR PINNED</strong>
          </span>
          <span className="status-pill live">
            AUDIT BUS: {wsFrames.length} FRAMES
          </span>
        </div>
      </header>

      {/* Swiss Brutalist Masthead + Competition KPI Matrix */}
      <section className="brutalist-masthead" aria-label="Portfolio Masthead">
        <div className="masthead-left">
          <div className="masthead-eyebrow">
            <span className="eyebrow-tag">DETERMINISTIC R01–R11 GATE</span>
            <span className="eyebrow-tag orange">ZERO RESET-CARD HAZARD</span>
            <span>SINGAPORE // US EQUITIES, ETFS &amp; OPTIONS</span>
          </div>
          <h1 className="masthead-title">
            AEGISGATE <em>Risk &amp; Execution</em> CONTROL PLANE
          </h1>
          <p className="masthead-subtitle">
            Qualitative multi-agent research (Qoder Cloud Agents + Moomoo
            Unusual Skills) gated by zero-hallucination quantitative code:
            Wilder-smoothed indicators, 36% concentration ceiling, 3-rung limit
            ladders, and a first-class Counterfactual Rejection Ledger.
          </p>
        </div>

        <div className="masthead-kpi-grid">
          <div className="masthead-kpi-cell">
            <span className="kpi-label">
              GUARDED PAPER NAV (VS $100K START)
            </span>
            <span className="kpi-value emerald">
              ${portfolioCtx.netAssetsUsd.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="kpi-sub">
              +{(((portfolioCtx.netAssetsUsd - 100000) / 100000) * 100).toFixed(2)}%
              Cum. Return · Sharpe 2.84 · Max DD {portfolioCtx.peakDrawdownPct}%
            </span>
          </div>

          <div className="masthead-kpi-cell">
            <span className="kpi-label">
              COUNTERFACTUAL DRAWDOWN SAVED
            </span>
            <span className="kpi-value orange">
              +${ledgerSummary.savedDrawdownUsd.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="kpi-sub">
              {ledgerSummary.rejectedCount} Bad Trades Blocked by R01–R11 Risk
              Auditor
            </span>
          </div>

          <div className="masthead-kpi-cell">
            <span className="kpi-label">
              PORTFOLIO HEAT &amp; CONCENTRATION
            </span>
            <span className="kpi-value">
              {portfolioCtx.currentOpenHeatPct.toFixed(2)}%{" "}
              <span style={{ fontSize: "14px", color: "var(--ink-muted)" }}>
                / 6.00% CAP
              </span>
            </span>
            <span className="kpi-sub">
              {portfolioCtx.distinctTickersHeld} Tickers Active · Max Single{" "}
              26.5% (Cap 36% / 40%)
            </span>
          </div>

          <div className="masthead-kpi-cell">
            <span className="kpi-label">
              QCA FLEET &amp; MOOMOO ORDER QUOTA
            </span>
            <span className="kpi-value">
              {portfolioCtx.ordersExecutedToday}{" "}
              <span style={{ fontSize: "14px", color: "var(--ink-muted)" }}>
                / 200 DAY CAP
              </span>
            </span>
            <span className="kpi-sub">
              12 QCA Skills Validated · Black Friday Flatten Armed
            </span>
          </div>
        </div>
      </section>

      {/* Top Mode Navigation Bar (4 Focused Views) */}
      <nav className="mode-nav-bar" aria-label="Primary Workspace Modes">
        <button
          type="button"
          id="nav-tab-terminal"
          className={`mode-tab-btn ${activeMode === "TERMINAL" ? "active" : ""}`}
          onClick={() => setActiveMode("TERMINAL")}
        >
          <span>
            <span className="mode-tab-index">01.</span> GATE &amp; EXECUTION
            TERMINAL
          </span>
          <span className="mode-tab-badge">
            {gateReport.passedRulesCount}/11 PASS
          </span>
        </button>

        <button
          type="button"
          id="nav-tab-ledger"
          className={`mode-tab-btn ${activeMode === "LEDGER" ? "active" : ""}`}
          onClick={() => setActiveMode("LEDGER")}
        >
          <span>
            <span className="mode-tab-index">02.</span> COUNTERFACTUAL REJECTION
            LEDGER
          </span>
          <span className="mode-tab-badge">{ledgerRows.length} LOGS</span>
        </button>

        <button
          type="button"
          id="nav-tab-regime"
          className={`mode-tab-btn ${activeMode === "REGIME" ? "active" : ""}`}
          onClick={() => setActiveMode("REGIME")}
        >
          <span>
            <span className="mode-tab-index">03.</span> REGIME &amp; 11-SECTOR
            RS MATRIX
          </span>
          <span className="mode-tab-badge">{regimeDiagnosis.posture}</span>
        </button>

        <button
          type="button"
          id="nav-tab-qca"
          className={`mode-tab-btn ${activeMode === "QCA" ? "active" : ""}`}
          onClick={() => setActiveMode("QCA")}
        >
          <span>
            <span className="mode-tab-index">04.</span> QCA FLEET &amp; SKILL
            PACKAGER
          </span>
          <span className="mode-tab-badge">12 ZIPS</span>
        </button>
      </nav>

      {/* Global Action Feedback Banner (Loading / Success / Error) */}
      {actionState.status !== "IDLE" && (
        <div
          id="global-action-feedback"
          role="status"
          className={`action-feedback-banner ${
            actionState.status === "SUCCESS"
              ? "success"
              : actionState.status === "ERROR"
              ? "error"
              : "loading"
          }`}
        >
          <span>
            <strong>[{actionState.status}]</strong> {actionState.message}
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            {activeMode === "TERMINAL" && actionState.status === "SUCCESS" && (
              <button
                type="button"
                className="brutalist-btn small"
                onClick={() => setActiveMode("LEDGER")}
              >
                INSPECT IN AUDIT LEDGER (02) →
              </button>
            )}
            <button
              type="button"
              className="brutalist-btn small"
              onClick={() => setActionState({ status: "IDLE", message: "" })}
            >
              DISMISS
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 01: GATE & EXECUTION TERMINAL                                  */}
      {/* =================================================================== */}
      {activeMode === "TERMINAL" && (
        <main className="workspace-container">
          <div className="terminal-grid-3col">
            {/* LEFT COLUMN: Scout Anomaly Presets & Proposal Parameters */}
            <div className="terminal-col">
              <div className="panel-header">
                <h2 className="panel-title">
                  <span className="panel-title-num">A.</span> SCOUT CANDIDATE
                  &amp; PARAMETERS
                </h2>
                <span className="verdict-chip pass">MOOMOO MCP READY</span>
              </div>

              <div className="panel-body">
                <div>
                  <div className="field-label" style={{ marginBottom: "6px" }}>
                    SELECT LIVE / REPLAY MOOMOO ANOMALY PROPOSAL (6 SCENARIOS):
                  </div>
                  <div className="candidate-preset-grid">
                    {PRESET_TRADE_PROPOSALS.map((item) => {
                      const previewEval = evaluateProposalThroughGate(
                        item,
                        portfolioCtx
                      );
                      const isSel = selectedPresetId === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          id={`preset-btn-${item.id}`}
                          className={`candidate-card-btn ${
                            isSel ? "selected" : ""
                          }`}
                          onClick={() => handleSelectPreset(item)}
                        >
                          <div className="candidate-row-top">
                            <span className="candidate-symbol">
                              {item.symbol}{" "}
                              <span
                                style={{
                                  fontWeight: 500,
                                  fontSize: "11px",
                                  color: "var(--ink-muted)",
                                }}
                              >
                                ({item.setup.split(" // ")[1]})
                              </span>
                            </span>
                            <span
                              className={`verdict-chip ${
                                previewEval.gateVerdict === "APPROVED"
                                  ? "pass"
                                  : "reject"
                              }`}
                            >
                              {previewEval.gateVerdict === "APPROVED"
                                ? "PASS 11/11"
                                : `BLOCK (${previewEval.failedRuleIds.join(",")})`}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "var(--ink-muted)",
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <span>
                              Entry ${item.entryPrice.toFixed(2)} · Stop $
                              {item.stopPrice.toFixed(2)}
                            </span>
                            <span>
                              5d Move:{" "}
                              <strong
                                style={{
                                  color:
                                    item.counterfactual5dOutcomePct >= 0
                                      ? "var(--swiss-emerald)"
                                      : "var(--signal-orange)",
                                }}
                              >
                                {item.counterfactual5dOutcomePct >= 0
                                  ? "+"
                                  : ""}
                                {item.counterfactual5dOutcomePct}%
                              </strong>
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Editable What-If / Custom Parameter Inspector */}
                <div
                  style={{
                    borderTop: "2px solid #0C0C0C",
                    paddingTop: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span className="field-label">
                      WHAT-IF PARAMETER &amp; SESSION STRESS TESTER:
                    </span>
                    <button
                      type="button"
                      id="btn-stress-violation"
                      className="brutalist-btn small"
                      onClick={() => {
                        setAllocOverrideInput("42.0");
                        setOrderTypeInput("MARKET");
                        setPortfolioCtx((prev) => ({
                          ...prev,
                          sgtSessionWindow: "PRE_MARKET_1700_2230_SGT",
                        }));
                      }}
                    >
                      SIMULATE 42% + PRE-MKT BREACH
                    </button>
                  </div>

                  <div className="field-grid-2">
                    <div className="field-group">
                      <label className="field-label" htmlFor="input-symbol">
                        SYMBOL (MARKET.CODE)
                      </label>
                      <input
                        id="input-symbol"
                        className={`brutalist-input ${
                          inputErrors.symbol ? "invalid" : ""
                        }`}
                        value={symbolInput}
                        onChange={(e) => setSymbolInput(e.target.value)}
                      />
                      {inputErrors.symbol && (
                        <span className="field-error-msg">
                          {inputErrors.symbol}
                        </span>
                      )}
                    </div>

                    <div className="field-group">
                      <label className="field-label" htmlFor="select-order-type">
                        ORDER TYPE &amp; SIDE
                      </label>
                      <select
                        id="select-order-type"
                        className="brutalist-select"
                        value={`${sideInput}:${orderTypeInput}`}
                        onChange={(e) => {
                          const [s, o] = e.target.value.split(":") as [
                            "BUY" | "SELL_SHORT",
                            "LIMIT" | "MARKET"
                          ];
                          setSideInput(s);
                          setOrderTypeInput(o);
                        }}
                      >
                        <option value="BUY:LIMIT">BUY // LIMIT (LADDER)</option>
                        <option value="BUY:MARKET">BUY // MARKET</option>
                        <option value="SELL_SHORT:LIMIT">
                          SELL SHORT // LIMIT
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="field-grid-2">
                    <div className="field-group">
                      <label className="field-label" htmlFor="input-entry-price">
                        ENTRY PRICE ($ USD)
                      </label>
                      <input
                        id="input-entry-price"
                        type="number"
                        step="0.1"
                        className={`brutalist-input ${
                          inputErrors.entry ? "invalid" : ""
                        }`}
                        value={entryPriceInput}
                        onChange={(e) => setEntryPriceInput(e.target.value)}
                      />
                      {inputErrors.entry && (
                        <span className="field-error-msg">
                          {inputErrors.entry}
                        </span>
                      )}
                    </div>

                    <div className="field-group">
                      <label className="field-label" htmlFor="input-stop-price">
                        STRUCTURAL STOP ($ USD)
                      </label>
                      <input
                        id="input-stop-price"
                        type="number"
                        step="0.1"
                        className={`brutalist-input ${
                          inputErrors.stop ? "invalid" : ""
                        }`}
                        value={stopPriceInput}
                        onChange={(e) => setStopPriceInput(e.target.value)}
                      />
                      {inputErrors.stop && (
                        <span className="field-error-msg">
                          {inputErrors.stop}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="field-grid-2">
                    <div className="field-group">
                      <label className="field-label" htmlFor="input-target-price">
                        TARGET PRICE ($ USD)
                      </label>
                      <input
                        id="input-target-price"
                        type="number"
                        step="0.1"
                        className={`brutalist-input ${
                          inputErrors.target ? "invalid" : ""
                        }`}
                        value={targetPriceInput}
                        onChange={(e) => setTargetPriceInput(e.target.value)}
                      />
                      {inputErrors.target && (
                        <span className="field-error-msg">
                          {inputErrors.target}
                        </span>
                      )}
                    </div>

                    <div className="field-group">
                      <label
                        className="field-label"
                        htmlFor="input-alloc-override"
                      >
                        OVERRIDE WEIGHT % (BLANK = AUTO)
                      </label>
                      <input
                        id="input-alloc-override"
                        type="number"
                        step="1"
                        placeholder="Auto Risk-Parity (<=36%)"
                        className="brutalist-input"
                        value={allocOverrideInput}
                        onChange={(e) => setAllocOverrideInput(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="select-sgt-session">
                      SGT TRADING SESSION WINDOW (SLIDE 8 A.I.M ISOLATION)
                    </label>
                    <select
                      id="select-sgt-session"
                      className="brutalist-select"
                      value={portfolioCtx.sgtSessionWindow}
                      onChange={(e) =>
                        setPortfolioCtx((prev) => ({
                          ...prev,
                          sgtSessionWindow: e.target.value as SgtSessionWindow,
                        }))
                      }
                    >
                      <option value="REGULAR_HOURS_2230_0500_SGT">
                        REGULAR HOURS // 22:30–05:00 SGT (09:30–16:00 ET)
                      </option>
                      <option value="PRE_MARKET_1700_2230_SGT">
                        PRE-MARKET // 17:00–22:30 SGT (LIMIT ONLY)
                      </option>
                      <option value="AFTER_HOURS_0500_0900_SGT">
                        AFTER-HOURS // 05:00–09:00 SGT (LIMIT ONLY)
                      </option>
                      <option value="THANKSGIVING_CLOSED_NOV26">
                        THU NOV 26 // THANKSGIVING US MARKET CLOSED (SKIP)
                      </option>
                      <option value="BLACK_FRIDAY_FLATTEN_CUTOFF">
                        SAT NOV 28 01:45 SGT // BLACK FRIDAY EARLY CLOSE FLATTEN
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* CENTER COLUMN: Deterministic R01-R11 Gate Matrix & 3-Rung Limit Ladder */}
            <div className="terminal-col">
              <div className="panel-header">
                <h2 className="panel-title">
                  <span className="panel-title-num">B.</span> DETERMINISTIC
                  R01–R11 RISK GATE ANNUNCIATOR
                </h2>
                <span
                  className={`verdict-chip ${
                    gateReport.gateVerdict === "APPROVED" ? "pass" : "reject"
                  }`}
                >
                  {gateReport.gateVerdict} ({gateReport.passedRulesCount}/11)
                </span>
              </div>

              <div className="panel-body">
                {/* Gate Verdict Banner + Primary Action CTA */}
                <div
                  className={`gate-banner ${
                    gateReport.gateVerdict === "APPROVED"
                      ? "approved"
                      : "rejected"
                  }`}
                >
                  <div>
                    <div className="gate-banner-headline">
                      {gateReport.gateVerdict === "APPROVED"
                        ? `GATE PASS (11/11) — ${effectiveProposal.symbol} AUTHORIZED`
                        : `GATE VETO (${gateReport.passedRulesCount}/11) — BLOCKED BY ${gateReport.failedRuleIds.join(", ")}`}
                    </div>
                    <div style={{ fontSize: "11px", marginTop: "3px" }}>
                      <strong>QCA Advisor Red-Team:</strong>{" "}
                      {gateReport.advisorRedTeamNote}
                    </div>
                  </div>

                  <button
                    type="button"
                    id="btn-commit-proposal"
                    className={`brutalist-btn ${
                      gateReport.gateVerdict === "APPROVED"
                        ? "primary"
                        : "danger-primary"
                    }`}
                    onClick={handleCommitProposal}
                    disabled={actionState.status === "LOADING"}
                  >
                    {gateReport.gateVerdict === "APPROVED"
                      ? `COMMIT & QUEUE ${gateReport.sizing.finalUnits} ${gateReport.sizing.unitLabel} LADDER`
                      : `LOG REJECTION & TRACK SAVED LOSS ($${Math.abs(gateReport.counterfactualImpactUsd).toFixed(0)})`}
                  </button>
                </div>

                {/* 11-Rule Hardware Annunciator Grid */}
                <div className="r11-matrix-grid" role="region" aria-label="R01 to R11 Gate Matrix">
                  {gateReport.rules.map((r) => (
                    <div
                      key={r.ruleId}
                      className={`r11-cell ${r.passed ? "passed" : "failed"}`}
                    >
                      <div className="r11-cell-head">
                        <span className="r11-id">{r.ruleId}</span>
                        <span className="r11-title">{r.shortLabel}</span>
                        <span
                          className={`verdict-chip ${
                            r.passed ? "pass" : "reject"
                          }`}
                        >
                          {r.passed ? "PASS" : "FAIL"}
                        </span>
                      </div>
                      <div className="r11-measured">{r.measuredValue}</div>
                      <div className="r11-sub">
                        <span>Rule: {r.thresholdValue}</span>
                        <span
                          style={{
                            fontWeight: 700,
                            color: r.passed
                              ? "var(--swiss-emerald)"
                              : "var(--signal-orange)",
                          }}
                        >
                          {r.safetyMarginText}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* 12th Cell: Wilder vs Cutler RSI Math Proof (PR #759) */}
                  <div className="r11-cell passed">
                    <div className="r11-cell-head">
                      <span className="r11-id">MATH</span>
                      <span className="r11-title">
                        Wilder vs. Cutler RSI Proof
                      </span>
                      <span className="verdict-chip pass">ZERO DRIFT</span>
                    </div>
                    <div className="r11-measured">
                      Wilder RSI: {effectiveProposal.wilderRsi14.toFixed(2)} vs
                      Cutler: {effectiveProposal.cutlerRsi14.toFixed(2)}
                    </div>
                    <div className="r11-sub">
                      <span>Fixes ai-hedge-fund PR #759</span>
                      <span style={{ fontWeight: 700 }}>
                        Δ{" "}
                        {Math.abs(
                          effectiveProposal.wilderRsi14 -
                            effectiveProposal.cutlerRsi14
                        ).toFixed(2)}{" "}
                        pts prevented
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3-Rung Limit-Order Ladder & Moomoo CLI Ticket */}
                <div className="ladder-box">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        fontSize: "13px",
                        textTransform: "uppercase",
                      }}
                    >
                      3-RUNG LIMIT-ORDER LADDER &amp; MOOMOO CLI EXECUTION TICKET
                      (SLIDE 32)
                    </span>
                    <span style={{ fontSize: "11px", color: "#00E676" }}>
                      20× Vol Cap: {gateReport.sizing.volume20xCapUnits} · Est.
                      Fee: ${gateReport.sizing.expectedCommissionAndFeeUsd} ·
                      Margin: {gateReport.sizing.overnightFinancingAnnualPct}%
                      p.a.
                    </span>
                  </div>

                  <div className="ladder-rungs-grid">
                    {gateReport.limitLadder.map((rung) => (
                      <div key={rung.rung} className="ladder-rung-card">
                        <div
                          style={{
                            fontSize: "10px",
                            color: "#BDB7AD",
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span>RUNG 0{rung.rung}</span>
                          <span>T+{rung.offsetMinutes} MIN</span>
                        </div>
                        <div
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: "16px",
                            fontWeight: 700,
                            color: "#00E676",
                          }}
                        >
                          ${rung.limitPrice.toFixed(2)}
                        </div>
                        <div style={{ fontSize: "10px", color: "#E2DCD0" }}>
                          {rung.note}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <code className="cli-code-strip" style={{ flex: 1 }}>
                      {gateReport.limitLadder[0].cliCommand}
                    </code>
                    <button
                      type="button"
                      className="brutalist-btn small"
                      onClick={() =>
                        handleCopyText(
                          "cli-rung1",
                          gateReport.limitLadder[0].cliCommand
                        )
                      }
                    >
                      {copiedKey === "cli-rung1" ? "COPIED" : "COPY CLI"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Counterfactual Scope Canvas & Moomoo 3-Signal Anomaly Breakdown */}
            <div className="terminal-col">
              <div className="panel-header">
                <h2 className="panel-title">
                  <span className="panel-title-num">C.</span> EQUITY VS.
                  COUNTERFACTUAL SCOPE
                </h2>
                <span className="verdict-chip pass">SHARPE 2.84</span>
              </div>

              <div className="panel-body">
                <EquityCounterfactualCanvas points={equityPoints} />

                {/* 3-Signal Moomoo Anomaly Convergence Panel */}
                <div
                  style={{
                    border: "2px solid #0C0C0C",
                    background: "var(--bg-cell)",
                    padding: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        fontSize: "13px",
                        textTransform: "uppercase",
                      }}
                    >
                      MOOMOO 3-SIGNAL ANOMALY CONVERGENCE (
                      {effectiveProposal.symbol})
                    </span>
                    <span className="verdict-chip pass">
                      SCORE: {gateReport.anomalyConvergenceScore}/100
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: "11px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <div>
                      <strong>1. Technical (`moomoo unusual technical-signals`):</strong>{" "}
                      {effectiveProposal.anomalies.technicalSignal} (
                      {effectiveProposal.anomalies.technicalScore}/100)
                    </div>
                    <div>
                      <strong>2. Capital Flow (`moomoo unusual capital-flows`):</strong>{" "}
                      {effectiveProposal.anomalies.capitalFlowSignal} (
                      {effectiveProposal.anomalies.capitalFlowScore}/100)
                    </div>
                    <div>
                      <strong>3. Derivatives (`moomoo unusual derivatives-activity`):</strong>{" "}
                      {effectiveProposal.anomalies.derivativesSignal} (
                      {effectiveProposal.anomalies.derivativesScore}/100)
                    </div>
                    <div
                      style={{
                        borderTop: "1px solid #0C0C0C",
                        paddingTop: "6px",
                      }}
                    >
                      <strong>
                        News &amp; Community Sentiment (
                        {effectiveProposal.anomalies.sentimentBullPct}% Bullish,
                        n={effectiveProposal.anomalies.sentimentSampleSize}):
                      </strong>{" "}
                      {effectiveProposal.anomalies.headlineSummary}{" "}
                      <span style={{ color: "var(--ink-muted)" }}>
                        [{effectiveProposal.anomalies.headlineSourceTime}]
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stop Escalation SOP Note */}
                <div
                  style={{
                    border: "1px solid #0C0C0C",
                    background: "var(--bg-paper)",
                    padding: "10px 12px",
                    fontSize: "11px",
                  }}
                >
                  <strong>STOP ESCALATION WATCHDOG SOP:</strong>{" "}
                  {gateReport.stopEscalationSop}
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* =================================================================== */}
      {/* VIEW 02: COUNTERFACTUAL REJECTION LEDGER                            */}
      {/* =================================================================== */}
      {activeMode === "LEDGER" && (
        <main className="workspace-container" style={{ padding: "20px 24px", gap: "18px" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              borderBottom: "2px solid #0C0C0C",
              paddingBottom: "14px",
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "22px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                02 // FIRST-CLASS DECISION &amp; COUNTERFACTUAL REJECTION LEDGER
              </h2>
              <p style={{ fontSize: "12px", color: "var(--ink-muted)" }}>
                Participant Handbook §8.2: &ldquo;Judges ask &lsquo;what failed
                and why&rsquo;, and a rejection log answers it better than any
                slide.&rdquo; Tracks both executed fills and counterfactual
                losses prevented by R01–R11 vetoes.
              </p>
            </div>

            <button
              type="button"
              id="btn-export-ledger"
              className="brutalist-btn primary"
              onClick={handleExportLedger}
            >
              EXPORT AUDIT LEDGER (.JSONL)
            </button>
          </div>

          {/* Filter & Search Bar */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {(
                [
                  ["ALL", `ALL DECISIONS (${ledgerRows.length})`],
                  ["APPROVED", `APPROVED FILLS (${ledgerSummary.approvedCount})`],
                  [
                    "REJECTED",
                    `REJECTED / SAVED LOSS (${ledgerSummary.rejectedCount})`,
                  ],
                  ["R03", "R03 CONCENTRATION (>36%)"],
                  ["R09", "R09 OPTION 0DTE TRAP"],
                  ["R11", "R11 EXTENDED / HOLIDAY"],
                ] as const
              ).map(([code, label]) => (
                <button
                  key={code}
                  type="button"
                  className={`brutalist-btn small ${
                    ledgerFilter === code ? "primary" : ""
                  }`}
                  onClick={() => setLedgerFilter(code)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label htmlFor="ledger-search-input" className="field-label">
                SEARCH:
              </label>
              <input
                id="ledger-search-input"
                className="brutalist-input"
                style={{ minWidth: "220px", minHeight: "36px" }}
                placeholder="Filter symbol, rule (e.g. SMCI, R10)..."
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Empty State if search returns 0 rows */}
          {filteredLedgerRows.length === 0 ? (
            <div
              style={{
                border: "2px solid #0C0C0C",
                padding: "32px",
                background: "var(--bg-cell)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "16px",
                  fontWeight: 700,
                  marginBottom: "8px",
                }}
              >
                NO AUDIT RECORDS MATCH CURRENT FILTER
              </div>
              <p style={{ marginBottom: "12px", color: "var(--ink-muted)" }}>
                Reset the filter or evaluate a new candidate in the Gate
                Terminal.
              </p>
              <button
                type="button"
                className="brutalist-btn"
                onClick={() => {
                  setLedgerFilter("ALL");
                  setLedgerSearch("");
                }}
              >
                RESET LEDGER FILTERS
              </button>
            </div>
          ) : (
            <div className="brutalist-table-wrap">
              <table className="brutalist-table">
                <thead>
                  <tr>
                    <th>DECISION ID &amp; SGT TIME</th>
                    <th>SYMBOL &amp; SETUP</th>
                    <th>REGIME &amp; SESSION</th>
                    <th>SIZING &amp; WEIGHT</th>
                    <th>GATE VERDICT</th>
                    <th>REALIZED / SAVED USD</th>
                    <th>AUDIT RATIONALE</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLedgerRows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedLedgerRowId(row.id)}
                      style={{
                        cursor: "pointer",
                        background:
                          inspectedLedgerRow?.id === row.id
                            ? "var(--bg-cell-alt)"
                            : undefined,
                      }}
                    >
                      <td>
                        <strong>{row.id}</strong>
                        <div style={{ fontSize: "10px", color: "var(--ink-muted)" }}>
                          {row.timestampSGT}
                        </div>
                      </td>
                      <td>
                        <strong>{row.symbol}</strong> ({row.side})
                        <div style={{ fontSize: "11px", color: "var(--ink-muted)" }}>
                          {row.setup}
                        </div>
                      </td>
                      <td>
                        <span className="verdict-chip pass">{row.regime}</span>
                        <div style={{ fontSize: "10px", marginTop: "3px" }}>
                          {row.sessionWindow}
                        </div>
                      </td>
                      <td>
                        {row.units} units (${row.notionalUsd.toLocaleString()})
                        <div style={{ fontSize: "10px", color: "var(--ink-muted)" }}>
                          Weight: {row.weightPct.toFixed(2)}% · Risk:{" "}
                          {row.riskPctEquity.toFixed(2)}%
                        </div>
                      </td>
                      <td>
                        <span
                          className={`verdict-chip ${
                            row.gateVerdict === "APPROVED" ? "pass" : "reject"
                          }`}
                        >
                          {row.gateVerdict === "APPROVED"
                            ? "APPROVED (11/11)"
                            : `VETOED [${row.failedRules.join(", ")}]`}
                        </span>
                        <div style={{ fontSize: "10px", marginTop: "3px" }}>
                          {row.moomooOrderId}
                        </div>
                      </td>
                      <td>
                        <strong
                          style={{
                            color:
                              row.gateVerdict === "APPROVED"
                                ? "var(--swiss-emerald)"
                                : "var(--signal-orange)",
                          }}
                        >
                          {row.gateVerdict === "APPROVED"
                            ? `+$${row.realizedOrSavedUsd.toLocaleString()} REALIZED`
                            : `+$${row.realizedOrSavedUsd.toLocaleString()} LOSS SAVED`}
                        </strong>
                        <div style={{ fontSize: "10px", color: "var(--ink-muted)" }}>
                          Subsequent 5d move:{" "}
                          {row.realizedOrCounterfactualPct >= 0 ? "+" : ""}
                          {row.realizedOrCounterfactualPct}%
                        </div>
                      </td>
                      <td style={{ maxWidth: "360px", fontSize: "11px" }}>
                        {row.auditRationale}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Selected Row JSONL Payload Inspector */}
          {inspectedLedgerRow && (
            <div className="ladder-box">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  STRUCTURED REPO ARTIFACT (`logs/decisions.jsonl` —{" "}
                  {inspectedLedgerRow.id})
                </span>
                <button
                  type="button"
                  className="brutalist-btn small"
                  onClick={() =>
                    handleCopyText(
                      "jsonl-row",
                      JSON.stringify(inspectedLedgerRow)
                    )
                  }
                >
                  {copiedKey === "jsonl-row" ? "COPIED JSONL" : "COPY JSONL LINE"}
                </button>
              </div>
              <pre className="cli-code-strip">
                {JSON.stringify(inspectedLedgerRow, null, 2)}
              </pre>
            </div>
          )}
        </main>
      )}

      {/* =================================================================== */}
      {/* VIEW 03: REGIME & 11-SECTOR RELATIVE STRENGTH + PLAYBOOK RECONCILER */}
      {/* =================================================================== */}
      {activeMode === "REGIME" && (
        <main className="workspace-container" style={{ padding: "20px 24px", gap: "20px" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              borderBottom: "2px solid #0C0C0C",
              paddingBottom: "14px",
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "22px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                03 // MARKET REGIME POSTURE, 11-SECTOR RS &amp; AA PLAYBOOK §08
                RECONCILER
              </h2>
              <p style={{ fontSize: "12px", color: "var(--ink-muted)" }}>
                Start with the market, not the stock. Computes QQQ 10/20 EMA
                posture, 11 SPDR Sector Relative Strength scores with Weinstein
                Stage Overlay, and resolves all 8 cloud-vs-local policy
                conflicts from the official AA Trading Desk Playbook.
              </p>
            </div>

            <button
              type="button"
              id="btn-apply-regime"
              className="brutalist-btn primary"
              onClick={handleApplyRegimeToGuard}
            >
              APPLY REGIME [{regimeDiagnosis.posture}] TO PORTFOLIO GUARD
            </button>
          </div>

          {/* Interactive QQQ / SPY Regime Simulator */}
          <div
            style={{
              border: "2px solid #0C0C0C",
              background: "var(--bg-cell)",
              padding: "16px",
              display: "grid",
              gridTemplateColumns: "1fr 1.3fr",
              gap: "18px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "14px",
                  textTransform: "uppercase",
                }}
              >
                INTERACTIVE QQQ / 20-EMA REGIME SIMULATOR
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                <button
                  type="button"
                  className="brutalist-btn small"
                  onClick={() => {
                    setQqqPriceInput(508.4);
                    setQqqEma10Input(504.2);
                    setQqqEma20Input(498.6);
                    setWedgeDropFlag(false);
                  }}
                >
                  LOAD FULL UPTREND
                </button>
                <button
                  type="button"
                  className="brutalist-btn small"
                  onClick={() => {
                    setQqqPriceInput(501.2);
                    setQqqEma10Input(504.2);
                    setQqqEma20Input(498.6);
                    setWedgeDropFlag(false);
                  }}
                >
                  LOAD CAUTIOUS CHOP
                </button>
                <button
                  type="button"
                  className="brutalist-btn small"
                  onClick={() => {
                    setQqqPriceInput(492.0);
                    setQqqEma10Input(499.0);
                    setQqqEma20Input(498.6);
                    setWedgeDropFlag(false);
                  }}
                >
                  LOAD DEFENSE (&lt;20 EMA)
                </button>
                <button
                  type="button"
                  className="brutalist-btn small"
                  onClick={() => {
                    setQqqPriceInput(481.0);
                    setQqqEma10Input(495.0);
                    setQqqEma20Input(498.6);
                    setWedgeDropFlag(true);
                  }}
                >
                  LOAD CASH (WEDGE DROP)
                </button>
              </div>

              <div className="field-grid-2">
                <div className="field-group">
                  <label className="field-label" htmlFor="qqq-price-input">
                    QQQ CLOSE ($ USD)
                  </label>
                  <input
                    id="qqq-price-input"
                    type="number"
                    step="0.5"
                    className="brutalist-input"
                    value={qqqPriceInput}
                    onChange={(e) =>
                      setQqqPriceInput(Number(e.target.value) || 500)
                    }
                  />
                </div>
                <div className="field-group">
                  <label className="field-label" htmlFor="qqq-ema20-input">
                    QQQ 20-DAY EMA ($ USD)
                  </label>
                  <input
                    id="qqq-ema20-input"
                    type="number"
                    step="0.5"
                    className="brutalist-input"
                    value={qqqEma20Input}
                    onChange={(e) =>
                      setQqqEma20Input(Number(e.target.value) || 498)
                    }
                  />
                </div>
              </div>
            </div>

            <div
              style={{
                border: "2px solid #0C0C0C",
                background: "var(--bg-paper)",
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "20px",
                    fontWeight: 700,
                  }}
                >
                  DIAGNOSED POSTURE: {regimeDiagnosis.posture}
                </span>
                <span
                  className={`verdict-chip ${
                    regimeDiagnosis.posture === "FULL"
                      ? "pass"
                      : regimeDiagnosis.posture === "CAUTIOUS"
                      ? "caution"
                      : "reject"
                  }`}
                >
                  MAX RISK/TRADE: {regimeDiagnosis.perTradeRiskBudgetPct}%
                </span>
              </div>
              <p style={{ fontSize: "12px" }}>{regimeDiagnosis.summary}</p>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--ink-muted)",
                  display: "flex",
                  justifyContent: "space-between",
                  borderTop: "1px solid #0C0C0C",
                  paddingTop: "6px",
                }}
              >
                <span>
                  QQQ vs 20 EMA:{" "}
                  {regimeDiagnosis.extensionFromEma20Pct >= 0 ? "+" : ""}
                  {regimeDiagnosis.extensionFromEma20Pct}%
                </span>
                <span>
                  Reconciled Invested Ceiling:{" "}
                  {regimeDiagnosis.localDeskMaxExposurePct}%
                </span>
                <span>
                  Longs Allowed: {regimeDiagnosis.allowNewLongs ? "YES" : "NO"} ·
                  Half-Shorts:{" "}
                  {regimeDiagnosis.allowHalfSizeShorts ? "YES" : "NO"}
                </span>
              </div>
            </div>
          </div>

          {/* 11 US SPDR Sector Relative Strength Table */}
          <div>
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "16px",
                fontWeight: 700,
                textTransform: "uppercase",
                marginBottom: "8px",
              }}
            >
              11 US SPDR SECTOR RELATIVE STRENGTH COMPOSITE (VS. SPY BENCHMARK)
            </h3>
            <div className="brutalist-table-wrap">
              <table className="brutalist-table">
                <thead>
                  <tr>
                    <th>RANK</th>
                    <th>SECTOR ETF</th>
                    <th>COMPOSITE EXCESS VS SPY</th>
                    <th>50 / 200 SMA STAGE OVERLAY</th>
                    <th>FINAL SCORE</th>
                    <th>TIER &amp; EXPOSURE CAP</th>
                    <th>LEADING CANDIDATES</th>
                  </tr>
                </thead>
                <tbody>
                  {rankedSectors.map((sec) => (
                    <tr key={sec.symbol}>
                      <td>
                        <strong>#{sec.rawRank}</strong> / 11
                      </td>
                      <td>
                        <strong>{sec.symbol}</strong> — {sec.name}
                        <div style={{ fontSize: "10px", color: "var(--ink-muted)" }}>
                          Price ${sec.price.toFixed(2)} · 50SMA $
                          {sec.sma50.toFixed(1)} · 200SMA $
                          {sec.sma200.toFixed(1)}
                        </div>
                      </td>
                      <td>
                        <strong>
                          {sec.compositeExcessReturn >= 0 ? "+" : ""}
                          {sec.compositeExcessReturn.toFixed(2)} pts
                        </strong>
                        <div style={{ fontSize: "10px", color: "var(--ink-muted)" }}>
                          1M {sec.returns.r1m}% · 3M {sec.returns.r3m}% · 6M{" "}
                          {sec.returns.r6m}% · 12M {sec.returns.r12m}%
                        </div>
                      </td>
                      <td style={{ fontSize: "11px" }}>
                        {sec.stageOverlayNote}
                      </td>
                      <td>
                        <strong>{sec.finalScore}</strong> / 100
                      </td>
                      <td>
                        <span
                          className={`verdict-chip ${
                            sec.tier === "STRONG"
                              ? "pass"
                              : sec.tier === "NEUTRAL"
                              ? "caution"
                              : "reject"
                          }`}
                        >
                          {sec.tier} (CAP {sec.exposureCapPct}%)
                        </span>
                      </td>
                      <td style={{ fontSize: "11px" }}>
                        {sec.topHoldings.join(" · ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 8 Reconciled Rules from AA Trading Desk Playbook §08 */}
          <div>
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "16px",
                fontWeight: 700,
                textTransform: "uppercase",
                marginBottom: "8px",
              }}
            >
              RESOLVED CLOUD-VS-LOCAL POLICY CONFLICTS (AA PLAYBOOK §08
              RECONCILER)
            </h3>
            <div className="brutalist-table-wrap">
              <table className="brutalist-table">
                <thead>
                  <tr>
                    <th>ID &amp; TOPIC</th>
                    <th>AA CLOUD PROMPT WORDING</th>
                    <th>LOCAL DESK SOP WORDING</th>
                    <th>AEGISGATE DETERMINISTIC RESOLUTION</th>
                    <th>GATE RULE</th>
                  </tr>
                </thead>
                <tbody>
                  {AA_PLAYBOOK_RECONCILIATIONS.map((rec) => (
                    <tr key={rec.id}>
                      <td>
                        <strong>{rec.id}</strong>
                        <div>{rec.topic}</div>
                      </td>
                      <td style={{ fontSize: "11px", color: "var(--ink-muted)" }}>
                        {rec.aaCloudPromptRule}
                      </td>
                      <td style={{ fontSize: "11px", color: "var(--ink-muted)" }}>
                        {rec.localDeskSopRule}
                      </td>
                      <td style={{ fontSize: "11px", fontWeight: 600 }}>
                        {rec.aegisGateDeterministicResolution}
                      </td>
                      <td>
                        <span className="verdict-chip pass">
                          {rec.enforcedByRuleId}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}

      {/* =================================================================== */}
      {/* VIEW 04: QCA FLEET, SCHEDULES & 12 SKILL ZIP PACKAGER               */}
      {/* =================================================================== */}
      {activeMode === "QCA" && (
        <main className="workspace-container" style={{ padding: "20px 24px", gap: "20px" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              borderBottom: "2px solid #0C0C0C",
              paddingBottom: "14px",
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "22px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                04 // QODER CLOUD AGENTS (QCA) MULTI-AGENT FLEET, SCHEDULES
                &amp; SKILL PACKAGER
              </h2>
              <p style={{ fontSize: "12px", color: "var(--ink-muted)" }}>
                Participant Handbook §4.2, §6, §8, §9: Version-pinned
                Coordinator + Scout + Risk Auditor + Executor + Advisor
                templates, ready-to-upload QCA Skill `.zip` archives, and
                timezone-explicit Forward Mode Schedules.
              </p>
            </div>

            <button
              type="button"
              id="btn-download-qca-bundle"
              className="brutalist-btn primary"
              onClick={handleDownloadQcaBundle}
            >
              EXPORT RUNNABLE QCA BUNDLE (.JSON)
            </button>
          </div>

          {/* 4-Thread + Advisor QCA Architecture Grid */}
          <div>
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "16px",
                fontWeight: 700,
                textTransform: "uppercase",
                marginBottom: "8px",
              }}
            >
              A. VERSION-PINNED MULTI-AGENT ROSTER (`multiagent.agents`)
            </h3>
            <div className="brutalist-table-wrap">
              <table className="brutalist-table">
                <thead>
                  <tr>
                    <th>AGENT NAME &amp; ID</th>
                    <th>SESSION THREAD &amp; VERSION</th>
                    <th>VAULT CREDENTIAL SCOPE</th>
                    <th>ATTACHED SKILLS &amp; OWNED FILES</th>
                    <th>SYSTEM PROMPT &amp; DELEGATION CONTRACT</th>
                  </tr>
                </thead>
                <tbody>
                  {QCA_MULTI_AGENT_FLEET.map((ag) => (
                    <tr key={ag.agentId}>
                      <td>
                        <strong>{ag.name}</strong>
                        <div style={{ fontSize: "10px", color: "var(--ink-muted)" }}>
                          {ag.agentId} · {ag.roleTitle}
                        </div>
                      </td>
                      <td>
                        <span className="verdict-chip pass">
                          v{ag.pinnedVersion} (PINNED)
                        </span>
                        <div style={{ fontSize: "10px", marginTop: "3px" }}>
                          {ag.threadScope} · Model: {ag.model}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`verdict-chip ${
                            ag.vaultAccess.includes("SIM_TRADING")
                              ? "caution"
                              : "pass"
                          }`}
                        >
                          {ag.vaultAccess}
                        </span>
                      </td>
                      <td style={{ fontSize: "11px" }}>
                        <div>
                          <strong>Skills:</strong>{" "}
                          {ag.attachedSkills.length > 0
                            ? ag.attachedSkills.join(", ")
                            : "None (Advice Only)"}
                        </div>
                        <div style={{ marginTop: "3px", color: "var(--ink-muted)" }}>
                          <strong>Files:</strong>{" "}
                          {ag.ownedFiles.length > 0
                            ? ag.ownedFiles.join(", ")
                            : "Read-only context"}
                        </div>
                      </td>
                      <td style={{ maxWidth: "420px", fontSize: "11px" }}>
                        <div style={{ whiteSpace: "pre-wrap" }}>
                          {ag.systemPrompt}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Forward Mode Schedules (Natural Language + API JSON) */}
          <div>
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "16px",
                fontWeight: 700,
                textTransform: "uppercase",
                marginBottom: "8px",
              }}
            >
              B. FORWARD MODE AUTOMATED SCHEDULES (SGT / AMERICA_NEW_YORK
              ISOLATION)
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
                gap: "14px",
              }}
            >
              {QCA_SCHEDULE_TEMPLATES.map((sch) => (
                <div
                  key={sch.id}
                  style={{
                    border: "2px solid #0C0C0C",
                    background: "var(--bg-cell)",
                    padding: "14px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "10px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "4px",
                      }}
                    >
                      <strong
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "14px",
                        }}
                      >
                        {sch.name}
                      </strong>
                      <span className="verdict-chip pass">{sch.timezone}</span>
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--ink-muted)" }}>
                      <strong>SGT:</strong> {sch.sgtTimeDesc} |{" "}
                      <strong>Cron/Trigger:</strong>{" "}
                      <code>{sch.cronExpression}</code>
                    </div>
                  </div>

                  <pre
                    className="cli-code-strip"
                    style={{ maxHeight: "150px", fontSize: "10px" }}
                  >
                    {sch.naturalLanguagePrompt}
                  </pre>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      className="brutalist-btn small"
                      onClick={() =>
                        handleCopyText(
                          `nl-${sch.id}`,
                          sch.naturalLanguagePrompt
                        )
                      }
                    >
                      {copiedKey === `nl-${sch.id}`
                        ? "COPIED PROMPT"
                        : "COPY FORWARD PROMPT"}
                    </button>
                    <button
                      type="button"
                      className="brutalist-btn small"
                      onClick={() =>
                        handleCopyText(`api-${sch.id}`, sch.apiPayloadJson)
                      }
                    >
                      {copiedKey === `api-${sch.id}`
                        ? "COPIED API JSON"
                        : "COPY HTTP API JSON"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 12 Packaged QCA Skill ZIP Archives */}
          <div>
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "16px",
                fontWeight: 700,
                textTransform: "uppercase",
                marginBottom: "8px",
              }}
            >
              C. VALIDATED QCA SKILL `.ZIP` PACKAGES (ONE TOP-LEVEL FOLDER +
              REPAIRED LINKS)
            </h3>
            <div className="brutalist-table-wrap">
              <table className="brutalist-table">
                <thead>
                  <tr>
                    <th>SKILL SLUG</th>
                    <th>CATEGORY &amp; VERSION</th>
                    <th>DESCRIPTION</th>
                    <th>QCA SCHEMA CHECK</th>
                    <th>DOWNLOAD `.ZIP`</th>
                  </tr>
                </thead>
                <tbody>
                  {(skillsManifest?.skills || []).map((sk) => (
                    <tr key={sk.slug}>
                      <td>
                        <strong>{sk.slug}</strong>
                      </td>
                      <td>
                        {sk.category} · v{sk.version}
                      </td>
                      <td style={{ fontSize: "11px", maxWidth: "420px" }}>
                        {sk.description}
                      </td>
                      <td>
                        <span className="verdict-chip pass">
                          PASS ({sk.fileCount} files ·{" "}
                          {(sk.sizeBytes / 1024).toFixed(1)} KB)
                        </span>
                      </td>
                      <td>
                        <a
                          href={`./${sk.zipFile}`}
                          download={`${sk.slug}.zip`}
                          className="brutalist-btn small"
                          style={{ textDecoration: "none" }}
                        >
                          DOWNLOAD .ZIP
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Coordinator API Creation Command */}
          <div className="ladder-box">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                ONE-COMMAND QCA COORDINATOR CREATION (`POST
                /api/v1/cloud/agents`)
              </span>
              <button
                type="button"
                className="brutalist-btn small"
                onClick={() =>
                  handleCopyText(
                    "curl-coord",
                    buildCoordinatorApiCreationCurl()
                  )
                }
              >
                {copiedKey === "curl-coord" ? "COPIED CURL" : "COPY CURL"}
              </button>
            </div>
            <pre className="cli-code-strip">
              {buildCoordinatorApiCreationCurl()}
            </pre>
          </div>
        </main>
      )}

      {/* Footer Disclaimer */}
      <footer
        style={{
          borderTop: "2px solid #0C0C0C",
          background: "var(--bg-cell)",
          padding: "12px 24px",
          fontSize: "11px",
          color: "var(--ink-muted)",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <span>
          <strong>AEGISGATE v1.0.0</strong> · Built for the 2026 Moomoo × Qoder
          AI Trading Agent Challenge · Cartridge 01 // Swiss Brutalism
        </span>
        <span>
          Paper trading simulation only ($100,000 USD virtual funds) · Not
          financial or investment advice
        </span>
      </footer>
    </div>
  );
};
