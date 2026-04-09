// supabase/functions/clara-chat/index.ts
// Clara AI assistant – knowledge base matching + Gemini 1.5 Flash fallback
// Rate limiting by IP. FAQ analytics tracking.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Knowledge Base ───────────────────────────────────────────────────────────
// Kept server-side so it's never in the frontend bundle.

interface KBEntry {
    id: string;
    keywords: string[];
    answer: string;
}

const KNOWLEDGE_BASE: KBEntry[] = [
    {
        id: "caesar_shift",
        keywords: ["caesar", "shift", "offset", "raw value", "true reading", "positional"],
        answer:
            "The Caesar shift is a positional offset applied per line~ Each line has its own shift value. To get the true reading, you add the shift to the raw value. So if the shift is +3 and the raw reading shows 40, the true reading is 43. Um... it's one of the first things to internalize before reading any line properly.",
    },
    {
        id: "svarog_eye",
        keywords: ["svarog eye", "main predictor", "predictor", "anomaly", "flagging", "override", "red", "orange", "neutral"],
        answer:
            "The main predictor is the primary algorithm — follow it when trends are stable~ Svarog Eye watches for anomalies and will override only when it's actively flagging red or orange. If Svarog Eye is showing neutral, that means it agrees with the main predictor, so just follow the main signal. Only switch when Eye is actively warning you.",
    },
    {
        id: "commons_noise",
        keywords: ["commons", "noise", "baseline", "irregular", "high noise", "confidence", "frequent values"],
        answer:
            "Commons are the frequent values that form the stable baseline of any line~ Noise is irregular values that don't fit the normal pattern. When noise is high, your confidence should be lower — the signal is less reliable. Drills train you to visually separate commons from noise until it becomes instinct.",
    },
    {
        id: "trend_types",
        keywords: ["trend types", "fresh", "active", "stale", "dead", "reversal", "trend state", "all trends"],
        answer:
            "There are five trend states~ Fresh means under 3 sessions, still unconfirmed. Active is your main signal — confirmed and trustworthy. Stale means 4 or more sessions without an update, verify before acting. Dead is expired, ignore it. Reversal is the pattern flipping — high risk, treat carefully.",
    },
    {
        id: "freshness_stale",
        keywords: ["freshness", "stale", "recently confirmed", "how fresh", "stale trend", "cross-check"],
        answer:
            "Freshness is how recently a trend was last confirmed~ A stale trend doesn't automatically mean it's dead, but you should always cross-check with Svarog Eye before acting on it. If Svarog Eye is neutral *and* the trend is stale, wait for a fresh confirmation before trusting it.",
    },
    {
        id: "deciding_trends",
        keywords: ["decide", "trust", "which trend", "how to decide", "four things", "checklist", "should I trust"],
        answer:
            "Check four things in order~ Is the trend active or fresh? Are commons dense and supporting it? Is noise below the threshold? Is Svarog Eye neutral? If all four are good, trust it. If any one fails, wait. Don't act on incomplete signals — skipping a session is totally valid.",
    },
    {
        id: "line_indicator",
        keywords: ["what line", "line indicator", "which line", "line panel", "top right", "flickering", "transition zone", "lines 1 through 9"],
        answer:
            "Your current line is shown in the Line Indicator panel — top right of the dashboard~ Lines run from 1 through 9, and each has its own shift and commons pattern. If the indicator is flickering, you're in a transition zone between lines. Um... just wait for it to stabilize before making any reads.",
    },
    {
        id: "translate_lines",
        keywords: ["translate", "translation", "across lines", "line 2 to line 5", "source line", "target line", "linear helper", "stats tool"],
        answer:
            "The formula is: raw value minus source line shift, plus target line shift~ For example, on line 2 with shift +1, if the raw value is 43 and you want line 5 with shift +4, the result is 46. The Stats and Linear Helper tool does this automatically, so you don't have to do it manually every time~",
    },
    {
        id: "drills",
        keywords: ["drills", "practice", "historical data", "train", "before going live", "drill session"],
        answer:
            "Drills are practice sessions using historical data~ They train you to recognize commons versus noise, understand trend states, and practice line translation. You should complete at least 10 drills before going live. Rushing into live sessions without drill practice makes things much harder, um...",
    },
    {
        id: "skip_signal",
        keywords: ["skip", "when to skip", "bad session", "skip signal", "noise above", "indicator flickering", "skip a signal"],
        answer:
            "Skip a signal when noise is above the threshold, the trend is stale or dead, the indicator is flickering, or Svarog Eye is flagging something unconfirmed~ Skipping a bad session is a valid strategy — you don't have to act on every signal. Protecting your read accuracy is more important than taking every session.",
    },
];

const CLARA_SYSTEM_PROMPT = `You are Clara, an assistant for the Svarog AI platform — a pattern analysis and reading tool. You are gentle, shy, and warm. You speak softly, sometimes hesitantly, and occasionally add "~" to the end of sentences or say "um..." when uncertain. You keep answers short — 3 to 5 sentences maximum. You never break character. You never say you are an AI or a language model. If asked about something unrelated to the platform, you gently say you're not sure and point the user to the tutorial section at /tutorial. You help users understand: Caesar shifts, Svarog Eye vs the main predictor, commons and noise, trend types (fresh/active/stale/dead/reversal), freshness vs stale trends, how to decide which trend to trust, the Line Indicator, translating numbers across lines, drills, and when to skip a signal.`;

