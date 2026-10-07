# Email API — Resume Mailer

A Next.js API that sends cold emails to recruiters with your resume auto-attached. Your AI assistant (ChatGPT, Claude, etc.) calls it via HTTP. Includes duplicate guard, daily send cap, Google Sheets tracking, and a follow-up endpoint.

---

## What it does

| Endpoint | What it does |
|---|---|
| `POST /api/send-email` | Sends email + resume. Blocks if already emailed this person in 30 days or daily cap hit. |
| `POST /api/follow-up` | Sends a follow-up with `Re:` prefix so it threads. |
| `GET /api/send-email` | Health check — confirms resume is bundled, shows daily send count. |

Every send is logged to a Google Sheet (your free CRM).

---

## Repo structure

```
email-api/
├── assets/
│   └── resume.pdf              ← YOUR resume goes here
├── src/
│   ├── lib/
│   │   └── sheets.ts           ← Google Sheets helper (log, dedup, daily cap)
│   └── app/
│       ├── api/
│       │   ├── send-email/
│       │   │   └── route.ts    ← main send endpoint
│       │   └── follow-up/
│       │       └── route.ts    ← follow-up endpoint
│       ├── layout.tsx
│       └── page.tsx
├── next.config.js              ← bundles assets/resume.pdf into the function
├── .env.example                ← copy to .env.local and fill in
└── package.json
```

---

## Step 1 — Replace the resume

1. Export your resume as a PDF.
2. Rename it to **`resume.pdf`** (exact name, lowercase).
3. Drop it into `assets/`, replacing the existing file.
4. Open [`src/app/api/send-email/route.ts`](src/app/api/send-email/route.ts) and change line 15:
   ```ts
   const RESUME_FILENAME = "YourName_Resume.pdf";
   ```
   Do the same in [`src/app/api/follow-up/route.ts`](src/app/api/follow-up/route.ts) line 15.

---

## Step 2 — Set up Gmail App Password

1. Google Account → **Security** → **2-Step Verification** (must be on)
2. Scroll down → **App passwords**
3. App: Mail, Device: Other → name it "Email API" → Generate
4. Copy the 16-character password shown

> If you don't see App passwords, your account may be a Workspace account with restrictions. Contact your admin or use a personal Gmail.

---

## Step 3 — Set up Google Sheets (tracking + dedup + daily cap)

**Create the sheet**

