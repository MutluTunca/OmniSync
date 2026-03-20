"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      setError("Lutfen once giris yapin (/users veya /login).");
      setLoading(false);
      return;
    }

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
  }, []);

  return (
    <main className="container">
      <h1>Instagram Hesap Yönetimi</h1>
      <p>Bağlı hesapları ve token durumlarını buradan izleyin.</p>

      {error ? (
        <p className="notice">{error}</p>
      ) : loading ? (
        <p>Yükleniyor...</p>
      ) : (
        <>
          <div style={{ marginBottom: '20px' }}>
            <Link className="link" href="/instagram/connect" style={{ padding: '8px 16px', background: '#0070f3', color: 'white', borderRadius: '4px', textDecoration: 'none' }}>
              + Yeni Hesap Bağla
            </Link>
          </div>

          {items.length === 0 ? (
            <p>Bağlı hesap bulunamadı.</p>
          ) : (
            <div className="table-wrap">
          <table className="comments-table">
            <thead>
              <tr>
                <th>Kullanıcı Adı</th>
                <th>Page ID</th>
                <th>Durum</th>
                <th>Token Sağlık</th>
                <th>Expire</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {items.map((x) => (
                <tr key={x.id}>
                  <td>{x.username}</td>
                  <td>{x.page_id}</td>
                  <td>{x.is_active ? 'Aktif' : 'Pasif'}</td>
                  <td>
                    {x.token_health === 'active' && (
                      <span className="badge badge-sent">Sağlıklı</span>
                    )}
                    {x.token_health === 'expiring_soon' && (
                      <span className="badge badge-failed" style={{ backgroundColor: '#f59e0b' }}>Yenileme Gerekiyor</span>
                    )}
                    {(x.token_health === 'expired' || x.token_health === 'missing') && (
                      <span className="badge badge-failed">Bağlantı Koptu</span>
                    )}
                    {x.token_health === 'unknown' && (
                      <span className="badge badge-failed" style={{ backgroundColor: '#64748b' }}>Bilinmiyor</span>
                    )}
                  </td>
                  <td>{x.token_expires_at ? new Date(x.token_expires_at).toLocaleDateString('tr-TR') : '-'}</td>
                  <td>
                    <Link className="link" href="/instagram/connect">
                      Yeniden Bağlan
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          )}
        </>
      )}
    </main>
  );
}
