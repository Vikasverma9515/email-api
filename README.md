# Email API — Resume Mailer

A Next.js app deployed on Vercel that sends cold emails to recruiters with your resume auto-attached. Your AI assistant (ChatGPT, Claude, etc.) calls it via HTTP. Includes a live tracking dashboard showing opens, sent count, and follow-ups.

**Live URL:** `https://email-api-drab.vercel.app`

---

## What it does

| Endpoint | What it does |
|---|---|
| `GET /` | Dashboard — shows all sent emails, open status, stats |
| `POST /api/send-email` | Sends email + resume PDF attached |
| `POST /api/follow-up` | Sends a follow-up with `Re:` prefix so it threads |
| `GET /api/send-email` | Health check — confirms resume is bundled and API is alive |
| `GET /api/track/[id]` | Open tracking pixel — called automatically when recipient opens email |

Every email is sent as clean HTML with a signature footer and plain-text fallback. Open tracking is embedded automatically when `APP_URL` is set.

---

## Repo structure

```
email-api/
├── assets/
│   └── resume.pdf                       ← YOUR resume goes here
├── src/
│   ├── lib/
│   │   └── db.ts                        ← JSON file storage (./data/ locally, /tmp/ on Vercel)
│   └── app/
│       ├── api/
│       │   ├── send-email/route.ts      ← main send endpoint
│       │   ├── follow-up/route.ts       ← follow-up endpoint
│       │   └── track/[id]/route.ts      ← open tracking pixel
│       ├── layout.tsx
│       └── page.tsx                     ← dashboard UI
├── next.config.js                       ← bundles assets/resume.pdf into the function
├── .env.example                         ← copy to .env.local and fill in
└── package.json
```

---

## Environment variables

All 5 vars are required for full functionality.

| Variable | Description |
|---|---|
| `GMAIL_USER` | Gmail address that sends the emails (`vikasverma951582@gmail.com`) |
| `GMAIL_APP_PASSWORD` | 16-char Gmail App Password (Google Account → Security → App passwords) |
| `API_SECRET` | Secret header value — every API request must include this |
| `FROM_NAME` | Display name in the From field (e.g. `Vikas Verma`) |
| `APP_URL` | Your deployed Vercel URL — enables open tracking pixels in emails |

### Current values on Vercel production

```
GMAIL_USER        = vikasverma951582@gmail.com
GMAIL_APP_PASSWORD= (encrypted, set 11 days ago)
API_SECRET        = 588669bcc37128310aa33992f42f6ec2e77eac1a0495f7ea
FROM_NAME         = Vikas Verma
APP_URL           = https://email-api-drab.vercel.app
```

### Local development (.env.local)

```
GMAIL_USER=vikasverma951582@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password
API_SECRET=588669bcc37128310aa33992f42f6ec2e77eac1a0495f7ea
FROM_NAME=Vikas Verma
APP_URL=https://email-api-drab.vercel.app
```

---

## How to replace the resume

1. Export your resume as a PDF
2. Rename it to **`resume.pdf`** (exact name, lowercase)
3. Drop it into `assets/`, replacing the existing file
4. In both [`src/app/api/send-email/route.ts`](src/app/api/send-email/route.ts) and [`src/app/api/follow-up/route.ts`](src/app/api/follow-up/route.ts), update:
   ```ts
   const RESUME_FILENAME = "YourName_Resume.pdf";
   ```
5. Commit and push — Vercel auto-deploys

---

## How to set up Gmail App Password

1. Go to Google Account → **Security** → **2-Step Verification** (must be on)
2. Scroll down → **App passwords**
3. App: Mail, Device: Other → name it "Email API" → Generate
4. Copy the 16-character password
5. Add to Vercel: `vercel env add GMAIL_APP_PASSWORD production`

---

## Dashboard

Visit `https://email-api-drab.vercel.app` to see:

- **Stats bar** — Total Sent, Opened, Open Rate %, Follow-ups
- **Email table** — recipient, subject, type badge (Initial / Follow-up), sent date, open status
- Rows turn green with an "Opened" badge when the recipient's email client loads the tracking pixel
- Shows open count (e.g. "3× opened") if they opened it multiple times

> **Note:** Open tracking requires `APP_URL` to be set and the recipient's email client to load remote images. Gmail, Outlook and most desktop clients do. Apple Mail Privacy Protection may pre-load pixels — open counts may be inflated on iPhone.

