import { getAllEmails, getCompanies, getStats, getAllJobs } from "@/lib/db";

export const dynamic = "force-dynamic";

// ── helpers ───────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function initials(s: string) {
  const p = s.trim().split(/[\s@._-]/);
  return (p.length > 1 ? p[0][0] + p[1][0] : s.slice(0, 2)).toUpperCase();
}

function avatarColor(s: string) {
  const pal = ["#4d72fa","#7c5cf5","#0ea5e9","#10b981","#f59e0b","#ef4444","#ec4899","#06b6d4"];
  let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return pal[Math.abs(h) % pal.length];
}

function getDailyCounts(timestamps: string[], days = 14): number[] {
  const now = Date.now();
  return Array.from({ length: days }, (_, i) => {
    const key = new Date(now - (days - 1 - i) * 86400000).toISOString().slice(0, 10);
    return timestamps.filter(ts => ts.startsWith(key)).length;
  });
}

function sparkPaths(data: number[], w: number, h: number) {
  if (data.length < 2) return { line: "", area: "" };
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => [
    +((i / (data.length - 1)) * w).toFixed(2),
    +((h - (v / max) * h * 0.76 - h * 0.1)).toFixed(2),
  ]);
  let line = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const cx = (((pts[i-1][0] + pts[i][0]) / 2)).toFixed(2);
    line += ` C${cx} ${pts[i-1][1]},${cx} ${pts[i][1]},${pts[i][0]} ${pts[i][1]}`;
  }
  return { line, area: `${line} L${pts[pts.length-1][0]} ${h} L${pts[0][0]} ${h}Z` };
}

// ── SVG components ────────────────────────────────────────────────────────

function Spark({ data, color, gid, w = 160, h = 44 }: {
  data: number[]; color: string; gid: string; w?: number; h?: number;
}) {
  const { line, area } = sparkPaths(data, w, h);
  const last = data[data.length - 1] ?? 0;
  const max = Math.max(...data, 1);
  const ex = w;
  const ey = +((h - (last / max) * h * 0.76 - h * 0.1)).toFixed(2);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {area && <path d={area} fill={`url(#${gid})`} />}
      {line && <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />}
      {line && <circle cx={ex} cy={ey} r="3.5" fill={color} />}
      {line && <circle cx={ex} cy={ey} r="7" fill={color} fillOpacity="0.15" />}
    </svg>
  );
}

function Gauge({ score, max = 10 }: { score: number; max?: number }) {
  const pct = Math.min(score / max, 1);
  const r = 48; const cx = 65; const cy = 65;
  const circ = 2 * Math.PI * r;
  const arcLen = circ * 0.75;
  const filled = pct * arcLen;
  const col = score >= 7.5 ? "#10d9a5" : score >= 5 ? "#4d72fa" : score >= 3 ? "#f5a623" : "#ef4444";
  const lbl = score >= 7.5 ? "Great" : score >= 5 ? "Good" : score >= 3 ? "Fair" : "Low";
  return (
    <svg width="130" height="130" viewBox="0 0 130 130">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" strokeLinecap="round"
        strokeDasharray={`${arcLen.toFixed(2)} ${(circ - arcLen).toFixed(2)}`}
        transform={`rotate(135 ${cx} ${cy})`} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth="9" strokeLinecap="round"
        strokeDasharray={`${filled.toFixed(2)} ${(circ - filled).toFixed(2)}`}
        transform={`rotate(135 ${cx} ${cy})`} />
      <text x={cx} y={cy - 4} textAnchor="middle" fill="#dde2ef" fontSize="24" fontWeight="700" fontFamily="Inter,sans-serif">{score.toFixed(1)}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#4a5370" fontSize="11" fontFamily="Inter,sans-serif">{lbl}</text>
    </svg>
  );
}

