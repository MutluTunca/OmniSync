"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  MessageSquare, 
  Send, 
  LayoutDashboard, 
  Instagram, 
  BarChart3, 
  Users, 
  Activity, 
  Cpu, 
  Settings 
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Yorum Merkezi", href: "/comments", icon: MessageSquare },
    { name: "DM Merkezi", href: "/conversations", icon: Send },
    { name: "Hesaplar", href: "/instagram/accounts", icon: Instagram },
    { name: "Analiz", href: "/analytics", icon: BarChart3 },
    { name: "Ekip", href: "/users", icon: Users },
    { name: "Sistem", href: "/logs", icon: Activity },
    { name: "AI Ayarları", href: "/ai-settings", icon: Cpu },
    { name: "Ayarlar", href: "/settings", icon: Settings },
  ];

  return (
    <aside className="app-sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">OS</div>
        <span>OmniSync</span>
      </div>
      
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`nav-item ${isActive ? "active" : ""}`}
            >
              <item.icon size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <style jsx>{`
        .app-sidebar {
          width: 260px;
          height: 100vh;
          background: white;
          border-right: 1px solid rgba(0,0,0,0.05);
          display: flex;
          flex-direction: column;
          padding: 24px 16px;
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 12px 32px 12px;
        }

        .logo-icon {
          width: 32px;
          height: 32px;
          background: var(--primary);
          color: white;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.8rem;
        }

        .sidebar-logo span {
          font-weight: 800;
          font-size: 1.2rem;
          color: #0f172a;
          letter-spacing: -0.02em;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 12px;
          color: #64748b;
          font-weight: 600;
          transition: all 0.2s;
          text-decoration: none;
        }

        .nav-item:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .nav-item.active {
          background: rgba(99, 102, 241, 0.1);
          color: var(--primary);
        }

        @media (max-width: 1024px) {
          .app-sidebar {
            width: 80px;
            padding: 24px 8px;
          }
          .sidebar-logo span, .nav-item span {
            display: none;
          }
          .sidebar-logo {
            justify-content: center;
            padding-bottom: 24px;
          }
          .nav-item {
            justify-content: center;
          }
        }
      `}</style>
    </aside>
  );
}
