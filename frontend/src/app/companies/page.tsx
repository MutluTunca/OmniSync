"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const API_BASE = "";
const TOKEN_STORAGE_KEY = "omnisync_access_token";

type CompanyItem = {
  id: string;
  name: string;
  logo_url: string | null;
  plan: string;
  status: string;
};

export default function CompaniesPage() {
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const saved = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (saved) {
      setToken(saved);
      void loadCompanies(saved);
    } else {
      setError("Önce giriş yapmalısınız.");
    }
  }, []);

  async function loadCompanies(accessToken: string) {
    setLoading(true);
    setError("");
    try {
      const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` };
      const res = await fetch(`${API_BASE}/api/v1/company/list`, {
        cache: "no-store",
        headers,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Şirketler yüklenemedi");
      }
      const data = await res.json() as CompanyItem[];
      setCompanies(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Şirketler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCompany(companyId: string) {
    if (!token) return;
    if (!window.confirm("Bu şirketi kalıcı olarak silmek istediğinize emin misiniz? DİKKAT: Şirkete ait tüm kullanıcılar, yorumlar ve hesaplar kalıcı olarak silinecektir. Bu işlem GERİ ALINAMAZ.")) return;
    
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/api/v1/company/${companyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Silme işlemi başarısız");
      }
      setMessage("Şirket başarıyla silindi.");
      await loadCompanies(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silme işlemi başarısız");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="wrapper container">
      <div style={{ marginBottom: "20px", display: "inline-block" }}>
        <Link href="/" className="btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <ArrowLeft size={16} /> Dashboard'a Dön
        </Link>
      </div>
      
      <h1>Şirket Yönetimi</h1>
      <p>Sistemdeki kurulan tüm şirketleri buradan görüntüleyip yönetebilirsiniz. Test veya gereksiz şirketleri Sistem Sahibi (Owner) olarak kalıcı olarak silebilirsiniz.</p>

      {error ? <p className="notice" style={{ background: "#fee2e2", color: "#b91c1c", border: "1px solid #f87171" }}>{error}</p> : null}
      {message ? <p className="notice" style={{ background: "#dcfce3", color: "#15803d", border: "1px solid #86efac" }}>{message}</p> : null}

      {!token ? (
        <p>Lütfen yetkili hesap ile giriş yapın.</p>
      ) : (
        <section className="table-wrap" style={{ marginTop: "30px" }}>
          <h2>Kayıtlı Şirketler</h2>
          {loading ? (
            <p>Yükleniyor...</p>
          ) : companies.length === 0 ? (
            <p>Kayıtlı şirket bulunamadı.</p>
          ) : (
            <table className="comments-table table-modern" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "12px", borderBottom: "1px solid rgba(0,0,0,0.1)" }}>Şirket Adı</th>
                  <th style={{ textAlign: "left", padding: "12px", borderBottom: "1px solid rgba(0,0,0,0.1)" }}>Plan</th>
                  <th style={{ textAlign: "left", padding: "12px", borderBottom: "1px solid rgba(0,0,0,0.1)" }}>Durum</th>
                  <th style={{ textAlign: "left", padding: "12px", borderBottom: "1px solid rgba(0,0,0,0.1)" }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                    <td style={{ padding: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        {company.logo_url ? (
                          <img src={company.logo_url} alt="logo" style={{ width: "32px", height: "32px", borderRadius: "6px", objectFit: "cover", backgroundColor: "#fff" }} />
                        ) : (
                          <div style={{ width: "32px", height: "32px", borderRadius: "6px", background: "#cbd5e1" }}></div>
                        )}
                        <span style={{ fontWeight: "600" }}>{company.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px" }}>{company.plan.toUpperCase()}</td>
                    <td style={{ padding: "12px" }}>
                      <span className="badge-owner" style={{ background: company.status === "active" ? "#22c55e" : "#64748b" }}>
                        {company.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <button
                        className="btn-primary"
                        onClick={() => handleDeleteCompany(company.id)}
                        disabled={loading}
                        style={{ padding: "6px 12px", fontSize: "0.85rem", backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
                      >
                        Kalıcı Sil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      <style jsx>{`
        .wrapper {
          min-height: 100vh;
        }
        .table-modern th {
          background-color: transparent;
          font-weight: 600;
          color: #475569;
        }
        .table-modern tr:hover {
          background-color: rgba(0,0,0,0.02);
        }
        .badge-owner {
          color: #fff;
          font-size: 0.65rem;
          padding: 4px 8px;
          border-radius: 99px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
        }
      `}</style>
    </main>
  );
}
