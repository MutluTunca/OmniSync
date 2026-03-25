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
  Settings,
  TrendingUp,
  ChevronDown,
  Building2,
  Lock
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from "recharts";

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
  const [trends, setTrends] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [allCompanies, setAllCompanies] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const loadData = async () => {
      const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
      const selectedCompanyId = window.localStorage.getItem("omnisync_selected_company_id");
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      if (selectedCompanyId) {
        headers["X-Company-ID"] = selectedCompanyId;
      }

      try {
        const [hRes, tRes, cRes, wRes, analyticsRes, companyRes] = await Promise.all([
          fetch(`${API_BASE}/api/v1/healthz`, { cache: "no-store", headers }),
          fetch(`${API_BASE}/api/v1/instagram/token-health`, { cache: "no-store", headers }),
          fetch(`${API_BASE}/api/v1/monitoring/celery`, { cache: "no-store", headers }),
          fetch(`${API_BASE}/api/v1/monitoring/webhooks`, { cache: "no-store", headers }),
          fetch(`${API_BASE}/api/v1/analytics/trends`, { cache: "no-store", headers }),
          fetch(`${API_BASE}/api/v1/company/me`, { cache: "no-store", headers })
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
        if (analyticsRes.ok) setTrends(await analyticsRes.json());
        if (companyRes.ok) {
          const cData = await companyRes.json();
          setCompany(cData);
        }

        // If user is owner, list all companies
        const userStr = token ? JSON.parse(atob(token.split('.')[1])) : null;
        if (userStr) {
          setUserRole(userStr.role);
          if (userStr.role === 'owner') {
             const listRes = await fetch(`${API_BASE}/api/v1/company/list`, { headers });
             if (listRes.ok) setAllCompanies(await listRes.json());
          }
        }
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
          <div className="flex items-center" style={{ gap: '1.5rem' }}>
            {company?.logo_url ? (
              <img src={company.logo_url} alt="Logo" style={{ height: '48px', borderRadius: '12px' }} />
            ) : (
              <div className="glass-card flex items-center justify-center" style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary)', color: 'white' }}>
                <Building2 size={24} />
              </div>
            )}
            <div>
              <div className="flex items-center" style={{ gap: '0.5rem' }}>
                <h1 style={{ margin: 0 }}>{company?.name || 'OmniSync'}</h1>
                {userRole === 'owner' && (
                  <span className="badge-owner"><Lock size={12} style={{marginRight:'4px'}}/> Sistem Sahibi</span>
                )}
              </div>
              <p style={{ margin: 0 }}>{company?.name ? `${company.name} Ofis Yönetimi` : 'Gayrimenkul Dijital Asistanı'}</p>
            </div>
          </div>
          
          <div className="topbar-actions flex items-center" style={{ gap: '1rem' }}>
             {userRole === 'owner' && (
               <div className="flex items-center" style={{ gap: '0.75rem' }}>
                 <div className="company-switcher-container">
                    <select 
                      className="glass-select"
                      value={company?.id || ""}
                      onChange={(e) => {
                        window.localStorage.setItem("omnisync_selected_company_id", e.target.value);
                        window.location.reload();
                      }}
                    >
                      <option value="" disabled>Şirket Seçin</option>
                      <option value="all">Tüm Şirketler (Global)</option>
                      {allCompanies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                 </div>
                 <Link href="/companies" className="btn-secondary" style={{ backgroundColor: '#f1f5f9', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Settings size={14} /> Yönet
                 </Link>
               </div>
             )}
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
          <>
            {/* Quick Glance Chart Section */}
            <div className="glass-card chart-hero" style={{ 
              marginBottom: '2rem', 
              padding: '1.25rem',
              borderRadius: '24px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <TrendingUp size={20} color="var(--primary)" />
                  <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: '#1e293b' }}>Hızlı Bakış: Etkileşim</h2>
                </div>
                <Link href="/analytics" style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '600' }}>
                  Tümü <ArrowRight size={14} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
                </Link>
              </div>
              
              <div style={{ height: '120px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends}>
                    <defs>
                      <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#6366f1" 
                      strokeWidth={2} 
                      fillOpacity={1} 
                      fill="url(#colorTrend)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              <div style={{ 
                marginTop: '1rem', 
                display: 'flex', 
                justifyContent: 'space-between', 
                color: '#64748b', 
                fontSize: '0.75rem',
                borderTop: '1px solid rgba(0,0,0,0.03)',
                paddingTop: '0.75rem'
              }}>
                <span>Son 7 Günlük Trend</span>
                <span style={{ fontWeight: 'bold', color: '#0f172a' }}>
                  {trends.reduce((acc, curr) => acc + (curr.count || 0), 0)} Toplam Yorum
                </span>
              </div>
            </div>

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
            <Link href="/ai-settings" className="menu-card glass-card">
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
                <p>Model seçimi ve özel kurallar belirlemek için tıklayın.</p>
              </div>
            </Link>

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
          </>
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
            gap: 16px;
            margin-bottom: 24px;
          }
          .topbar-actions {
            width: 100%;
            flex-wrap: wrap;
          }
          .topbar h1 {
            font-size: 1.4rem;
          }
          .chart-hero {
            padding: 1rem !important;
          }
          .company-switcher-container {
            width: 100%;
          }
          .glass-select {
            width: 100%;
          }
        }

        .badge-owner {
          background: #0f172a;
          color: #f8fafc;
          font-size: 0.65rem;
          padding: 2px 8px;
          border-radius: 99px;
          font-weight: 700;
          text-transform: uppercase;
          display: inline-flex;
          align-items: center;
        }

        .glass-select {
          background: rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(0,0,0,0.1);
          padding: 8px 16px;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 600;
          color: #1e293b;
          outline: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        .glass-select:hover {
          background: rgba(255, 255, 255, 0.8);
          border-color: var(--primary);
        }
      `}</style>
    </div>
  );
}
