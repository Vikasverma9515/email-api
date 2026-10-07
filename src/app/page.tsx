import { getAllEmails, getCompanies, getStats, getAllJobs } from "@/lib/db";

export const dynamic = "force-dynamic";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function initials(s: string) {
  return s.split(/[\s@]/)[0].slice(0, 2).toUpperCase();
}

function hue(s: string) {
  const palette = ["#6366f1","#8b5cf6","#0ea5e9","#10b981","#f59e0b","#ef4444","#ec4899","#14b8a6"];
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return palette[Math.abs(h) % palette.length];
}

function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: size, height: size, borderRadius: 6, flexShrink: 0,
      background: hue(name), color: "#fff", fontSize: size * 0.38, fontWeight: 700,
    }}>
      {initials(name)}
    </span>
  );
}

function Badge({ label, color }: { label: string; color: "blue" | "purple" | "green" | "amber" | "slate" }) {
  const map = {
    blue:   { bg: "var(--badge-blue-bg)",   fg: "var(--badge-blue-fg)"   },
    purple: { bg: "var(--badge-purple-bg)", fg: "var(--badge-purple-fg)" },
    green:  { bg: "var(--badge-green-bg)",  fg: "var(--badge-green-fg)"  },
    amber:  { bg: "var(--badge-amber-bg)",  fg: "var(--badge-amber-fg)"  },
    slate:  { bg: "var(--badge-slate-bg)",  fg: "var(--badge-slate-fg)"  },
  };
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 20,
      fontSize: 11, fontWeight: 600, letterSpacing: ".02em",
      background: map[color].bg, color: map[color].fg,
    }}>
      {label}
    </span>
  );
}

