"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { 
  MessageSquare, 
  Instagram, 
  BarChart3, 
  Users, 
  Activity, 
  Cpu, 
  Loader2, 
  ArrowRight,
  Settings
} from "lucide-react";

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
  const [aiInfo, setAiInfo] = useState<{ provider: string; model: string } | null>(null);
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
          if (hData.ai_provider) {
            setAiInfo({ provider: hData.ai_provider, model: hData.ai_model });
          }
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
    <div className="dashboard-wrapper">
      <div className="dashboard-background">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <main className="container dashboard-content">
        <header className="topbar">
          <div>
            <h1>OmniSync Dashboard</h1>
            <p>Gayrimenkul portföyünüz ve dijital etkileşimleriniz tek noktada.</p>
          </div>
          <div className="topbar-actions">
            <Link href="/login" className="btn-secondary">
              Giriş Yap / Değiştir
            </Link>
          </div>
        </header>

        {loading ? (
          <div className="glass-loader">
            <Loader2 className="animate-spin" size={32} />
            <p>Veriler senkronize ediliyor...</p>
          </div>
        ) : (
          <section className="menu-grid">
            {/* Yorum Yonetimi */}
            <Link href="/comments" className="menu-card glass-card">
              <div className="menu-card-image" style={{ backgroundImage: "url('/images/dashboard/comments.png')" }}>
                <MessageSquare className="card-icon" size={40} />
              </div>
              <div className="menu-card-body">
                <h3>Yorum Merkezi</h3>
                <p>AI destekli otomatik yanıtlar ve etkileşim takibi.</p>
              </div>
            </Link>

            {/* Hesap Yönetimi */}
            <Link href="/instagram/accounts" className="menu-card glass-card">
              {tokenHealth && (
                <div className="health-stat-pill" style={{ 
                  background: requiresReconnect ? "var(--danger-bg)" : "var(--success-bg)",
                  color: requiresReconnect ? "var(--danger-text)" : "var(--success-text)"
                }}>
                  {tokenHealth.summary.active} / {tokenHealth.summary.total} Hesap
                </div>
              )}
              <div className="menu-card-image" style={{ backgroundImage: "url('/images/dashboard/accounts.png')" }}>
                <Instagram className="card-icon" size={40} />
              </div>
              <div className="menu-card-body">
                <h3>Instagram Bağlantıları</h3>
                <p>Sosyal medya hesaplarınızı entegre edin.</p>
              </div>
            </Link>

            {/* Analitik */}
            <Link href="/analytics" className="menu-card glass-card">
              <div className="menu-card-image" style={{ backgroundImage: "url('/images/dashboard/analytics.png')" }}>
                <BarChart3 className="card-icon" size={40} />
              </div>
              <div className="menu-card-body">
                <h3>Analiz & Rapor</h3>
                <p>Müşteri eğilimleri ve performans verileri.</p>
              </div>
            </Link>

            {/* Kullanıcılar */}
            <Link href="/users" className="menu-card glass-card">
              <div className="menu-card-image" style={{ backgroundImage: "url('/images/dashboard/users.png')" }}>
                <Users className="card-icon" size={40} />
              </div>
              <div className="menu-card-body">
                <h3>Ekip Yönetimi</h3>
                <p>Kullanıcı yetkileri ve takım organizasyonu.</p>
              </div>
            </Link>

            {/* Sistem İzleme / Loglar */}
            <Link href="/logs" className="menu-card glass-card">
              {celeryMon && (
                <div className="health-stat-pill">
                  Kuyruk: {celeryMon.queue_backlog.webhooks + celeryMon.queue_backlog.ai + celeryMon.queue_backlog.outbound}
                </div>
              )}
              <div className="menu-card-image" style={{ backgroundImage: "url('/images/dashboard/monitoring.png')" }}>
                <Activity className="card-icon" size={40} />
              </div>
              <div className="menu-card-body">
                <h3>Sistem İzleme</h3>
                <p>Webhook ve arka plan görev takibi.</p>
              </div>
            </Link>

            {/* AI Ayarları / Status */}
            <div className="menu-card glass-card status-card">
               <div className="health-stat-pill" style={{ 
                 background: health === "online" ? "var(--success-bg)" : "var(--danger-bg)",
                 color: health === "online" ? "var(--success-text)" : "var(--danger-text)"
               }}>
                 {health.toUpperCase()}
               </div>
              <div className="menu-card-image" style={{ backgroundImage: "url('/images/dashboard/ai.png')" }}>
                <Cpu className="card-icon" size={40} />
              </div>
              <div className="menu-card-body">
                <h3>Yapay Zeka</h3>
                <p>{aiInfo ? `${aiInfo.provider.toUpperCase()} (${aiInfo.model})` : 'Modeller yükleniyor...'}</p>
              </div>
            </div>

            {/* Ayarlar ve Paketim */}
            <Link href="/settings" className="menu-card glass-card">
              <div className="menu-card-image" style={{ background: "linear-gradient(135deg, #1f2937, #111827)" }}>
                <Settings className="card-icon" size={40} />
              </div>
              <div className="menu-card-body">
                <h3>Ayarlar & Paketim</h3>
                <p>Şirket planınız ve uygulamadaki kotalarınızı görüntüleyin.</p>
              </div>
            </Link>
          </section>
        )}
      </main>

      <style jsx>{`
        .dashboard-wrapper {
          min-height: 100vh;
          background: #f8fafc;
          position: relative;
          overflow: hidden;
        }

        .dashboard-background {
          position: absolute;
          width: 100%;
          height: 100%;
          z-index: 0;
        }

        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.2;
        }

        .blob-1 {
          width: 600px;
          height: 600px;
          background: #6366f1;
          top: -200px;
          right: -100px;
        }

        .blob-2 {
          width: 500px;
          height: 500px;
          background: #818cf8;
          bottom: -150px;
          left: -100px;
        }

        .dashboard-content {
          position: relative;
          z-index: 10;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 48px;
          padding-bottom: 24px;
          border-bottom: 1px solid rgba(0,0,0,0.05);
        }

        .topbar h1 {
          font-size: 2rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .topbar p {
          color: #64748b;
          margin-top: 4px;
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.7) !important;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.4) !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05) !important;
        }

        .health-stat-pill {
          position: absolute;
          top: 16px;
          right: 16px;
          padding: 6px 12px;
          border-radius: 99px;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .card-icon {
          color: var(--primary);
          opacity: 0.8;
        }

        .glass-loader {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 100px;
          gap: 16px;
          color: var(--text-secondary);
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .topbar {
            flex-direction: column;
            align-items: flex-start;
            gap: 20px;
          }
        }
      `}</style>
    </div>
  );
}
