"use client";

import { FormEventHandler, useEffect, useState } from "react";

const API_BASE = "";

const TOKEN_STORAGE_KEY = "omnisync_access_token";
const roles = ["owner", "admin", "manager", "operator", "agent"] as const;

type RoleValue = (typeof roles)[number];

type UserItem = {
  id: string;
  email: string;
  full_name: string;
  role: RoleValue;
  is_active: boolean;
};

export default function UsersPage() {
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const [loginForm, setLoginForm] = useState({
    email: "owner@omnisync.life",
    password: "ChangeMe123!",
  });

  const [createForm, setCreateForm] = useState({
    email: "",
    full_name: "",
    password: "",
    role: "agent" as RoleValue,
  });

  useEffect(() => {
    const saved = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (saved) {
      setToken(saved);
      void loadUsers(saved);
    }
  }, []);

  async function loadUsers(accessToken: string) {
    setLoading(true);
    setError("");
    try {
      const selectedCompanyId = window.localStorage.getItem("omnisync_selected_company_id");
      const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` };
      if (selectedCompanyId) {
        headers["X-Company-ID"] = selectedCompanyId;
      }

      const res = await fetch(`${API_BASE}/api/v1/users`, {
        cache: "no-store",
        headers,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Yetki yok");
      }
      const data = (await res.json()) as { items: UserItem[] };
      setUsers(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kullanicilar yuklenemedi");
    } finally {
      setLoading(false);
    }
  }

  const handleLogin: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Giris basarisiz");
      }
      const data = (await res.json()) as { access_token: string };
      if (!data.access_token) throw new Error("Access token alinmadi");
      setToken(data.access_token);
      window.localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
      await loadUsers(data.access_token);
      setMessage("Giris basarili.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giris basarisiz");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!token) {
      setError("Once giris yapman gerekiyor.");
      return;
    }
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const selectedCompanyId = window.localStorage.getItem("omnisync_selected_company_id");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      if (selectedCompanyId) {
        headers["X-Company-ID"] = selectedCompanyId;
      }

      const res = await fetch(`${API_BASE}/api/v1/users`, {
        method: "POST",
        headers,
        body: JSON.stringify(createForm),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Kullanici olusturulamadi");
      }
      setMessage("Kullanici olusturuldu.");
      setCreateForm({ email: "", full_name: "", password: "", role: "agent" });
      await loadUsers(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kullanici olusturulamadi");
    } finally {
      setLoading(false);
    }
  };

  async function handleUpdateStatus(userId: string, currentIsActive: boolean, currentRole: RoleValue) {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/v1/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_active: !currentIsActive, role: currentRole }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Guncelleme basarisiz");
      }
      await loadUsers(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Guncelleme basarisiz");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateRole(userId: string, currentIsActive: boolean, newRole: RoleValue) {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/v1/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_active: currentIsActive, role: newRole }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Guncelleme basarisiz");
      }
      await loadUsers(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Guncelleme basarisiz");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!token) return;
    if (!window.confirm("Bu kullanıcıyı kalıcı olarak silmek istediğinize emin misiniz?")) return;
    
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/v1/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Silme islemi basarisiz");
      }
      setMessage("Kullanici basariyla silindi.");
      await loadUsers(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silme islemi basarisiz");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken("");
    setUsers([]);
    setMessage("Cikis yapildi.");
    setError("");
  }

  return (
    <main className="container">
      <h1>Kullanici Yonetimi</h1>
      <p>Admin/Owner girisi yaparak kullanicilari yonetebilirsin.</p>

      {error ? <p className="notice">{error}</p> : null}
      {message ? <p className="notice">{message}</p> : null}

      {!token ? (
        <section className="filters-panel">
          <h2>Yetkili Girisi</h2>
          <form className="filters-grid" onSubmit={handleLogin}>
            <label>
              E-posta
              <input
                className="input"
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm((s) => ({ ...s, email: e.target.value }))}
              />
            </label>
            <label>
              Sifre
              <input
                className="input"
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm((s) => ({ ...s, password: e.target.value }))}
              />
            </label>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Giris yapiliyor..." : "Giris Yap"}
            </button>
          </form>
        </section>
      ) : (
        <>
          <section className="filters-panel">
            <div className="filters-foot">
              <small className="subtle">Oturum aktif. Token tarayici icinde saklaniyor.</small>
              <button className="btn-secondary" onClick={logout}>
                Cikis Yap
              </button>
            </div>
          </section>

          <section className="filters-panel">
            <h2>Yeni kullanici ekle</h2>
            <form className="filters-grid" onSubmit={handleCreate}>
              <label>
                E-posta
                <input
                  className="input"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((s) => ({ ...s, email: e.target.value }))}
                />
              </label>
              <label>
                Isim
                <input
                  className="input"
                  type="text"
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm((s) => ({ ...s, full_name: e.target.value }))}
                />
              </label>
              <label>
                Sifre
                <input
                  className="input"
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((s) => ({ ...s, password: e.target.value }))}
                />
              </label>
              <label>
                Rol
                <select
                  className="input"
                  value={createForm.role}
                  onChange={(e) => setCreateForm((s) => ({ ...s, role: e.target.value as RoleValue }))}
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? "Kaydediliyor..." : "Kullanici Olustur"}
              </button>
            </form>
          </section>

          <section className="table-wrap">
            <h2>Kayitli kullanicilar</h2>
            {loading ? (
              <p>Yukleniyor...</p>
            ) : users.length === 0 ? (
              <p>Henuz kullanici yok.</p>
            ) : (
              <table className="comments-table">
                <thead>
                  <tr>
                    <th>E-posta</th>
                    <th>Isim</th>
                    <th>Rol</th>
                    <th>Aktif</th>
                    <th>Islemler</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.email}</td>
                      <td>{user.full_name}</td>
                      <td>
                        <select
                          className="input"
                          style={{ width: "auto", padding: "4px" }}
                          value={user.role}
                          onChange={(e) => handleUpdateRole(user.id, user.is_active, e.target.value as RoleValue)}
                          disabled={loading}
                        >
                          {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      <td>{user.is_active ? "Evet" : "Hayir"}</td>
                      <td>
                        <button
                          className={user.is_active ? "btn-secondary" : "btn-primary"}
                          onClick={() => handleUpdateStatus(user.id, user.is_active, user.role)}
                          disabled={loading}
                          style={{ padding: "4px 8px", fontSize: "0.85rem" }}
                        >
                          {user.is_active ? "Pasif Yap" : "Aktif Yap"}
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={loading}
                          style={{ padding: "4px 8px", fontSize: "0.85rem", marginLeft: '8px', backgroundColor: '#dc3545', color: 'white' }}
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </main>
  );
}
