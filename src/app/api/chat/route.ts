import { NextRequest, NextResponse } from "next/server";
import { runAgent, AVAILABLE_MODELS } from "@/lib/agent";

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

interface RequestBody {
    message: string;
    history: ChatMessage[];
    model?: string;
}

export async function POST(req: NextRequest) {
    try {
        const body: RequestBody = await req.json();

        if (!body.message || typeof body.message !== "string") {
            return NextResponse.json(
                { error: "Message is required" },
                { status: 400 }
            );
        }

        const history = (body.history || []).map((msg: ChatMessage) => ({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.content,
        }));

        const result = await runAgent(body.message, history, body.model);

        return NextResponse.json({
            reply: result.reply,
            dataCaveats: result.dataCaveats,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Internal server error";
        console.error("Chat API error:", err);
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({ models: AVAILABLE_MODELS });
}
