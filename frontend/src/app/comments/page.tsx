"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MessageSquare, CheckCircle, Clock, Cpu, RefreshCw, Search, ListFilter, ArrowRight } from "lucide-react";

type ReplyItem = {
  id: string;
  status: string;
  draft_text: string | null;
  final_text: string | null;
  sent_at: string | null;
};

type PostItem = {
  id: string;
  ig_media_id: string;
  caption_text: string | null;
  media_type: string | null;
  posted_at: string | null;
};

type CommentItem = {
  id: string;
  text: string;
  commenter_username: string | null;
  intent: string | null;
  intent_confidence: number | null;
  is_sensitive: boolean;
  status: string;
  received_at: string;
  post: PostItem;
  reply: ReplyItem | null;
};

type ApiResponse = {
  items: CommentItem[];
};

type QuickView = "all" | "action" | "today" | "replied" | "sensitive" | "pricing" | "critical";

const API_BASE = "";
const TOKEN_STORAGE_KEY = "omnisync_access_token";

const STATUS_OPTIONS = ["all", "new", "pending_approval", "replied", "failed", "skipped"];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("tr-TR");
}

function truncateText(value: string, maxLen: number): string {
  if (value.length <= maxLen) return value;
  return `${value.slice(0, maxLen - 1)}...`;
}

function isToday(dateStr: string): boolean {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

function isWithinDays(dateStr: string, days: number): boolean {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return false;
  return Date.now() - date.getTime() <= days * 24 * 60 * 60 * 1000;
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    all: "Tum durumlar",
    new: "Yeni",
    pending_approval: "Onay Bekliyor",
    replied: "Yanitlandi",
    failed: "Hata",
    skipped: "Atlandi",
    draft: "Taslak",
    scheduled: "Planlandi",
    sent: "Gonderildi"
  };
  return map[status] ?? status;
}

