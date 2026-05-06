import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";

let socket;

// ── Helpers ──────────────────────────────────────────────
const AVATAR_COLORS = [
  "#6366f1","#8b5cf6","#ec4899","#f59e0b",
  "#10b981","#3b82f6","#ef4444","#14b8a6",
];
const getColor = (name = "") => {
  let h = 0;
  for (let c of name) h += c.charCodeAt(0);
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};
const initials = (name = "") =>
  name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

const relativeTime = (iso) => {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
};

const ROOMS = [
  { name: "General", icon: "🌐", desc: "General chat" },
  { name: "Coding",  icon: "💻", desc: "Dev talk" },
  { name: "Gaming",  icon: "🎮", desc: "Gaming chat" },
  { name: "Music",   icon: "🎵", desc: "Tunes & vibes" },
];

const REACTION_EMOJIS = ["❤️","😂","🔥","👍","😮","😢"];

// ── Avatar ────────────────────────────────────────────────
function Avatar({ name, size = 36, showRing = false }) {
  const color = getColor(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, ${color}dd, ${color}88)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, color: "#fff",
      flexShrink: 0,
      boxShadow: showRing ? `0 0 0 2px ${color}66, 0 0 0 4px #12141a` : "none",
      fontFamily: "'Sora', sans-serif",
    }}>
      {initials(name)}
    </div>
  );
}

// ── Message Bubble ─────────────────────────────────────────
function MessageBubble({ msg, isMe, onReact, onReply, replyMsg }) {
  const [showActions, setShowActions] = useState(false);
  const [showReactPicker, setShowReactPicker] = useState(false);

  const reactionCounts = {};
  (msg.reactions || []).forEach(r => {
    reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isMe ? "row-reverse" : "row",
        alignItems: "flex-end",
        gap: 10,
        animation: "msgPop 0.25s cubic-bezier(.34,1.56,.64,1)",
        position: "relative",
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowReactPicker(false); }}
    >
      {!isMe && <Avatar name={msg.user} />}

      <div style={{ maxWidth: "62%", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", gap: 3 }}>
        {!isMe && (
          <span style={{ fontSize: 12, color: "#6b7280", paddingLeft: 4, fontWeight: 600, color: getColor(msg.user) }}>
            {msg.user}
          </span>
        )}

        {/* Reply preview */}
        {msg.replyTo && (
          <div style={{
            background: "rgba(255,255,255,0.04)",
            borderLeft: "3px solid #6366f1",
            borderRadius: "8px 8px 0 0",
            padding: "6px 10px",
            fontSize: 12,
            color: "#9ca3af",
            maxWidth: "100%",
          }}>
            <span style={{ color: "#6366f1", fontWeight: 600 }}>↩ {msg.replyTo.user}: </span>
            {msg.replyTo.text?.slice(0, 60)}{msg.replyTo.text?.length > 60 ? "…" : ""}
          </div>
        )}

        {/* Bubble */}
        <div style={{
          background: isMe
            ? "linear-gradient(135deg, #6366f1, #818cf8)"
            : "rgba(255,255,255,0.055)",
          backdropFilter: "blur(10px)",
          border: isMe ? "none" : "1px solid rgba(255,255,255,0.07)",
          borderRadius: isMe
            ? (msg.replyTo ? "16px 4px 16px 16px" : "16px 4px 16px 16px")
            : (msg.replyTo ? "4px 16px 16px 16px" : "4px 16px 16px 16px"),
          padding: "10px 14px",
          color: "#f1f5f9",
          fontSize: 15,
          lineHeight: 1.55,
          wordBreak: "break-word",
          boxShadow: isMe ? "0 4px 20px rgba(99,102,241,0.3)" : "0 2px 12px rgba(0,0,0,0.2)",
          position: "relative",
        }}>
          {msg.text}
          <span style={{
            display: "block",
            fontSize: 10,
            color: isMe ? "rgba(255,255,255,0.55)" : "#4b5563",
            marginTop: 4,
            textAlign: "right",
            fontFamily: "'Space Mono', monospace",
          }}>
            {relativeTime(msg.isoTime || msg.time)}
          </span>
        </div>

        {/* Reactions display */}
        {Object.keys(reactionCounts).length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 2 }}>
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => onReact(msg.id, emoji)}
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 20,
                  padding: "2px 8px",
                  cursor: "pointer",
                  fontSize: 13,
                  color: "#e2e8f0",
                  display: "flex", alignItems: "center", gap: 3,
                }}
              >
                {emoji} <span style={{ fontSize: 11 }}>{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {showActions && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          position: "absolute",
          [isMe ? "left" : "right"]: -76,
          bottom: 24,
          zIndex: 10,
        }}>
          {/* React picker */}
          {showReactPicker && (
            <div style={{
              position: "absolute",
              bottom: 36,
              [isMe ? "left" : "right"]: 0,
              background: "#1e2130",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              padding: "6px 8px",
              display: "flex",
              gap: 4,
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}>
              {REACTION_EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => { onReact(msg.id, e); setShowReactPicker(false); }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, padding: 2, transition: "transform .15s" }}
                  onMouseEnter={ev => ev.target.style.transform = "scale(1.3)"}
                  onMouseLeave={ev => ev.target.style.transform = "scale(1)"}
                >
                  {e}
                </button>
              ))}
            </div>
          )}

          <ActionBtn title="React" onClick={() => setShowReactPicker(v => !v)}>😊</ActionBtn>
          <ActionBtn title="Reply" onClick={() => onReply(msg)}>↩</ActionBtn>
        </div>
      )}
    </div>
  );
}

