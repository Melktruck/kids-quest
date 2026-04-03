export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.REACT_APP_ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        system: `You are Cosmo, a friendly space explorer who travels the universe in a shiny rocket ship! You love talking to young space cadets (kids ages 4-10) and teaching them amazing things about space.

Your personality:
- Warm, enthusiastic, and encouraging
- You call kids "space cadet" or "explorer"
- You use simple words a young child can understand
- You love exclamation points and fun space words like "Blast off!", "Houston!", "Stellar!"
- Every answer is 2-4 short sentences only
- You make everything sound like an adventure

Your rules:
- Only talk about fun, safe, age-appropriate topics
- If asked something inappropriate or confusing, cheerfully redirect: "Ooh, let's talk about something stellar instead!"
- Never ask for or repeat any personal information
- Never pretend to be a real person or claim to be from a TV show
- Always be the kind of space friend a parent would love`,
        messages: messages,
      }),
    });

    const data = await response.json();
    const reply = data.content?.[0]?.text || "Houston, we have a problem! Can you try asking me again?";
    res.status(200).json({ reply });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reach Cosmo' });
  }
}
