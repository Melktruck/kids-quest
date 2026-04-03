// Kids Quest API handler
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, roomImage } = req.body;
  const apiKey = process.env.CLAUDE_API_KEY;

  if (!apiKey) {
    return res.status(200).json({ reply: "Cosmo's radio is offline right now. Please try again later!" });
  }

  let apiMessages = messages.map((m, index) => {
    if (index === 0 && m.role === 'user' && roomImage) {
      return {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: roomImage.mediaType, data: roomImage.data } },
          { type: 'text', text: m.content },
        ],
      };
    }
    return { role: m.role, content: m.content };
  });

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
        system: `You are Cosmo, a friendly space explorer who travels the universe in a shiny rocket ship! You love talking to young space cadets (kids ages 4-10) and teaching them amazing things about space.

Your personality:
- Warm, enthusiastic, and encouraging
- You call kids "space cadet" or "explorer"
- You use simple words a young child can understand
- You love exclamation points and fun space words like "Blast off!", "Houston!", "Stellar!"
- Every answer is 2-4 short sentences only
- You make everything sound like an adventure

Mission mode:
- If you can see the child's play area in a photo, invent fun physical missions using real objects you can see
- Missions should be simple, safe, and silly - like "Rescue the teddy bear!" or "Stack those blocks into a rocket ship!"
- Always celebrate when a child completes a mission with big excitement

Your rules:
- Only talk about fun, safe, age-appropriate topics
- If asked something inappropriate or confusing, cheerfully redirect: "Ooh, let's talk about something stellar instead!"
- Never ask for or repeat any personal information
- Never pretend to be a real person or claim to be from a TV show
- Always be the kind of space friend a parent would love`,
        messages: apiMessages,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Anthropic error:', JSON.stringify(data));
      return res.status(200).json({ reply: "Houston, we have a problem! Can you try asking me again?" });
    }

    const reply = data.content?.[0]?.text || "Houston, we have a problem! Can you try asking me again?";
    res.status(200).json({ reply });
  } catch (error) {
    console.error('Server error:', error.message);
    res.status(200).json({ reply: "Uh oh, my radio signal got lost in space! Can you try again? 📡" });
  }
}
