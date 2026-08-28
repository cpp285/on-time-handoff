export default function Loading() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f4f1e8",
        padding: "96px 6vw",
      }}
      aria-label="正在加载病区交班看板"
    >
      <div
        style={{
          maxWidth: 1380,
          margin: "0 auto",
          display: "grid",
          gap: 20,
        }}
      >
        <div style={{ width: 180, height: 18, background: "#d8d4c8" }} />
        <div style={{ width: "55%", height: 72, background: "#e5e0d3" }} />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
            marginTop: 40,
          }}
        >
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              style={{ height: 280, background: "#fffdf8", border: "1px solid #d8d4c8" }}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
