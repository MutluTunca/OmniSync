"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type TokenHealthSummary = {
  total: number;
  active: number;
  expiring_soon: number;
  expired: number;
  unknown: number;
  missing: number;
};

type TokenHealthItem = {
  id: string;
  username: string;
  is_active: boolean;
  token_health: string;
  token_expires_at: string | null;
};

type TokenHealthResponse = {
  summary: TokenHealthSummary;
  items: TokenHealthItem[];
};

type CeleryHealth = {
  status: string;
  timestamp: string;
  workers_total: number;
  queue_backlog: { webhooks: number; ai: number; outbound: number };
};

type WebhookHealth = {
  status: string;
  timestamp: string;
  counts: { total: number; processed: number; pending: number; received_last_1h: number };
  oldest_pending_age_sec: number | null;
};

const API_BASE = "";
const TOKEN_STORAGE_KEY = "omnisync_access_token";

function tokenLabel(value: string): string {
  const map: Record<string, string> = {
    active: "Aktif",
    expiring_soon: "Yakin bitiyor",
    expired: "Suresi dolmus",
    unknown: "Bilinmiyor",
    missing: "Token yok"
  };
  return map[value] ?? value;
}

export default function HomePage() {
  const [health, setHealth] = useState("loading...");
  const [tokenHealth, setTokenHealth] = useState<TokenHealthResponse | null>(null);
  const [celeryMon, setCeleryMon] = useState<CeleryHealth | null>(null);
  const [webhookMon, setWebhookMon] = useState<WebhookHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const loadData = async () => {
      const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      try {
        const [hRes, tRes, cRes, wRes] = await Promise.all([
          fetch(`${API_BASE}/api/v1/healthz`, { cache: "no-store", headers }),
          fetch(`${API_BASE}/api/v1/instagram/token-health`, { cache: "no-store", headers }),
          fetch(`${API_BASE}/api/v1/monitoring/celery`, { cache: "no-store", headers }),
          fetch(`${API_BASE}/api/v1/monitoring/webhooks`, { cache: "no-store", headers })
        ]);

        if (hRes.ok) {
          const hData = await hRes.json();
          setHealth(hData.status ?? "online");
        } else {
          setHealth("offline");
        }

        if (tRes.ok) setTokenHealth(await tRes.json());
        if (cRes.ok) setCeleryMon(await cRes.json());
        if (wRes.ok) setWebhookMon(await wRes.json());
      } catch (err) {
        console.error("Dashboard data load failed", err);
        setHealth("offline");
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const reconnectItems = (tokenHealth?.items ?? []).filter(
    (x) => x.is_active && x.token_health !== "active"
  );
  const requiresReconnect = reconnectItems.length > 0;

  return (
    <main className="container">
      <div className="topbar">
        <div>
          <h1>OmniSync Emlak Dashboard</h1>
          <p>Yapay Zeka Destekli Gayrimenkul Yönetim Paneli</p>
        </div>
        <Link href="/login" className="btn-secondary" style={{ textDecoration: 'none' }}>
          Farklı Hesapla Giriş Yap
        </Link>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px" }}>
          <p>Dashboard verileri yükleniyor...</p>
        </div>
      ) : (
        <section className="menu-grid">
          {/* Yorum Yonetimi */}
          <Link href="/comments" className="menu-card">
            <div className="menu-card-image" style={{ backgroundImage: "url('/images/dashboard/comments.png')" }}></div>
            <div className="menu-card-body">
              <h3>Yorum Yönetimi</h3>
              <p>Instagram yorumlarını tek panelde izleyin ve yapay zeka ile otomatik yanıtlayın.</p>
            </div>
          </Link>

          {/* Hesap Yönetimi */}
          <Link href="/instagram/accounts" className="menu-card">
            {tokenHealth && (
              <div className="health-stat-minimal" style={{ color: requiresReconnect ? "var(--danger-text)" : "var(--success-text)" }}>
                {tokenHealth.summary.active} Hesap Aktif
              </div>
            )}
            <div className="menu-card-image" style={{ backgroundImage: "url('/images/dashboard/accounts.png')" }}></div>
            <div className="menu-card-body">
              <h3>Hesap Bağlantıları</h3>
              <p>Bağlı Instagram hesaplarını yönetin ve yeni bağlantılar kurun.</p>
            </div>
          </Link>

          {/* Analitik */}
          <Link href="/analytics" className="menu-card">
            <div className="menu-card-image" style={{ backgroundImage: "url('/images/dashboard/analytics.png')" }}></div>
            <div className="menu-card-body">
              <h3>Analitik & Raporlar</h3>
              <p>Performans metriklerini ve müşteri duygu analizlerini takip edin.</p>
            </div>
          </Link>

          {/* Kullanıcılar */}
          <Link href="/users" className="menu-card">
            <div className="menu-card-image" style={{ backgroundImage: "url('/images/dashboard/users.png')" }}></div>
            <div className="menu-card-body">
              <h3>Kullanıcı Yönetimi</h3>
              <p>Ekip üyelerini yönetin, yeni kullanıcılar ekleyin ve yetkilendirin.</p>
            </div>
          </Link>

          {/* Sistem İzleme / Loglar */}
          <Link href="/logs" className="menu-card">
            {celeryMon && (
              <div className="health-stat-minimal">
                Kuyruk: {celeryMon.queue_backlog.webhooks + celeryMon.queue_backlog.ai + celeryMon.queue_backlog.outbound}
              </div>
            )}
            <div className="menu-card-image" style={{ backgroundImage: "url('/images/dashboard/monitoring.png')" }}></div>
            <div className="menu-card-body">
              <h3>Sistem Kayıtları</h3>
              <p>Yorum gönderimleri, operasyonel hatalar ve sistem loglarını inceleyin.</p>
            </div>
          </Link>

          {/* AI Ayarları / Status */}
          <div className="menu-card" style={{ cursor: 'default' }}>
             <div className="health-stat-minimal" style={{ color: health === "online" ? "var(--success-text)" : "var(--danger-text)" }}>
               SİSTEM: {health.toUpperCase()}
             </div>
            <div className="menu-card-image" style={{ backgroundImage: "url('/images/dashboard/ai.png')" }}></div>
            <div className="menu-card-body">
              <h3>Yapay Zeka Motoru</h3>
              <p>Bağlı model: {tokenHealth ? 'GPT-4o Mini' : 'Bekleniyor...'}</p>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
