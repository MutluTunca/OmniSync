"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

const API_BASE = "";


export default function InstagramConnectPage() {
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const status = params.get("status");
  const connected = params.get("connected");

  async function startConnect() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/api/v1/instagram/oauth/start`, { cache: "no-store" });
      if (!res.ok) throw new Error("oauth_start_failed");
      const data = (await res.json()) as { auth_url?: string };
      if (!data.auth_url) throw new Error("missing_auth_url");
      window.location.href = data.auth_url;
    } catch {
      setMessage("Baglanti baslatilamadi. Backend URL ve Meta ayarlarini kontrol edin.");
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <h1>Instagram Baglanti Yenileme</h1>
      <p>Token sagligi zayif hesaplar icin yeniden baglanti baslatabilirsiniz.</p>

      {status === "ok" ? (
        <p className="notice">Baglanti tamamlandi. Baglanan hesap sayisi: {connected ?? "0"}.</p>
      ) : null}

      <div className="actions">
        <button className="btn-primary" onClick={startConnect} disabled={loading}>
          {loading ? "Yonlendiriliyor..." : "Meta ile baglan"}
        </button>
        <Link className="btn-secondary" href="/">
          Panele don
        </Link>
      </div>

      {message ? <p className="notice">{message}</p> : null}
    </main>
  );
}
