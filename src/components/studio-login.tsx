import Link from "next/link";

type StudioLoginProps = {
  failed?: boolean;
};

export function StudioLogin({ failed = false }: StudioLoginProps) {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "var(--bg)" }}>
      <section style={{ maxWidth: 560, width: "100%", border: "1px solid rgba(148,163,184,0.22)", borderRadius: 28, background: "#0d1424", padding: 32, boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}>
        <p style={{ margin: 0, color: "#67e8f9", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 12 }}>Geschütztes Studio</p>
        <h1 style={{ margin: "10px 0 12px", fontSize: "clamp(2rem, 5vw, 3.25rem)", lineHeight: 1, color: "#e8ecf5" }}>Admin-Zugang erforderlich</h1>
        <p style={{ margin: "0 0 22px", color: "#94a3b8", fontSize: 16, lineHeight: 1.7 }}>
          Das Chris Fact Radar Studio ist in dieser Umgebung geschützt. Gib den Admin-Token ein, um die Arbeitsoberfläche zu öffnen.
        </p>
        {failed && (
          <div role="alert" style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 16, background: "rgba(239,68,68,0.14)", color: "#fca5a5", fontWeight: 800 }}>
            Token ungültig. Bitte erneut versuchen.
          </div>
        )}
        <form method="post" action="/api/admin/login" style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 8, color: "#e8ecf5", fontWeight: 800 }}>
            Admin-Token
            <input
              name="token"
              type="password"
              autoComplete="current-password"
              required
              placeholder="APP_ADMIN_TOKEN"
              style={{ minHeight: 46, borderRadius: 14, border: "1px solid rgba(148,163,184,0.28)", padding: "0 14px", font: "inherit", background: "#111a2e", color: "#e8ecf5" }}
            />
          </label>
          <button type="submit" style={{ minHeight: 48, border: 0, borderRadius: 999, background: "#67e8f9", color: "#0b1220", fontWeight: 900, cursor: "pointer" }}>
            Studio entsperren
          </button>
        </form>
        <p style={{ margin: "18px 0 0", color: "#94a3b8", fontSize: 14, lineHeight: 1.6 }}>
          Für lokale Walkthroughs bleibt das Studio offen, solange <code>APP_ADMIN_TOKEN</code> nicht gesetzt ist. Zurück zur <Link href="/" style={{ color: "#67e8f9", fontWeight: 800 }}>Startseite</Link>.
        </p>
      </section>
    </main>
  );
}
