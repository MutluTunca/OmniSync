"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { 
  Building2, 
  Settings as SettingsIcon, 
  MapPin, 
  Globe, 
  Shield, 
  Zap, 
  AlertCircle,
  Loader2,
  ArrowLeft,
  Search,
  CheckCircle2,
  Lock,
  Upload,
  Image as ImageIcon,
  Users
} from "lucide-react";

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
  logo_url: string | null;
};

const API_BASE = "";
const TOKEN_STORAGE_KEY = "omnisync_access_token";

export default function SettingsPage() {
  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logoInput, setLogoInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingOffice, setIsCreatingOffice] = useState(false);
  const [newOfficeName, setNewOfficeName] = useState("");
  const [allCompanies, setAllCompanies] = useState<{id: string, name: string}[]>([]);
  const [userRole, setUserRole] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    const selectedCompanyId = window.localStorage.getItem("omnisync_selected_company_id");
    
    if (!token) {
      setError("Oturum bulunamadı. Lütfen giriş yapın.");
      setLoading(false);
      return;
    }

    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (selectedCompanyId) {
      headers["X-Company-ID"] = selectedCompanyId;
    }

    try {
      const res = await fetch(`${API_BASE}/api/v1/company/me`, { headers });
      if (res.ok) {
        const data = await res.json();
        setCompany(data);
        setLogoInput(data.logo_url || "");
      } else {
        setError("Şirket bilgileri alınamadı.");
      }

      const decoded = JSON.parse(atob(token.split('.')[1]));
      setUserRole(decoded.role);

      if (decoded.role === 'owner') {
        const listRes = await fetch(`${API_BASE}/api/v1/company/list`, { headers });
        if (listRes.ok) {
          setAllCompanies(await listRes.json());
        }
      }
    } catch (err) {
      console.error(err);
      setError("Bağlantı hatası.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleUpdateLogo = async () => {
    setIsSaving(true);
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    const selectedCompanyId = window.localStorage.getItem("omnisync_selected_company_id");
    
    const headers: Record<string, string> = { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    };
    if (selectedCompanyId) {
      headers["X-Company-ID"] = selectedCompanyId;
    }

    try {
      const res = await fetch(`${API_BASE}/api/v1/company/update`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ logo_url: logoInput })
      });
      if (res.ok) {
        alert("Logo başarıyla güncellendi!");
        await loadData();
      } else {
        alert("Güncelleme sırasında hata oluştu.");
      }
    } catch (e) {
      alert("Bağlantı hatası.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    const selectedCompanyId = window.localStorage.getItem("omnisync_selected_company_id");
    
    const headers: Record<string, string> = { 
      'Authorization': `Bearer ${token}` 
    };
    if (selectedCompanyId) {
      headers["X-Company-ID"] = selectedCompanyId;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/api/v1/company/upload-logo`, {
        method: 'POST',
        headers,
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setLogoInput(data.logo_url);
        await loadData();
      } else {
        const data = await res.json();
        alert(data.detail || "Yükleme başarısız.");
      }
    } catch (e) {
      alert("Dosya yüklenemedi.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateOffice = async () => {
    if (!newOfficeName) return;
    setIsCreatingOffice(true);
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    try {
      const res = await fetch(`${API_BASE}/api/v1/company/create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ name: newOfficeName, plan: 'pro', max_accounts: 5 })
      });
      if (res.ok) {
        alert("Yeni Ofis Başarıyla Oluşturuldu!");
        setNewOfficeName("");
        window.location.reload();
      } else {
        alert("Ofis oluşturulamadı.");
      }
    } catch (e) {
      alert("Bağlantı hatası.");
    } finally {
      setIsCreatingOffice(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-wrapper">
        <div className="dashboard-background"><div className="blob blob-1"></div><div className="blob blob-2"></div></div>
        <div className="container" style={{ paddingTop: '80px', textAlign: 'center' }}>
          <Loader2 className="animate-spin" size={40} style={{ margin: '0 auto', color: 'var(--primary-color)' }} />
          <p style={{ marginTop: '1rem', color: 'gray' }}>Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper flex">
      <div className="dashboard-background"><div className="blob blob-1"></div><div className="blob blob-2"></div></div>

      <main className="content-area">
        <header className="topbar">
          <div className="flex items-center" style={{ gap: '1rem' }}>
            <Link href="/" className="btn-secondary" style={{ padding: '0.5rem' }}>
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="page-title">Ayarlar & Paketim</h1>
              <p className="page-subtitle">{company?.name} Ofis Yapılandırması</p>
            </div>
          </div>

          {userRole === 'owner' && allCompanies.length > 0 && (
            <div className="company-switcher-wrapper">
                <select 
                    className="glass-select"
                    value={window.localStorage.getItem("omnisync_selected_company_id") || ""}
                    onChange={(e) => {
                        if (e.target.value) {
                            window.localStorage.setItem("omnisync_selected_company_id", e.target.value);
                        } else {
                            window.localStorage.removeItem("omnisync_selected_company_id");
                        }
                        window.location.reload();
                    }}
                >
                    <option value="">Varsayılan Ofis</option>
                    {allCompanies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
                <div className="owner-badge">OWNER</div>
            </div>
          )}
        </header>

        <div className="page-content" style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
          {error && <div className="filter-warning" style={{ marginBottom: "1.5rem" }}><AlertCircle size={18} /><span>{error}</span></div>}

          {company && (
            <div className="settings-grid">
              {/* Profile & Logo Card */}
              <div className="glass-card settings-card">
                <div className="card-header">
                  <Building2 className="icon-title" size={24} />
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
                  
                  <div className="logo-management" style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
                    <label className="info-label" style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600, color: 'white' }}>Şirket Logosu (URL)</label>
                    <div className="flex" style={{ gap: '0.5rem' }}>
                      <input 
                        type="text" 
                        className="glass-input" 
                        value={logoInput} 
                        onChange={(e) => setLogoInput(e.target.value)}
                        placeholder="https://example.com/logo.png"
                        style={{ flex: 1 }}
                      />
                      <button 
                        className="btn-secondary" 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        title="PC'den Yükle"
                        style={{ padding: '0 1rem' }}
                      >
                        {isUploading ? <Loader2 className="animate-spin" size={18}/> : <Upload size={18} />}
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleUploadLogo} 
                        style={{ display: 'none' }} 
                        accept="image/*"
                      />
                      <button className="btn-primary" onClick={handleUpdateLogo} disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin" size={16}/> : 'Kaydet'}
                      </button>
                    </div>
                    {company.logo_url && (
                        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                            <p className="info-label">Önizleme:</p>
                            <img src={company.logo_url} alt="Logo" style={{ maxHeight: '60px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }} />
                        </div>
                    )}
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
                  <div className="quota-block">
                    <div className="quota-header">
                      <span className="quota-title">Hesap Limiti</span>
                      <span className="quota-numbers">{company.used_accounts} / {company.max_accounts}</span>
                    </div>
                    <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${(company.used_accounts / company.max_accounts) * 100}%`, background: 'var(--primary-color)' }} /></div>
                  </div>
                  <div className="quota-block">
                    <div className="quota-header">
                      <span className="quota-title">Günlük Yanıt Limiti</span>
                      <span className="quota-numbers">{company.used_replies_today} / {company.daily_reply_limit}</span>
                    </div>
                    <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${(company.used_replies_today / company.daily_reply_limit) * 100}%`, background: 'var(--success-text)' }} /></div>
                  </div>
                </div>
              </div>

              {/* System Admin Card (Owner Only) */}
              {userRole === 'owner' && (
                <div className="glass-card settings-card">
                  <div className="card-header">
                    <Lock className="icon-title" size={24} />
                    <h2>Sistem Yönetimi</h2>
                  </div>
                  <div className="card-body">
                    <p className="info-desc">Yeni bir emlak ofisi (şirket) tanımlayın.</p>
                    <div className="flex flex-col" style={{ gap: '0.5rem', marginTop: '1rem' }}>
                        <input 
                            type="text" 
                            className="glass-input" 
                            placeholder="Yeni Ofis / Şirket Adı"
                            value={newOfficeName}
                            onChange={(e) => setNewOfficeName(e.target.value)}
                        />
                        <button className="btn-primary w-full" onClick={handleCreateOffice} disabled={isCreatingOffice}>
                            {isCreatingOffice ? <Loader2 className="animate-spin" size={16}/> : 'Yeni Ofis Oluştur'}
                        </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Team / Users Card */}
              {(userRole === 'owner' || userRole === 'admin') && (
                <div className="glass-card settings-card" style={{ gridColumn: '1 / -1' }}>
                  <div className="card-header">
                    <Users className="icon-title" size={24} />
                    <h2>Ekip Yönetimi</h2>
                  </div>
                  <div className="card-body">
                    <p className="info-desc">
                        {userRole === 'owner' ? 'Sistem sahibi olarak bu ofisin yöneticilerini ve çalışanlarını tanımlayabilirsiniz.' : 'Admin olarak ofisinize yeni çalışanlar ekleyebilirsiniz.'}
                    </p>
                    <div className="flex" style={{ marginTop: '1rem' }}>
                         <Link href="/users" className="btn-secondary flex items-center" style={{ gap: '0.5rem' }}>
                            <Users size={16} /> Kullanıcıları Yönet
                         </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        .page-title { font-size: 1.5rem; font-weight: 700; color: #0f172a !important; margin: 0; }
        .page-subtitle { color: #64748b !important; font-size: 0.9rem; margin-top: 2px; }
        .header-section { margin-bottom: 2rem; }
        
        .company-switcher-wrapper { display: flex; align-items: center; gap: 0.75rem; background: rgba(0,0,0,0.05); padding: 5px 12px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.1); }
        .glass-select { background: transparent; border: none; color: #0f172a; font-size: 0.9rem; font-weight: 600; outline: none; cursor: pointer; padding: 5px; }
        .glass-select option { background: white; color: #0f172a; }
        .owner-badge { background: #0f172a; color: white; padding: 2px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.5px; }

        .content-area { flex: 1; display: flex; flex-direction: column; position: relative; z-index: 10; }
        .page-content { padding: 2rem; }
        .settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; align-items: start; }
        .settings-card { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }
        .card-header { display: flex; align-items: center; gap: 0.75rem; border-bottom: 1px solid rgba(0, 0, 0, 0.1); padding-bottom: 1rem; }
        .card-header h2 { font-size: 1.25rem; font-weight: 600; color: #1e293b !important; margin: 0; }
        .info-row { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px dashed rgba(0, 0, 0, 0.1) !important; }
        .info-label { color: #64748b !important; font-size: 0.95rem; }
        .info-val { color: #1e293b !important; font-weight: 600; }
        .plan-badge { background: #0f172a; color: white; padding: 2px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 700; }
        .quota-block { margin-bottom: 1.5rem; }
        .quota-header { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
        .quota-title { color: #1e293b; font-size: 0.9rem; font-weight: 600; }
        .quota-numbers { font-family: monospace; color: #64748b; }
        .progress-bar-bg { width: 100%; height: 6px; background: rgba(0, 0, 0, 0.05); border-radius: 3px; overflow: hidden; }
        .progress-bar-fill { height: 100%; transition: width 0.5s ease; }
        .glass-input { background: white; border: 1px solid rgba(0, 0, 0, 0.1); color: #1e293b; padding: 8px 12px; border-radius: 8px; outline: none; transition: 0.2s; }
        .glass-input:focus { border-color: var(--primary-color); background: #f8fafc; }
        .info-desc { color: #64748b; font-size: 0.9rem; line-height: 1.5; }
        
        @media (max-width: 768px) {
          .settings-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
