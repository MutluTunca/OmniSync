"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar, Legend 
} from "recharts";
import { ArrowLeft, MessageSquare, Heart, AlertTriangle, CheckCircle } from "lucide-react";

const API_BASE = "";
const TOKEN_STORAGE_KEY = "omnisync_access_token";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#64748b"];

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

    Promise.all([
      fetch(`${API_BASE}/api/v1/analytics/overview`, { headers }).then(res => res.json()),
      fetch(`${API_BASE}/api/v1/analytics/trends`, { headers }).then(res => res.json()),
      fetch(`${API_BASE}/api/v1/analytics/sentiment-distribution`, { headers }).then(res => res.json())
    ])
    .then(([overviewData, trendsData, sentData]) => {
      setOverview(overviewData);
      setTrends(trendsData);
      setSentimentData(sentData);
    })
    .catch(err => setError("Veri yüklenirken hata oluştu."))
    .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="container">Yükleniyor...</div>;
  if (error) return <div className="container notice">{error}</div>;

  return (
    <main className="container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <Link href="/" className="link" style={{ display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={20} /> Geri
        </Link>
        <h1>Performans ve Analitik</h1>
      </div>

      {/* Overview Cards */}
      <div className="card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <MessageSquare size={32} color="#6366f1" style={{ margin: '0 auto 10px' }} />
          <h3>Toplam Yorum</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{overview?.total_comments}</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <CheckCircle size={32} color="#10b981" style={{ margin: '0 auto 10px' }} />
          <h3>AI Yanıtları</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{overview?.replies_sent}</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <AlertTriangle size={32} color="#ef4444" style={{ margin: '0 auto 10px' }} />
          <h3>Hatalar</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{overview?.replies_failed}</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <Heart size={32} color="#6366f1" style={{ margin: '0 auto 10px' }} />
          <h3>Otomasyon Oranı</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>%{overview?.automation_rate.toFixed(1)}</p>
        </div>
      </div>

      <div className="card-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Trends Chart */}
        <div className="card">
          <div className="card-header">
            <h3>📈 Yorum Hacmi (7 Gün)</h3>
          </div>
          <div className="card-content" style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                 />
                <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sentiment Chart */}
        <div className="card">
          <div className="card-header">
            <h3>🎭 Duygu Analizi (Sentiment)</h3>
          </div>
          <div className="card-content" style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <h3>📋 Niyet Dağılımı (Intents)</h3>
        </div>
        <div className="card-content">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
            {Object.entries(overview?.intent_stats || {}).map(([intent, count]: [any, any]) => (
              <div key={intent} className="badge" style={{ padding: '10px 20px', fontSize: '1rem', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                <strong>{intent}</strong>: {count} yorum
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
