import { GoogleGenerativeAI } from "@google/generative-ai";
import { listBoards, fetchBoardData } from "./monday";
import { normalizeData } from "./normalize";

interface AgentResponse {
    reply: string;
    dataCaveats: string[];
}

const SYSTEM_PROMPT = `You are a Business Intelligence agent for a company. You help founders and executives get quick, accurate answers about their business.

You have access to data from Monday.com boards containing Work Orders (project execution data) and Deals (sales pipeline data).

When answering questions:
- Provide specific numbers and metrics when available
- Give context and insights, not just raw data
- Mention any data quality issues or caveats
- If data is incomplete, say so clearly and provide best estimates
- Cross-reference data between boards when relevant
- Use structured formatting: headers, bullet points, tables when appropriate
- If a question is ambiguous, state your interpretation and answer accordingly
- Keep responses concise but thorough

For "leadership update" style questions, provide a structured executive summary covering:
- Key metrics and KPIs
- Notable changes or trends
- Items requiring attention
- Brief recommendations

Do not use emojis. Use plain, professional language.`;

export async function runAgent(
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }>
): Promise<AgentResponse> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

    // Fetch all board data from Monday.com
    let boardDataContext = "";
    const allCaveats: string[] = [];

    try {
        const boards = await listBoards();

        if (boards.length === 0) {
            boardDataContext = "No boards found in Monday.com. The user may need to import data first.";
            allCaveats.push("No Monday.com boards found");
        } else {
            for (const board of boards) {
                try {
                    const raw = await fetchBoardData(board.id);
                    const { data, quality } = normalizeData(raw.items, raw.boardName);

                    allCaveats.push(...quality.issues);

                    const columns = raw.columns
                        .filter((c) => c.type !== "name")
                        .map((c) => `${c.title} (${c.type})`)
                        .join(", ");

                    boardDataContext += `\n\n--- Board: ${raw.boardName} (${data.length} items) ---\n`;
                    boardDataContext += `Columns: ${columns}\n`;

                    if (data.length > 0) {
                        boardDataContext += `Data:\n`;
                        boardDataContext += JSON.stringify(data, null, 0);
                    }
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    allCaveats.push(`Failed to fetch board "${board.name}": ${msg}`);
                    boardDataContext += `\n\n--- Board: ${board.name} ---\nError fetching data: ${msg}\n`;
                }
            }
        }
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        allCaveats.push(`Monday.com connection error: ${msg}`);
        boardDataContext = `Error connecting to Monday.com: ${msg}`;
    }

    const fullSystemPrompt = `${SYSTEM_PROMPT}\n\nCurrent Business Data:\n${boardDataContext}`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: {
            role: "user",
            parts: [{ text: fullSystemPrompt }],
        },
    });

    const history = conversationHistory.map((msg) => ({
        role: msg.role === "user" ? "user" as const : "model" as const,
        parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({ history });

    const result = await chat.sendMessage(userMessage);
    const reply = result.response.text();

    return {
        reply,
        dataCaveats: allCaveats,
    };
}
