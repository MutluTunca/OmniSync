"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

type QuickView = "all" | "action" | "today" | "replied" | "sensitive";

const API_BASE = "";


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
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/comments?limit=200`, { cache: "no-store" });
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
    setBusyId("poll");
    try {
      const res = await fetch(`${API_BASE}/api/v1/instagram/poll-now`, { method: "POST" });
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
    setBusyId(commentId);
    try {
      const res = await fetch(`${API_BASE}/api/v1/comments/${commentId}/generate-reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    if (!item.reply?.final_text) {
      setMessage("Gonderilecek yanit metni bulunamadi.");
      return;
    }

    setBusyId(item.id);
    try {
      const res = await fetch(`${API_BASE}/api/v1/comments/${item.id}/approve-reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    void loadComments();
  }, []);

  return (
    <main className="container">
      <div className="topbar">
        <div>
          <h1>Yorum Merkezi</h1>
          <p>Tum Instagram yorumlarini ve AI yanitlarini buradan takip edebilirsiniz.</p>
        </div>
        <div className="actions">
          <button className="btn-secondary" onClick={loadComments} disabled={loading || busyId !== null}>
            Yenile
          </button>
          <button className="btn-primary" onClick={triggerPollNow} disabled={busyId !== null}>
            {busyId === "poll" ? "Kontrol Ediliyor..." : "Yorumlari Kontrol Et"}
          </button>
        </div>
      </div>

      <section className="stats-grid">
        <article className="stat-card">
          <span>Toplam</span>
          <strong>{stats.total}</strong>
        </article>
        <article className="stat-card">
          <span>Yanitlanan</span>
          <strong>{stats.replied}</strong>
        </article>
        <article className="stat-card">
          <span>Bekleyen</span>
          <strong>{stats.pending}</strong>
        </article>
        <article className="stat-card">
          <span>Yanit Uretilen</span>
          <strong>{stats.withReply}</strong>
        </article>
      </section>

      <section className="filters-panel">
        <div className="quick-tabs" role="tablist" aria-label="Hazir gorunumler">
          <button className={`chip ${quickView === "all" ? "chip-active" : ""}`} onClick={() => setQuickView("all")}>
            Tumu
          </button>
          <button className={`chip ${quickView === "action" ? "chip-active" : ""}`} onClick={() => setQuickView("action")}>
            Aksiyon Gerekli
          </button>
          <button className={`chip ${quickView === "today" ? "chip-active" : ""}`} onClick={() => setQuickView("today")}>
            Bugun Gelenler
          </button>
          <button className={`chip ${quickView === "replied" ? "chip-active" : ""}`} onClick={() => setQuickView("replied")}>
            Yanitlananlar
          </button>
          <button className={`chip ${quickView === "sensitive" ? "chip-active" : ""}`} onClick={() => setQuickView("sensitive")}>
            Hassaslar
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
              <option value="all">Tum intentler</option>
              {intentOptions.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>

          <label>
            Yanit
            <select className="input" value={replyFilter} onChange={(e) => setReplyFilter(e.target.value)}>
              <option value="all">Hepsi</option>
              <option value="with">Yanit var</option>
              <option value="without">Yanit yok</option>
            </select>
          </label>

          <label>
            Tarih
            <select className="input" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
              <option value="all">Tum zamanlar</option>
              <option value="today">Bugun</option>
              <option value="7d">Son 7 gun</option>
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
            Gosterilen {pagedItems.length} / {filteredItems.length} (Toplam: {items.length})
          </small>
          <button className="btn-secondary" onClick={resetFilters} disabled={loading || busyId !== null}>
            Filtreleri Temizle
          </button>
        </div>
      </section>

      {message ? <p className="notice">{message}</p> : null}

      <section className="table-wrap">
        <table className="comments-table">
          <thead>
            <tr>
              <th>Yorum</th>
              <th>Paylasim</th>
              <th>Intent</th>
              <th>Durum</th>
              <th>AI Yanit</th>
              <th>Zaman</th>
              <th>Islem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7}>Yukleniyor...</td>
              </tr>
            ) : pagedItems.length === 0 ? (
              <tr>
                <td colSpan={7}>Filtreye uygun yorum bulunamadi.</td>
              </tr>
            ) : (
              pagedItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.commenter_username ? <small className="subtle">@{item.commenter_username}</small> : null}
                    {item.text}
                  </td>
                  <td>
                    <span className="badge">{item.post.media_type ?? "POST"}</span>
                    <small className="subtle">Media ID: {item.post.ig_media_id}</small>
                    <small className="subtle">Yayin: {formatDate(item.post.posted_at)}</small>
                    {item.post.caption_text ? <small className="subtle">{truncateText(item.post.caption_text, 90)}</small> : null}
                  </td>
                  <td>
                    <span className="badge">{item.intent ?? "-"}</span>
                    {item.intent_confidence !== null ? <small className="subtle">%{Math.round(item.intent_confidence * 100)}</small> : null}
                  </td>
                  <td>
                    <span className={`badge badge-${item.status}`}>{statusLabel(item.status)}</span>
                    {item.reply ? <small className="subtle">Reply: {statusLabel(item.reply.status)}</small> : null}
                  </td>
                  <td>{item.reply?.final_text ?? item.reply?.draft_text ?? "Henuz yok"}</td>
                  <td>
                    <small className="subtle">Yorum: {formatDate(item.received_at)}</small>
                    <small className="subtle">Reply: {formatDate(item.reply?.sent_at ?? null)}</small>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-secondary" onClick={() => generateReply(item.id)} disabled={busyId === item.id}>
                        Yanit Uret
                      </button>
                      {item.reply?.final_text ? (
                        <button
                          className="btn-primary"
                          onClick={() => sendReplyNow(item)}
                          disabled={busyId === item.id || item.reply.status === "sent"}
                        >
                          {item.reply.status === "sent" ? "Gonderildi" : "Hemen Gonder"}
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
            Onceki
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

      <Link className="link" href="/">
        Ana sayfaya don
      </Link>
    </main>
  );
}
