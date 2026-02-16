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

function compressImage(file: File, maxSize = 1024, quality = 0.85): Promise<File> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) return resolve(file);
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          resolve(new File([blob!], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality,
      );
    };
    img.src = URL.createObjectURL(file);
  });
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
  const [files, setFiles] = useState<FileList | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const send = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if ((!text && !files) || isLoading) return;
    setInput("");
    setFiles(null);
    let compressed: FileList | undefined;
    if (files) {
      const dt = new DataTransfer();
      const results = await Promise.all(Array.from(files).map((f) => compressImage(f)));
      results.forEach((f) => dt.items.add(f));
      compressed = dt.files;
    }
    sendMessage({ text, files: compressed });
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
              .filter((p) => p.type === "text" || p.type === "file")
              .map((p, i) =>
                p.type === "file" ? (
                  <img key={i} src={p.url} alt="uploaded" />
                ) : (
                  <span key={i}>{p.text}</span>
                )
              )}
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
        {files && files.length > 0 && (
          <div className="image-preview">
            {Array.from(files).map((f, i) => (
              <div key={i} className="image-preview-item">
                <img src={URL.createObjectURL(f)} alt="preview" />
                <button
                  type="button"
                  className="remove-btn"
                  onClick={() => {
                    const dt = new DataTransfer();
                    Array.from(files).forEach((file, idx) => {
                      if (idx !== i) dt.items.add(file);
                    });
                    setFiles(dt.files.length > 0 ? dt.files : null);
                  }}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              const dt = new DataTransfer();
              Array.from(e.target.files).forEach((f) => dt.items.add(f));
              setFiles(dt.files);
            }
            e.target.value = "";
          }}
        />
        <button
          type="button"
          className="attach-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
              stroke="#666"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="輸入訊息..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button type="submit" className="send-btn" disabled={isLoading || (!input.trim() && !files)}>
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
