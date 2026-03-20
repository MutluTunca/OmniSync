"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AuditLogItem = {
  id: string;
  event_type: string;
  description: string;
  payload: any;
  created_at: string;
  user_id: string | null;
};

type ApiResponse = {
  items: AuditLogItem[];
};

const API_BASE = "";
const TOKEN_STORAGE_KEY = "omnisync_access_token";

export default function LogsPage() {
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadLogs() {
    setLoading(true);
    try {
      const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
      const res = await fetch(`${API_BASE}/api/v1/audit-logs/`, {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Loglar alinamadi");
      const data: ApiResponse = await res.json();
      setItems(data.items ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLogs();
  }, []);

  function formatEventType(type: string): string {
    const map: Record<string, string> = {
      reply_sent: "Yanit Gonderildi",
      reply_failed: "Gonderim Hatasi",
      comment_skipped: "Yorum Atlandi",
      token_refresh_failed: "Token Yenileme Hatasi",
      subscription_limit_reached: "Limit Asildi",
    };
    return map[type] ?? type;
  }

  return (
    <main className="container">
      <div className="topbar">
        <div>
          <h1>Operasyon Kayıtları</h1>
          <p>Sistem ve kullanıcı aksiyonlarını buradan takip edebilirsiniz.</p>
        </div>
        <button className="btn-secondary" onClick={loadLogs} disabled={loading}>
          Yenile
        </button>
      </div>

      {error ? (
        <p className="notice">{error}</p>
      ) : loading ? (
        <p>Yukleniyor...</p>
      ) : items.length === 0 ? (
        <p>Henuz kayit bulunmuyor.</p>
      ) : (
        <section className="table-wrap">
          <table className="comments-table">
            <thead>
              <tr>
                <th>Zaman</th>
                <th>Olay</th>
                <th>Açıklama</th>
                <th>Detay</th>
              </tr>
            </thead>
            <tbody>
              {items.map((log) => (
                <tr key={log.id}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {new Date(log.created_at).toLocaleString("tr-TR")}
                  </td>
                  <td>
                    <span className={`badge badge-${log.event_type.includes("failed") ? "failed" : "sent"}`}>
                      {formatEventType(log.event_type)}
                    </span>
                  </td>
                  <td>{log.description}</td>
                  <td>
                    {log.payload ? (
                      <pre style={{ fontSize: "0.7rem", margin: 0, opacity: 0.8 }}>
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <Link className="link" href="/">
        Ana sayfaya don
      </Link>
    </main>
  );
}
