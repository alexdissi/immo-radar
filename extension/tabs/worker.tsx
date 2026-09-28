/** Idle page of the pinned worker tab. */
export default function WorkerTab() {
  return (
    <main style={styles.page}>
      <div style={styles.logo}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19.07 4.93A10 10 0 0 0 6.99 3.34" />
          <path d="M4 6h.01" />
          <path d="M2.29 9.62A10 10 0 1 0 21.31 8.35" />
          <path d="M16.24 7.76A6 6 0 1 0 8.23 16.67" />
          <path d="M12 18h.01" />
          <path d="M17.99 11.66A6 6 0 0 1 15.77 16.67" />
          <circle cx="12" cy="12" r="2" />
          <path d="m13.41 10.59 5.66-5.66" />
        </svg>
      </div>
      <h1 style={styles.title}>Immo Radar travaille ici</h1>
      <p style={styles.text}>
        Cet onglet épinglé sert aux recherches : l'extension y ouvre Bien'ici, SeLoger, Logic-Immo, PAP et Leboncoin avec ta session. Garde-le
        ouvert, il revient ici entre deux passages.
      </p>
    </main>
  );
}

const styles = {
  page: { minHeight: "100vh", display: "grid", placeContent: "center", justifyItems: "center", gap: 12, padding: 24, background: "#f6f5f2", color: "#1d1d1b", fontFamily: "Inter, system-ui, sans-serif", textAlign: "center" },
  logo: { display: "grid", placeItems: "center", width: 44, height: 44, borderRadius: 12, background: "#2f5d50" },
  title: { margin: 0, fontSize: 20, fontWeight: 600 },
  text: { margin: 0, maxWidth: 420, color: "#6b6b66", fontSize: 14, lineHeight: 1.5 },
} satisfies Record<string, React.CSSProperties>;