export default function CommentsPage() {
  const [items, setItems] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    setToken(saved);
  }, []);

  const [quickView, setQuickView] = useState<QuickView>("action");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [intentFilter, setIntentFilter] = useState("all");
  const [replyFilter, setReplyFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);

  const stats = useMemo(() => {
    const total = items.length;
    const replied = items.filter((x) => x.status === "replied").length;
    const pending = items.filter((x) => x.status === "pending_approval" || x.status === "new").length;
    const withReply = items.filter((x) => x.reply && x.reply.final_text).length;
    return { total, replied, pending, withReply };
  }, [items]);

  const intentOptions = useMemo(() => {
    return Array.from(new Set(items.map((x) => x.intent).filter((x): x is string => Boolean(x)))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return items.filter((item) => {
      if (quickView === "action" && !(item.status === "new" || item.status === "pending_approval" || item.status === "failed")) {
        return false;
      }
      if (quickView === "today" && !isToday(item.received_at)) return false;
      if (quickView === "replied" && item.status !== "replied") return false;
      if (quickView === "sensitive" && !item.is_sensitive) return false;
      if (quickView === "pricing" && !(item.intent === "pricing_inquiry")) return false;
      if (quickView === "critical" && !(item.intent === "complaint" || item.is_sensitive)) return false;

      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (intentFilter !== "all" && item.intent !== intentFilter) return false;

      const hasReply = Boolean(item.reply?.final_text || item.reply?.draft_text);
      if (replyFilter === "with" && !hasReply) return false;
      if (replyFilter === "without" && hasReply) return false;

      if (dateFilter === "today" && !isToday(item.received_at)) return false;
      if (dateFilter === "7d" && !isWithinDays(item.received_at, 7)) return false;

      if (!query) return true;
      const searchable = [item.text, item.commenter_username ?? "", item.post.ig_media_id, item.post.caption_text ?? ""]
        .join(" ")
        .toLowerCase();
      return searchable.includes(query);
    });
  }, [items, quickView, searchText, statusFilter, intentFilter, replyFilter, dateFilter]);

  useEffect(() => {
    setPage(1);
  }, [quickView, searchText, statusFilter, intentFilter, replyFilter, dateFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  async function loadComments() {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/comments?limit=200`, { 
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Yorumlar alinamadi");
      const data: ApiResponse = await res.json();
      setItems(data.items ?? []);
      setMessage("");
    } catch {
      setMessage("Yorumlar yuklenemedi. Backend baglantisini kontrol edin.");
    } finally {
      setLoading(false);
    }
  }

  async function triggerPollNow() {
    if (!token) return;
    setBusyId("poll");
    try {
      const res = await fetch(`${API_BASE}/api/v1/instagram/poll-now`, { 
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      setMessage("Yorum kontrolu tetiklendi. Birkac saniye sonra liste yenilenir.");
      setTimeout(() => {
        void loadComments();
      }, 2500);
    } catch {
      setMessage("Yorum kontrolu baslatilamadi.");
    } finally {
      setBusyId(null);
    }
  }

  async function generateReply(commentId: string) {
    if (!token) return;
    setBusyId(commentId);
    try {
      const res = await fetch(`${API_BASE}/api/v1/comments/${commentId}/generate-reply`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ force_regenerate: true })
      });
      if (!res.ok) throw new Error();
      setMessage("Yanit uretimi kuyruga alindi.");
      setTimeout(() => {
        void loadComments();
      }, 2500);
    } catch {
      setMessage("Yanit uretimi basarisiz.");
    } finally {
      setBusyId(null);
    }
  }

  async function sendReplyNow(item: CommentItem) {
    if (!token) return;
    if (!item.reply?.final_text) {
      setMessage("Gonderilecek yanit metni bulunamadi.");
      return;
    }

    setBusyId(item.id);
    try {
      const res = await fetch(`${API_BASE}/api/v1/comments/${item.id}/approve-reply`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ final_text: item.reply.final_text, send_now: true })
      });
      if (!res.ok) throw new Error();
      setMessage("Yanit gonderim kuyruguna alindi.");
      setTimeout(() => {
        void loadComments();
      }, 2500);
    } catch {
      setMessage("Yanit gonderimi basarisiz.");
    } finally {
      setBusyId(null);
    }
  }

  function resetFilters() {
    setQuickView("all");
    setSearchText("");
    setStatusFilter("all");
    setIntentFilter("all");
    setReplyFilter("all");
    setDateFilter("all");
    setPage(1);
  }

  useEffect(() => {
    if (token) {
      void loadComments();
    }
  }, [token]);

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-background">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <main className="container dashboard-content">
        <header className="topbar">
          <div>
            <h1>Yorum Merkezi</h1>
            <p>Yapay zeka ile güçlendirilmiş etkileşim yönetimi.</p>
          </div>
          <div className="actions" style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-secondary" onClick={loadComments} disabled={loading || busyId !== null} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Yenile
            </button>
            <button className="btn-primary" onClick={triggerPollNow} disabled={busyId !== null} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Search size={16} />
              {busyId === "poll" ? "Kontrol Ediliyor..." : "Yorumları Kontrol Et"}
            </button>
          </div>
        </header>

        <section className="stats-grid">
          <article className="stat-card glass-card">
            <span><MessageSquare size={18} color="var(--primary)" /> Toplam</span>
            <strong>{stats.total}</strong>
          </article>
          <article className="stat-card glass-card">
            <span><CheckCircle size={18} color="#10b981" /> Yanıtlanan</span>
            <strong>{stats.replied}</strong>
          </article>
          <article className="stat-card glass-card">
            <span><Clock size={18} color="#f59e0b" /> Bekleyen</span>
            <strong>{stats.pending}</strong>
          </article>
          <article className="stat-card glass-card">
            <span><Cpu size={18} color="#6366f1" /> Yanıt Üretilen</span>
            <strong>{stats.withReply}</strong>
          </article>
        </section>

        <section className="filters-panel glass-card">
          <div className="quick-tabs" role="tablist" aria-label="Hazir gorunumler">
            <button className={`chip ${quickView === "all" ? "chip-active" : ""}`} onClick={() => setQuickView("all")}>
              Tümü
            </button>
            <button className={`chip ${quickView === "action" ? "chip-active" : ""}`} onClick={() => setQuickView("action")}>
              Aksiyon Gerekli
            </button>
            <button className={`chip ${quickView === "today" ? "chip-active" : ""}`} onClick={() => setQuickView("today")}>
              Bugün Gelenler
            </button>
            <button className={`chip ${quickView === "replied" ? "chip-active" : ""}`} onClick={() => setQuickView("replied")}>
              Yanıtlananlar
            </button>
            <button className={`chip ${quickView === "sensitive" ? "chip-active" : ""}`} onClick={() => setQuickView("sensitive")}>
              Hassaslar
            </button>
            <button className={`chip ${quickView === "pricing" ? "chip-active" : ""}`} onClick={() => setQuickView("pricing")}>
              Fiyat Soranlar
            </button>
            <button className={`chip ${quickView === "critical" ? "chip-active" : ""}`} onClick={() => setQuickView("critical")}>
              Şikayet/Kritik
            </button>
          </div>

          <div className="filters-grid">
            <label>
              Ara
              <input
                className="input"
                placeholder="yorum, @kullanici, media id"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </label>

            <label>
              Durum
              <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                {STATUS_OPTIONS.map((x) => (
                  <option key={x} value={x}>
                    {statusLabel(x)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Intent
              <select className="input" value={intentFilter} onChange={(e) => setIntentFilter(e.target.value)}>
                <option value="all">Tüm intentler</option>
                {intentOptions.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Yanıt
              <select className="input" value={replyFilter} onChange={(e) => setReplyFilter(e.target.value)}>
                <option value="all">Hepsi</option>
                <option value="with">Yanıt var</option>
                <option value="without">Yanıt yok</option>
              </select>
            </label>

            <label>
              Tarih
              <select className="input" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                <option value="all">Tüm zamanlar</option>
                <option value="today">Bugün</option>
                <option value="7d">Son 7 gün</option>
              </select>
            </label>

            <label>
              Sayfa boyutu
              <select className="input" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>

          <div className="filters-foot">
            <small className="subtle">
              Gösterilen {pagedItems.length} / {filteredItems.length} (Toplam: {items.length})
            </small>
            <button className="btn-secondary" onClick={resetFilters} disabled={loading || busyId !== null}>
              Filtreleri Temizle
            </button>
          </div>
        </section>

        {message ? <p className="notice">{message}</p> : null}

        <section className="table-wrap glass-card">
          <table className="comments-table">
            <thead>
              <tr>
                <th>Yorum</th>
                <th>Paylaşım</th>
                <th>Intent</th>
                <th>Durum</th>
                <th>AI Yanıt</th>
                <th>Zaman</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7}>Yükleniyor...</td>
                </tr>
              ) : pagedItems.length === 0 ? (
                <tr>
                  <td colSpan={7}>Filtreye uygun yorum bulunamadı.</td>
                </tr>
              ) : (
                pagedItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.commenter_username ? <small className="subtle">@{item.commenter_username}</small> : null}
                      <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>{item.text}</div>
                    </td>
                    <td>
                      <span className="badge">{item.post.media_type ?? "POST"}</span>
                      <small className="subtle">Media ID: {item.post.ig_media_id}</small>
                      {item.post.caption_text ? <small className="subtle">{truncateText(item.post.caption_text, 60)}</small> : null}
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'var(--accent-soft)', color: 'var(--primary)' }}>{item.intent ?? "-"}</span>
                      {item.intent_confidence !== null ? <small className="subtle">%{Math.round(item.intent_confidence * 100)}</small> : null}
                    </td>
                    <td>
                      <span className={`badge badge-${item.status}`}>{statusLabel(item.status)}</span>
                    </td>
                    <td>
                      <div style={{ maxWidth: '200px', fontSize: '0.85rem' }}>
                        {item.reply?.final_text ?? item.reply?.draft_text ?? <span className="subtle">Henüz yok</span>}
                      </div>
                    </td>
                    <td>
                      <small className="subtle">Yorum: {formatDate(item.received_at)}</small>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="btn-secondary" onClick={() => generateReply(item.id)} disabled={busyId === item.id} style={{ padding: '8px 12px' }}>
                          Yanıt Üret
                        </button>
                        {item.reply?.final_text ? (
                          <button
                            className="btn-primary"
                            onClick={() => sendReplyNow(item)}
                            disabled={busyId === item.id || item.reply.status === "sent"}
                            style={{ padding: '8px 12px' }}
                          >
                            {item.reply.status === "sent" ? "Gönderildi" : "Onayla"}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <div className="pagination-row">
          <small className="subtle">
            Sayfa {currentPage} / {totalPages}
          </small>
          <div className="row-actions">
            <button className="btn-secondary" onClick={() => setPage((x) => Math.max(1, x - 1))} disabled={currentPage <= 1}>
              Önceki
            </button>
            <button
              className="btn-secondary"
              onClick={() => setPage((x) => Math.min(totalPages, x + 1))}
              disabled={currentPage >= totalPages}
            >
              Sonraki
            </button>
          </div>
        </div>

        <Link className="link" href="/" style={{ marginBottom: '40px' }}>
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
          opacity: 0.2;
        }

        .blob-1 {
          width: 500px;
          height: 500px;
          background: #6366f1;
          top: -100px;
          left: -100px;
        }

        .blob-2 {
          width: 400px;
          height: 400px;
          background: #818cf8;
          bottom: -100px;
          right: -100px;
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