function BarChart({ data, labels, color = "#4d72fa" }: { data: number[]; labels: string[]; color?: string }) {
  const W = 268; const H = 56;
  const max = Math.max(...data, 1);
  const bw = Math.floor(W / data.length) - 2;
  return (
    <svg width={W} height={H + 14} viewBox={`0 0 ${W} ${H + 14}`} style={{ display: "block" }}>
      {data.map((v, i) => {
        const bh = Math.max((v / max) * H, v > 0 ? 3 : 1);
        const x = i * (bw + 2);
        const isToday = i === data.length - 1;
        return (
          <g key={i}>
            <rect x={x} y={H - bh} width={bw} height={bh} rx={2}
              fill={isToday ? color : v > 0 ? "rgba(77,114,250,0.25)" : "rgba(255,255,255,0.04)"} />
            {(i % 4 === 0 || isToday) && (
              <text x={x + bw / 2} y={H + 12} textAnchor="middle" fill="#3a4060" fontSize="8" fontFamily="Inter,sans-serif">
                {labels[i]?.slice(5).replace("-", "/")}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Icon SVGs ─────────────────────────────────────────────────────────────

const IconMail = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
  </svg>
);
const IconBuilding = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>
  </svg>
);
const IconBag = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
  </svg>
);
const IconGrid = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
);
const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

// ── Dashboard ─────────────────────────────────────────────────────────────

export default async function Dashboard() {
  let stats = { total: 0, companies: 0, followups: 0, total_jobs: 0, pending_jobs: 0 };
  let companies: Awaited<ReturnType<typeof getCompanies>> = [];
  let emails:    Awaited<ReturnType<typeof getAllEmails>>  = [];
  let jobs:      Awaited<ReturnType<typeof getAllJobs>>    = [];

  try {
    [stats, companies, emails, jobs] = await Promise.all([
      getStats(), getCompanies(), getAllEmails(), getAllJobs(),
    ]);
  } catch { /* DB not ready */ }

  // ── computed ──
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(now - 7 * 86400000).toISOString().slice(0, 10);
  const prevWeekAgo = new Date(now - 14 * 86400000).toISOString().slice(0, 10);

  const todayEmails   = emails.filter(e => e.sent_at.startsWith(today)).length;
  const weekEmails    = emails.filter(e => e.sent_at.slice(0, 10) >= weekAgo).length;
  const prevWeekEmails = emails.filter(e => { const d = e.sent_at.slice(0, 10); return d >= prevWeekAgo && d < weekAgo; }).length;
  const weekTrend     = prevWeekEmails > 0 ? Math.round((weekEmails - prevWeekEmails) / prevWeekEmails * 100) : weekEmails > 0 ? 100 : 0;
  const weekAvg       = +(weekEmails / 7).toFixed(1);

  const emailSpark    = getDailyCounts(emails.map(e => e.sent_at));
  const followupSpark = getDailyCounts(emails.filter(e => e.type === "followup").map(e => e.sent_at));
  const jobSpark      = getDailyCounts(jobs.map(j => j.found_at));
  const barLabels     = Array.from({ length: 14 }, (_, i) =>
    new Date(now - (13 - i) * 86400000).toISOString().slice(0, 10));

  const appliedJobs    = jobs.filter(j => j.status === "applied").length;
  const consistencyDays = emailSpark.filter(v => v > 0).length;
  const followupRate   = stats.total > 0 ? stats.followups / stats.total : 0;
  const recentScore    = Math.min(weekEmails / 5, 1);
  const outreachScore  = +Math.min(10, followupRate * 3 + recentScore * 4 + (consistencyDays / 14) * 3).toFixed(1);

  const updatedAt = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="shell">

        {/* ─── Sidebar ─── */}
        <aside className="sidebar">
          <div className="sb-brand">
            <div className="sb-logo">
              <IconMail />
            </div>
          </div>

          <nav className="sb-nav">
            {[
              { icon: <IconGrid />,     panel: "all",           tip: "Overview"   },
              { icon: <IconBuilding />, panel: "p-companies",   tip: "Companies"  },
              { icon: <IconBag />,      panel: "p-jobs",        tip: "Jobs"       },
              { icon: <IconMail />,     panel: "p-emails",      tip: "Email Log"  },
            ].map(({ icon, panel, tip }) => (
              <button key={panel} className={`sb-btn${panel === "all" ? " active" : ""}`}
                data-sb={panel} title={tip} type="button">
                {icon}
              </button>
            ))}
          </nav>

          <div className="sb-foot">
            <button className="sb-btn" title="Settings" type="button"><IconSettings /></button>
            <div className="sb-avatar" title="Vikas Verma">VV</div>
          </div>
        </aside>

        {/* ─── Main ─── */}
        <main className="main">

          {/* Header */}
          <header className="pg-header">
            <div>
              <h1 className="pg-title">Email Outreach</h1>
              <p className="pg-meta">Last updated {updatedAt} · {process.env.GMAIL_USER}</p>
            </div>
          </header>

          {/* ── Activity Cards ── */}
          <div className="activity-grid">

            <div className="metric-card">
              <div className="mc-label">Emails Sent</div>
              <div className="mc-spark"><Spark data={emailSpark} color="#4d72fa" gid="s1" /></div>
              <div className="mc-num">{stats.total.toLocaleString()}</div>
              <div className="mc-rows">
                <div className="mc-row"><span className="mcr-l">Goal</span><span className="mcr-v">50</span></div>
                <div className="mc-row"><span className="mcr-l">Average</span><span className="mcr-v">{weekAvg}/day</span></div>
              </div>
            </div>

            <div className="metric-card">
              <div className="mc-label">Companies Reached</div>
              <div className="mc-spark"><Spark data={followupSpark} color="#7c5cf5" gid="s2" /></div>
              <div className="mc-num">{stats.companies.toLocaleString()}</div>
              <div className="mc-rows">
                <div className="mc-row"><span className="mcr-l">Follow-ups</span><span className="mcr-v">{stats.followups}</span></div>
                <div className="mc-row"><span className="mcr-l">Rate</span><span className="mcr-v">{stats.companies > 0 ? Math.round(followupRate * 100) : 0}%</span></div>
              </div>
            </div>

            <div className="metric-card">
              <div className="mc-label">Jobs Found</div>
              <div className="mc-spark"><Spark data={jobSpark} color="#10d9a5" gid="s3" /></div>
              <div className="mc-num">{stats.total_jobs.toLocaleString()}</div>
              <div className="mc-rows">
                <div className="mc-row"><span className="mcr-l">Goal</span><span className="mcr-v">20</span></div>
                <div className="mc-row"><span className="mcr-l">Applied</span><span className="mcr-v">{appliedJobs}</span></div>
              </div>
            </div>

          </div>

          {/* ── Summary Chips ── */}
          <div className="sum-bar">
            <div className="sum-chip">
              <span className="sum-icon" style={{ background: "rgba(77,114,250,.12)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4d72fa" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </span>
              <span className="sum-label">Today</span>
              <span className="sum-val">{todayEmails}</span>
              <span className="sum-unit">emails sent</span>
            </div>
            <div className="sum-chip">
              <span className="sum-icon" style={{ background: "rgba(124,92,245,.12)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c5cf5" strokeWidth="2.5" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              </span>
              <span className="sum-label">This Week</span>
              <span className="sum-val">{weekEmails}</span>
              <span className="sum-unit">
                deployments
                {weekTrend !== 0 && (
                  <span className={weekTrend > 0 ? "trend-up" : "trend-dn"} style={{ marginLeft: 6 }}>
                    {weekTrend > 0 ? "↑" : "↓"}{Math.abs(weekTrend)}%
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* ── Bottom ── */}
          <div className="bottom-grid">

            {/* Table card */}
            <div className="tbl-card">
              <div className="tab-bar">
                <button className="tab active" data-panel="p-companies" type="button">
                  Companies <span className="tc">{stats.companies}</span>
                </button>
                <button className="tab" data-panel="p-jobs" type="button">
                  Jobs <span className="tc">{stats.pending_jobs} pending</span>
                </button>
                <button className="tab" data-panel="p-emails" type="button">
                  Email Log <span className="tc">{stats.total}</span>
                </button>
              </div>

              {/* Companies */}
              <div id="p-companies" className="panel active">
                {companies.length === 0 ? (
                  <div className="empty"><div className="ei">🏢</div><b>No companies yet</b><p>Pass "company" field when sending emails</p></div>
                ) : (
                  <table>
                    <thead><tr>
                      <th data-sort="co" data-stype="str">Company <span className="si">⇅</span></th>
                      <th data-sort="rec" data-stype="str">Recruiter <span className="si">⇅</span></th>
                      <th data-sort="dt" data-stype="str">Last Contact <span className="si">⇅</span></th>
                      <th data-sort="cnt" data-stype="num">Emails <span className="si">⇅</span></th>
                      <th>Apply</th>
                    </tr></thead>
                    <tbody>
                      {companies.map(c => (
                        <tr key={c.company} data-co={c.company} data-rec={c.recruiter_name || ""} data-dt={c.last_contacted} data-cnt={c.email_count}>
                          <td><div className="cf"><div className="av" style={{ background: avatarColor(c.company) }}>{initials(c.company)}</div><span className="cm">{c.company}</span></div></td>
                          <td>{c.recruiter_name ? <><div className="cm">{c.recruiter_name}</div><div className="cs">{c.recruiter_email}</div></> : <span className="mu">{c.recruiter_email}</span>}</td>
                          <td className="num mu">{fmtDate(c.last_contacted)}</td>
                          <td><span className="badge b-blue num">{c.email_count}</span></td>
                          <td>{c.apply_url ? <a href={c.apply_url} target="_blank" rel="noreferrer" className="btn-apply">Apply →</a> : <span className="mu">—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Jobs */}
              <div id="p-jobs" className="panel">
                {jobs.length === 0 ? (
                  <div className="empty"><div className="ei">🔍</div><b>No jobs saved</b><p>POST /api/jobs to save job listings</p></div>
                ) : (
                  <table>
                    <thead><tr>
                      <th data-sort="co" data-stype="str">Company <span className="si">⇅</span></th>
                      <th data-sort="role" data-stype="str">Role <span className="si">⇅</span></th>
                      <th data-sort="src" data-stype="str">Source <span className="si">⇅</span></th>
                      <th data-sort="dt" data-stype="str">Found <span className="si">⇅</span></th>
                      <th data-sort="st" data-stype="str">Status <span className="si">⇅</span></th>
                      <th>Link</th>
                    </tr></thead>
                    <tbody>
                      {jobs.map(j => (
                        <tr key={j.id} className={j.status === "skip" ? "skip-row" : ""} data-co={j.company} data-role={j.role} data-src={j.source || ""} data-dt={j.found_at} data-st={j.status}>
                          <td><div className="cf"><div className="av" style={{ background: avatarColor(j.company) }}>{initials(j.company)}</div><span className="cm">{j.company}</span></div></td>
                          <td className="mu">{j.role}</td>
                          <td className="mu" style={{ color: "var(--m2)" }}>{j.source || "—"}</td>
                          <td className="num mu">{fmtDate(j.found_at)}</td>
                          <td><span className={`badge ${j.status === "applied" ? "b-green" : j.status === "skip" ? "b-slate" : "b-amber"}`}>{j.status === "applied" ? "Applied" : j.status === "skip" ? "Skipped" : "To Apply"}</span></td>
                          <td><a href={j.url} target="_blank" rel="noreferrer" className="btn-apply">Apply →</a></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Emails */}
              <div id="p-emails" className="panel">
                {emails.length === 0 ? (
                  <div className="empty"><div className="ei">📭</div><b>No emails sent yet</b><p>POST /api/send-email to start</p></div>
                ) : (
                  <table>
                    <thead><tr>
                      <th data-sort="rec" data-stype="str">Recipient <span className="si">⇅</span></th>
                      <th data-sort="co" data-stype="str">Company <span className="si">⇅</span></th>
                      <th data-sort="sub" data-stype="str">Subject <span className="si">⇅</span></th>
                      <th data-sort="typ" data-stype="str">Type <span className="si">⇅</span></th>
                      <th data-sort="dt" data-stype="str">Date <span className="si">⇅</span></th>
                    </tr></thead>
                    <tbody>
                      {emails.map(e => (
                        <tr key={e.id} data-rec={e.name || e.to_email} data-co={e.company || ""} data-sub={e.subject} data-typ={e.type} data-dt={e.sent_at}>
                          <td><div className="cm">{e.name || e.to_email}</div>{e.name && <div className="cs">{e.to_email}</div>}</td>
                          <td className="mu">{e.company || "—"}</td>
                          <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} className="mu">{e.subject}</td>
                          <td><span className={`badge ${e.type === "initial" ? "b-blue" : "b-purple"}`}>{e.type === "initial" ? "Initial" : "Follow-up"}</span></td>
                          <td className="num mu">{fmtDate(e.sent_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Side panel */}
            <div className="side-col">

              <div className="side-card">
                <div className="sc-hd">
                  <div className="sc-title">Outreach Score</div>
                  <div className="sc-sub">Consistency &amp; follow-up rate</div>
                </div>
                <div className="gauge-wrap">
                  <Gauge score={outreachScore} />
                  <div className="gauge-target">Target: <strong>8.0</strong> reliability</div>
                </div>
              </div>

              <div className="side-card">
                <div className="sc-hd">
                  <div className="sc-title">14-Day Activity</div>
                  <div className="sc-sub">Daily emails sent</div>
                </div>
                <div style={{ padding: "8px 16px 4px" }}>
                  <BarChart data={emailSpark} labels={barLabels} />
                </div>
                <div className="breakdown">
                  {([
                    { l: "Today",       v: todayEmails,  t: null      },
                    { l: "This Week",   v: weekEmails,   t: weekTrend },
                    { l: "Avg / Day",   v: weekAvg,      t: null      },
                    { l: "All Time",    v: stats.total,  t: null      },
                  ] as { l: string; v: number; t: number | null }[]).map(r => (
                    <div className="bd-row" key={r.l}>
                      <span className="bd-l">{r.l}</span>
                      <span className="bd-v num">
                        {r.v}
                        {r.t !== null && r.t !== 0 && (
                          <span className={r.t > 0 ? "trend-up" : "trend-dn"} style={{ fontSize: 10, marginLeft: 4 }}>
                            {r.t > 0 ? "↑" : "↓"}{Math.abs(r.t)}%
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>

      <script dangerouslySetInnerHTML={{ __html: JS }} />
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const CSS = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#07090f;
    --s1:#0d1117;
    --s2:#111622;
    --bd:rgba(255,255,255,0.07);
    --bd2:rgba(255,255,255,0.04);
    --fg:#dde2ef;
    --m1:#4a5370;
    --m2:#6b7694;
    --ac:#4d72fa;
    --ac-d:rgba(77,114,250,0.12);
    --green:#10d9a5;
    --amber:#f5a623;
    --red:#ef4444;
    color-scheme:dark;
  }
  body{background:var(--bg);color:var(--fg);font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;font-size:13px;line-height:1.5;-webkit-font-smoothing:antialiased}

  /* shell */
  .shell{display:flex;min-height:100vh}

  /* sidebar */
  .sidebar{width:64px;background:var(--s1);border-right:1px solid var(--bd);display:flex;flex-direction:column;align-items:center;padding:16px 0;position:sticky;top:0;height:100vh;flex-shrink:0}
  .sb-brand{margin-bottom:20px}
  .sb-logo{width:38px;height:38px;background:var(--ac);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff}
  .sb-nav{display:flex;flex-direction:column;gap:4px;width:100%;align-items:center}
  .sb-btn{width:42px;height:42px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--m1);cursor:pointer;background:none;border:none;transition:background .15s,color .15s}
  .sb-btn:hover{background:var(--s2);color:var(--fg)}
  .sb-btn.active{background:var(--ac-d);color:var(--ac)}
  .sb-foot{margin-top:auto;display:flex;flex-direction:column;align-items:center;gap:8px}
  .sb-avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#4d72fa,#7c5cf5);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:#fff;cursor:pointer}

  /* main */
  .main{flex:1;min-width:0;padding:28px 28px 48px;overflow-y:auto}

  /* header */
  .pg-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px}
  .pg-title{font-size:20px;font-weight:700;letter-spacing:-.02em}
  .pg-meta{font-size:11px;color:var(--m1);margin-top:3px}

  /* activity cards */
  .activity-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:12px}
  .metric-card{background:var(--s1);border:1px solid var(--bd);border-radius:14px;padding:18px 20px 14px;overflow:hidden}
  .mc-label{font-size:11px;color:var(--m2);margin-bottom:12px;font-weight:500}
  .mc-spark{margin-bottom:14px}
  .mc-num{font-size:38px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-.03em;line-height:1;margin-bottom:12px}
  .mc-rows{border-top:1px solid var(--bd2);padding-top:10px;display:flex;flex-direction:column;gap:5px}
  .mc-row{display:flex;justify-content:space-between;font-size:11px}
  .mcr-l{color:var(--m1)}
  .mcr-v{color:var(--m2);font-weight:500;font-variant-numeric:tabular-nums}

  /* summary bar */
  .sum-bar{display:flex;gap:10px;margin-bottom:18px}
  .sum-chip{flex:1;background:var(--s1);border:1px solid var(--bd);border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:10px}
  .sum-icon{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .sum-label{font-size:11px;color:var(--m1);white-space:nowrap}
  .sum-val{font-size:22px;font-weight:700;font-variant-numeric:tabular-nums;margin-left:4px;line-height:1}
  .sum-unit{font-size:11px;color:var(--m1);margin-left:2px}

  /* bottom */
  .bottom-grid{display:grid;grid-template-columns:1fr 284px;gap:14px;align-items:start}

  /* table card */
  .tbl-card{background:var(--s1);border:1px solid var(--bd);border-radius:14px;overflow:hidden}
  .tab-bar{display:flex;border-bottom:1px solid var(--bd);padding:0 4px}
  .tab{padding:11px 14px;font-size:12px;font-weight:500;color:var(--m1);background:none;border:none;border-bottom:2px solid transparent;margin-bottom:-1px;cursor:pointer;transition:color .15s,border-color .15s;font-family:inherit;white-space:nowrap}
  .tab:hover{color:var(--fg)}
  .tab.active{color:var(--ac);border-bottom-color:var(--ac)}
  .tc{font-size:10px;opacity:.55;margin-left:3px}
  .panel{display:none}
  .panel.active{display:block}

  table{width:100%;border-collapse:collapse}
  thead tr{background:var(--s2)}
  th{padding:8px 14px;text-align:left;font-size:10px;font-weight:600;color:var(--m1);text-transform:uppercase;letter-spacing:.07em;border-bottom:1px solid var(--bd);cursor:pointer;user-select:none;white-space:nowrap}
  th:hover{color:var(--fg)}
  th.sorted .si{color:var(--ac);opacity:1}
  .si{opacity:.25;font-size:9px;margin-left:3px}
  td{padding:8px 14px;border-bottom:1px solid var(--bd2);vertical-align:middle;font-size:12px}
  tr:last-child td{border-bottom:none}
  tbody tr:hover td{background:rgba(255,255,255,0.015)}
  .cf{display:flex;align-items:center;gap:8px}
  .av{width:26px;height:26px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0}
  .cm{font-weight:500;color:var(--fg)}
  .cs{font-size:10px;color:var(--m1)}
  .mu{color:var(--m2)}
  .num{font-variant-numeric:tabular-nums}
  .badge{display:inline-block;padding:2px 7px;border-radius:20px;font-size:10.5px;font-weight:600;letter-spacing:.02em}
  .b-blue{background:rgba(77,114,250,.15);color:#7da4fc}
  .b-purple{background:rgba(124,92,245,.15);color:#a78bfa}
  .b-green{background:rgba(16,217,165,.12);color:#10d9a5}
  .b-amber{background:rgba(245,166,35,.12);color:#f5a623}
  .b-slate{background:rgba(255,255,255,.05);color:var(--m2)}
  .btn-apply{display:inline-block;padding:3px 9px;border-radius:6px;font-size:11px;font-weight:600;text-decoration:none;background:var(--ac);color:#fff;transition:opacity .15s}
  .btn-apply:hover{opacity:.8}
  .skip-row td{opacity:.38}
  .empty{padding:38px 20px;text-align:center;color:var(--m1)}
  .empty .ei{font-size:26px;margin-bottom:8px}
  .empty b{display:block;font-size:13px;margin-bottom:4px;color:var(--m2)}
  .empty p{font-size:11px}

  /* side panel */
  .side-col{display:flex;flex-direction:column;gap:12px}
  .side-card{background:var(--s1);border:1px solid var(--bd);border-radius:14px;overflow:hidden}
  .sc-hd{padding:14px 16px 0}
  .sc-title{font-size:13px;font-weight:600}
  .sc-sub{font-size:11px;color:var(--m1);margin-top:2px}
  .gauge-wrap{display:flex;flex-direction:column;align-items:center;padding:8px 16px 14px}
  .gauge-target{font-size:11px;color:var(--m1);margin-top:4px}
  .gauge-target strong{color:var(--fg)}
  .breakdown{padding:0 16px 12px}
  .bd-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--bd2)}
  .bd-row:last-child{border-bottom:none}
  .bd-l{font-size:12px;color:var(--m2)}
  .bd-v{font-size:14px;font-weight:600}
  .trend-up{color:var(--green)}
  .trend-dn{color:var(--red)}

  /* responsive */
  @media(max-width:1100px){.bottom-grid{grid-template-columns:1fr}}
  @media(max-width:860px){.activity-grid{grid-template-columns:1fr 1fr}}
  @media(max-width:580px){
    .shell{flex-direction:column}
    .sidebar{width:100%;height:auto;flex-direction:row;padding:10px 12px;position:relative;overflow-x:auto;gap:4px}
    .sb-brand{margin-bottom:0;margin-right:6px}
    .sb-nav{flex-direction:row}
    .sb-foot{flex-direction:row;margin-top:0;margin-left:auto;gap:6px}
    .main{padding:14px 14px 32px}
    .activity-grid{grid-template-columns:1fr}
    .sum-bar{flex-direction:column}
  }
`;

// ── Client JS ─────────────────────────────────────────────────────────────

const JS = `
(function(){
  // ── tabs ──
  var tabs=document.querySelectorAll('.tab[data-panel]');
  var panels=document.querySelectorAll('.panel');
  function activateTab(id){
    tabs.forEach(function(t){t.classList.toggle('active',t.dataset.panel===id)});
    panels.forEach(function(p){p.classList.toggle('active',p.id===id)});
    try{localStorage.setItem('et_v3',id)}catch(e){}
  }
  tabs.forEach(function(t){t.addEventListener('click',function(){activateTab(t.dataset.panel)})});
  try{var s=localStorage.getItem('et_v3');if(s)activateTab(s)}catch(e){}

  // ── sidebar nav ──
  var sbBtns=document.querySelectorAll('.sb-btn[data-sb]');
  sbBtns.forEach(function(b){
    b.addEventListener('click',function(){
      sbBtns.forEach(function(x){x.classList.remove('active')});
      b.classList.add('active');
      var t=b.dataset.sb;
      if(t!=='all') activateTab(t);
    });
  });

  // ── sortable tables ──
  document.querySelectorAll('th[data-sort]').forEach(function(th){
    th.addEventListener('click',function(){
      var tbody=th.closest('table').querySelector('tbody');
      var col=th.dataset.sort;
      var isNum=th.dataset.stype==='num';
      var asc=th.dataset.asc!=='1';
      th.dataset.asc=asc?'1':'0';
      th.closest('table').querySelectorAll('th[data-sort]').forEach(function(x){
        x.classList.remove('sorted');
        x.querySelector('.si').textContent='⇅';
      });
      th.classList.add('sorted');
      th.querySelector('.si').textContent=asc?'↑':'↓';
      var rows=Array.from(tbody.querySelectorAll('tr'));
      rows.sort(function(a,b){
        var av=a.dataset[col]||'', bv=b.dataset[col]||'';
        var cmp=isNum?(parseFloat(av)||0)-(parseFloat(bv)||0):av.localeCompare(bv);
        return asc?cmp:-cmp;
      });
      rows.forEach(function(r){tbody.appendChild(r)});
    });
  });
})();
`;
