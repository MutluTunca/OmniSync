"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area 
} from "recharts";
import { 
  ArrowLeft, 
  MessageSquare, 
  Heart, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  Zap, 
  Loader2,
  PieChart as PieIcon
} from "lucide-react";

const API_BASE = "";
const TOKEN_STORAGE_KEY = "omnisync_access_token";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6"];

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [sentimentData, setSentimentData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      setError("Lütfen giriş yapın.");
      setLoading(false);
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    const load = async () => {
      try {
        const [oRes, tRes, sRes] = await Promise.all([
          fetch(`${API_BASE}/api/v1/analytics/overview`, { headers }),
          fetch(`${API_BASE}/api/v1/analytics/trends`, { headers }),
          fetch(`${API_BASE}/api/v1/analytics/sentiment-distribution`, { headers })
        ]);
        
        if (oRes.ok) setOverview(await oRes.json());
        if (tRes.ok) setTrends(await tRes.json());
        if (sRes.ok) setSentimentData(await sRes.json());
      } catch (err) {
        setError("Veri senkronizasyon hatası.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-wrapper">
        <div className="dashboard-background">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
        </div>
        <div className="glass-loader" style={{ height: '80vh' }}>
          <Loader2 className="animate-spin" size={40} color="var(--primary)" />
          <p>Analitik veriler hazırlanıyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-background">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <main className="container dashboard-content">
        <header className="topbar">
          <div className="flex items-center" style={{ gap: '1rem' }}>
            <Link href="/" className="btn-secondary" style={{ padding: '0.5rem' }}>
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1>Performans Merkezi</h1>
              <p>Yapay zeka verimliliği ve müşteri etkileşimleri.</p>
            </div>
          </div>
        </header>

        {error ? (
          <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger-text)' }}>
            <AlertTriangle size={48} style={{ margin: '0 auto 1rem' }} />
            <h3>Hata Oluştu</h3>
            <p>{error}</p>
          </div>
        ) : (
          <>
            {/* Quick Stats Grid */}
            <div className="analytics-stats-grid">
              <div className="glass-card stat-item">
                <div className="stat-icon-box" style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
                  <MessageSquare size={24} color="#6366f1" />
                </div>
                <div>
                  <label>Toplam Yorum</label>
                  <p>{overview?.total_comments || 0}</p>
                </div>
              </div>

              <div className="glass-card stat-item">
                <div className="stat-icon-box" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                  <Zap size={24} color="#10b981" />
                </div>
                <div>
                  <label>AI Yanıtları</label>
                  <p>{overview?.replies_sent || 0}</p>
                </div>
              </div>

              <div className="glass-card stat-item">
                <div className="stat-icon-box" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
                  <TrendingUp size={24} color="#f59e0b" />
                </div>
                <div>
                  <label>Otomasyon Oranı</label>
                  <p>%{overview?.automation_rate?.toFixed(1) || 0}</p>
                </div>
              </div>

              <div className="glass-card stat-item">
                <div className="stat-icon-box" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                  <AlertTriangle size={24} color="#ef4444" />
                </div>
                <div>
                  <label>Başarısız</label>
                  <p>{overview?.replies_failed || 0}</p>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="charts-main-grid">
              {/* Trends Card */}
              <div className="glass-card chart-container-card">
                <div className="card-header-premium">
                  <TrendingUp size={20} color="var(--primary)" />
                  <h3>Etkileşim Trendi (7 Gün)</h3>
                </div>
                <div className="chart-wrapper-premium">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trends}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#94a3b8" 
                        fontSize={11} 
                        tickFormatter={(str) => {
                          const date = new Date(str);
                          return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
                        }}
                      />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'rgba(255,255,255,0.9)', 
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(0,0,0,0.05)',
                          borderRadius: '12px',
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                        }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#6366f1" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorCount)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Sentiment Summary */}
              <div className="glass-card chart-container-card">
                 <div className="card-header-premium">
                  <PieIcon size={20} color="#10b981" />
                  <h3>Duygu (Sentiment) Dağılımı</h3>
                </div>
                <div className="chart-wrapper-premium">
                   <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sentimentData}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={8}
                        dataKey="value"
                      >
                        {sentimentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Intent Distribution List */}
            <div className="glass-card" style={{ marginTop: '20px', padding: '1.5rem' }}>
               <div className="card-header-premium" style={{ marginBottom: '1.5rem' }}>
                  <CheckCircle size={20} color="#8b5cf6" />
                  <h3>Niyet Dağılımı (AI Intent Analysis)</h3>
                </div>
                <div className="intent-stats-list">
                  {Object.entries(overview?.intent_stats || {}).map(([intent, count]: [any, any], idx) => (
                    <div key={intent} className="intent-stat-pill">
                      <span className="intent-name">{intent}</span>
                      <span className="intent-count">{count}</span>
                    </div>
                  ))}
                  {(!overview?.intent_stats || Object.keys(overview.intent_stats).length === 0) && (
                    <p style={{ color: 'var(--text-secondary)' }}>Henüz yeterli veri toplanmadı.</p>
                  )}
                </div>
            </div>
          </>
        )}
      </main>

      <style jsx>{`
        .analytics-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        .stat-item {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 1.5rem;
        }
        .stat-icon-box {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stat-item label {
          display: block;
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 2px;
          font-weight: 500;
        }
        .stat-item p {
          font-size: 1.5rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }
        .charts-main-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 1.5rem;
        }
        .chart-container-card {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
        }
        .card-header-premium {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .card-header-premium h3 {
          font-size: 1rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }
        .chart-wrapper-premium {
          height: 300px;
          width: 100%;
        }
        .intent-stats-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }
        .intent-stat-pill {
          background: rgba(255,255,255,0.5);
          border: 1px solid rgba(0,0,0,0.05);
          padding: 8px 16px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .intent-name {
          font-weight: 600;
          color: #334155;
          font-size: 0.9rem;
        }
        .intent-count {
          background: var(--primary);
          color: white;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: bold;
        }

        @media (max-width: 1024px) {
          .charts-main-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 768px) {
          .analytics-stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.75rem;
          }
          .stat-item {
            padding: 1rem;
            gap: 0.75rem;
          }
          .stat-item p {
            font-size: 1.2rem;
          }
          .charts-main-grid {
            grid-template-columns: 1fr;
          }
          .chart-wrapper-premium {
            height: 220px;
          }
          .topbar {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .topbar h1 {
            font-size: 1.4rem;
          }
        }
      `}</style>
    </div>
  );
}
