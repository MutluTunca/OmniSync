"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, AlertCircle, Loader2, Zap, Server, Settings } from "lucide-react";

type CompanyDetails = {
  id: string;
  name: string;
  plan: string;
  status: string;
  max_accounts: number;
  used_accounts: number;
  daily_reply_limit: number;
  used_replies_today: number;
  ai_model_tier: string;
};

const API_BASE = "";
const TOKEN_STORAGE_KEY = "omnisync_access_token";

export default function SettingsPage() {
  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCompany = async () => {
      const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!token) {
        setError("Oturum bulunamadı. Lütfen giriş yapın.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/v1/company/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setCompany(await res.json());
        } else {
          setError("Şirket/Paket bilgileri alınamadı.");
        }
      } catch (err) {
        console.error(err);
        setError("Bağlantı hatası.");
      } finally {
        setLoading(false);
      }
    };
    void fetchCompany();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-wrapper">
        <div className="dashboard-background">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
        </div>
        <div className="container" style={{ paddingTop: '80px', textAlign: 'center' }}>
          <Loader2 className="animate-spin" size={40} style={{ margin: '0 auto', color: 'var(--primary-color)' }} />
          <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Paket bilgileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper flex">
      {/* Background blobs for aesthetics */}
      <div className="dashboard-background">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <main className="content-area">
        <header className="topbar">
          <div className="flex items-center" style={{ gap: '1rem' }}>
            <Link href="/" className="btn-secondary" style={{ padding: '0.5rem' }}>
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1>Ayarlar & Paketim</h1>
              <p>Şirket planınız ve kotalarınız</p>
            </div>
          </div>
        </header>

        <div className="page-content" style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
          {error && (
            <div className="filter-warning" style={{ marginBottom: "1.5rem" }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {company && (
            <div className="settings-grid">
              {/* Profile Card */}
              <div className="glass-card settings-card">
                <div className="card-header">
                  <Server className="icon-title" size={24} />
                  <h2>Şirket Profili</h2>
                </div>
                <div className="card-body">
                  <div className="info-row">
                    <span className="info-label">Şirket Adı</span>
                    <span className="info-val" style={{ fontWeight: 600 }}>{company.name}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Mevcut Plan</span>
                    <span className="info-val plan-badge">{company.plan.toUpperCase()}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Durum</span>
                    <span className="info-val">
                      {company.status === "active" ? (
                        <span style={{ color: "var(--success-text)", display: "flex", alignItems: "center", gap: "5px" }}>
                          <CheckCircle size={16} /> Aktif
                        </span>
                      ) : (
                        <span style={{ color: "var(--danger-text)" }}>{company.status}</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quotas Card */}
              <div className="glass-card settings-card">
                <div className="card-header">
                  <Zap className="icon-title" size={24} />
                  <h2>Kota Kullanımı</h2>
                </div>
                <div className="card-body">
                  
                  {/* Account Quota */}
                  <div className="quota-block">
                    <div className="quota-header">
                      <span className="quota-title">Instagram Hesap Limiti</span>
                      <span className="quota-numbers">{company.used_accounts} / {company.max_accounts}</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div 
                        className="progress-bar-fill" 
                        style={{ 
                          width: `${Math.min(100, (company.used_accounts / Math.max(1, company.max_accounts)) * 100)}%`,
                          background: company.used_accounts >= company.max_accounts ? "var(--danger-bg)" : "var(--primary-color)"
                        }} 
                      />
                    </div>
                    <p className="quota-desc">Bağlayabileceğiniz maksimum Instagram hesabı sayısı.</p>
                  </div>

                  {/* Reply Quota */}
                  <div className="quota-block">
                    <div className="quota-header">
                      <span className="quota-title">Günlük AI Yanıt Limiti</span>
                      <span className="quota-numbers">{company.used_replies_today} / {company.daily_reply_limit}</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div 
                        className="progress-bar-fill" 
                        style={{ 
                          width: `${Math.min(100, (company.used_replies_today / Math.max(1, company.daily_reply_limit)) * 100)}%`,
                          background: company.used_replies_today >= company.daily_reply_limit ? "var(--danger-bg)" : "var(--success-text)"
                        }} 
                      />
                    </div>
                    <p className="quota-desc">Bugün oluşturulan otomatik yanıt sayısı (Gece 00:00'da sıfırlanır).</p>
                  </div>
                </div>
              </div>

              {/* Engine Card */}
              <div className="glass-card settings-card">
                <div className="card-header">
                  <Settings className="icon-title" size={24} />
                  <h2>Yapay Zeka Motoru</h2>
                </div>
                <div className="card-body">
                  <div className="info-row">
                    <span className="info-label">Aktif Model</span>
                    <span className="info-val">{company.ai_model_tier}</span>
                  </div>
                  <p className="info-desc" style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
                    Bu model, planınıza uygun olarak tahsis edilmiştir. Pro veya Enterprise paketlerde daha yetenekli motorlar kullanılır.
                  </p>
                </div>
              </div>

              {/* Upgrade Banner */}
              <div className="upgrade-banner">
                <div className="upgrade-content">
                  <h3>Limitlere mi takıldınız?</h3>
                  <p>Pro planına geçerek limitsiz hesap ve günde 1000 yanıt kapasitesine ulaşın.</p>
                </div>
                <button className="btn-primary" onClick={() => alert("Faturalandırma modülü yakında eklenecektir!")}>
                  Hemen Yükselt
                </button>
              </div>

            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        .content-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          position: relative;
          z-index: 10;
        }
        .page-content {
          padding: 2rem;
        }
        .settings-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          align-items: start;
        }
        .settings-card {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .card-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 1rem;
        }
        .card-header h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: white;
          margin: 0;
        }
        .icon-title {
          color: var(--primary-color);
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 0;
          border-bottom: 1px dashed rgba(255, 255, 255, 0.05);
        }
        .info-row:last-child {
          border-bottom: none;
        }
        .info-label {
          color: var(--text-secondary);
          font-size: 0.95rem;
        }
        .info-val {
          color: white;
        }
        .plan-badge {
          background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 10px rgba(79, 70, 229, 0.3);
        }
        .quota-block {
          margin-bottom: 2rem;
        }
        .quota-block:last-child {
          margin-bottom: 0;
        }
        .quota-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }
        .quota-title {
          font-weight: 500;
          color: white;
        }
        .quota-numbers {
          font-family: monospace;
          color: var(--text-secondary);
        }
        .progress-bar-bg {
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }
        .progress-bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.5s ease;
        }
        .quota-desc {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .upgrade-banner {
          grid-column: 1 / -1;
          background: linear-gradient(to right, rgba(79, 70, 229, 0.1), rgba(168, 85, 247, 0.1));
          border: 1px solid rgba(79, 70, 229, 0.3);
          border-radius: 16px;
          padding: 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }
        .upgrade-content h3 {
          color: white;
          font-size: 1.25rem;
          margin-bottom: 0.5rem;
        }
        .upgrade-content p {
          color: var(--text-secondary);
        }
        
        @media (max-width: 768px) {
          .settings-grid {
            grid-template-columns: 1fr;
          }
          .upgrade-banner {
            flex-direction: column;
            text-align: center;
            gap: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
