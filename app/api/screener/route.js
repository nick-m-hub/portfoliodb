import Anthropic from '@anthropic-ai/sdk';
import { getPortfolios } from '@/lib/db';

const client = new Anthropic();

export async function POST(request) {
  try {
    const body = await request.json();

    if (!body?.goal || typeof body.goal !== 'string' || body.goal.trim().length === 0) {
      return Response.json({ error: 'Please provide a goal.' }, { status: 400 });
    }

    // CR-5: hard cap on input size — this endpoint spends real money per call
    // (Anthropic API), so never let an arbitrarily large goal inflate the prompt.
    const goal = body.goal.trim().slice(0, 500);

    // Fetch all portfolio stats from Supabase
    const portfolios = await getPortfolios();

    if (!portfolios || portfolios.length === 0) {
      return Response.json({ error: 'Could not load portfolio data.' }, { status: 500 });
    }

    // Build a compact summary of all portfolios for the prompt
    const portfolioSummary = portfolios.map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      cagr: p.cagr != null ? parseFloat(p.cagr.toFixed(2)) : null,
      max_drawdown: p.max_drawdown != null ? parseFloat(p.max_drawdown.toFixed(2)) : null,
      sharpe_ratio: p.sharpe_ratio != null ? parseFloat(p.sharpe_ratio.toFixed(3)) : null,
      risk_level: p.risk_level,
      min_timeline_years: p.min_timeline_years,
      trade_frequency: p.trade_frequency,
      // CR-5: description intentionally omitted — getPortfolios() doesn't
      // select it (it never reached the prompt), and including 76 full
      // descriptions would multiply the per-call token cost for little gain.
    }));

    const systemPrompt = `You are a portfolio analyst assistant for PortfolioDB, a database of investment portfolios.
Your job is to read a user's plain-English investing goal and recommend the 3 best-matching portfolios from the database.

Rules:
- Only recommend portfolios from the provided data — never invent portfolios.
- For each recommendation, write a 1–2 sentence reason that explains WHY it matches the user's goal. Reference specific numbers (e.g. CAGR, max drawdown, risk level) where helpful.
- Keep reasons friendly and jargon-free — the audience is everyday DIY investors.
- Return ONLY valid JSON in this exact format, with no extra text:
{
  "recommendations": [
    { "slug": "...", "name": "...", "reason": "..." },
    { "slug": "...", "name": "...", "reason": "..." },
    { "slug": "...", "name": "...", "reason": "..." }
  ]
}`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Here is the full portfolio database:\n${JSON.stringify(portfolioSummary, null, 2)}\n\nUser's goal: "${goal}"\n\nReturn the 3 best matching portfolios as JSON.`,
        },
      ],
    });

    // Extract the text content from the response
    const textBlock = message.content.find((block) => block.type === 'text');
    if (!textBlock) {
      return Response.json({ error: 'No response from AI.' }, { status: 500 });
    }

    // Parse the JSON from Claude's response
    let parsed;
    try {
      // Strip any markdown code fences if present
      const raw = textBlock.text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      parsed = JSON.parse(raw);
    } catch {
      console.error('Failed to parse Claude response:', textBlock.text);
      return Response.json({ error: 'AI returned an unexpected format.' }, { status: 500 });
    }

    if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
      return Response.json({ error: 'AI returned an unexpected format.' }, { status: 500 });
    }

    return Response.json({ recommendations: parsed.recommendations });
  } catch (err) {
    console.error('Screener API error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