function ActionBtn({ children, onClick, title }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 30, height: 30,
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8,
        cursor: "pointer",
        color: "#9ca3af",
        fontSize: 14,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all .15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.2)"; e.currentTarget.style.color = "#818cf8"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#9ca3af"; }}
    >
      {children}
    </button>
  );
}

// ── Main Chat Component ────────────────────────────────────
function Chat() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username");

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typingUser, setTypingUser] = useState("");
  const [room, setRoom] = useState("General");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [unread, setUnread] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { if (!username) navigate("/"); }, []);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("messages_v2")) || [];
    setMessages(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("messages_v2", JSON.stringify(messages.slice(-200)));
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, room]);

  useEffect(() => {
    socket = io("https://realtime-chat-app-7dti.onrender.com/");
    socket.emit("join", username);

    socket.on("receiveMessage", (data) => {
      const enriched = { ...data, id: data.id || `${Date.now()}_${Math.random()}`, isoTime: new Date().toISOString(), reactions: [] };
      setMessages(prev => [...prev, enriched]);
      if (data.user !== username) {
        setUnread(prev => ({
          ...prev,
          [data.room]: (prev[data.room] || 0) + 1,
        }));
        if (Notification.permission === "granted") {
          new Notification(`${data.user} in #${data.room}`, { body: data.text });
        }
      }
    });

    socket.on("activeUsers", setUsers);

    socket.on("typing", (user) => {
      if (user !== username) {
        setTypingUser(user);
        setTimeout(() => setTypingUser(""), 1800);
      }
    });

    if (Notification.permission !== "granted") Notification.requestPermission();

    return () => socket.off("receiveMessage").off("activeUsers").off("typing");
  }, []);

  const switchRoom = (r) => {
    setRoom(r);
    setUnread(prev => ({ ...prev, [r]: 0 }));
    setShowSearch(false);
    setReplyTo(null);
  };

  const sendMessage = () => {
    const text = message.trim();
    if (!text) return;
    const data = {
      id: `${Date.now()}_${Math.random()}`,
      user: username,
      text,
      room,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isoTime: new Date().toISOString(),
      reactions: [],
      replyTo: replyTo ? { user: replyTo.user, text: replyTo.text } : null,
    };
    socket.emit("sendMessage", data);
    setMessages(prev => [...prev, data]);
    setMessage("");
    setReplyTo(null);
    inputRef.current?.focus();
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    socket.emit("typing", username);
  };

  const handleReact = (msgId, emoji) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const reactions = m.reactions || [];
      const existing = reactions.find(r => r.user === username && r.emoji === emoji);
      return {
        ...m,
        reactions: existing
          ? reactions.filter(r => !(r.user === username && r.emoji === emoji))
          : [...reactions, { user: username, emoji }],
      };
    }));
  };

  const logout = () => { localStorage.removeItem("username"); navigate("/"); };
  const clearChat = () => { localStorage.removeItem("messages_v2"); setMessages([]); };

  const filteredMessages = messages.filter(m => {
    if (m.room !== room) return false;
    if (searchQuery) return m.text.toLowerCase().includes(searchQuery.toLowerCase()) || m.user.toLowerCase().includes(searchQuery.toLowerCase());
    return true;
  });

  const EMOJIS = ["😀","😂","❤️","🔥","👍","🎉","😎","🙏"];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Sora', sans-serif; background: #0d0f18; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
        @keyframes msgPop {
          from { opacity: 0; transform: translateY(10px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideLeft { from { opacity:0; transform:translateX(-16px) } to { opacity:1; transform:translateX(0) } }
        @keyframes blink { 0%,100%{opacity:0.3} 50%{opacity:1} }
        .typing-dot { animation: blink 1.2s infinite; }
        .typing-dot:nth-child(2) { animation-delay: .2s }
        .typing-dot:nth-child(3) { animation-delay: .4s }
        input, button, textarea { font-family: 'Sora', sans-serif; }
        input::placeholder { color: #4b5563; }
      `}</style>

      <div style={{ height: "100vh", background: "#0d0f18", display: "flex", overflow: "hidden", color: "#f1f5f9" }}>

        {/* ── Sidebar ── */}
        <div style={{
          width: sidebarOpen ? 270 : 0,
          minWidth: sidebarOpen ? 270 : 0,
          overflow: "hidden",
          background: "rgba(255,255,255,0.025)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          display: "flex", flexDirection: "column",
          transition: "all .3s cubic-bezier(.4,0,.2,1)",
          animation: "slideLeft .4s ease",
        }}>

          {/* Brand */}
          <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
              }}>💬</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.3px" }}>VibeChat</div>
                <div style={{ fontSize: 11, color: "#6366f1", fontWeight: 600 }}>● LIVE</div>
              </div>
            </div>
          </div>

          {/* Rooms */}
          <div style={{ padding: "14px 10px 10px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "#4b5563", padding: "0 8px 8px" }}>
              Channels
            </div>
            {ROOMS.map(r => (
              <button
                key={r.name}
                onClick={() => switchRoom(r.name)}
                style={{
                  width: "100%", textAlign: "left",
                  padding: "9px 12px",
                  borderRadius: 10,
                  border: "none",
                  background: room === r.name ? "rgba(99,102,241,0.18)" : "transparent",
                  color: room === r.name ? "#818cf8" : "#9ca3af",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 10,
                  marginBottom: 2,
                  transition: "all .15s",
                  fontWeight: room === r.name ? 600 : 400,
                  fontSize: 14,
                  position: "relative",
                }}
                onMouseEnter={e => { if (room !== r.name) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { if (room !== r.name) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ fontSize: 16 }}>{r.icon}</span>
                <span># {r.name}</span>
                {unread[r.name] > 0 && room !== r.name && (
                  <span style={{
                    marginLeft: "auto",
                    background: "#6366f1",
                    color: "#fff",
                    borderRadius: 20,
                    padding: "1px 7px",
                    fontSize: 11,
                    fontWeight: 700,
                  }}>{unread[r.name]}</span>
                )}
              </button>
            ))}
          </div>

          {/* Online Users */}
          <div style={{ flex: 1, overflowY: "auto", padding: "6px 10px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "#4b5563", padding: "8px 8px 10px" }}>
              Online — {users.length}
            </div>
            {users.map((u, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px", borderRadius: 10, marginBottom: 2 }}>
                <div style={{ position: "relative" }}>
                  <Avatar name={u} size={32} />
                  <span style={{
                    position: "absolute", bottom: 0, right: 0,
                    width: 9, height: 9, borderRadius: "50%",
                    background: "#10b981",
                    border: "2px solid #0d0f18",
                  }} />
                </div>
                <span style={{ fontSize: 13, color: u === username ? "#818cf8" : "#d1d5db", fontWeight: u === username ? 600 : 400 }}>
                  {u}{u === username ? " (you)" : ""}
                </span>
              </div>
            ))}
          </div>

          {/* Current user footer */}
          <div style={{ padding: "12px 10px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 12, marginBottom: 10 }}>
              <Avatar name={username} size={34} showRing />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{username}</div>
                <div style={{ fontSize: 11, color: "#10b981" }}>● Active now</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={clearChat} style={btnStyle("#ef4444")}>🗑 Clear</button>
              <button onClick={logout} style={btnStyle("#374151")}>⏻ Logout</button>
            </div>
          </div>
        </div>

        {/* ── Main ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: "#0d0f18" }}>

          {/* Header */}
          <div style={{
            height: 60,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.02)",
            display: "flex", alignItems: "center",
            padding: "0 20px", gap: 12,
            backdropFilter: "blur(10px)",
          }}>
            <button
              onClick={() => setSidebarOpen(v => !v)}
              style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 20, padding: 4 }}
            >☰</button>

            <span style={{ fontSize: 18 }}>{ROOMS.find(r => r.name === room)?.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}># {room}</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>{users.length} online</div>
            </div>

            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              {showSearch && (
                <input
                  autoFocus
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    padding: "7px 14px",
                    color: "#f1f5f9",
                    fontSize: 13,
                    outline: "none",
                    width: 220,
                    animation: "fadeIn .2s ease",
                  }}
                />
              )}
              <HeaderBtn onClick={() => { setShowSearch(v => !v); setSearchQuery(""); }}>🔍</HeaderBtn>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

            {filteredMessages.length === 0 && !searchQuery && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "#374151", animation: "fadeIn .4s ease" }}>
                <div style={{ fontSize: 52 }}>{ROOMS.find(r => r.name === room)?.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#4b5563" }}>Welcome to #{room}</div>
                <div style={{ fontSize: 13, color: "#374151" }}>Be the first to say something!</div>
              </div>
            )}

            {searchQuery && filteredMessages.length === 0 && (
              <div style={{ textAlign: "center", color: "#4b5563", padding: 40 }}>
                No messages matching "{searchQuery}"
              </div>
            )}

            {filteredMessages.map((msg) => (
              <MessageBubble
                key={msg.id || msg.time}
                msg={msg}
                isMe={msg.user === username}
                onReact={handleReact}
                onReply={setReplyTo}
              />
            ))}

            {typingUser && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, animation: "fadeIn .2s ease" }}>
                <Avatar name={typingUser} size={28} />
                <div style={{
                  background: "rgba(255,255,255,0.055)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "4px 16px 16px 16px",
                  padding: "10px 16px",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  {[0,1,2].map(i => (
                    <span key={i} className="typing-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "#6b7280", display: "inline-block", animationDelay: `${i*.2}s` }} />
                  ))}
                </div>
                <span style={{ fontSize: 12, color: "#4b5563" }}>{typingUser} is typing</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Emoji bar */}
          <div style={{ padding: "8px 20px 0", display: "flex", gap: 4, background: "rgba(255,255,255,0.01)" }}>
            {EMOJIS.map(e => (
              <button
                key={e}
                onClick={() => setMessage(p => p + e)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, transition: "transform .15s", padding: 4 }}
                onMouseEnter={ev => ev.currentTarget.style.transform = "scale(1.25)"}
                onMouseLeave={ev => ev.currentTarget.style.transform = "scale(1)"}
              >{e}</button>
            ))}
          </div>

          {/* Reply preview */}
          {replyTo && (
            <div style={{
              margin: "8px 20px 0",
              background: "rgba(99,102,241,0.08)",
              border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: 10,
              padding: "8px 12px",
              display: "flex", alignItems: "center", gap: 10,
              animation: "fadeIn .2s ease",
            }}>
              <span style={{ color: "#6366f1", fontSize: 14 }}>↩</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ color: "#818cf8", fontSize: 12, fontWeight: 600 }}>{replyTo.user}: </span>
                <span style={{ color: "#9ca3af", fontSize: 12 }}>{replyTo.text?.slice(0, 80)}…</span>
              </div>
              <button onClick={() => setReplyTo(null)} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>
          )}

          {/* Input */}
          <div style={{ padding: "12px 20px 20px", display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <input
                ref={inputRef}
                type="text"
                placeholder={`Message #${room}...`}
                value={message}
                onChange={handleTyping}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  borderRadius: 14,
                  padding: "13px 18px",
                  color: "#f1f5f9",
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color .2s, box-shadow .2s",
                }}
                onFocus={e => { e.target.style.borderColor = "rgba(99,102,241,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.09)"; e.target.style.boxShadow = "none"; }}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!message.trim()}
              style={{
                padding: "13px 22px",
                background: message.trim() ? "linear-gradient(135deg, #6366f1, #818cf8)" : "rgba(255,255,255,0.05)",
                border: "none",
                borderRadius: 14,
                color: message.trim() ? "#fff" : "#4b5563",
                fontWeight: 700,
                fontSize: 14,
                cursor: message.trim() ? "pointer" : "not-allowed",
                transition: "all .2s",
                boxShadow: message.trim() ? "0 4px 16px rgba(99,102,241,0.35)" : "none",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={e => { if (message.trim()) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(99,102,241,0.45)"; }}}
              onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = message.trim() ? "0 4px 16px rgba(99,102,241,0.35)" : "none"; }}
            >
              Send 🚀
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const btnStyle = (bg) => ({
  flex: 1, padding: "8px 0", background: bg,
  border: "none", borderRadius: 8, color: "#fff",
  fontSize: 12, fontWeight: 600, cursor: "pointer",
  transition: "opacity .15s",
});

function HeaderBtn({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 10, padding: "7px 12px",
        color: "#9ca3af", cursor: "pointer", fontSize: 16,
        transition: "all .15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.15)"; e.currentTarget.style.color = "#818cf8"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#9ca3af"; }}
    >
      {children}
    </button>
  );
}

export default Chat;