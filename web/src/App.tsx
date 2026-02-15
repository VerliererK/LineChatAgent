import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import "./App.css";

function AuthGate({ onAuth }: { onAuth: (key: string) => void }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) {
      setError("金鑰不可為空。");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/settings", {
        headers: { Authorization: `Bearer ${trimmed}` },
      });
      if (res.ok) {
        sessionStorage.setItem("authKey", trimmed);
        onAuth(trimmed);
      } else {
        setError(res.status === 401 ? "授權金鑰不正確。" : "伺服器錯誤。");
      }
    } catch {
      setError("無法連線至伺服器。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>請輸入授權金鑰</h2>
        <input
          type="password"
          placeholder="Authorization Key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          autoFocus
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "驗證中..." : "進入"}
        </button>
      </form>
    </div>
  );
}

function Chat({ authKey }: { authKey: string }) {
  const transportRef = useRef(
    new DefaultChatTransport({
      api: "/api/chat",
      headers: { Authorization: `Bearer ${authKey}` },
    })
  );

  const { messages, sendMessage, status } = useChat({
    transport: transportRef.current,
  });

  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    }
  }, [input]);

  const send = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage({ text });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="chat-container">
      <header className="chat-header">LINE Agent</header>

      <div className="message-area">
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.role}`}>
            {m.parts
              .filter((p) => p.type === "text")
              .map((p, i) => (
                <span key={i}>{p.text}</span>
              ))}
          </div>
        ))}

        {isLoading && messages.at(-1)?.role !== "assistant" && (
          <div className="bubble assistant">
            <div className="typing-dots">
              <span /><span /><span />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form className="input-area" onSubmit={send}>
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="輸入訊息..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button type="submit" className="send-btn" disabled={isLoading || !input.trim()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>
    </div>
  );
}

export default function App() {
  const [authKey, setAuthKey] = useState<string | null>(() =>
    sessionStorage.getItem("authKey")
  );
  const [checked, setChecked] = useState(!authKey);

  useEffect(() => {
    if (!authKey) return;
    fetch("/api/settings", {
      headers: { Authorization: `Bearer ${authKey}` },
    }).then((res) => {
      if (!res.ok) {
        sessionStorage.removeItem("authKey");
        setAuthKey(null);
      }
      setChecked(true);
    }).catch(() => {
      setChecked(true);
    });
  }, []);

  if (!checked) return null;
  if (!authKey) return <AuthGate onAuth={setAuthKey} />;
  return <Chat authKey={authKey} />;
}