1. [sheets.google.com](https://sheets.google.com) → New spreadsheet
2. Rename the first tab to **`Emails`**
3. Add these headers in row 1:

| A | B | C | D | E |
|---|---|---|---|---|
| Timestamp | To | Subject | Type | Status |

4. Copy the Sheet ID from the URL — the part between `/d/` and `/edit`

**Create a Service Account**

1. [console.cloud.google.com](https://console.cloud.google.com) → create or select a project
2. Search **Google Sheets API** → Enable it
3. **IAM & Admin → Service Accounts** → Create Service Account (name it anything)
4. Click the account → **Keys** tab → **Add Key** → **Create new key** → JSON → Download
5. From the downloaded JSON file, you need:
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → `GOOGLE_PRIVATE_KEY`

**Share the sheet**

In your Google Sheet → Share → paste the `client_email` → give **Editor** access.

---

## Step 4 — Configure environment variables

Copy `.env.example` to `.env.local` and fill it in:

```bash
cp .env.example .env.local
```

```
GMAIL_USER=vikasverma951582@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
API_SECRET=make-up-any-long-random-string
FROM_NAME=Vikas Verma

GOOGLE_SHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
GOOGLE_SERVICE_ACCOUNT_EMAIL=email-api@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----"
```

| Variable | Description |
|---|---|
| `GMAIL_USER` | Gmail address that sends the emails |
| `GMAIL_APP_PASSWORD` | 16-char app password from Step 2 (spaces ok) |
| `API_SECRET` | A random string you invent — sent in every request header |
| `FROM_NAME` | Display name in the From field (e.g. "Vikas Verma") |
| `GOOGLE_SHEET_ID` | From the spreadsheet URL |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` from the downloaded JSON |
| `GOOGLE_PRIVATE_KEY` | `private_key` from the downloaded JSON, including `-----BEGIN` lines |

---

## Step 5 — Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or push to GitHub and import the repo at [vercel.com](https://vercel.com).

**Add all 7 env vars** in Vercel → Project → Settings → Environment Variables, then redeploy.

> For `GOOGLE_PRIVATE_KEY`: paste the value with literal `\n` characters — Vercel handles them correctly.

---

## Step 6 — Test it

**Health check**
```bash
curl https://your-app.vercel.app/api/send-email \
  -H "x-api-secret: YOUR_API_SECRET"
```
```json
{"ok":true,"resume":"Vikas_Verma_Resume.pdf","bytes":211495,"isPdf":true,"from":"Vikas Verma <you@gmail.com>","sent_today":0,"daily_limit":50}
```

**Send an email**
```bash
curl -X POST https://your-app.vercel.app/api/send-email \
  -H "Content-Type: application/json" \
  -H "x-api-secret: YOUR_API_SECRET" \
  -d '{"to":"recruiter@company.com","subject":"SWE role at Acme","body":"Hi Sarah,\n\nI came across the opening..."}'
```

**Send a follow-up** (3-4 days later)
```bash
curl -X POST https://your-app.vercel.app/api/follow-up \
  -H "Content-Type: application/json" \
  -H "x-api-secret: YOUR_API_SECRET" \
  -d '{"to":"recruiter@company.com","original_subject":"SWE role at Acme"}'
```

---

## Step 7 — Give to your AI (ChatGPT / Claude)

Paste this as a system prompt:

```
I have an email API for job search outreach. Here is how to use it:

Base URL: https://your-app.vercel.app

Required header on all requests:
  x-api-secret: YOUR_API_SECRET

--- Send initial email ---
POST /api/send-email
Body: { "to": "email", "subject": "subject", "body": "plain text" }

My resume PDF is automatically attached to every email.
Emails are sent with high priority and a clean HTML layout.

Error responses:
  409 — already emailed this person in the last 30 days, use /api/follow-up instead
  429 — daily limit of 50 reached, try tomorrow

--- Send follow-up ---
POST /api/follow-up
Body: { "to": "email", "original_subject": "the original subject line" }
Optionally pass "body" for a custom follow-up message.
The subject becomes "Re: {original_subject}" so it threads in their inbox.

--- Health check ---
GET /api/send-email
Returns sent_today and daily_limit so you know how many sends are left today.
```

### ChatGPT Custom GPT — Actions schema

```yaml
openapi: 3.1.0
info:
  title: Resume Email API
  version: 1.0.0
servers:
  - url: https://your-app.vercel.app
paths:
  /api/send-email:
    post:
      operationId: sendEmail
      summary: Send a cold email with resume attached
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [to, subject, body]
              properties:
                to:
                  type: string
                subject:
                  type: string
                body:
                  type: string
      parameters:
        - in: header
          name: x-api-secret
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Sent
        "409":
          description: Already emailed this person — use follow-up endpoint
        "429":
          description: Daily limit reached
    get:
      operationId: healthCheck
      summary: Check API status and daily send count
      parameters:
        - in: header
          name: x-api-secret
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Status
  /api/follow-up:
    post:
      operationId: sendFollowUp
      summary: Send a follow-up to a previous email
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [to, original_subject]
              properties:
                to:
                  type: string
                original_subject:
                  type: string
                body:
                  type: string
                  description: Optional custom follow-up body
      parameters:
        - in: header
          name: x-api-secret
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Follow-up sent
```

Under **Authentication** → API Key → Header → name: `x-api-secret` → paste your `API_SECRET`.

---

## API reference

### `POST /api/send-email`

| Field | Type | Required |
|---|---|---|
| `to` | string | Yes |
| `subject` | string | Yes |
| `body` | string | Yes — plain text |

| Status | Meaning |
|---|---|
| 200 | Sent, logged to sheet |
| 400 | Missing field |
| 401 | Wrong `x-api-secret` |
| 409 | Already emailed this address in the last 30 days |
| 429 | 50 emails already sent today |
| 500 | Resume missing or sheet unreachable |

---

### `POST /api/follow-up`

| Field | Type | Required |
|---|---|---|
| `to` | string | Yes |
| `original_subject` | string | Yes — used to build `Re: …` subject |
| `body` | string | No — uses a default if omitted |

Respects the same daily cap. Logs to sheet as type `followup`.

---

### `GET /api/send-email`

Health check. Returns resume status + `sent_today` / `daily_limit`.

---

## Google Sheet — what it tracks

Every sent email (initial and follow-up) adds a row:

| Timestamp | To | Subject | Type | Status |
|---|---|---|---|---|
| 2026-10-07T10:23:00Z | sarah@google.com | SWE role at Google | initial | sent |
| 2026-10-10T09:01:00Z | sarah@google.com | Re: SWE role at Google | followup | sent |

This is your paper trail. You can filter by Type, search by company, and see at a glance who's been contacted.

---

## Local development

```bash
npm install
cp .env.example .env.local   # fill in all 7 vars
npm run dev
```

API runs at `http://localhost:3000/api/send-email`.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `401 Unauthorized` | Check `x-api-secret` header matches your `API_SECRET` exactly |
| `535 Invalid credentials` | Re-generate Gmail App Password; make sure 2FA is on |
| `Resume file missing` in prod | Ensure `assets/resume.pdf` is committed to git (not in `.gitignore`) |
| Sheet not logging | Check service account has Editor access on the sheet; verify `GOOGLE_PRIVATE_KEY` has real newlines not `\\n` in local env |
| `409 on first send` | Sheet has an old row for this email — delete it manually or it was sent in the last 30 days |
| Vercel function timeout | Large PDF + slow SMTP can hit the 10s free tier limit — upgrade to Vercel Pro or switch to Resend |
