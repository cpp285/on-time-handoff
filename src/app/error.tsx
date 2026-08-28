"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#f4f1e8",
      }}
    >
      <section
        style={{
          width: "min(520px, 100%)",
          padding: 40,
          background: "#fffdf8",
          border: "1px solid #d8d4c8",
          boxShadow: "0 24px 80px rgba(23,60,56,.12)",
        }}
      >
        <AlertTriangle size={34} color="#b84939" aria-hidden="true" />
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32 }}>
          交班看板暂时无法读取
        </h1>
        <p style={{ color: "#66716d", lineHeight: 1.8 }}>
          本地数据没有丢失。请重新读取，如果问题持续出现，请保留终端报错用于排查。
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: 16,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            border: 0,
            padding: "12px 18px",
            background: "#173c38",
            color: "white",
            cursor: "pointer",
          }}
        >
          <RefreshCw size={17} aria-hidden="true" />
          重新读取
        </button>
      </section>
    </main>
  );
}
