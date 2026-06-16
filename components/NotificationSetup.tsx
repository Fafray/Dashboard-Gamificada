"use client";

import { useState, useEffect } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr.buffer;
}

export function NotificationSetup() {
  const [status, setStatus] = useState<"unknown" | "unsupported" | "denied" | "granted" | "loading">("unknown");

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }
    setStatus(Notification.permission === "granted" ? "granted" : Notification.permission === "denied" ? "denied" : "unknown");
  }, []);

  async function enable() {
    if (!VAPID_PUBLIC_KEY) return;
    setStatus("loading");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setStatus("denied"); return; }

      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      setStatus("granted");
    } catch {
      setStatus("unknown");
    }
  }

  async function disable() {
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

  return (
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
  );
}
