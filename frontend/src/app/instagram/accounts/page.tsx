"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, ArrowRight } from "lucide-react";

const API_BASE = "";

const TOKEN_STORAGE_KEY = "omnisync_access_token";

type AccountItem = {
  id: string;
  ig_user_id: string;
  username: string;
  page_id: string;
  is_active: boolean;
  token_expires_at: string | null;
  token_health: string;
  requires_reconnect: boolean;
};

type ApiRes = {
  items: AccountItem[];
};

export default function AccountsPage() {
  const [items, setItems] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [showManualForm, setShowManualForm] = useState(false);
  const [manualPayload, setManualPayload] = useState({
    ig_user_id: "",
    username: "",
    page_id: "",
    page_access_token: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    refreshAccounts();
  }, []);

  function refreshAccounts() {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      setError("Lutfen once giris yapin (/users veya /login).");
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`${API_BASE}/api/v1/instagram/accounts`, { 
      cache: "no-store", 
      headers: { Authorization: `Bearer ${token}` } 
    })
      .then((res) => {
        if (!res.ok) throw new Error("Giris yetkiniz yok veya oturumunuz suresi dolmus.");
        return res.json();
      })
      .then((data: ApiRes) => setItems(data.items ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    
    try {
      const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
      const res = await fetch(`${API_BASE}/api/v1/instagram/manual-connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(manualPayload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Baglanti basarisiz.");
      }

      setShowManualForm(false);
      setManualPayload({ ig_user_id: "", username: "", page_id: "", page_access_token: "" });
      refreshAccounts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-background">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <main className="container dashboard-content">
        <header className="topbar">
          <div>
            <h1>Instagram Hesap Yönetimi</h1>
            <p>Bağlı hesapları ve token durumlarını buradan izleyin.</p>
          </div>
          <div className="topbar-actions" style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn-secondary" 
              onClick={() => setShowManualForm(!showManualForm)}
              style={{ padding: '10px 16px', fontSize: '0.9rem' }}
            >
              {showManualForm ? "İptal" : "Gelişmiş: Manuel Bağla"}
            </button>
            <Link className="btn-primary" href="/instagram/connect" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              + Yeni Hesap Bağla
            </Link>
          </div>
        </header>

        {showManualForm && (
          <section className="glass-card" style={{ marginBottom: '30px', padding: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Manuel Instagram Bağlantısı</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Meta App Geliştirici modundayken veya OAuth sorunlarında bu formu kullanabilirsiniz.
            </p>
            <form onSubmit={handleManualSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="input-group">
                <label>Instagram User ID</label>
                <input 
                  type="text" 
                  placeholder="örn: 178414..." 
                  required
                  value={manualPayload.ig_user_id}
                  onChange={e => setManualPayload({...manualPayload, ig_user_id: e.target.value})}
                />
              </div>
              <div className="input-group">
                <label>Kullanıcı Adı</label>
                <input 
                  type="text" 
                  placeholder="örn: omnisync_emlak" 
                  required
                  value={manualPayload.username}
                  onChange={e => setManualPayload({...manualPayload, username: e.target.value})}
                />
              </div>
              <div className="input-group">
                <label>Facebook Page ID</label>
                <input 
                  type="text" 
                  placeholder="örn: 105..." 
                  required
                  value={manualPayload.page_id}
                  onChange={e => setManualPayload({...manualPayload, page_id: e.target.value})}
                />
              </div>
              <div className="input-group">
                <label>Page Access Token</label>
                <input 
                  type="password" 
                  placeholder="EAAB..." 
                  required
                  value={manualPayload.page_access_token}
                  onChange={e => setManualPayload({...manualPayload, page_access_token: e.target.value})}
                />
              </div>
              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button className="btn-primary" type="submit" disabled={submitting}>
                  {submitting ? "Bağlanıyor..." : "Hesabı Tanımla"}
                </button>
              </div>
            </form>
          </section>
        )}

        {error ? (
          <div className="notice" style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', marginBottom: '20px' }}>{error}</div>
        ) : null}

        {loading ? (
          <div className="glass-loader">
            <Loader2 className="animate-spin" size={32} />
            <p>Hesaplar yükleniyor...</p>
          </div>
        ) : (
          <>
            {items.length === 0 ? (
              <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
                <p>Henüz bağlı bir Instagram hesabı bulunamadı.</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '16px' }}>
                   <Link className="btn-primary" href="/instagram/connect" style={{ textDecoration: 'none' }}>
                    Hemen Bağla
                  </Link>
                </div>
              </div>
            ) : (
              <section className="table-wrap glass-card">
                <table className="comments-table">
                  <thead>
                    <tr>
                      <th>Kullanıcı Adı</th>
                      <th>Page ID</th>
                      <th>Durum</th>
                      <th>Token Sağlık</th>
                      <th>Geçerlilik</th>
                      <th>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((x) => (
                      <tr key={x.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>@{x.username}</td>
                        <td className="subtle">{x.page_id}</td>
                        <td>
                          <span className={`badge ${x.is_active ? 'badge-sent' : 'badge-failed'}`}>
                            {x.is_active ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                        <td>
                          {x.token_health === 'active' && (
                            <span className="badge badge-sent">Sağlıklı</span>
                          )}
                          {x.token_health === 'expiring_soon' && (
                            <span className="badge badge-failed" style={{ backgroundColor: '#fcf9c3', color: '#854d0e' }}>Yenileme Yakın</span>
                          )}
                          {(x.token_health === 'expired' || x.token_health === 'missing') && (
                            <span className="badge badge-failed">Bağlantı Koptu</span>
                          )}
                          {x.token_health === 'unknown' && (
                            <span className="badge badge-failed" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>Bilinmiyor</span>
                          )}
                        </td>
                        <td className="subtle">{x.token_expires_at ? new Date(x.token_expires_at).toLocaleDateString('tr-TR') : '-'}</td>
                        <td>
                          <Link className="link" href="/instagram/connect" style={{ fontSize: '0.85rem' }}>
                            Yeniden Bağlan
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </>
        )}

        <Link className="link" href="/" style={{ marginTop: '40px', display: 'inline-flex', alignItems: 'center' }}>
          <ArrowRight size={18} style={{ transform: 'rotate(180deg)', marginRight: '8px' }} />
          Ana sayfaya dön
        </Link>
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
          opacity: 0.15;
        }

        .blob-1 {
          width: 450px;
          height: 450px;
          background: #6366f1;
          top: -100px;
          right: -100px;
        }

        .blob-2 {
          width: 350px;
          height: 350px;
          background: #818cf8;
          bottom: -100px;
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
          margin-bottom: 40px;
          padding-bottom: 24px;
          border-bottom: 1px solid rgba(0,0,0,0.05);
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.7) !important;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.4) !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05) !important;
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
            gap: 12px;
          }
          .topbar h1 {
            font-size: 1.4rem;
          }
          .topbar-actions {
            width: 100%;
          }
          .topbar-actions a {
            display: block;
            text-align: center;
          }
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .input-group label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .input-group input {
          background: rgba(255, 255, 255, 0.5);
          border: 1px solid rgba(0, 0, 0, 0.1);
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 0.9rem;
          color: var(--text-main);
          transition: border-color 0.2s;
        }

        .input-group input:focus {
          outline: none;
          border-color: var(--primary);
        }
      `}</style>
    </div>
  );
}
