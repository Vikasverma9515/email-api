import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { readFile } from "fs/promises";
import path from "path";

const GMAIL_USER = process.env.GMAIL_USER!;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD!;
const API_SECRET = process.env.API_SECRET!;

// Resume ships with the deployment (assets/resume.pdf) so every email has it.
const RESUME_PATH = path.join(process.cwd(), "assets", "resume.pdf");
const RESUME_FILENAME = "Vikas_Verma_Resume.pdf";

export async function POST(req: NextRequest) {
  // Simple auth check
  const auth = req.headers.get("x-api-secret");
  if (!API_SECRET || auth !== API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { to, subject, body } = await req.json();

  if (!to || !subject || !body) {
    return NextResponse.json({ error: "Missing to, subject, or body" }, { status: 400 });
  }

  // Never send without the resume
  let resumeBuffer: Buffer;
  try {
    resumeBuffer = await readFile(RESUME_PATH);
  } catch {
    return NextResponse.json({ error: "Resume file missing" }, { status: 500 });
  }
  if (resumeBuffer.subarray(0, 5).toString() !== "%PDF-") {
    return NextResponse.json({ error: "Resume file is not a PDF" }, { status: 500 });
  }

  // Send via Gmail SMTP
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD.replace(/\s/g, ""),
    },
  });

  await transporter.sendMail({
    from: GMAIL_USER,
    to,
    subject,
    text: body,
    attachments: [
      {
        filename: RESUME_FILENAME,
        content: resumeBuffer,
        contentType: "application/pdf",
      },
    ],
  });

  return NextResponse.json({ success: true, to, subject });
}

// Health check: confirms the resume is bundled, without sending anything
export async function GET(req: NextRequest) {
  if (!API_SECRET || req.headers.get("x-api-secret") !== API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const buf = await readFile(RESUME_PATH);
    return NextResponse.json({ ok: true, resume: RESUME_FILENAME, bytes: buf.length, isPdf: buf.subarray(0, 5).toString() === "%PDF-" });
  } catch {
    return NextResponse.json({ ok: false, error: "Resume file missing" }, { status: 500 });
  }
}
