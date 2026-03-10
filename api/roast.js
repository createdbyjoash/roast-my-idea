export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { idea, category, intensity } = req.body;

  if (!idea) return res.status(400).json({ error: 'No idea provided' });

  const intensityPrompt = intensity === 'mild'
    ? 'Be somewhat critical but encouraging. Point out flaws but end on a constructive note.'
    : intensity === 'medium'
    ? 'Be brutally honest and direct. Do not sugarcoat. Point out every major flaw and risk but acknowledge any genuine strengths.'
    : 'Be absolutely savage and merciless. Tear this idea apart like a VC who has seen 10,000 pitches and has zero patience. Be funny but devastatingly honest.';

  const prompt = `You are a brutally honest startup investor who has deployed over $500M and seen thousands of ideas. A founder just pitched you this idea in the ${category} category: "${idea}"

${intensityPrompt}

Respond ONLY in this exact JSON format with no markdown, no backticks, just raw JSON:
{
  "verdict": "DEAD ON ARRIVAL" or "NEEDS WORK" or "ACTUALLY FIRE",
  "roast": "Your roast here in 3 to 4 sentences. Be specific about THIS idea, not generic. Reference real market realities.",
  "marketScore": a number from 1 to 10,
  "originalityScore": a number from 1 to 10,
  "viabilityScore": a number from 1 to 10
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 500 }
        })
      }
    );

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    res.status(200).json(parsed);
  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