**Storage:** Data is saved to `/tmp/emails.json` on Vercel. Persists while the function is warm (typically hours of activity). Resets on cold starts (when the app hasn't been used for a while). For permanent storage, add Upstash Redis (free tier at upstash.com) and set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`.

---

## API usage

### Health check
```bash
curl https://email-api-drab.vercel.app/api/send-email \
  -H "x-api-secret: 588669bcc37128310aa33992f42f6ec2e77eac1a0495f7ea"
```

### Send an email
```bash
curl -X POST https://email-api-drab.vercel.app/api/send-email \
  -H "Content-Type: application/json" \
  -H "x-api-secret: 588669bcc37128310aa33992f42f6ec2e77eac1a0495f7ea" \
  -d '{
    "to": "recruiter@company.com",
    "subject": "SWE role at Acme",
    "body": "Hi Sarah,\n\nI came across the opening at Acme and would love to connect.\n\nBest,\nVikas"
  }'
```

### Send a follow-up (3–4 days later)
```bash
curl -X POST https://email-api-drab.vercel.app/api/follow-up \
  -H "Content-Type: application/json" \
  -H "x-api-secret: 588669bcc37128310aa33992f42f6ec2e77eac1a0495f7ea" \
  -d '{
    "to": "recruiter@company.com",
    "original_subject": "SWE role at Acme"
  }'
```
Subject becomes `Re: SWE role at Acme` — threads in their inbox. Pass `body` for a custom message; otherwise a default follow-up is used.

---

## Give to your AI assistant

Paste this as a system prompt:

```
I have an email API for job search outreach. Use it to send emails on my behalf.

Base URL: https://email-api-drab.vercel.app

Required header on every request:
  x-api-secret: 588669bcc37128310aa33992f42f6ec2e77eac1a0495f7ea

Send initial email:
  POST /api/send-email
  Body: { "to": "email", "subject": "subject line", "body": "plain text body" }
  My resume PDF is automatically attached to every email.
  Emails are sent with high priority and clean HTML formatting.

Send follow-up (3–4 days after no reply):
  POST /api/follow-up
  Body: { "to": "email", "original_subject": "the original subject" }
  Optionally pass "body" for a custom message.
  Subject becomes "Re: {original_subject}" so it threads in their inbox.

Health check (no email sent):
  GET /api/send-email

Dashboard (see what was sent and opened):
  https://email-api-drab.vercel.app
```

### ChatGPT Custom GPT — Actions schema

In the GPT editor → **Actions** → **Create new action** → paste:

```yaml
openapi: 3.1.0
info:
  title: Resume Email API
  version: 1.0.0
servers:
  - url: https://email-api-drab.vercel.app
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
                  description: Subject of the original email
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

Under **Authentication** → **API Key** → **Header** → name: `x-api-secret` → value: `588669bcc37128310aa33992f42f6ec2e77eac1a0495f7ea`

---

## API reference

### `POST /api/send-email`

| Field | Type | Required |
|---|---|---|
| `to` | string | Yes |
| `subject` | string | Yes |
| `body` | string | Yes |

| Status | Meaning |
|---|---|
| 200 | Sent |
| 400 | Missing field |
| 401 | Wrong `x-api-secret` |
| 500 | Resume missing or not a valid PDF |

---

### `POST /api/follow-up`

| Field | Type | Required |
|---|---|---|
| `to` | string | Yes |
| `original_subject` | string | Yes |
| `body` | string | No — default follow-up message used if omitted |

---

### `GET /api/send-email`

Health check. Returns resume name, size, and `from` address.

---

## Local development

```bash
npm install
cp .env.example .env.local   # fill in GMAIL_APP_PASSWORD
npm run dev
```

Runs at `http://localhost:3000`. Data saved to `./data/emails.json`.

---

## Deploying changes

```bash
git add -A && git commit -m "your message"
git push origin main
```

Vercel auto-deploys on every push to `main`.

To add or update an env var on Vercel:
```bash
vercel env add VAR_NAME production
vercel env rm VAR_NAME production   # to remove
```

Then redeploy:
```bash
vercel --prod
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `401 Unauthorized` | Check `x-api-secret` header matches `API_SECRET` exactly |
| `535 Invalid credentials` | Re-generate Gmail App Password; confirm 2FA is on |
| `Resume file missing` in prod | Ensure `assets/resume.pdf` is committed to git |
| Dashboard shows no data | Data resets on cold starts — send an email first; for persistence add Upstash Redis |
| Open tracking not working | Check `APP_URL` is set in Vercel env vars and redeployed |
| Vercel function timeout | Large PDF + slow SMTP can hit the 10s free-tier limit — upgrade to Vercel Pro or switch SMTP provider |
