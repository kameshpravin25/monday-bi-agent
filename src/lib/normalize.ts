interface DataQualityReport {
    totalFields: number;
    missingFields: number;
    cleanedFields: number;
    issues: string[];
}

interface NormalizedResult {
    data: Record<string, string>[];
    quality: DataQualityReport;
}

function normalizeDate(value: string): string {
    if (!value || value.trim() === "") return "";
    const trimmed = value.trim();

    // Already in YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);

    // DD/MM/YYYY or DD-MM-YYYY
    const dmy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmy) {
        const [, d, m, y] = dmy;
        return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    // MM/DD/YYYY
    const mdy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (mdy) {
        const parsed = new Date(trimmed);
        if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().slice(0, 10);
        }
    }

    // Try generic parse
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().slice(0, 10);
    }

    return trimmed;
}

function normalizeCurrency(value: string): string {
    if (!value || value.trim() === "") return "";
    const trimmed = value.trim();

    // Remove currency symbols and commas
    let cleaned = trimmed.replace(/[₹$€£,]/g, "").trim();

    // Handle Lakhs/Cr notation
    const lakhMatch = cleaned.match(/^([\d.]+)\s*(L|Lakh|Lakhs)/i);
    if (lakhMatch) {
        return String(parseFloat(lakhMatch[1]) * 100000);
    }

    const crMatch = cleaned.match(/^([\d.]+)\s*(Cr|Crore|Crores)/i);
    if (crMatch) {
        return String(parseFloat(crMatch[1]) * 10000000);
    }

    // If it's a plain number, return it
    const num = parseFloat(cleaned);
    if (!isNaN(num)) return String(num);

    return trimmed;
}

function normalizeText(value: string): string {
    if (!value) return "";
    return value.trim().replace(/\s+/g, " ");
}

const DATE_KEYWORDS = ["date", "created", "updated", "deadline", "due", "start", "end", "time"];
const CURRENCY_KEYWORDS = ["amount", "value", "price", "cost", "revenue", "budget", "fee", "payment", "total"];

function isDateColumn(title: string): boolean {
    const lower = title.toLowerCase();
    return DATE_KEYWORDS.some((k) => lower.includes(k));
}

function isCurrencyColumn(title: string): boolean {
    const lower = title.toLowerCase();
    return CURRENCY_KEYWORDS.some((k) => lower.includes(k));
}

export function normalizeData(
    items: Record<string, string>[],
    boardName: string
): NormalizedResult {
    const quality: DataQualityReport = {
        totalFields: 0,
        missingFields: 0,
        cleanedFields: 0,
        issues: [],
    };

    if (items.length === 0) {
        quality.issues.push(`${boardName}: No data found`);
        return { data: [], quality };
    }

    const columns = Object.keys(items[0]);

    const normalized = items.map((item) => {
        const row: Record<string, string> = {};
        for (const col of columns) {
            quality.totalFields++;
            const raw = item[col];

            if (!raw || raw.trim() === "" || raw === "null" || raw === "undefined") {
                quality.missingFields++;
                row[col] = "";
                continue;
            }

            let value = raw;
            if (isDateColumn(col)) {
                const norm = normalizeDate(raw);
                if (norm !== raw) quality.cleanedFields++;
                value = norm;
            } else if (isCurrencyColumn(col)) {
                const norm = normalizeCurrency(raw);
                if (norm !== raw) quality.cleanedFields++;
                value = norm;
            } else {
                const norm = normalizeText(raw);
                if (norm !== raw) quality.cleanedFields++;
                value = norm;
            }

            row[col] = value;
        }
        return row;
    });

    if (quality.missingFields > 0) {
        const pct = ((quality.missingFields / quality.totalFields) * 100).toFixed(1);
        quality.issues.push(
            `${boardName}: ${quality.missingFields}/${quality.totalFields} fields (${pct}%) are empty or missing`
        );
    }

    return { data: normalized, quality };
}
