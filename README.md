# Email API — Resume Mailer

A Next.js API that sends cold emails to recruiters with your resume auto-attached. Your AI assistant (ChatGPT, Claude, etc.) calls it via HTTP — you never touch email manually.

---

## What it does

| Endpoint | What it does |
|---|---|
| `POST /api/send-email` | Sends email + resume PDF attached |
| `POST /api/follow-up` | Sends a follow-up with `Re:` prefix so it threads in their inbox |
| `GET /api/send-email` | Health check — confirms the resume is bundled and the API is alive |

Every email is sent as proper HTML with a clean layout and your name/email in the footer, plus a plain-text fallback.

---

## Repo structure

```
email-api/
├── assets/
│   └── resume.pdf                  ← YOUR resume goes here
├── src/
│   └── app/
│       ├── api/
│       │   ├── send-email/
│       │   │   └── route.ts        ← main send endpoint
│       │   └── follow-up/
│       │       └── route.ts        ← follow-up endpoint
│       ├── layout.tsx
│       └── page.tsx
├── next.config.js                  ← bundles assets/resume.pdf into the serverless function
├── .env.example                    ← copy to .env.local and fill in
└── package.json
```

---

## Step 1 — Replace the resume

1. Export your resume as a PDF.
2. Rename it to **`resume.pdf`** (exact name, lowercase).
3. Drop it into `assets/`, replacing the existing file.
4. Open [`src/app/api/send-email/route.ts`](src/app/api/send-email/route.ts) and change:
   ```ts
   const RESUME_FILENAME = "YourName_Resume.pdf";
   ```
   Do the same in [`src/app/api/follow-up/route.ts`](src/app/api/follow-up/route.ts).
   This is just the filename the recipient sees — pick anything.

---

## Step 2 — Set up Gmail App Password

1. Google Account → **Security** → **2-Step Verification** (must be enabled)
2. Scroll to the bottom → **App passwords**
3. App: Mail, Device: Other → name it "Email API" → Generate
4. Copy the 16-character password (e.g. `abcd efgh ijkl mnop`)

> If you don't see App passwords, 2-Step Verification is not on, or your account is a Google Workspace account with restrictions.

---

## Step 3 — Configure environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```
GMAIL_USER=you@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
API_SECRET=make-up-any-long-random-string
FROM_NAME=Your Full Name
```

| Variable | Description |
|---|---|
| `GMAIL_USER` | The Gmail address that sends the emails |
| `GMAIL_APP_PASSWORD` | 16-char app password from Step 2 (spaces are fine) |
| `API_SECRET` | A secret you invent — every request must include it in the header |
| `FROM_NAME` | Display name shown in the From field (e.g. "Vikas Verma") |

---

## Step 4 — Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or push to GitHub → [vercel.com](https://vercel.com) → **Add New Project** → import repo → Deploy.

**Add all 4 env vars** in Vercel → Project → Settings → Environment Variables, then **redeploy**.

Your live URL: `https://your-project-name.vercel.app`

---

## Step 5 — Test it

**Health check** (no email sent)
```bash
curl https://your-project-name.vercel.app/api/send-email \
  -H "x-api-secret: YOUR_API_SECRET"
```
```json
{"ok":true,"resume":"Vikas_Verma_Resume.pdf","bytes":211495,"isPdf":true,"from":"Vikas Verma <you@gmail.com>"}
```

**Send a test email to yourself**
```bash
curl -X POST https://your-project-name.vercel.app/api/send-email \
  -H "Content-Type: application/json" \
  -H "x-api-secret: YOUR_API_SECRET" \
  -d '{"to":"you@gmail.com","subject":"Test","body":"Hello.\n\nResume is attached."}'
```

**Send a follow-up** (3-4 days after initial email)
```bash
curl -X POST https://your-project-name.vercel.app/api/follow-up \
  -H "Content-Type: application/json" \
  -H "x-api-secret: YOUR_API_SECRET" \
  -d '{"to":"recruiter@company.com","original_subject":"SWE role at Acme"}'
```
Subject becomes `Re: SWE role at Acme` — threads in their inbox.

---

## Step 6 — Connect your AI assistant

### What to tell ChatGPT / Claude

Paste this as a system prompt or in chat:

```
I have an email API for job search outreach. Use it to send emails on my behalf.

Base URL: https://your-project-name.vercel.app

Required header on every request:
  x-api-secret: YOUR_API_SECRET

Send initial email:
  POST /api/send-email
  Body: { "to": "email", "subject": "subject line", "body": "plain text body" }
  My resume PDF is automatically attached to every email.
  Emails are sent with high priority and a clean HTML layout.

Send follow-up (use 3-4 days after no reply):
  POST /api/follow-up
  Body: { "to": "email", "original_subject": "the original subject" }
  Optionally pass "body" for a custom message — otherwise a default follow-up is used.
  Subject becomes "Re: {original_subject}" so it threads in their inbox.

Health check (no email sent):
  GET /api/send-email
```

### ChatGPT Custom GPT — Actions schema

In the GPT editor → **Actions** → **Create new action** → paste:

```yaml
openapi: 3.1.0
info:
  title: Resume Email API
  version: 1.0.0
servers:
  - url: https://your-project-name.vercel.app
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
                  description: Recipient email address
                subject:
                  type: string
                  description: Email subject line
                body:
                  type: string
                  description: Plain text email body
      parameters:
        - in: header
          name: x-api-secret
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Email sent
    get:
      operationId: healthCheck
      summary: Check if the API and resume are ready
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
                  description: The subject of the original email
                body:
                  type: string
                  description: Optional custom follow-up message
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

Under **Authentication** → **API Key** → **Header** → name: `x-api-secret` → paste your `API_SECRET`.

---

## API reference

### `POST /api/send-email`

| Field | Type | Required | Description |
|---|---|---|---|
| `to` | string | Yes | Recipient email address |
| `subject` | string | Yes | Subject line |
| `body` | string | Yes | Plain text body |

| Status | Meaning |
|---|---|
| 200 | Email sent |
| 400 | Missing `to`, `subject`, or `body` |
| 401 | Wrong or missing `x-api-secret` |
| 500 | Resume file missing or not a valid PDF |

---

### `POST /api/follow-up`

| Field | Type | Required | Description |
|---|---|---|---|
| `to` | string | Yes | Recipient email address |
| `original_subject` | string | Yes | Subject of the original email — prefixed with `Re:` |
| `body` | string | No | Custom follow-up text. Default is a short "just following up" message |

---

### `GET /api/send-email`

Health check. Confirms the resume PDF is bundled and returns its byte size.

---

## Local development

```bash
npm install
cp .env.example .env.local   # fill in all 4 vars
npm run dev
```

API runs at `http://localhost:3000`.

Test health check:
```bash
curl http://localhost:3000/api/send-email \
  -H "x-api-secret: YOUR_API_SECRET"
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `401 Unauthorized` | Check the `x-api-secret` header matches `API_SECRET` exactly |
| `535 Invalid credentials` from Gmail | Re-generate the App Password; confirm 2FA is on; spaces in the password are fine |
| `Resume file missing` in production | Make sure `assets/resume.pdf` is committed to git (check `.gitignore`) |
| Email goes to spam | Use a custom domain with SPF/DKIM, or switch to Resend/SendGrid for cold outreach |
| Vercel function timeout | Large PDFs + slow SMTP can hit the 10s free-tier limit — upgrade to Vercel Pro or switch SMTP provider |
