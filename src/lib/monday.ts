const MONDAY_API_URL = "https://api.monday.com/v2";

interface MondayColumn {
    id: string;
    title: string;
    type: string;
}

interface MondayItem {
    id: string;
    name: string;
    column_values: Array<{
        id: string;
        text: string;
        value: string | null;
        column: {
            title: string;
        };
    }>;
}

interface BoardData {
    boardId: string;
    boardName: string;
    columns: MondayColumn[];
    items: Record<string, string>[];
    totalItems: number;
}

async function mondayQuery(query: string, variables?: Record<string, unknown>): Promise<unknown> {
    const token = process.env.MONDAY_API_TOKEN;
    if (!token) throw new Error("MONDAY_API_TOKEN is not set");

    const res = await fetch(MONDAY_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: token,
            "API-Version": "2024-10",
        },
        body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Monday.com API error (${res.status}): ${text}`);
    }

    const data = await res.json();
    if (data.errors) {
        throw new Error(`Monday.com GraphQL error: ${JSON.stringify(data.errors)}`);
    }
    return data;
}

export async function listBoards(): Promise<Array<{ id: string; name: string }>> {
    const query = `query { boards(limit: 50) { id name } }`;
    const data = (await mondayQuery(query)) as {
        data: { boards: Array<{ id: string; name: string }> };
    };
    return data.data.boards;
}

export async function fetchBoardData(boardId: string): Promise<BoardData> {
    const allItems: Record<string, string>[] = [];
    let cursor: string | null = null;
    let boardName = "";
    let columns: MondayColumn[] = [];

    // First page
    const firstQuery = `query ($boardId: [ID!]!) {
    boards(ids: $boardId) {
      name
      columns { id title type }
      items_page(limit: 500) {
        cursor
        items {
          id
          name
          column_values {
            id
            text
            value
            column { title }
          }
        }
      }
    }
  }`;

    const firstData = (await mondayQuery(firstQuery, { boardId: [boardId] })) as {
        data: {
            boards: Array<{
                name: string;
                columns: MondayColumn[];
                items_page: {
                    cursor: string | null;
                    items: MondayItem[];
                };
            }>;
        };
    };

    const board = firstData.data.boards[0];
    if (!board) throw new Error(`Board ${boardId} not found`);

    boardName = board.name;
    columns = board.columns;
    cursor = board.items_page.cursor;

    for (const item of board.items_page.items) {
        const row: Record<string, string> = { Name: item.name };
        for (const cv of item.column_values) {
            row[cv.column.title] = cv.text || "";
        }
        allItems.push(row);
    }

    // Paginate
    while (cursor) {
        const nextQuery = `query ($cursor: String!) {
      next_items_page(cursor: $cursor, limit: 500) {
        cursor
        items {
          id
          name
          column_values {
            id
            text
            value
            column { title }
          }
        }
      }
    }`;

        const nextData = (await mondayQuery(nextQuery, { cursor })) as {
            data: {
                next_items_page: {
                    cursor: string | null;
                    items: MondayItem[];
                };
            };
        };

        cursor = nextData.data.next_items_page.cursor;
        for (const item of nextData.data.next_items_page.items) {
            const row: Record<string, string> = { Name: item.name };
            for (const cv of item.column_values) {
                row[cv.column.title] = cv.text || "";
            }
            allItems.push(row);
        }
    }

    return {
        boardId,
        boardName,
        columns,
        items: allItems,
        totalItems: allItems.length,
    };
}
