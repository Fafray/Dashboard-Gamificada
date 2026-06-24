"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function UnlockGate() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        setError("Senha incorreta");
        setPassword("");
      }
    } catch {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "60vh", gap: "28px", padding: "32px 16px",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "40px", marginBottom: "14px", lineHeight: 1 }}>🔒</div>
        <h2 style={{
          fontFamily: "var(--font-space-grotesk), sans-serif",
          fontSize: "20px", fontWeight: 700, color: "var(--text-primary)",
          letterSpacing: ".06em", marginBottom: "6px",
        }}>
          Perfil protegido
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
          Digite a senha para acessar seus dados
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", maxWidth: "300px" }}
      >
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          autoFocus
          style={{
            height: "44px", borderRadius: "10px",
            border: `1px solid ${error ? "var(--accent-red, #ef4444)" : "var(--border)"}`,
            background: "var(--bg-card)", color: "var(--text-primary)",
            padding: "0 14px", fontSize: "15px", outline: "none", fontFamily: "inherit",
          }}
        />
        {error && (
          <p style={{ color: "var(--accent-red, #ef4444)", fontSize: "13px", textAlign: "center", margin: 0 }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading || !password}
          style={{
            height: "44px", borderRadius: "10px", border: "none",
            background: "var(--accent-violet)", color: "#fff",
            fontSize: "13px", fontWeight: 700, cursor: "pointer",
            fontFamily: "var(--font-space-grotesk), sans-serif",
            letterSpacing: ".1em", opacity: (loading || !password) ? 0.55 : 1,
            transition: "opacity .15s",
          }}
        >
          {loading ? "..." : "ENTRAR"}
        </button>
      </form>
    </div>
  );
}
