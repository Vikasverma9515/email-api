import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const GMAIL_USER = process.env.GMAIL_USER!;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD!;
const API_SECRET = process.env.API_SECRET!;

// Public Google Drive file ID for Vikas_Verma_Resume_Cairn-6.pdf
const RESUME_DRIVE_ID = process.env.RESUME_DRIVE_ID || "1n9aDreYwCuSHgdywZ6zSSk08aRC7mlJV";
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

  // Fetch resume PDF from Google Drive
  const driveUrl = `https://drive.google.com/uc?export=download&id=${RESUME_DRIVE_ID}`;
  const resumeRes = await fetch(driveUrl);
  if (!resumeRes.ok) {
    return NextResponse.json({ error: "Failed to fetch resume" }, { status: 500 });
  }
  const resumeBuffer = Buffer.from(await resumeRes.arrayBuffer());

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
