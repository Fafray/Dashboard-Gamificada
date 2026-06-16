"use client";

import { useState, useEffect } from "react";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr.buffer;
}

function isIOSSafari() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  return /iP(hone|ad|od)/.test(ua) && /WebKit/.test(ua);
}

function isPWA() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

export function NotificationSetup() {
  const [status, setStatus] = useState<"unknown" | "unsupported" | "denied" | "granted" | "loading">("unknown");
  const [error, setError] = useState<string | null>(null);
  const [vapidKey, setVapidKey] = useState<string>("");
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }

    // iOS Safari fora do PWA não suporta push
    if (isIOSSafari() && !isPWA()) {
      setShowIOSHint(true);
      return;
    }

    setStatus(
      Notification.permission === "granted"
        ? "granted"
        : Notification.permission === "denied"
        ? "denied"
        : "unknown"
    );

    // Busca a chave VAPID em runtime (não depende de NEXT_PUBLIC_)
    fetch("/api/push/vapid-key")
      .then((r) => r.json())
      .then((d) => setVapidKey(d.key || ""))
      .catch(() => {});
  }, []);

  async function enable() {
    setError(null);
    if (!vapidKey) {
      setError("Chave VAPID não configurada no servidor — adicione VAPID_PUBLIC_KEY no Railway.");
      return;
    }
    setStatus("loading");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        }));

      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      if (!res.ok) throw new Error(`Erro ao salvar assinatura: ${res.status}`);

      setStatus("granted");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStatus("unknown");
    }
  }

  async function disable() {
    setError(null);
    setStatus("loading");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("unknown");
    } catch {
      setStatus("granted");
    }
  }

  if (status === "unsupported") return null;

  // iOS Safari fora do PWA: instrução para adicionar à tela de início
  if (showIOSHint) {
    return (
      <div style={{
        padding: "12px 16px", borderRadius: "12px",
        background: "rgba(124,58,237,.07)",
        border: "1px solid rgba(124,58,237,.25)",
      }}>
        <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px" }}>
          📲 Instale o app para ativar notificações
        </p>
        <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
          No Safari, toque em <strong>Compartilhar</strong> → <strong>Adicionar à Tela de Início</strong>. Depois abra o app pelo ícone na tela inicial e toque em Ativar aqui.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "10px",
        padding: "12px 16px", borderRadius: "12px",
        background: status === "granted" ? "rgba(47,208,154,.07)" : "rgba(124,58,237,.07)",
        border: `1px solid ${status === "granted" ? "rgba(47,208,154,.25)" : "rgba(124,58,237,.25)"}`,
      }}>
        <span style={{ fontSize: "18px" }}>{status === "granted" ? "🔔" : "🔕"}</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
            {status === "granted" ? "Notificações ativas" : "Notificações desativadas"}
          </p>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "2px 0 0" }}>
            {status === "granted"
              ? "Você receberá lembretes nos horários configurados"
              : "Ative para receber lembretes das missões"}
          </p>
        </div>
        {status === "denied" ? (
          <span style={{ fontSize: "11px", color: "#ef4444" }}>Bloqueado no browser</span>
        ) : status === "granted" ? (
          <button
            onClick={disable}
            style={{
              padding: "6px 12px", borderRadius: "8px", fontSize: "12px",
              background: "var(--bg-surface)", border: "1px solid var(--border)",
              color: "var(--text-muted)", cursor: "pointer", fontWeight: 600,
            }}
          >
            Desativar
          </button>
        ) : (
          <button
            onClick={enable}
            disabled={status === "loading"}
            style={{
              padding: "6px 12px", borderRadius: "8px", fontSize: "12px",
              background: "var(--accent-violet)", border: "none",
              color: "white", cursor: "pointer", fontWeight: 700,
              opacity: status === "loading" ? 0.7 : 1,
            }}
          >
            {status === "loading" ? "..." : "Ativar"}
          </button>
        )}
      </div>

      {error && (
        <div style={{
          padding: "8px 12px", borderRadius: "8px",
          background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.3)",
          fontSize: "11px", color: "#ef4444", lineHeight: 1.4,
        }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
