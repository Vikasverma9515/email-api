export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "monospace" }}>
      <h1>Email API</h1>
      <p>POST /api/send-email</p>
      <pre>{`{
  "to": "recipient@example.com",
  "subject": "Your subject",
  "body": "Plain text body"
}`}</pre>
      <p>Header: <code>x-api-secret: YOUR_API_SECRET</code></p>
    </main>
  );
}
