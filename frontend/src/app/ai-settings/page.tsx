"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Bot, MessageSquareText } from "lucide-react";

const API_BASE = "";
const TOKEN_STORAGE_KEY = "omnisync_access_token";

export default function AISettingsPage() {
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [aiModel, setAiModel] = useState<string>("gpt-4o-mini");
  const [customInstructions, setCustomInstructions] = useState<string>("");

  useEffect(() => {
    const saved = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (saved) {
      setToken(saved);
      void loadSettings(saved);
    } else {
      setError("Önce giriş yapmalısınız.");
    }
  }, []);

  async function loadSettings(accessToken: string) {
    setLoading(true);
    setError("");
    try {
      const selectedCompanyId = window.localStorage.getItem("omnisync_selected_company_id");
      const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` };
      if (selectedCompanyId) {
        headers["X-Company-ID"] = selectedCompanyId;
      }
      const res = await fetch(`${API_BASE}/api/v1/company/me`, {
        cache: "no-store",
        headers,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Ayarlar yüklenemedi");
      }
      const data = await res.json();
      setAiModel(data.ai_model_tier || "gpt-4o-mini");
      setCustomInstructions(data.ai_custom_instructions || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ayarlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const selectedCompanyId = window.localStorage.getItem("omnisync_selected_company_id");
      const headers: Record<string, string> = { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}` 
      };
      if (selectedCompanyId) {
        headers["X-Company-ID"] = selectedCompanyId;
      }

      const res = await fetch(`${API_BASE}/api/v1/company/update`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          ai_model_tier: aiModel,
          ai_custom_instructions: customInstructions
        })
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Kaydetme başarısız");
      }
      setMessage("Yapay zeka ayarları başarıyla güncellendi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydetme başarısız");
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

      <h1>Yapay Zeka Ayarları</h1>
      <p>Yapay zeka asistanının hangi modeli kullanacağını ve üretilen yanıtlarda hangi özel kurallara uyacağını buradan ayarlayabilirsiniz.</p>

      {error ? <p className="notice" style={{ background: "#fee2e2", color: "#b91c1c", border: "1px solid #f87171" }}>{error}</p> : null}
      {message ? <p className="notice" style={{ background: "#dcfce3", color: "#15803d", border: "1px solid #86efac" }}>{message}</p> : null}

      {!token ? (
        <p>Lütfen yetkili hesap ile giriş yapın.</p>
      ) : (
        <form onSubmit={handleSave} className="ai-settings-panel">
          
          <div className="glass-card panel-section">
            <div className="section-header">
              <Bot className="section-icon" size={24} />
              <h2>Dil Modeli Seçimi</h2>
            </div>
            <p className="section-desc">Yorumlara yanıt verirken veya analiz yaparken kullanılacak yapay zeka modelini seçin.</p>
            
            <label className="input-label" style={{ marginTop: "16px" }}>
              <select 
                className="input glass-input" 
                value={aiModel} 
                onChange={e => setAiModel(e.target.value)}
                disabled={loading}
              >
                <optgroup label="OpenAI Modelleri">
                  <option value="gpt-4o-mini">GPT-4o Mini (Hızlı ve Ucuz)</option>
                  <option value="gpt-4o">GPT-4o (En Zeki)</option>
                </optgroup>
                <optgroup label="Google Modelleri">
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Hızlı)</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (Dengeli)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (Gelişmiş)</option>
                </optgroup>
              </select>
            </label>
          </div>

          <div className="glass-card panel-section">
            <div className="section-header">
              <MessageSquareText className="section-icon" size={24} />
              <h2>Özel Talimatlar & Yönlendirmeler</h2>
            </div>
            <p className="section-desc">Yapay zekanın mutlaka kullanmasını istediğiniz kelimeleri, iletişim üslubunu veya sormasını istediğiniz soruları buraya yazın.</p>
            
            <label className="input-label" style={{ marginTop: "16px" }}>
              <textarea 
                className="input glass-input" 
                rows={8}
                placeholder="Örn: 'Yanıt verirken her zaman emlak ofisi numaramız 0555 555 55 55'i dahil et.' veya 'Samimi ama kurumsal bir dil kullan, müşteriye daima ofisimize gelip kahve içmeyi teklif et.'"
                value={customInstructions} 
                onChange={e => setCustomInstructions(e.target.value)}
                disabled={loading}
                style={{ resize: "vertical" }}
              />
            </label>
          </div>

          <button type="submit" className="btn-primary save-btn" disabled={loading}>
            {loading ? "Kaydediliyor..." : (
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}><Save size={18} /> Ayarları Kaydet</span>
            )}
          </button>

        </form>
      )}

      <style jsx>{`
        .wrapper {
          min-height: 100vh;
          padding: 40px 20px;
        }
        .ai-settings-panel {
          display: flex;
          flex-direction: column;
          gap: 24px;
          margin-top: 32px;
          max-width: 800px;
        }
        .panel-section {
          padding: 24px;
          border-radius: 16px;
        }
        .section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }
        .section-icon {
          color: var(--primary);
        }
        .section-header h2 {
          margin: 0;
          font-size: 1.25rem;
          color: #0f172a;
        }
        .section-desc {
          margin: 0;
          color: #64748b;
          font-size: 0.9rem;
        }
        .input-label {
          display: flex;
          flex-direction: column;
          font-weight: 600;
          color: #334155;
        }
        .glass-input {
          width: 100%;
          background: rgba(255,255,255,0.8);
          border: 1px solid rgba(0,0,0,0.1);
          border-radius: 12px;
          padding: 12px 16px;
          margin-top: 8px;
          font-family: inherit;
        }
        .glass-input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        .save-btn {
          align-self: flex-start;
          padding: 12px 24px;
          font-size: 1rem;
          border-radius: 12px;
        }
      `}</style>
    </main>
  );
}
