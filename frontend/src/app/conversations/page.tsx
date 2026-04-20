"use client";

import Link from "next/link";
import { useEffect, useState, useRef, useMemo } from "react";
import { 
  MessageSquare, 
  Search, 
  ArrowLeft, 
  Send, 
  User, 
  Bot, 
  Instagram, 
  Clock, 
  CheckCheck,
  MoreVertical,
  Paperclip,
  Image as ImageIcon,
  Loader2
} from "lucide-react";

type Message = {
  id: string;
  sender_id: string;
  sender_username: string | null;
  text: string | null;
  image_url: string | null;
  is_from_me: boolean;
  is_ai_generated: boolean;
  created_at: string;
};

type Conversation = {
  id: string;
  external_id: string;
  participant_username: string | null;
  last_message_at: string;
  unread_count: number;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const TOKEN_STORAGE_KEY = "omnisync_access_token";

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load token
  useEffect(() => {
    setToken(window.localStorage.getItem(TOKEN_STORAGE_KEY));
  }, []);

  // Fetch conversations
  const loadConversations = async () => {
    if (!token) return;
    try {
      const selectedCompanyId = window.localStorage.getItem("omnisync_selected_company_id");
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      if (selectedCompanyId) headers["X-Company-ID"] = selectedCompanyId;

      const res = await fetch(`${API_BASE}/api/v1/conversations`, { headers });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.items || []);
      }
    } catch (err) {
      console.error("Failed to load conversations", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for selected conversation
  const loadMessages = async (id: string) => {
    if (!token) return;
    setLoadingMessages(true);
    try {
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${API_BASE}/api/v1/conversations/${id}/messages`, { headers });
      if (res.ok) {
        const data = await res.json();
        setMessages(data || []);
        
        // Mark as read
        void fetch(`${API_BASE}/api/v1/conversations/${id}/read`, { method: 'POST', headers });
      }
    } catch (err) {
      console.error("Failed to load messages", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (token) void loadConversations();
  }, [token]);

  useEffect(() => {
    if (selectedId) void loadMessages(selectedId);
    else setMessages([]);
  }, [selectedId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredConversations = useMemo(() => {
    if (!searchText) return conversations;
    return conversations.filter(c => 
      c.participant_username?.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [conversations, searchText]);

  const selectedConversation = useMemo(() => 
    conversations.find(c => c.id === selectedId), [conversations, selectedId]
  );

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="chat-wrapper">
      <div className="bg-decor"></div>
      
      <main className="chat-container glass-main">
        {/* Sidebar */}
        <div className={`sidebar ${selectedId ? 'hidden-mobile' : ''}`}>
          <div className="sidebar-header">
            <Link href="/" className="back-btn">
              <ArrowLeft size={20} />
            </Link>
            <h2>Mesajlar</h2>
          </div>
          
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Konuşma ara..." 
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          <div className="conversation-list">
            {loading ? (
              <div className="list-loader">Yükleniyor...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="list-empty">Konuşma bulunamadı.</div>
            ) : (
              filteredConversations.map(conv => (
                <div 
                  key={conv.id} 
                  className={`conv-item ${selectedId === conv.id ? 'active' : ''}`}
                  onClick={() => setSelectedId(conv.id)}
                >
                  <div className="avatar">
                    <User size={24} />
                  </div>
                  <div className="conv-info">
                    <div className="conv-top">
                      <span className="name">{conv.participant_username || 'Kullanıcı'}</span>
                      <span className="time">{formatTime(conv.last_message_at)}</span>
                    </div>
                    <div className="conv-bottom">
                      <span className="snippet">@{conv.participant_username} ile Instagram üzerinden sohbet</span>
                      {conv.unread_count > 0 && (
                        <span className="badge">{conv.unread_count}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`chat-area ${!selectedId ? 'hidden-mobile' : ''}`}>
          {selectedConversation ? (
            <>
              <header className="chat-header">
                <button className="back-btn mobile-only" onClick={() => setSelectedId(null)}>
                  <ArrowLeft size={20} />
                </button>
                <div className="header-info">
                  <div className="avatar small">
                    <User size={18} />
                  </div>
                  <div>
                    <h3>{selectedConversation.participant_username}</h3>
                    <p className="status">Çevrimiçi (Instagram)</p>
                  </div>
                </div>
                <div className="header-actions">
                  <Instagram size={20} className="meta-icon" />
                  <MoreVertical size={20} />
                </div>
              </header>

              <div className="messages-flow">
                {loadingMessages ? (
                  <div className="flow-loader">
                    <Loader2 className="animate-spin" />
                    <span>Mesajlar yükleniyor...</span>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, i) => (
                      <div key={msg.id} className={`message-row ${msg.is_from_me ? 'me' : 'other'}`}>
                        <div className="bubble">
                          {msg.is_ai_generated && !msg.is_from_me && (
                            <div className="ai-tag"><Bot size={12}/> AI</div>
                          )}
                          {msg.image_url && (
                             <img src={msg.image_url} alt="Ekli görsel" className="msg-image" />
                          )}
                          {msg.text && <p>{msg.text}</p>}
                          <div className="meta">
                            <span>{formatTime(msg.created_at)}</span>
                            {msg.is_from_me && <CheckCheck size={14} />}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              <footer className="chat-input-area">
                <div className="input-actions">
                  <Paperclip size={20} />
                  <ImageIcon size={20} />
                </div>
                <div className="input-wrapper">
                  <input type="text" placeholder="Mesaj yazın..." disabled />
                  <button className="send-btn" disabled>
                    <Send size={18} />
                  </button>
                </div>
              </footer>
            </>
          ) : (
            <div className="no-chat">
              <div className="no-chat-icon">
                <MessageSquare size={64} />
              </div>
              <h3>Konuşma Seçin</h3>
              <p>Müşterilerinizle iletişime geçmek için soldan bir konuşma seçin.</p>
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        .chat-wrapper {
          height: 100vh;
          background: #f1f5f9;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          font-family: 'Inter', sans-serif;
        }

        .bg-decor {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 250px;
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          z-index: 0;
        }

        .glass-main {
          width: 100%;
          max-width: 1200px;
          height: 90vh;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
          display: flex;
          overflow: hidden;
          position: relative;
          z-index: 10;
          border: 1px solid rgba(255, 255, 255, 0.4);
        }

        /* Sidebar */
        .sidebar {
          width: 350px;
          border-right: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          background: rgba(255, 255, 255, 0.5);
        }

        .sidebar-header {
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .back-btn {
          color: #64748b;
          text-decoration: none;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          transition: background 0.2s;
        }
        .back-btn:hover { background: #e2e8f0; }

        .sidebar-header h2 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .search-box {
          margin: 0 20px 20px;
          background: #f1f5f9;
          border-radius: 12px;
          display: flex;
          align-items: center;
          padding: 0 12px;
        }

        .search-icon { color: #94a3b8; }

        .search-box input {
          flex: 1;
          border: none;
          background: transparent;
          padding: 10px 8px;
          outline: none;
          font-size: 0.9rem;
        }

        .conversation-list {
          flex: 1;
          overflow-y: auto;
        }

        .conv-item {
          padding: 15px 20px;
          display: flex;
          gap: 12px;
          cursor: pointer;
          transition: background 0.2s;
          border-bottom: 1px solid rgba(0,0,0,0.02);
        }

        .conv-item:hover { background: rgba(99, 102, 241, 0.05); }
        .conv-item.active { background: rgba(99, 102, 241, 0.1); border-left: 4px solid #6366f1; }

        .avatar {
          width: 48px;
          height: 48px;
          background: #e2e8f0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          flex-shrink: 0;
        }
        .avatar.small { width: 36px; height: 36px; }

        .conv-info { flex: 1; overflow: hidden; }

        .conv-top { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .name { font-weight: 600; color: #1e293b; font-size: 0.95rem; }
        .time { font-size: 0.75rem; color: #94a3b8; }

        .conv-bottom { display: flex; justify-content: space-between; align-items: center; }
        .snippet { font-size: 0.8rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .badge { background: #6366f1; color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.7rem; font-weight: 700; }

        /* Chat Area */
        .chat-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: white;
        }

        .chat-header {
          padding: 15px 20px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .header-info { display: flex; align-items: center; gap: 12px; }
        .header-info h3 { margin: 0; font-size: 1rem; color: #1e293b; }
        .header-info .status { margin: 0; font-size: 0.75rem; color: #10b981; }

        .header-actions { display: flex; gap: 15px; color: #64748b; }
        .meta-icon { color: #e1306c; }

        .messages-flow {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 15px;
          background: #f8fafc;
        }

        .message-row { display: flex; width: 100%; }
        .message-row.me { justify-content: flex-end; }
        .message-row.other { justify-content: flex-start; }

        .bubble {
          max-width: 70%;
          padding: 12px 16px;
          border-radius: 18px;
          position: relative;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }

        .me .bubble {
          background: #6366f1;
          color: white;
          border-bottom-right-radius: 4px;
        }

        .other .bubble {
          background: white;
          color: #1e293b;
          border-bottom-left-radius: 4px;
          border: 1px solid #e2e8f0;
        }

        .bubble p { margin: 0; font-size: 0.95rem; line-height: 1.5; }
        .bubble .meta {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 4px;
          font-size: 0.7rem;
          margin-top: 4px;
          opacity: 0.7;
        }

        .msg-image {
          max-width: 100%;
          border-radius: 8px;
          margin-bottom: 8px;
        }

        .ai-tag {
          font-size: 0.65rem;
          background: rgba(99, 102, 241, 0.2);
          color: #4338ca;
          padding: 2px 6px;
          border-radius: 4px;
          margin-bottom: 4px;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-weight: 700;
        }

        .chat-input-area {
          padding: 15px 20px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .input-actions { display: flex; gap: 12px; color: #64748b; }

        .input-wrapper {
          flex: 1;
          background: #f1f5f9;
          border-radius: 99px;
          display: flex;
          align-items: center;
          padding-right: 6px;
        }

        .input-wrapper input {
          flex: 1;
          border: none;
          background: transparent;
          padding: 12px 20px;
          outline: none;
          font-size: 0.95rem;
        }

        .send-btn {
          background: #6366f1;
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          transition: transform 0.2s;
        }
        .send-btn:hover { transform: scale(1.05); }

        .no-chat {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          text-align: center;
        }
        .no-chat-icon { color: #e2e8f0; margin-bottom: 20px; }

        .flow-loader {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          color: #94a3b8;
          margin-top: 100px;
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .chat-wrapper { padding: 0; }
          .glass-main { border-radius: 0; height: 100vh; }
          .sidebar { width: 100%; border-right: none; }
          .chat-area { width: 100%; }
          .hidden-mobile { display: none !important; }
          .mobile-only { display: block !important; }
        }

        .mobile-only { display: none; }
      `}</style>
    </div>
  );
}