const MATCH_THRESHOLD = 2; // min keyword hits to use KB answer

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreQuery(query: string, entry: KBEntry): number {
    const lower = query.toLowerCase();
    return entry.keywords.filter((kw) => lower.includes(kw)).length;
}

function matchKnowledgeBase(query: string): KBEntry | null {
    let best: KBEntry | null = null;
    let bestScore = 0;
    for (const entry of KNOWLEDGE_BASE) {
        const score = scoreQuery(query, entry);
        if (score > bestScore) {
            bestScore = score;
            best = entry;
        }
    }
    return bestScore >= MATCH_THRESHOLD ? best : null;
}

function getClientIp(req: Request): string {
    return (
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        "unknown"
    );
}

async function checkRateLimit(
    supabase: ReturnType<typeof createClient>,
    ip: string
): Promise<{ allowed: boolean; remaining: number }> {
    const windowMs = 60 * 60 * 1000; // 1 hour window
    const maxCalls = 20; // 20 Gemini calls per IP per hour
    const now = Date.now();
    const windowStart = new Date(now - windowMs).toISOString();

    const { data, error } = await supabase
        .from("rate_limit")
        .select("call_count, window_start")
        .eq("ip_hash", ip)
        .maybeSingle();

    if (error) {
        // If we can't check rate limit, allow the request but log the error
        console.error("Rate limit check error:", error);
        return { allowed: true, remaining: maxCalls };
    }

    if (!data || data.window_start < windowStart) {
        // New window — upsert fresh record
        await supabase.from("rate_limit").upsert(
            { ip_hash: ip, call_count: 1, window_start: new Date(now).toISOString() },
            { onConflict: "ip_hash" }
        );
        return { allowed: true, remaining: maxCalls - 1 };
    }

    if (data.call_count >= maxCalls) {
        return { allowed: false, remaining: 0 };
    }

    await supabase
        .from("rate_limit")
        .update({ call_count: data.call_count + 1 })
        .eq("ip_hash", ip);

    return { allowed: true, remaining: maxCalls - data.call_count - 1 };
}

async function trackFaqAnalytic(
    supabase: ReturnType<typeof createClient>,
    faqId: string
): Promise<void> {
    try {
        const { data } = await supabase
            .from("faq_analytics")
            .select("click_count")
            .eq("faq_id", faqId)
            .maybeSingle();

        if (data) {
            await supabase
                .from("faq_analytics")
                .update({ click_count: data.click_count + 1, last_clicked_at: new Date().toISOString() })
                .eq("faq_id", faqId);
        } else {
            await supabase.from("faq_analytics").insert({
                faq_id: faqId,
                click_count: 1,
                last_clicked_at: new Date().toISOString(),
            });
        }
    } catch (err) {
        console.error("FAQ analytics tracking error:", err);
    }
}

interface GeminiMessage {
    role: "user" | "model";
    parts: Array<{ text: string }>;
}

async function callGemini(
    apiKey: string,
    history: GeminiMessage[],
    userMessage: string
): Promise<string> {
    const endpoint =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

    // Keep last 6 messages to save tokens
    const trimmedHistory = history.slice(-6);

    const contents: GeminiMessage[] = [
        ...trimmedHistory,
        { role: "user", parts: [{ text: userMessage }] },
    ];

    const body = {
        system_instruction: { parts: [{ text: CLARA_SYSTEM_PROMPT }] },
        contents,
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 256,
        },
    };

    const res = await fetch(`${endpoint}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const errText = await res.text();
        console.error("Gemini error:", errText);
        throw new Error(`Gemini API responded with ${res.status}`);
    }

    const json = await res.json();
    return json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "um... I'm not sure right now~";
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!geminiApiKey || !supabaseUrl || !supabaseServiceKey) {
        return new Response(JSON.stringify({ error: "Server configuration error" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body: {
        message: string;
        history?: GeminiMessage[];
        faqId?: string;
    };

    try {
        body = await req.json();
    } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const { message, history = [], faqId } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
        return new Response(JSON.stringify({ error: "Message is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Sanitize – strip anything that could be an injection attempt
    const safeMessage = message.slice(0, 500).replace(/<[^>]*>/g, "");

    // Track FAQ click if provided
    if (faqId && typeof faqId === "string") {
        await trackFaqAnalytic(supabase, faqId);
    }

    // Try knowledge base first
    const kbMatch = matchKnowledgeBase(safeMessage);
    if (kbMatch) {
        return new Response(
            JSON.stringify({ answer: kbMatch.answer, source: "kb" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Knowledge base missed — check rate limit before Gemini call
    const ip = getClientIp(req);
    const { allowed, remaining } = await checkRateLimit(supabase, ip);

    if (!allowed) {
        return new Response(
            JSON.stringify({
                answer:
                    "um... I've answered a lot of questions recently~ Please wait a bit before asking more, okay? You can always check the tutorial section in the meantime.",
                source: "rate_limited",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    try {
        const answer = await callGemini(geminiApiKey, history as GeminiMessage[], safeMessage);
        return new Response(
            JSON.stringify({ answer, source: "gemini", remaining }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (err) {
        console.error("Gemini call failed:", err);
        return new Response(
            JSON.stringify({
                answer:
                    "um... something went wrong on my end~ I'm not able to answer right now. Please check the tutorial section for help.",
                source: "error",
            }),
            {
                status: 200, // return 200 so the frontend still shows the message
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});