export default async function Dashboard() {
  let stats = { total: 0, companies: 0, followups: 0, total_jobs: 0, pending_jobs: 0 };
  let companies: Awaited<ReturnType<typeof getCompanies>> = [];
  let emails: Awaited<ReturnType<typeof getAllEmails>> = [];
  let jobs: Awaited<ReturnType<typeof getAllJobs>> = [];

  try {
    [stats, companies, emails, jobs] = await Promise.all([
      getStats(), getCompanies(), getAllEmails(), getAllJobs(),
    ]);
  } catch {
    // DB not ready
  }

  const css = `
    :root {
      --bg: #f1f5f9;
      --surface: #ffffff;
      --border: #e2e8f0;
      --fg: #0f172a;
      --muted: #64748b;
      --accent: #4f46e5;
      --accent-subtle: #eef2ff;
      --row-hover: #f8fafc;

      --badge-blue-bg:#dbeafe; --badge-blue-fg:#1d4ed8;
      --badge-purple-bg:#ede9fe; --badge-purple-fg:#6d28d9;
      --badge-green-bg:#d1fae5; --badge-green-fg:#065f46;
      --badge-amber-bg:#fef3c7; --badge-amber-fg:#92400e;
      --badge-slate-bg:#f1f5f9; --badge-slate-fg:#475569;
    }
    @media(prefers-color-scheme:dark){
      :root:not([data-theme="light"]){
        --bg:#0f172a; --surface:#1e293b; --border:#334155;
        --fg:#f1f5f9; --muted:#94a3b8; --accent:#818cf8; --accent-subtle:#1e1b4b;
        --row-hover:#263044;
        --badge-blue-bg:#1e3a5f; --badge-blue-fg:#93c5fd;
        --badge-purple-bg:#2e1065; --badge-purple-fg:#c4b5fd;
        --badge-green-bg:#064e3b; --badge-green-fg:#6ee7b7;
        --badge-amber-bg:#451a03; --badge-amber-fg:#fcd34d;
        --badge-slate-bg:#1e293b; --badge-slate-fg:#94a3b8;
        color-scheme:dark;
      }
    }
    :root[data-theme="dark"]{
      --bg:#0f172a; --surface:#1e293b; --border:#334155;
      --fg:#f1f5f9; --muted:#94a3b8; --accent:#818cf8; --accent-subtle:#1e1b4b;
      --row-hover:#263044;
      --badge-blue-bg:#1e3a5f; --badge-blue-fg:#93c5fd;
      --badge-purple-bg:#2e1065; --badge-purple-fg:#c4b5fd;
      --badge-green-bg:#064e3b; --badge-green-fg:#6ee7b7;
      --badge-amber-bg:#451a03; --badge-amber-fg:#fcd34d;
      --badge-slate-bg:#1e293b; --badge-slate-fg:#94a3b8;
      color-scheme:dark;
    }

    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{background:var(--bg);color:var(--fg);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:13px;line-height:1.5}

    /* ── topbar ── */
    .topbar{
      background:var(--surface);border-bottom:1px solid var(--border);
      position:sticky;top:0;z-index:10;
      padding:0 24px;
      display:flex;align-items:center;justify-content:space-between;height:52px;
    }
    .logo{display:flex;align-items:center;gap:8px;font-weight:700;font-size:15px}
    .logo-icon{width:28px;height:28px;background:var(--accent);border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
    .stats-row{display:flex;align-items:center;gap:6px}
    .stat-chip{
      display:flex;align-items:center;gap:5px;
      padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;
      background:var(--bg);border:1px solid var(--border);
      font-variant-numeric:tabular-nums;
    }
    .stat-chip .dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
    .user-label{font-size:12px;color:var(--muted);display:none}
    @media(min-width:700px){.user-label{display:block}}

    /* ── tabs ── */
    .tabbar{
      background:var(--surface);border-bottom:1px solid var(--border);
      padding:0 24px;display:flex;gap:0;
    }
    .tab{
      padding:10px 16px;font-size:13px;font-weight:500;color:var(--muted);
      border-bottom:2px solid transparent;cursor:pointer;
      transition:color .15s,border-color .15s;white-space:nowrap;
    }
    .tab:hover{color:var(--fg)}
    .tab.active{color:var(--accent);border-bottom-color:var(--accent);font-weight:600}

    /* ── content ── */
    .content{max-width:1100px;margin:0 auto;padding:20px 24px}
    .panel{display:none}
    .panel.active{display:block}

    /* ── card ── */
    .card{background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden}
    .card-header{
      padding:12px 18px;border-bottom:1px solid var(--border);
      display:flex;align-items:center;justify-content:space-between;
    }
    .card-title{font-weight:600;font-size:13px}
    .card-count{font-size:12px;color:var(--muted)}

    /* ── table ── */
    table{width:100%;border-collapse:collapse}
    th{
      padding:8px 16px;text-align:left;font-size:10.5px;font-weight:600;
      color:var(--muted);text-transform:uppercase;letter-spacing:.06em;
      background:var(--bg);border-bottom:1px solid var(--border);
    }
    td{padding:9px 16px;border-bottom:1px solid var(--border);vertical-align:middle}
    tr:last-child td{border-bottom:none}
    tr:hover td{background:var(--row-hover)}
    .cell-main{font-weight:500}
    .cell-sub{font-size:11px;color:var(--muted);margin-top:1px}

    /* ── avatar row ── */
    .with-avatar{display:flex;align-items:center;gap:8px}

    /* ── apply btn ── */
    .btn-apply{
      display:inline-block;padding:3px 10px;border-radius:5px;
      font-size:11px;font-weight:600;text-decoration:none;
      background:var(--accent);color:#fff;
    }
    .btn-apply:hover{opacity:.85}

    /* ── empty ── */
    .empty{padding:40px 20px;text-align:center;color:var(--muted)}
    .empty-icon{font-size:26px;margin-bottom:8px}
    .empty-label{font-weight:500;font-size:13px;margin-bottom:4px}
    .empty-hint{font-size:12px}

    /* ── skipped row ── */
    .row-skip{opacity:.45}

    /* ── num ── */
    .num{font-variant-numeric:tabular-nums}
  `;

  const tabScript = `
    (function(){
      var tabs = document.querySelectorAll('.tab');
      var panels = document.querySelectorAll('.panel');
      tabs.forEach(function(t){
        t.addEventListener('click', function(){
          var id = t.dataset.panel;
          tabs.forEach(function(x){ x.classList.toggle('active', x===t); });
          panels.forEach(function(p){ p.classList.toggle('active', p.id===id); });
          try{ localStorage.setItem('et_tab', id); }catch(e){}
        });
      });
      try{
        var saved = localStorage.getItem('et_tab');
        if(saved){
          var t = document.querySelector('[data-panel="'+saved+'"]');
          if(t) t.click();
        }
      }catch(e){}
    })();
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* Topbar */}
      <header className="topbar">
        <div className="logo">
          <div className="logo-icon">✉</div>
          Email Tracker
        </div>

        <div className="stats-row">
          {[
            { label: "Sent",      value: stats.total,        color: "#4f46e5" },
            { label: "Companies", value: stats.companies,    color: "#0ea5e9" },
            { label: "Follow-ups",value: stats.followups,    color: "#8b5cf6" },
            { label: "Jobs",      value: stats.total_jobs,   color: "#10b981" },
            { label: "Pending",   value: stats.pending_jobs, color: "#f59e0b" },
          ].map(s => (
            <div className="stat-chip num" key={s.label}>
              <span className="dot" style={{ background: s.color }} />
              <span style={{ color: "var(--muted)", fontWeight: 400 }}>{s.label}</span>
              <span style={{ color: "var(--fg)" }}>{s.value}</span>
            </div>
          ))}
        </div>

        <span className="user-label">{process.env.GMAIL_USER}</span>
      </header>

      {/* Tabs */}
      <nav className="tabbar">
        <div className="tab active" data-panel="p-companies">
          Companies <span style={{ marginLeft: 4, color: "var(--muted)", fontWeight: 400 }}>{stats.companies}</span>
        </div>
        <div className="tab" data-panel="p-jobs">
          Jobs to Apply <span style={{ marginLeft: 4, color: "var(--muted)", fontWeight: 400 }}>{stats.pending_jobs} pending</span>
        </div>
        <div className="tab" data-panel="p-emails">
          Email Log <span style={{ marginLeft: 4, color: "var(--muted)", fontWeight: 400 }}>{stats.total}</span>
        </div>
      </nav>

      <main className="content">

        {/* — Companies — */}
        <div id="p-companies" className="panel active">
          <div className="card">
            <div className="card-header">
              <span className="card-title">Companies Contacted</span>
              <span className="card-count">{stats.companies} total</span>
            </div>
            {companies.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">🏢</div>
                <div className="empty-label">No companies yet</div>
                <div className="empty-hint">Pass a "company" field when sending emails</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Recruiter</th>
                    <th>Email</th>
                    <th>Last Contact</th>
                    <th>Emails</th>
                    <th>Apply</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map(c => (
                    <tr key={c.company}>
                      <td>
                        <div className="with-avatar">
                          <Avatar name={c.company} />
                          <span className="cell-main">{c.company}</span>
                        </div>
                      </td>
                      <td>{c.recruiter_name || <span style={{ color: "var(--muted)" }}>—</span>}</td>
                      <td style={{ color: "var(--muted)" }}>{c.recruiter_email}</td>
                      <td className="num" style={{ color: "var(--muted)" }}>{fmtDate(c.last_contacted)}</td>
                      <td>
                        <Badge label={String(c.email_count)} color="blue" />
                      </td>
                      <td>
                        {c.apply_url
                          ? <a href={c.apply_url} target="_blank" rel="noreferrer" className="btn-apply">Apply →</a>
                          : <span style={{ color: "var(--muted)" }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* — Jobs — */}
        <div id="p-jobs" className="panel">
          <div className="card">
            <div className="card-header">
              <span className="card-title">Jobs to Apply</span>
              <span className="card-count">{stats.pending_jobs} pending · {stats.total_jobs} total</span>
            </div>
            {jobs.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">🔍</div>
                <div className="empty-label">No jobs saved yet</div>
                <div className="empty-hint">POST /api/jobs to save a job</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Role</th>
                    <th>Source</th>
                    <th>Found</th>
                    <th>Status</th>
                    <th>Link</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(j => (
                    <tr key={j.id} className={j.status === "skip" ? "row-skip" : ""}>
                      <td>
                        <div className="with-avatar">
                          <Avatar name={j.company} size={26} />
                          <span className="cell-main">{j.company}</span>
                        </div>
                      </td>
                      <td>{j.role}</td>
                      <td style={{ color: "var(--muted)" }}>{j.source || "—"}</td>
                      <td className="num" style={{ color: "var(--muted)" }}>{fmtDate(j.found_at)}</td>
                      <td>
                        <Badge
                          label={j.status === "applied" ? "Applied" : j.status === "skip" ? "Skipped" : "To Apply"}
                          color={j.status === "applied" ? "green" : j.status === "skip" ? "slate" : "amber"}
                        />
                      </td>
                      <td>
                        <a href={j.url} target="_blank" rel="noreferrer" className="btn-apply">Apply →</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* — Email Log — */}
        <div id="p-emails" className="panel">
          <div className="card">
            <div className="card-header">
              <span className="card-title">Email Log</span>
              <span className="card-count">{stats.total} total</span>
            </div>
            {emails.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">📭</div>
                <div className="empty-label">No emails sent yet</div>
                <div className="empty-hint">POST /api/send-email to get started</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Recipient</th>
                    <th>Company</th>
                    <th>Subject</th>
                    <th>Type</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {emails.map(e => (
                    <tr key={e.id}>
                      <td>
                        <div className="cell-main">{e.name || e.to_email}</div>
                        {e.name && <div className="cell-sub">{e.to_email}</div>}
                      </td>
                      <td style={{ color: "var(--muted)" }}>{e.company || "—"}</td>
                      <td style={{ maxWidth: 260 }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.subject}</div>
                      </td>
                      <td>
                        <Badge
                          label={e.type === "initial" ? "Initial" : "Follow-up"}
                          color={e.type === "initial" ? "blue" : "purple"}
                        />
                      </td>
                      <td className="num" style={{ color: "var(--muted)" }}>{fmtDate(e.sent_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </main>

      <script dangerouslySetInnerHTML={{ __html: tabScript }} />
    </>
  );
}
