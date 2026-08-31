"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
    role: "user" | "assistant";
    content: string;
    caveats?: string[];
}

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
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading, scrollToBottom]);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const sendMessage = async (text?: string) => {
        const messageText = text || input.trim();
        if (!messageText || loading) return;

        setInput("");
        setError(null);

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
                body: JSON.stringify({ message: messageText, history }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Something went wrong");
            }

            setConnected(true);
            const assistantMsg: Message = {
                role: "assistant",
                content: data.reply,
                caveats: data.dataCaveats?.filter((c: string) => c.length > 0),
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

    return (
        <div className="app">
            <header className="header">
                <div className="header-left">
                    <h1 className="header-title">Monday BI Agent</h1>
                    <span className="header-subtitle">Skylark Drones</span>
                </div>
                <div className="header-status">
                    <span className={`status-dot ${connected ? "connected" : ""}`}></span>
                    {connected ? "Connected" : "Ready"}
                </div>
            </header>

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

                {messages.map((msg, i) => (
                    <div key={i} className={`message ${msg.role}`}>
                        {i === 0 || messages[i - 1].role !== msg.role ? (
                            <span className="message-label">
                                {msg.role === "user" ? "You" : "Agent"}
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
                        <span className="loading-text">Querying Monday.com and analyzing...</span>
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
