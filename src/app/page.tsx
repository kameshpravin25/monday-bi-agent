"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
    role: "user" | "assistant";
    content: string;
    model?: string;
}

interface ChatThread {
    id: string;
    title: string;
    messages: Message[];
    timestamp: number;
}

interface ModelOption {
    id: string;
    name: string;
    provider: string;
}

const MODELS: ModelOption[] = [
    { id: "gemini-flash", name: "Gemini 3.6 Flash", provider: "gemini" },
    { id: "nemotron-ultra", name: "Nemotron 3 Ultra 550B", provider: "openrouter" },
    { id: "nemotron-super", name: "Nemotron 3 Super 120B", provider: "openrouter" },
    { id: "minimax-m3", name: "MiniMax M3", provider: "openrouter" },
    { id: "glm-5.2", name: "GLM 5.2", provider: "openrouter" },
    { id: "nemotron-nano", name: "Nemotron Nano 30B", provider: "openrouter" },
];

const STARTERS = [
    { title: "Executive Leadership Update", desc: "Consolidated commercial, operations, cash flow & risk" },
    { title: "Analyze Deals pipeline for this quarter", desc: "Open value, weighted pipeline & sector breakdown" },
    { title: "Show me operational metrics", desc: "Work order status, completion rates across projects" },
    { title: "Compare sector performance", desc: "Revenue, deal count & win rate by sector" },
];

function getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
}

