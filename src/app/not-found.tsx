import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f8fafc" }}>
      <section style={{ maxWidth: 680, width: "100%", border: "1px solid rgba(15,23,42,0.1)", borderRadius: 28, background: "white", padding: 32, boxShadow: "0 24px 80px rgba(15,23,42,0.12)" }}>
        <p style={{ margin: 0, color: "#006d77", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 12 }}>404</p>
        <h1 style={{ margin: "10px 0 12px", fontSize: "clamp(2rem, 5vw, 3.5rem)", lineHeight: 1 }}>Seite nicht gefunden</h1>
        <p style={{ margin: "0 0 24px", color: "#475569", fontSize: 17, lineHeight: 1.7 }}>
          Dieser Pfad gehört nicht zum Chris Fact Radar. Nutze die Startseite, das Studio oder den Statusbereich.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <Link href="/" style={{ borderRadius: 999, padding: "12px 18px", background: "#006d77", color: "white", fontWeight: 800, textDecoration: "none" }}>Zur Startseite</Link>
          <Link href="/studio" style={{ borderRadius: 999, padding: "12px 18px", border: "1px solid rgba(15,23,42,0.15)", color: "#0f172a", fontWeight: 800, textDecoration: "none" }}>Studio öffnen</Link>
          <Link href="/status" style={{ borderRadius: 999, padding: "12px 18px", border: "1px solid rgba(15,23,42,0.15)", color: "#0f172a", fontWeight: 800, textDecoration: "none" }}>Status prüfen</Link>
        </div>
      </section>
    </main>
  );
}
