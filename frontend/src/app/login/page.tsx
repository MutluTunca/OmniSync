"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AtSign, Lock, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    // Ensure we use a relative path if on the same domain to avoid CORS/Mixed Content issues
    const loginUrl = apiBaseUrl.startsWith("http") 
      ? `${apiBaseUrl}/api/v1/auth/login` 
      : "/api/v1/auth/login";

    try {
      const response = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Giriş başarısız. Lütfen bilgilerinizi kontrol edin.");
      }

      const data = await response.json();
      
      // Store tokens
      localStorage.setItem("omnisync_access_token", data.access_token);
      localStorage.setItem("omnisync_refresh_token", data.refresh_token);
      localStorage.setItem("omnisync_token_type", data.token_type);

      // Redirect to dashboard
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-background">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>
      
      <main className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="logo-placeholder">OS</div>
            <h1>OmniSync Emlak</h1>
            <p>Gayrimenkul otomasyon paneline hoş geldiniz.</p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            {error && (
              <div className="error-alert">
                {error}
              </div>
            )}

            <div className="input-group">
              <label htmlFor="email">E-posta</label>
              <div className="input-wrapper">
                <AtSign className="input-icon" size={18} />
                <input
                  id="email"
                  type="email"
                  placeholder="admin@omnisync.life"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="login-input"
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="password">Şifre</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={18} />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="login-input"
                />
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="login-button">
              {isLoading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Giriş Yap <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="login-footer">
            <p>© 2026 OmniSync Life. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </main>

      <style jsx>{`
        .login-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          position: relative;
          overflow: hidden;
        }

        .login-background {
          position: absolute;
          width: 100%;
          height: 100%;
          z-index: 0;
        }

        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.4;
        }

        .blob-1 {
          width: 500px;
          height: 500px;
          background: #6366f1;
          top: -100px;
          left: -100px;
          animation: float 20s infinite alternate;
        }

        .blob-2 {
          width: 400px;
          height: 400px;
          background: #818cf8;
          bottom: -100px;
          right: -100px;
          animation: float 25s infinite alternate-reverse;
        }

        @keyframes float {
          from { transform: translate(0, 0); }
          to { transform: translate(50px, 100px); }
        }

        .login-container {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 440px;
          padding: 20px;
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .login-card {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: 32px;
          padding: 48px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1);
        }

        .login-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .logo-placeholder {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: white;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.5rem;
          margin: 0 auto 20px;
          box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.4);
        }

        .login-header h1 {
          font-size: 1.75rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 8px;
          letter-spacing: -0.02em;
        }

        .login-header p {
          font-size: 0.95rem;
          color: #64748b;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .error-alert {
          background: #fef2f2;
          border-left: 4px solid #ef4444;
          color: #991b1b;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .input-group label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #1e293b;
          margin-left: 4px;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 16px;
          color: #94a3b8;
        }

        .login-input {
          width: 100%;
          padding: 14px 14px 14px 48px;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          background: #fcfcfd;
          font-size: 1rem;
          transition: all 0.2s;
        }

        .login-input:focus {
          outline: none;
          background: white;
          border-color: #6366f1;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }

        .login-button {
          height: 56px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: white;
          border: none;
          border-radius: 16px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          transition: all 0.3s;
          margin-top: 8px;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
        }

        .login-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.4);
          background: linear-gradient(135deg, #4f46e5, #4338ca);
        }

        .login-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .login-footer {
          margin-top: 40px;
          text-align: center;
        }

        .login-footer p {
          font-size: 0.8rem;
          color: #94a3b8;
        }

        @media (max-width: 480px) {
          .login-card {
            padding: 32px 24px;
            border-radius: 24px;
          }
        }
      `}</style>
    </div>
  );
}