function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export default function Home() {
    const [threads, setThreads] = useState<ChatThread[]>([]);
    const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState("gemini-flash");
    const [showModelPicker, setShowModelPicker] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const modelPickerRef = useRef<HTMLDivElement>(null);

    const activeThread = threads.find((t) => t.id === activeThreadId) || null;
    const messages = activeThread?.messages || [];
    const currentModel = MODELS.find((m) => m.id === selectedModel) || MODELS[0];

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => { scrollToBottom(); }, [messages, loading, scrollToBottom]);
    useEffect(() => { inputRef.current?.focus(); }, [activeThreadId]);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (modelPickerRef.current && !modelPickerRef.current.contains(e.target as Node)) {
                setShowModelPicker(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const createNewThread = () => {
        setActiveThreadId(null);
        setInput("");
        setError(null);
    };

    const startThread = (firstMessage: string): string => {
        const id = generateId();
        const title = firstMessage.length > 40 ? firstMessage.slice(0, 40) + "..." : firstMessage;
        const thread: ChatThread = { id, title, messages: [], timestamp: Date.now() };
        setThreads((prev) => [thread, ...prev]);
        setActiveThreadId(id);
        return id;
    };

    const sendMessage = async (text?: string) => {
        const messageText = text || input.trim();
        if (!messageText || loading) return;

        setInput("");
        setError(null);

        let threadId = activeThreadId;
        if (!threadId) {
            threadId = startThread(messageText);
        }

        const userMsg: Message = { role: "user", content: messageText };

        setThreads((prev) =>
            prev.map((t) =>
                t.id === threadId ? { ...t, messages: [...t.messages, userMsg] } : t
            )
        );
        setLoading(true);

        try {
            const currentMessages = activeThread?.messages || [];
            const history = currentMessages.map((m) => ({ role: m.role, content: m.content }));

            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: messageText, history, model: selectedModel }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Something went wrong");

            const assistantMsg: Message = {
                role: "assistant",
                content: data.reply,
                model: currentModel.name,
            };

            setThreads((prev) =>
                prev.map((t) =>
                    t.id === threadId ? { ...t, messages: [...t.messages, assistantMsg] } : t
                )
            );
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to get response";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        const el = e.target;
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 120) + "px";
    };

    const filteredThreads = searchQuery
        ? threads.filter((t) => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
        : threads;

    const isEmptyState = !activeThreadId || messages.length === 0;

    return (
        <div className="app-shell">
            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
                        <span>Monday BI</span>
                    </div>
                </div>

                <button className="new-chat-btn" onClick={createNewThread}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    New Chat
                </button>

                <div className="sidebar-search">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    <input
                        type="text"
                        placeholder="Search threads..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="sidebar-section-label">Recent Threads</div>
                <div className="thread-list">
                    {filteredThreads.length === 0 && (
                        <div className="thread-empty">No conversations yet</div>
                    )}
                    {filteredThreads.map((t) => (
                        <button
                            key={t.id}
                            className={`thread-item ${t.id === activeThreadId ? "active" : ""}`}
                            onClick={() => { setActiveThreadId(t.id); setError(null); }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                            <span className="thread-title">{t.title}</span>
                        </button>
                    ))}
                </div>

                <div className="sidebar-footer">
                    <span>Skylark Drones</span>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                {/* Top bar */}
                <div className="topbar">
                    <button className="topbar-menu" onClick={() => setSidebarOpen(!sidebarOpen)}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
                    </button>
                    <div className="topbar-title">
                        {activeThread ? activeThread.title : "Monday BI Agent"}
                    </div>
                    <div></div>
                </div>

                {/* Chat Area */}
                <div className="chat-area">
                    {isEmptyState ? (
                        <div className="empty-state">
                            <h2 className="greeting-text">
                                {getGreeting()}, <span className="greeting-role">Founder</span>
                            </h2>
                            <p className="greeting-sub">What&apos;s on your mind?</p>

                            {/* Input Box (empty state) */}
                            <div className="input-card">
                                <div className="input-card-inner">
                                    <textarea
                                        ref={inputRef}
                                        className="input-field"
                                        value={input}
                                        onChange={handleTextareaInput}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Ask Monday BI a business question or request a leadership update..."
                                        rows={1}
                                        disabled={loading}
                                    />
                                    <div className="input-card-bottom">
                                        <div className="model-picker-inline" ref={modelPickerRef}>
                                            <button className="model-chip" onClick={() => setShowModelPicker(!showModelPicker)}>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
                                                <span>{currentModel.name}</span>
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                                            </button>
                                            {showModelPicker && (
                                                <div className="model-dropdown">
                                                    <div className="model-dropdown-header">Select Model</div>
                                                    {MODELS.map((m) => (
                                                        <button key={m.id} className={`model-option ${m.id === selectedModel ? "active" : ""}`} onClick={() => { setSelectedModel(m.id); setShowModelPicker(false); }}>
                                                            <span>{m.name}</span>
                                                            <span className="model-provider-tag">{m.provider}</span>
                                                        </button>
                                                    ))}
                                                    <div className="model-dropdown-footer">All models are free to use</div>
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            className="send-btn"
                                            onClick={() => sendMessage()}
                                            disabled={!input.trim() || loading}
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Executive Starter Cards */}
                            <div className="starter-section">
                                <div className="starter-label">Suggested</div>
                                <div className="starter-grid">
                                    {STARTERS.map((s, i) => (
                                        <button key={i} className="starter-card" onClick={() => sendMessage(s.title)}>
                                            <div className="starter-card-top">
                                                <span className="starter-title">{s.title}</span>

                                            </div>
                                            <span className="starter-desc">{s.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="messages-list">
                                {messages.map((msg, i) => (
                                    <div key={i} className={`msg ${msg.role}`}>
                                        <div className="msg-avatar">
                                            {msg.role === "user" ? "Y" : "A"}
                                        </div>
                                        <div className="msg-body">
                                            <div className="msg-meta">
                                                <span className="msg-sender">{msg.role === "user" ? "You" : "Agent"}</span>
                                                {msg.model && <span className="msg-model">{msg.model}</span>}
                                            </div>
                                            <div className="msg-content">
                                                {msg.role === "assistant" ? (
                                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                                ) : (
                                                    msg.content
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {loading && (
                                    <div className="msg assistant">
                                        <div className="msg-avatar">A</div>
                                        <div className="msg-body">
                                            <div className="msg-meta">
                                                <span className="msg-sender">Agent</span>
                                                <span className="msg-model">{currentModel.name}</span>
                                            </div>
                                            <div className="loading-indicator">
                                                <span className="dot"></span><span className="dot"></span><span className="dot"></span>
                                                <span className="loading-label">Thinking...</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {error && <div className="error-banner">{error}</div>}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Bar (chat mode) */}
                            <div className="chat-input-bar">
                                <div className="chat-input-inner">
                                    <textarea
                                        ref={inputRef}
                                        className="input-field"
                                        value={input}
                                        onChange={handleTextareaInput}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Ask a follow-up question..."
                                        rows={1}
                                        disabled={loading}
                                    />
                                    <div className="input-card-bottom">
                                        <div className="model-picker-inline" ref={modelPickerRef}>
                                            <button className="model-chip" onClick={() => setShowModelPicker(!showModelPicker)}>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
                                                <span>{currentModel.name}</span>
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                                            </button>
                                            {showModelPicker && (
                                                <div className="model-dropdown up">
                                                    <div className="model-dropdown-header">Select Model</div>
                                                    {MODELS.map((m) => (
                                                        <button key={m.id} className={`model-option ${m.id === selectedModel ? "active" : ""}`} onClick={() => { setSelectedModel(m.id); setShowModelPicker(false); }}>
                                                            <span>{m.name}</span>
                                                            <span className="model-provider-tag">{m.provider}</span>
                                                        </button>
                                                    ))}
                                                    <div className="model-dropdown-footer">All models are free to use</div>
                                                </div>
                                            )}
                                        </div>
                                        <button className="send-btn" onClick={() => sendMessage()} disabled={!input.trim() || loading}>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
