import { getAllEmails, EmailRecord } from "@/lib/db";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function initials(email: string) {
  const name = email.split("@")[0].replace(/[._-]/g, " ");
  return name.split(" ").map((w) => w[0]?.toUpperCase()).slice(0, 2).join("");
}

function avatarColor(email: string) {
  const colors = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#14b8a6"];
  let hash = 0;
  for (const c of email) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
}

export default async function Dashboard() {
  let emails: EmailRecord[] = [];
  try {
    emails = await getAllEmails();
  } catch {
    // Redis not configured — show empty state
  }

  const total = emails.length;
  const opened = emails.filter((e) => e.openedAt).length;
  const openRate = total ? Math.round((opened / total) * 100) : 0;
  const followups = emails.filter((e) => e.type === "followup").length;

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Email Tracker</title>
      </head>
      <body style={{ margin: 0, padding: 0, background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#1e293b" }}>

        {/* Header */}
        <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 32px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, background: "#6366f1", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#fff", fontSize: 16 }}>✉</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: 17 }}>Email Tracker</span>
            </div>
            <span style={{ fontSize: 13, color: "#64748b" }}>vikasverma951582@gmail.com</span>
          </div>
        </div>

        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 32px" }}>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
            {[
              { label: "Total Sent", value: total, color: "#6366f1", bg: "#eef2ff" },
              { label: "Opened", value: opened, color: "#10b981", bg: "#ecfdf5" },
              { label: "Open Rate", value: `${openRate}%`, color: "#f59e0b", bg: "#fffbeb" },
              { label: "Follow-ups", value: followups, color: "#8b5cf6", bg: "#f5f3ff" },
            ].map((s) => (
              <div key={s.label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px 24px" }}>
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>Sent Emails</span>
              <span style={{ fontSize: 13, color: "#64748b" }}>{total} total</span>
            </div>

            {emails.length === 0 ? (
              <div style={{ padding: "64px 24px", textAlign: "center", color: "#94a3b8" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>No emails sent yet</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Start sending via POST /api/send-email</div>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Recipient", "Subject", "Type", "Sent", "Status"].map((h) => (
                      <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {emails.map((email, i) => (
                    <tr key={email.id} style={{ borderBottom: i < emails.length - 1 ? "1px solid #f1f5f9" : "none" }}>

                      {/* Recipient */}
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: avatarColor(email.to), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#fff", flexShrink: 0 }}>
                            {initials(email.to)}
                          </div>
                          <span style={{ fontSize: 14, color: "#1e293b" }}>{email.to}</span>
                        </div>
                      </td>

                      {/* Subject */}
                      <td style={{ padding: "14px 20px", maxWidth: 280 }}>
                        <span style={{ fontSize: 14, color: "#334155", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email.subject}</span>
                      </td>

                      {/* Type badge */}
                      <td style={{ padding: "14px 20px" }}>
                        <span style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 500,
                          background: email.type === "initial" ? "#eff6ff" : "#f5f3ff",
                          color: email.type === "initial" ? "#3b82f6" : "#8b5cf6",
                        }}>
                          {email.type === "initial" ? "Initial" : "Follow-up"}
                        </span>
                      </td>

                      {/* Sent date */}
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ fontSize: 13, color: "#334155" }}>{formatDate(email.sentAt)}</div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>{formatTime(email.sentAt)}</div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: "14px 20px" }}>
                        {email.openedAt ? (
                          <div>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500, background: "#ecfdf5", color: "#10b981" }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                              Opened
                            </span>
                            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3, paddingLeft: 4 }}>
                              {email.openCount > 1 ? `${email.openCount}× — ` : ""}{formatDate(email.openedAt)}
                            </div>
                          </div>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500, background: "#f1f5f9", color: "#64748b" }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#94a3b8", display: "inline-block" }} />
                            Sent
                          </span>
                        )}
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Note */}
          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 16, textAlign: "center" }}>
            Open tracking requires <code style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: 4 }}>APP_URL</code> env var set to your deployed URL. Not all email clients load tracking pixels.
          </p>

        </div>
      </body>
    </html>
  );
}
