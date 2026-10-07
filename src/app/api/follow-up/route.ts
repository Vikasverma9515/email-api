import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { readFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { saveEmail } from "@/lib/db";

const GMAIL_USER = process.env.GMAIL_USER!;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD!;
const API_SECRET = process.env.API_SECRET!;
const FROM_NAME = process.env.FROM_NAME || GMAIL_USER;
const APP_URL = process.env.APP_URL || "";

const RESUME_PATH = path.join(process.cwd(), "assets", "resume.pdf");
const RESUME_FILENAME = "Vikas_Verma_Resume.pdf";

const DEFAULT_BODY =
  `Just wanted to follow up on my previous email in case it got buried.\n\n` +
  `I'm still very interested in the opportunity and would love to connect. I've attached my resume again for reference.\n\n` +
  `Happy to jump on a quick call whenever works for you.`;


export async function POST(req: NextRequest) {
  const auth = req.headers.get("x-api-secret");
  if (!API_SECRET || auth !== API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { to, original_subject, body } = await req.json();

  if (!to || !original_subject) {
    return NextResponse.json({ error: "Missing to or original_subject" }, { status: 400 });
  }

  let resumeBuffer: Buffer;
  try {
    resumeBuffer = await readFile(RESUME_PATH);
  } catch {
    return NextResponse.json({ error: "Resume file missing" }, { status: 500 });
  }
  if (resumeBuffer.subarray(0, 5).toString() !== "%PDF-") {
    return NextResponse.json({ error: "Resume file is not a valid PDF" }, { status: 500 });
  }

  const id = uuidv4();
  const followUpBody = body || DEFAULT_BODY;
  const subject = original_subject.startsWith("Re:") ? original_subject : `Re: ${original_subject}`;
  const trackingPixelUrl = APP_URL ? `${APP_URL}/api/track/${id}` : "";

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD.replace(/\s/g, "") },
  });

  await transporter.sendMail({
    from: `"${FROM_NAME}" <${GMAIL_USER}>`,
    to,
    subject,
    text: followUpBody,
    priority: "high",
    headers: { "X-Mailer": "Personal Mailer", "Precedence": "personal" },
    attachments: [{ filename: RESUME_FILENAME, content: resumeBuffer, contentType: "application/pdf" }],
  });

  await saveEmail({ id, to, subject, type: "followup", sentAt: new Date().toISOString(), openedAt: null, openCount: 0 });

  return NextResponse.json({ success: true, to, subject, id });
}
