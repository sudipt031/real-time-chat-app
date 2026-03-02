import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
  "#FECA57", "#FF9FF3", "#54A0FF", "#5F27CD",
];

function getColor(name) {
  let hash = 0;
  for (let c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function App() {
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typing, setTyping] = useState([]);
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);

  useEffect(() => {
    socket.on("message_history", (history) => setMessages(history));
    socket.on("new_message", (msg) => setMessages((prev) => [...prev, msg]));
    socket.on("users_update", (users) => setOnlineUsers(users));
    socket.on("typing_update", (users) => setTyping(users));
    return () => socket.removeAllListeners();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const join = () => {
    if (!username.trim()) return;
    socket.emit("join", username.trim());
    setJoined(true);
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    socket.emit("send_message", { text: input.trim() });
    setInput("");
    socket.emit("stop_typing");
  };

  const handleTyping = (e) => {
    setInput(e.target.value);
    socket.emit("typing");
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => socket.emit("stop_typing"), 1500);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!joined) {
    return (
      <div style={styles.loginWrap}>
        <div style={styles.loginCard}>
          <div style={styles.logo}>💬</div>
          <h1 style={styles.loginTitle}>NexChat</h1>
          <p style={styles.loginSub}>Real-time. Fast. Simple.</p>
          <input
            style={styles.loginInput}
            placeholder="Enter your username..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && join()}
            autoFocus
          />
          <button style={styles.loginBtn} onClick={join}>
            Join Chat →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.appWrap}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <span style={styles.logo2}>💬</span>
          <span style={styles.appName}>NexChat</span>
        </div>
        <div style={styles.sidebarSection}>
          <div style={styles.sectionLabel}>ONLINE — {onlineUsers.length}</div>
          {onlineUsers.map((u) => (
            <div key={u} style={styles.userRow}>
              <div style={{ ...styles.avatar, background: getColor(u) }}>
                {u[0].toUpperCase()}
              </div>
              <span style={styles.userName}>
                {u} {u === username && <span style={styles.you}>(you)</span>}
              </span>
              <div style={styles.dot} />
            </div>
          ))}
        </div>
      </aside>

      {/* Main */}
      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <div style={styles.headerTitle}># general</div>
            <div style={styles.headerSub}>{onlineUsers.length} members online</div>
          </div>
        </header>

        {/* Messages */}
        <div style={styles.messages}>
          {messages.map((msg, i) => {
            const isMe = msg.username === username;
            const isSystem = msg.type === "system";
            if (isSystem) {
              return (
                <div key={i} style={styles.systemMsg}>
                  {msg.text}
                </div>
              );
            }
            return (
              <div key={i} style={{ ...styles.msgRow, flexDirection: isMe ? "row-reverse" : "row" }}>
                <div style={{ ...styles.avatar, background: getColor(msg.username), flexShrink: 0 }}>
                  {msg.username[0].toUpperCase()}
                </div>
                <div style={{ maxWidth: "65%", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                  <div style={styles.msgMeta}>
                    {!isMe && <span style={{ ...styles.msgName, color: getColor(msg.username) }}>{msg.username}</span>}
                    <span style={styles.msgTime}>{new Date(msg.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div style={{ ...styles.bubble, background: isMe ? "#6C63FF" : "#1e2030", borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px" }}>
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })}
          {typing.filter((u) => u !== username).length > 0 && (
            <div style={styles.typingIndicator}>
              {typing.filter((u) => u !== username).join(", ")} {typing.length === 1 ? "is" : "are"} typing
              <span style={styles.dots}>
                <span>.</span><span>.</span><span>.</span>
              </span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={styles.inputArea}>
          <textarea
            style={styles.textInput}
            placeholder={`Message #general as ${username}...`}
            value={input}
            onChange={handleTyping}
            onKeyDown={handleKey}
            rows={1}
          />
          <button style={styles.sendBtn} onClick={sendMessage}>
            ➤
          </button>
        </div>
      </main>
    </div>
  );
}

const styles = {
  loginWrap: { minHeight: "100vh", background: "#0d0f1a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif" },
  loginCard: { background: "#13162a", border: "1px solid #2a2d4a", borderRadius: 20, padding: "48px 40px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, minWidth: 340 },
  logo: { fontSize: 52 },
  logo2: { fontSize: 22 },
  loginTitle: { color: "#fff", fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: -1 },
  loginSub: { color: "#6b7280", margin: 0, fontSize: 14 },
  loginInput: { width: "100%", boxSizing: "border-box", background: "#1e2030", border: "1px solid #2a2d4a", borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: 16, outline: "none" },
  loginBtn: { width: "100%", background: "#6C63FF", color: "#fff", border: "none", borderRadius: 10, padding: "13px 24px", fontSize: 16, fontWeight: 700, cursor: "pointer" },
  appWrap: { display: "flex", height: "100vh", background: "#0d0f1a", fontFamily: "'Segoe UI', sans-serif", color: "#fff", overflow: "hidden" },
  sidebar: { width: 240, background: "#0a0c18", borderRight: "1px solid #1a1d30", display: "flex", flexDirection: "column", padding: "20px 0" },
  sidebarHeader: { display: "flex", alignItems: "center", gap: 8, padding: "0 16px 20px", borderBottom: "1px solid #1a1d30" },
  appName: { fontWeight: 800, fontSize: 18, color: "#6C63FF" },
  sidebarSection: { padding: "16px" },
  sectionLabel: { fontSize: 11, color: "#4b5563", fontWeight: 700, letterSpacing: 1, marginBottom: 10 },
  userRow: { display: "flex", alignItems: "center", gap: 8, padding: "6px 0" },
  avatar: { width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 },
  userName: { fontSize: 13, color: "#d1d5db", flex: 1 },
  you: { color: "#6b7280", fontSize: 11 },
  dot: { width: 8, height: 8, borderRadius: "50%", background: "#22c55e" },
  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  header: { padding: "16px 24px", borderBottom: "1px solid #1a1d30", background: "#0a0c18" },
  headerTitle: { fontWeight: 700, fontSize: 16 },
  headerSub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  messages: { flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 },
  systemMsg: { textAlign: "center", color: "#4b5563", fontSize: 12, padding: "4px 0" },
  msgRow: { display: "flex", gap: 10, alignItems: "flex-end" },
  msgMeta: { display: "flex", gap: 8, alignItems: "baseline", marginBottom: 4, paddingLeft: 2 },
  msgName: { fontSize: 12, fontWeight: 700 },
  msgTime: { fontSize: 11, color: "#4b5563" },
  bubble: { padding: "10px 14px", fontSize: 14, lineHeight: 1.5, color: "#e5e7eb", wordBreak: "break-word" },
  typingIndicator: { color: "#6b7280", fontSize: 12, fontStyle: "italic", display: "flex", alignItems: "center", gap: 4 },
  dots: { display: "inline-flex", gap: 2 },
  inputArea: { padding: "16px 24px", borderTop: "1px solid #1a1d30", display: "flex", gap: 12, alignItems: "flex-end", background: "#0a0c18" },
  textInput: { flex: 1, background: "#1e2030", border: "1px solid #2a2d4a", borderRadius: 12, padding: "12px 16px", color: "#fff", fontSize: 14, outline: "none", resize: "none", lineHeight: 1.5, fontFamily: "inherit" },
  sendBtn: { background: "#6C63FF", border: "none", color: "#fff", width: 44, height: 44, borderRadius: 12, fontSize: 16, cursor: "pointer", flexShrink: 0 },
};
