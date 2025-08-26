export default function HomePage() {
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>VisionBI Assistant</h1>
      <p>Web UI coming soon. Backend running at <code>{process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'}</code></p>
    </main>
  );
}


