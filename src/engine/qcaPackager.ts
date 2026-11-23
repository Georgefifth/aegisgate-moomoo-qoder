/**
 * AegisGate — Qoder Cloud Agents (QCA) Multi-Agent Template, Schedule & Bundle Generator
 *
 * Implements Participant Handbook §4, §6, §8, §9 and Qoder Multiagent Docs:
 * - Coordinator (`aegis-coordinator`) + 3 Pinned Child Agents (`aegis-scout`, `aegis-risk-auditor`, `aegis-executor`) + `Advisor`
 * - Forward Mode Schedules with explicit IANA timezones (`America/New_York` and `Asia/Singapore`)
 * - Ready-to-run HTTP API `curl` commands and Natural Language Schedule prompts
 */

export interface QcaAgentSpec {
  agentId: string;
  name: string;
  roleTitle: string;
  threadScope: string;
  pinnedVersion: number | "advisor";
  model: string;
  vaultAccess: "NONE (Orchestrator Only)" | "READ_ONLY_QUOTE_MCP" | "SIM_TRADING_OAUTH_VAULT";
  attachedSkills: string[];
  ownedFiles: string[];
  systemPrompt: string;
}

export const QCA_MULTI_AGENT_FLEET: QcaAgentSpec[] = [
  {
    agentId: "agent_aegis_coordinator_01",
    name: "aegis-coordinator",
    roleTitle: "Forward Mode Coordinator & Session Router",
    threadScope: "Main Session Thread (sthr_coord)",
    pinnedVersion: 4,
    model: "ultimate",
    vaultAccess: "NONE (Orchestrator Only)",
    attachedSkills: ["aegisgate-r1-r11-risk-auditor"],
    ownedFiles: ["STATE.md", "logs/session_summary.md"],
    systemPrompt: `You are the AegisGate Coordinator for the 2026 Moomoo x Qoder AI Trading Agent Challenge.
Your job is to orchestrate three version-pinned child agents in isolated Session Threads and consult the independent Advisor:
1. Delegate market scanning, news/sentiment synthesis, and 3-signal anomaly detection to \`aegis-scout\` (v2).
2. Pass every candidate proposal from \`aegis-scout\` to \`aegis-risk-auditor\` (v3) in its own isolated Session Thread.
3. GOLDEN RULE: NEVER allow \`aegis-executor\` (v2) to submit or modify a Moomoo paper order unless \`aegis-risk-auditor\` returns \`GATE_VERDICT: PASS (11/11)\` and a deterministic share size > 0.
4. Consult the \`Advisor\` before approving any position > 20% of account NAV or during Market Regime transitions (FULL <-> CAUTIOUS <-> DEFENSE <-> CASH).
5. Enforce file ownership: \`aegis-scout\` writes \`signals/candidates.json\`; \`aegis-risk-auditor\` appends \`logs/decisions.jsonl\`; \`aegis-executor\` writes \`logs/fills.jsonl\`.`,
  },
  {
    agentId: "agent_aegis_scout_02",
    name: "aegis-scout",
    roleTitle: "Multi-Factor & Moomoo Anomaly Scout Researcher",
    threadScope: "Child Session Thread (sthr_scout)",
    pinnedVersion: 2,
    model: "auto",
    vaultAccess: "READ_ONLY_QUOTE_MCP",
    attachedSkills: [
      "moomoo-quote",
      "moomoo-news-search",
      "moomoo-stock-digest",
      "moomoo-comment-sentiment",
      "moomoo-unusual-technical-signal-alerts",
      "moomoo-unusual-capital-flows",
      "moomoo-unusual-derivatives-activity",
    ],
    ownedFiles: ["signals/candidates.json"],
    systemPrompt: `You are the AegisGate Scout Researcher. You have READ-ONLY market data and anomaly search access. You NEVER place, modify, or cancel orders.
For each scheduled scan cycle:
1. Check QQQ vs 10/20 EMA and the 11 US SPDR Sector ETFs to compute Market Regime Posture (FULL / CAUTIOUS / DEFENSE / CASH).
2. Screen liquid US stocks/ETFs (Price >= $10 preferred, ADV >= 1M) using \`moomoo unusual technical-signals\`, \`capital-flows\`, and \`derivatives-activity\`, plus \`moomoo-news-search\` and \`moomoo-comment-sentiment\`.
3. Compute Wilder-smoothed 14-period RSI and 14-period ATR (never use simple rolling mean Cutler RSI).
4. Output structured candidate proposals with exact entry, structural stop, target, 5m bar volume, and days-to-earnings to \`signals/candidates.json\`.`,
  },
  {
    agentId: "agent_aegis_auditor_03",
    name: "aegis-risk-auditor",
    roleTitle: "Isolated R01–R11 Deterministic Risk Auditor",
    threadScope: "Child Session Thread (sthr_auditor)",
    pinnedVersion: 3,
    model: "ultimate",
    vaultAccess: "READ_ONLY_QUOTE_MCP",
    attachedSkills: [
      "aegisgate-r1-r11-risk-auditor",
      "moomoo-quote",
    ],
    ownedFiles: ["logs/decisions.jsonl", "reports/daily_drawdown_audit.md"],
    systemPrompt: `You are the AegisGate Risk Auditor running in an isolated Session Thread. Your sole job is to protect the $100,000 Moomoo competition account (where no Reset Cards are permitted) and say NO whenever any of the 11 deterministic rules (R01–R11) fail:
- R01 Price >= $1.00 | R02 Market Cap >= $500M | R03 Single-Ticker Weight <= 36.0% (buffer under 40% ceiling)
- R04 >= 3 Distinct Tickers if >72% deployed | R05 Portfolio Open Heat <= 6.0% | R06 Per-Trade Risk <= 0.75% & R >= 1.5
- R07 Daily Loss > -2.0% & Peak DD > -10.0% | R08 Executed Orders < 190/200 | R09 Option DTE >= 2 & Delta >= 0.60
- R10 Earnings Buffer > 2 trading days | R11 SGT 3-Session Isolation & Thanksgiving/Black Friday Flatten Cutoff.
Append EVERY decision — both APPROVED and REJECTED with exact failed rule IDs — to \`logs/decisions.jsonl\`.`,
  },
  {
    agentId: "agent_aegis_executor_04",
    name: "aegis-executor",
    roleTitle: "3-Rung Limit Ladder & Stop Escalation Executor",
    threadScope: "Child Session Thread (sthr_executor)",
    pinnedVersion: 2,
    model: "auto",
    vaultAccess: "SIM_TRADING_OAUTH_VAULT",
    attachedSkills: [
      "moomoo-sim-trading",
      "moomoo-grid-strategy",
      "aegisgate-r1-r11-risk-auditor",
    ],
    ownedFiles: ["logs/fills.jsonl"],
    systemPrompt: `You are the AegisGate Order Executor. You talk ONLY to the verified Moomoo x Qoder AI Paper Trading Agent Challenge account (--account SIM-COMP-5770313) via \`moomoo sim\`, and ONLY after \`aegis-risk-auditor\` emits \`GATE_VERDICT: PASS (11/11)\`.
1. First reconcile open orders and positions (\`moomoo sim position\` and \`moomoo sim order list\`).
2. Execute approved entries using the 3-Rung Limit-Order Ladder (Rung 1 @ Midpoint, Rung 2 @ +50% spread at T+5m, Rung 3 @ Ask ceiling at T+10m; cancel unfilled at T+15m).
3. Enforce the Stop Escalation Watchdog: because Moomoo paper API has no resting stop orders, check held positions against their structural stop each cycle; cancel conflicting target limits, submit aggressive limit exit, and escalate to Market if unfilled after 1 check.`,
  },
  {
    agentId: "advisor_red_team",
    name: "aegis-red-team-advisor",
    roleTitle: "Independent Second-Opinion Red-Team Advisor",
    threadScope: "Ephemeral Advisor Thread (advice only, zero tools)",
    pinnedVersion: "advisor",
    model: "ultimate",
    vaultAccess: "NONE (Orchestrator Only)",
    attachedSkills: [],
    ownedFiles: [],
    systemPrompt: `Configured via \`{"type": "advisor", "model": "ultimate"}\` in \`multiagent.agents\`. Cannot execute tools or place orders. Provides an adversarial second opinion on narrative traps, sector crowing, and macro regime shifts before the Coordinator authorizes execution.`,
  },
];

