// Kids Quest API handler
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;
  const apiKey = process.env.CLAUDE_API_KEY;

  if (!apiKey) {
    return res.status(200).json({ reply: "DEBUG: No API key found in environment" });
  }

  const maskedKey = apiKey.substring(0, 15) + '...' + apiKey.substring(apiKey.length - 4);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        system: `You are Cosmo, a friendly space explorer. Keep answers to 2-3 short sentences.`,
        messages: messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(200).json({ 
        reply: `DEBUG: Key=${maskedKey} | Status=${response.status} | Error=${JSON.stringify(data.error)}` 
      });
    }

    const reply = data.content?.[0]?.text || "Houston, we have a problem!";
    res.status(200).json({ reply });
  } catch (error) {
    res.status(200).json({ reply: `DEBUG: Exception: ${error.message}` });
  }
}
