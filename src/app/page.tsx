"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
    role: "user" | "assistant";
    content: string;
    model?: string;
}

interface ModelOption {
    id: string;
    name: string;
    provider: string;
}

const DEFAULT_MODELS: ModelOption[] = [
    { id: "gemini-flash", name: "Gemini 3.6 Flash", provider: "gemini" },
    { id: "nemotron-ultra", name: "Nemotron 3 Ultra 550B", provider: "openrouter" },
    { id: "nemotron-super", name: "Nemotron 3 Super 120B", provider: "openrouter" },
    { id: "minimax-m3", name: "MiniMax M3", provider: "openrouter" },
    { id: "glm-5.2", name: "GLM 5.2", provider: "openrouter" },
    { id: "nemotron-nano", name: "Nemotron Nano 30B", provider: "openrouter" },
];

const HINT_QUERIES = [
    "How is our sales pipeline looking this quarter?",
    "Give me a leadership update on work orders",
    "What are the top deals by value?",
    "Show me operational metrics across all projects",
];

export default function Home() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [connected, setConnected] = useState(false);
    const [selectedModel, setSelectedModel] = useState("gemini-flash");
    const [showModelPicker, setShowModelPicker] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const modelPickerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading, scrollToBottom]);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Close model picker on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (modelPickerRef.current && !modelPickerRef.current.contains(e.target as Node)) {
                setShowModelPicker(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const currentModel = DEFAULT_MODELS.find((m) => m.id === selectedModel) || DEFAULT_MODELS[0];

    const sendMessage = async (text?: string) => {
        const messageText = text || input.trim();
        if (!messageText || loading) return;

        setInput("");
        setError(null);
        setShowSearch(false);
        setSearchQuery("");

        const userMsg: Message = { role: "user", content: messageText };
        setMessages((prev) => [...prev, userMsg]);
        setLoading(true);

        try {
            const history = messages.map((m) => ({
                role: m.role,
                content: m.content,
            }));

            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: messageText, history, model: selectedModel }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Something went wrong");
            }

            setConnected(true);
            const assistantMsg: Message = {
                role: "assistant",
                content: data.reply,
                model: currentModel.name,
            };
            setMessages((prev) => [...prev, assistantMsg]);
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

    // Filter messages by search
    const filteredMessages = searchQuery
        ? messages.filter((m) =>
            m.content.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : messages;

    return (
        <div className="app">
            <header className="header">
                <div className="header-left">
                    <h1 className="header-title">Monday BI Agent</h1>
                    <span className="header-subtitle">Skylark Drones</span>
                </div>
                <div className="header-actions">
                    <button
                        className="icon-btn"
                        onClick={() => { setShowSearch(!showSearch); setSearchQuery(""); }}
                        aria-label="Search messages"
                        title="Search messages"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </button>
                    <div className="model-picker-wrapper" ref={modelPickerRef}>
                        <button
                            className="model-btn"
                            onClick={() => setShowModelPicker(!showModelPicker)}
                        >
                            <span className="model-btn-name">{currentModel.name}</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>
                        {showModelPicker && (
                            <div className="model-dropdown">
                                <div className="model-dropdown-header">Select Model</div>
                                {DEFAULT_MODELS.map((m) => (
                                    <button
                                        key={m.id}
                                        className={`model-option ${m.id === selectedModel ? "active" : ""}`}
                                        onClick={() => {
                                            setSelectedModel(m.id);
                                            setShowModelPicker(false);
                                        }}
                                    >
                                        <span className="model-option-name">{m.name}</span>
                                        <span className="model-option-provider">{m.provider}</span>
                                    </button>
                                ))}
                                <div className="model-dropdown-footer">All models are free to use</div>
                            </div>
                        )}
                    </div>
                    <div className="header-status">
                        <span className={`status-dot ${connected ? "connected" : ""}`}></span>
                        {connected ? "Connected" : "Ready"}
                    </div>
                </div>
            </header>

            {showSearch && (
                <div className="search-bar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search in conversation..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                    {searchQuery && (
                        <span className="search-count">
                            {filteredMessages.length} found
                        </span>
                    )}
                </div>
            )}

            <div className="messages">
                {messages.length === 0 && !loading && (
                    <div className="empty-state">
                        <div className="empty-icon">/</div>
                        <p className="empty-title">Ask anything about your business data</p>
                        <div className="empty-hints">
                            {HINT_QUERIES.map((hint, i) => (
                                <button
                                    key={i}
                                    className="empty-hint"
                                    onClick={() => sendMessage(hint)}
                                >
                                    {hint}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {filteredMessages.map((msg, i) => (
                    <div key={i} className={`message ${msg.role}`}>
                        {i === 0 || filteredMessages[i - 1].role !== msg.role ? (
                            <span className="message-label">
                                {msg.role === "user" ? "You" : "Agent"}
                                {msg.model && <span className="message-model">{msg.model}</span>}
                            </span>
                        ) : null}
                        <div className="message-content">
                            {msg.role === "assistant" ? (
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                            ) : (
                                msg.content
                            )}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="loading">
                        <div className="loading-dots">
                            <span className="loading-dot"></span>
                            <span className="loading-dot"></span>
                            <span className="loading-dot"></span>
                        </div>
                        <span className="loading-text">Querying with {currentModel.name}...</span>
                    </div>
                )}

                {error && (
                    <div className="error-message">{error}</div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <div className="input-area">
                <div className="input-wrapper">
                    <textarea
                        ref={inputRef}
                        className="input-field"
                        value={input}
                        onChange={handleTextareaInput}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about work orders, deals, pipeline..."
                        rows={1}
                        disabled={loading}
                    />
                    <button
                        className="send-btn"
                        onClick={() => sendMessage()}
                        disabled={!input.trim() || loading}
                        aria-label="Send message"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
