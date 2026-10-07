import { getAllEmails, getCompanies, getStats, getAllJobs } from "@/lib/db";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function initials(str: string) {
  return str.split(/[\s@]/)[0].slice(0, 2).toUpperCase();
}

function avatarColor(str: string) {
  const colors = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#14b8a6"];
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return colors[Math.abs(h) % colors.length];
}

export default function Dashboard() {
  let stats = { total: 0, companies: 0, followups: 0, to_apply: 0, total_jobs: 0, pending_jobs: 0 };
  let companies: ReturnType<typeof getCompanies> = [];
  let emails: ReturnType<typeof getAllEmails> = [];
  let jobs: ReturnType<typeof getAllJobs> = [];

  try {
    stats = getStats();
    companies = getCompanies();
    emails = getAllEmails();
    jobs = getAllJobs();
  } catch {
    // DB not ready yet
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Email Tracker</title>
      </head>
      <body style={{ margin: 0, padding: 0, background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#1e293b", fontSize: 14 }}>

        {/* Header */}
        <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 32px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, background: "#6366f1", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✉</div>
              <span style={{ fontWeight: 700, fontSize: 17 }}>Email Tracker</span>
            </div>
            <span style={{ fontSize: 13, color: "#64748b" }}>{process.env.GMAIL_USER}</span>
          </div>
        </div>

        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 32px" }}>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 28 }}>
            {[
              { label: "Emails Sent",    value: stats.total,        color: "#6366f1" },
              { label: "Companies",      value: stats.companies,    color: "#3b82f6" },
              { label: "Follow-ups",     value: stats.followups,    color: "#8b5cf6" },
              { label: "Jobs Found",     value: stats.total_jobs,   color: "#10b981" },
              { label: "Yet to Apply",   value: stats.pending_jobs, color: "#f59e0b" },
            ].map((s) => (
              <div key={s.label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "18px 22px" }}>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>{s.label}</div>
                <div style={{ fontSize: 30, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Companies */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>Companies</span>
              <span style={{ fontSize: 13, color: "#64748b" }}>{stats.companies} contacted</span>
            </div>

            {companies.length === 0 ? (
              <div style={{ padding: "48px 24px", textAlign: "center", color: "#94a3b8" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🏢</div>
                <div style={{ fontWeight: 500 }}>No companies yet</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Pass "company" field when sending emails</div>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Company", "Recruiter", "Email", "Last Contacted", "Emails", "Apply Link"].map((h) => (
                      <th key={h} style={{ padding: "11px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c, i) => (
                    <tr key={c.company} style={{ borderBottom: i < companies.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                      <td style={{ padding: "13px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: avatarColor(c.company), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                            {initials(c.company)}
                          </div>
                          <span style={{ fontWeight: 600 }}>{c.company}</span>
                        </div>
                      </td>
                      <td style={{ padding: "13px 20px", color: "#334155" }}>{c.recruiter_name || <span style={{ color: "#94a3b8" }}>—</span>}</td>
                      <td style={{ padding: "13px 20px", color: "#334155" }}>{c.recruiter_email}</td>
                      <td style={{ padding: "13px 20px", color: "#334155" }}>{formatDate(c.last_contacted)}</td>
                      <td style={{ padding: "13px 20px" }}>
                        <span style={{ display: "inline-block", background: "#eff6ff", color: "#3b82f6", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>{c.email_count}</span>
                      </td>
                      <td style={{ padding: "13px 20px" }}>
                        {c.apply_url ? (
                          <a href={c.apply_url} target="_blank" rel="noreferrer" style={{ display: "inline-block", background: "#6366f1", color: "#fff", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                            Apply →
                          </a>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: 13 }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Jobs to Apply */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>Jobs to Apply</span>
              <span style={{ fontSize: 13, color: "#64748b" }}>{stats.pending_jobs} pending · {stats.total_jobs} total</span>
            </div>

            {jobs.length === 0 ? (
              <div style={{ padding: "48px 24px", textAlign: "center", color: "#94a3b8" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                <div style={{ fontWeight: 500 }}>No jobs saved yet</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Tell Claude to save jobs via POST /api/jobs</div>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Company", "Role", "Source", "Found", "Status", "Link"].map((h) => (
                      <th key={h} style={{ padding: "11px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j, i) => (
                    <tr key={j.id} style={{ borderBottom: i < jobs.length - 1 ? "1px solid #f1f5f9" : "none", opacity: j.status === "skip" ? 0.45 : 1 }}>
                      <td style={{ padding: "12px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 6, background: avatarColor(j.company), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                            {initials(j.company)}
                          </div>
                          <span style={{ fontWeight: 600 }}>{j.company}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 20px", color: "#334155" }}>{j.role}</td>
                      <td style={{ padding: "12px 20px", color: "#64748b", fontSize: 13 }}>{j.source || <span style={{ color: "#94a3b8" }}>—</span>}</td>
                      <td style={{ padding: "12px 20px", color: "#64748b", fontSize: 13 }}>{formatDate(j.found_at)}</td>
                      <td style={{ padding: "12px 20px" }}>
                        <span style={{
                          display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                          background: j.status === "applied" ? "#ecfdf5" : j.status === "skip" ? "#f1f5f9" : "#fefce8",
                          color: j.status === "applied" ? "#10b981" : j.status === "skip" ? "#94a3b8" : "#ca8a04",
                        }}>
                          {j.status === "applied" ? "Applied" : j.status === "skip" ? "Skipped" : "To Apply"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 20px" }}>
                        <a href={j.url} target="_blank" rel="noreferrer" style={{ display: "inline-block", background: "#10b981", color: "#fff", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                          Apply →
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Email Log */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>Email Log</span>
              <span style={{ fontSize: 13, color: "#64748b" }}>{stats.total} total</span>
            </div>

            {emails.length === 0 ? (
              <div style={{ padding: "48px 24px", textAlign: "center", color: "#94a3b8" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                <div style={{ fontWeight: 500 }}>No emails sent yet</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Call POST /api/send-email to get started</div>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Recipient", "Company", "Subject", "Type", "Date"].map((h) => (
                      <th key={h} style={{ padding: "11px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {emails.map((e, i) => (
                    <tr key={e.id} style={{ borderBottom: i < emails.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                      <td style={{ padding: "12px 20px" }}>
                        <div style={{ fontWeight: 500 }}>{e.name || e.to_email}</div>
                        {e.name && <div style={{ fontSize: 12, color: "#94a3b8" }}>{e.to_email}</div>}
                      </td>
                      <td style={{ padding: "12px 20px", color: "#334155" }}>{e.company || <span style={{ color: "#94a3b8" }}>—</span>}</td>
                      <td style={{ padding: "12px 20px", color: "#334155", maxWidth: 260 }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.subject}</div>
                      </td>
                      <td style={{ padding: "12px 20px" }}>
                        <span style={{
                          display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                          background: e.type === "initial" ? "#eff6ff" : "#f5f3ff",
                          color: e.type === "initial" ? "#3b82f6" : "#8b5cf6",
                        }}>
                          {e.type === "initial" ? "Initial" : "Follow-up"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 20px", color: "#64748b", fontSize: 13 }}>{formatDate(e.sent_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </body>
    </html>
  );
}
