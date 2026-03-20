"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const loadData = async () => {
      const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      try {
        const [hRes, tRes, cRes, wRes] = await Promise.all([
          fetch(`${API_BASE}/api/v1/healthz`, { cache: "no-store", headers }),
          fetch(`${API_BASE}/api/v1/instagram/token-health`, { cache: "no-store", headers }),
          fetch(`${API_BASE}/api/v1/monitoring/celery`, { cache: "no-store", headers }),
          fetch(`${API_BASE}/api/v1/monitoring/webhooks`, { cache: "no-store", headers })
        ]);

        if (hRes.ok) {
          const hData = await hRes.json();
          setHealth(hData.status ?? "online");
        } else {
          setHealth("offline");
        }

        if (tRes.ok) setTokenHealth(await tRes.json());
        if (cRes.ok) setCeleryMon(await cRes.json());
        if (wRes.ok) setWebhookMon(await wRes.json());
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
    <main className="container">
      <h1>OmniSync Emlak Dashboard</h1>
      <p>Durum: {health}</p>
      
      {loading ? (
        <p>Dashboard verileri yükleniyor...</p>
      ) : (
        <div className="card-grid">
          <article className="card">
            <h2>Yorum Yonetimi</h2>
            <p>Instagram yorumlarini tek panelde izleyin ve yonetin.</p>
            <Link className="link" href="/comments">
              Yorum merkezini ac
            </Link>
          </article>

          <article className="card">
            <h2>Hesap Yönetimi</h2>
            <p>Bağlı Instagram hesaplarını yönetmek ve yeniden bağlanmak için.</p>
            <Link className="link" href="/instagram/accounts">
              Hesapları yönet
            </Link>
          </article>

          <article className="card">
            <h2>Operasyon Sağlığı</h2>
            {celeryMon ? (
              <>
                <p>
                  Kuyruk (webhooks/ai/outbound): {celeryMon.queue_backlog.webhooks}/
                  {celeryMon.queue_backlog.ai}/{celeryMon.queue_backlog.outbound}
                </p>
              </>
            ) : (
              <p>Kuyruk durumu alınamıyor.</p>
            )}
            {webhookMon ? (
              <>
                <p>
                  Webhook (bekleyen/toplam): {webhookMon.counts.pending}/{webhookMon.counts.total}
                </p>
                <p>En uzun bekleyen (sn): {webhookMon.oldest_pending_age_sec ?? '-'}</p>
              </>
            ) : (
              <p>Webhook durumu alınamıyor.</p>
            )}
          </article>
          
          <article className="card">
            <h2>AI Otomasyon</h2>
            <p>Intent analizi + insan benzeri otomatik yanit motoru.</p>
          </article>
          
          <article className="card">
            <h2>Token Sagligi</h2>
            {tokenHealth ? (
              <>
                <p>
                  Toplam: {tokenHealth.summary.total} | Aktif: {tokenHealth.summary.active} | Yakin bitiyor: {tokenHealth.summary.expiring_soon}
                </p>
                <p>
                  Dolmus: {tokenHealth.summary.expired} | Bilinmiyor: {tokenHealth.summary.unknown} | Token yok: {tokenHealth.summary.missing}
                </p>
                {tokenHealth.items.length > 0 ? (
                  <p>{tokenHealth.items.map((x) => `${x.username} (${tokenLabel(x.token_health)})`).join(", ")}</p>
                ) : (
                  <p>Bagli hesap yok.</p>
                )}
                {requiresReconnect ? (
                  <>
                    <p>
                      Yeniden baglanmasi gereken aktif hesaplar: {reconnectItems.map((x) => x.username).join(", ")}
                    </p>
                    <Link className="link" href="/instagram/connect">
                      Instagram hesaplarini yeniden bagla
                    </Link>
                  </>
                ) : null}
              </>
            ) : (
              <p>Token sagligi alinamadi.</p>
            )}
          </article>

          <article className="card">
            <h2>Kullanıcılar</h2>
            <p>Kullanıcıları listele ve yeni kullanıcı ekle.</p>
            <Link className="link" href="/users">
              Kullanıcı yönetimi
            </Link>
          </article>
          
          <article className="card">
            <h2>📊 Analitik ve Raporlar</h2>
            <p>Performans metrikleri ve müşteri duygu analizi.</p>
            <Link href="/analytics" className="link">Raporları Gör</Link>
          </article>
          
          <article className="card">
            <h2>Sistem Kayıtları</h2>
            <p>Yorum gonderimleri, hatalar ve sistem olaylari.</p>
            <Link className="link" href="/logs">
              Loglari incele
            </Link>
          </article>
        </div>
      )}
      
      <div style={{ marginTop: '30px' }}>
        <Link className="link" href="/login">
          Farklı bir hesapla giris yap
        </Link>
      </div>
    </main>
  );
}
