import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const SYSTEM_PROMPT = `You are a supportive study and motivation coach for a student using a deadline aggregator app. Your tone is warm, encouraging, and non-judgmental.

Your goals:
- Help with "bargaining" and breaking work into manageable chunks (e.g. "I'll do one task then take a break", "what if we just do 25 minutes?").
- Offer accountability check-ins and gentle nudges.
- Use any context about the user's deadlines and tasks (provided below) to give relevant, specific suggestions—e.g. "You have 3 things due this week—want to pick one to focus on?" or "Your next deadline is X; want to tackle the first subtask?"
- Keep replies concise (2–4 sentences usually). Be conversational, not preachy.`;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { messages: { role: string; content: string }[]; context?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { messages, context } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "messages array required" },
      { status: 400 }
    );
  }

  const systemContent =
    SYSTEM_PROMPT +
    (context
      ? `\n\nCurrent context from the user's app:\n${context}`
      : "\n\n(No deadline/task context was provided this time.)");

  const chatMessages = messages
    .filter((m: { role: string; content: string }) => m.role === "user" || m.role === "assistant")
    .map((m: { role: string; content: string }) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

  // Prefer Claude (Anthropic), fall back to OpenAI
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (anthropicKey) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-20241022",
          max_tokens: 400,
          system: systemContent,
          messages: chatMessages,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("Anthropic API error:", res.status, err);
        return NextResponse.json({
          message:
            "Something went wrong talking to the coach. Please try again in a moment.",
          provider: "error",
        });
      }

      const data = (await res.json()) as {
        content?: { type: string; text?: string }[];
      };
      const textBlock = data.content?.find((c) => c.type === "text");
      const content =
        (typeof textBlock?.text === "string" ? textBlock.text : "")?.trim() ||
        "I'm not sure what to say right now—try asking again!";

      return NextResponse.json({ message: content, provider: "anthropic" });
    } catch (err) {
      console.error("Chat API error:", err);
      return NextResponse.json({
        message:
          "The coach couldn't be reached. Check your connection and try again.",
        provider: "error",
      });
    }
  }

  if (openaiKey) {
    try {
      const openaiMessages = [
        { role: "system" as const, content: systemContent },
        ...chatMessages,
      ];
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: openaiMessages,
          max_tokens: 400,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("OpenAI API error:", res.status, err);
        return NextResponse.json({
          message:
            "Something went wrong talking to the coach. Please try again in a moment.",
          provider: "error",
        });
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content =
        data.choices?.[0]?.message?.content?.trim() ||
        "I'm not sure what to say right now—try asking again!";

      return NextResponse.json({ message: content, provider: "openai" });
    } catch (err) {
      console.error("Chat API error:", err);
      return NextResponse.json({
        message:
          "The coach couldn't be reached. Check your connection and try again.",
        provider: "error",
      });
    }
  }

  return NextResponse.json({
    message:
      "The motivation coach isn't connected yet. To enable it, set ANTHROPIC_API_KEY or OPENAI_API_KEY in your environment (e.g. in .env). I'm here to help once that's set up!",
    provider: "stub",
  });
}
