// ElevenLabs TTS handler
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  const apiKey = process.env.ELEVENLABS_KEY;
  const ARIA_VOICE_ID = '9BWtsMINqrJLrRacOk9x';

  if (!apiKey) {
    console.error('ELEVENLABS_KEY is missing');
    return res.status(500).json({ error: 'Missing ElevenLabs key' });
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ARIA_VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('ElevenLabs full error:', errText);
      return res.status(500).json({ error: errText });
    }

    const audioBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.send(Buffer.from(audioBuffer));
  } catch (error) {
    console.error('Speak exception:', error.message);
    res.status(500).json({ error: error.message });
  }
}