export interface QcaScheduleTemplate {
  id: string;
  name: string;
  sgtTimeDesc: string;
  etTimeDesc: string;
  cronExpression: string;
  timezone: "America/New_York" | "Asia/Singapore";
  naturalLanguagePrompt: string;
  apiPayloadJson: string;
}

export const QCA_SCHEDULE_TEMPLATES: QcaScheduleTemplate[] = [
  {
    id: "SCHED-01-PREMARKET",
    name: "AegisGate Pre-Market Anomaly & Regime Scan",
    sgtTimeDesc: "Mon–Fri 21:30 SGT (1 hr before US Regular Open)",
    etTimeDesc: "Mon–Fri 08:30 AM America/New_York",
    cronExpression: "30 8 * * 1-5",
    timezone: "America/New_York",
    naturalLanguagePrompt: `Please create a scheduled task named "AegisGate Pre-Market Anomaly & Regime Scan".
Execution time: Monday through Friday at 08:30 AM New York local time (cron: 30 8 * * 1-5).
Time zone: America/New_York.
Task details: Check the US exchange calendar first and skip Thursday, November 26, 2026 (Thanksgiving closure). Run aegis-coordinator to delegate a full 11-sector Relative Strength + QQQ 20-EMA regime check and 3-signal Moomoo unusual activity scan to aegis-scout, then audit top candidates through aegis-risk-auditor (R01-R11).
Output requirements: Append all evaluated proposals (APPROVED and REJECTED) to logs/decisions.jsonl and post a concise Markdown pre-market briefing table to the connected Slack channel.
For temporary monitoring: Active from 2026-11-17T08:00:00-05:00 to 2026-11-28T17:00:00-05:00.
After creation, please confirm the task ID, scheduling rule, time zone, and next scheduled execution time.`,
    apiPayloadJson: JSON.stringify(
      {
        identity_id: "idn_aegis_desk_01",
        template_id: "tmpl_aegis_coordinator_v4",
        environment_id: "env_aegis_moomoo_sandbox",
        name: "AegisGate Pre-Market Anomaly & Regime Scan",
        initial_events: [
          {
            type: "user.message",
            content:
              "Check US market calendar (skip Nov 26 Thanksgiving). Run aegis-scout for QQQ 20-EMA regime + 3-signal Moomoo anomaly scan, validate candidates via aegis-risk-auditor (R01-R11), append to logs/decisions.jsonl, and post the pre-market plan.",
          },
        ],
        trigger_policy: {
          type: "cron",
          expression: "30 8 * * 1-5",
          timezone: "America/New_York",
        },
        execution: {
          session_mode: "new_session",
          max_concurrent_runs: 1,
        },
      },
      null,
      2
    ),
  },
  {
    id: "SCHED-02-RTH-GUARD",
    name: "AegisGate Intraday 15m Stop Watchdog & Ladder Executor",
    sgtTimeDesc: "Mon–Fri 22:30–05:00 SGT (Every 15 mins during RTH)",
    etTimeDesc: "Mon–Fri 09:30–15:45 America/New_York",
    cronExpression: "*/15 9-15 * * 1-5",
    timezone: "America/New_York",
    naturalLanguagePrompt: `Please create a scheduled task named "AegisGate Intraday 15m Stop Watchdog & Ladder Executor".
Execution time: Every 15 minutes from 09:30 through 15:45 Monday through Friday (cron: */15 9-15 * * 1-5).
Time zone: America/New_York.
Task details: Reconcile Moomoo competition paper account (SIM-COMP-5770313) positions, open orders, and daily P&L. Check all held positions against structural stops and R07 (-2% daily loss kill-switch). Walk any active 3-rung limit orders and execute R01-R11 approved proposals.
Output requirements: Append fills to logs/fills.jsonl and rejections to logs/decisions.jsonl. Alert Slack immediately if any stop or R01-R11 gate triggers.
After creation, please confirm the task ID, scheduling rule, time zone, and next scheduled execution time.`,
    apiPayloadJson: JSON.stringify(
      {
        identity_id: "idn_aegis_desk_01",
        template_id: "tmpl_aegis_coordinator_v4",
        environment_id: "env_aegis_moomoo_sandbox",
        name: "AegisGate Intraday 15m Stop Watchdog & Ladder Executor",
        initial_events: [
          {
            type: "user.message",
            content:
              "Reconcile competition paper account SIM-COMP-5770313. Enforce structural stop escalation, R07 daily drawdown kill-switch, R09 option DTE<=1 guard, and walk active 3-rung limit orders.",
          },
        ],
        trigger_policy: {
          type: "cron",
          expression: "*/15 9-15 * * 1-5",
          timezone: "America/New_York",
        },
        execution: {
          session_mode: "reuse_session",
          max_concurrent_runs: 1,
        },
      },
      null,
      2
    ),
  },
  {
    id: "SCHED-03-BLACK-FRIDAY",
    name: "AegisGate Black Friday Early-Close Flatten Guard",
    sgtTimeDesc: "Sat Nov 28, 2026 at 01:40 AM SGT (20 mins before 1:00 PM ET Early Close)",
    etTimeDesc: "Fri Nov 27, 2026 at 12:40 PM America/New_York",
    cronExpression: "2026-11-27T12:40:00-05:00",
    timezone: "America/New_York",
    naturalLanguagePrompt: `Please run once at 12:40 PM New York local time on November 27, 2026 (01:40 AM SGT on Saturday, November 28, 2026), using the America/New_York time zone.
Task details: Black Friday US market closes early at 1:00 PM ET and final competition settlement uses regular-market closing prices (after-hours trades on the final day do not count). Cancel all open pending limit orders, close all expiring options (R09), and flatten any short or margined positions to lock in final competition Sharpe Ratio and prevent weekend/settlement liquidation.`,
    apiPayloadJson: JSON.stringify(
      {
        identity_id: "idn_aegis_desk_01",
        template_id: "tmpl_aegis_coordinator_v4",
        environment_id: "env_aegis_moomoo_sandbox",
        name: "AegisGate Black Friday Early-Close Flatten Guard",
        initial_events: [
          {
            type: "user.message",
            content:
              "BLACK FRIDAY 12:40 PM ET CUTOFF (R11): Cancel all working orders, close all option contracts before 1:00 PM ET early close, and flatten margined exposure for final competition settlement.",
          },
        ],
        trigger_policy: {
          type: "once",
          expression: "2026-11-27T12:40:00-05:00",
        },
        execution: {
          session_mode: "new_session",
          max_concurrent_runs: 1,
        },
      },
      null,
      2
    ),
  },
];

export function buildCoordinatorApiCreationCurl(): string {
  const payload = {
    name: "aegis-coordinator",
    model: "ultimate",
    system: QCA_MULTI_AGENT_FLEET[0].systemPrompt,
    tools: [
      {
        type: "agent_toolset_20260401",
        enabled_tools: ["Bash", "Read", "Write", "Edit", "Glob", "Grep"],
      },
    ],
    multiagent: {
      type: "coordinator",
      agents: [
        { type: "agent", id: "agent_aegis_scout_02", version: 2 },
        { type: "agent", id: "agent_aegis_auditor_03", version: 3 },
        { type: "agent", id: "agent_aegis_executor_04", version: 2 },
        { type: "advisor", model: "ultimate" },
      ],
    },
  };

  return `curl -X POST "https://api.qoder.com/api/v1/cloud/agents" \\
  -H "Authorization: Bearer $QODER_PAT" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payload, null, 2)}'`;
}
