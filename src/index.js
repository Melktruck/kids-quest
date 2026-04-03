import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';

const WELCOME_MESSAGE = (hasPhoto) => hasPhoto
  ? "Blast off! Hello there, space cadet! I just scanned your play area and I can see SO many things for us to explore! Push the button and ask me for a mission!"
  : "Blast off! Hello there, space cadet! I'm Cosmo, your friendly space explorer! I've zoomed past Saturn's rings and danced with shooting stars! Push the button and ask me anything about space!";

const suggestedQuestions = [
  "🌙 What's the moon made of?",
  "🚀 How fast does a rocket go?",
  "⭐ Why do stars twinkle?",
  "🎯 Give me a mission!",
];

// ─── Setup Screen ─────────────────────────────────────────────────────────────
function SetupScreen({ onComplete }) {
  const [capturing, setCapturing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [roomImage, setRoomImage] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = async () => {
    setCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      alert("Couldn't access camera. Please allow camera access and try again.");
      setCapturing(false);
    }
  };

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    streamRef.current?.getTracks().forEach(t => t.stop());
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    setPreview(dataUrl);
    setRoomImage({ data: dataUrl.split(',')[1], mediaType: 'image/jpeg' });
    setCapturing(false);
  };

  const retake = async () => {
    setPreview(null);
    setRoomImage(null);
    await startCamera();
  };

  const handleStart = (img) => {
    const audio = new Audio();
    audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
    audio.play().catch(() => {});
    onComplete(img);
  };

  return (
    <div style={setup.page}>
      <div style={setup.card}>
        <div style={setup.rocket}>🚀</div>
        <h1 style={setup.title}>Hi, Grown-Up!</h1>
        <p style={setup.subtitle}>
          Optionally take a photo of your child's play area — Cosmo will invent missions using their real toys!
          Then hand the phone to your child. They just push the big button to talk to Cosmo!
        </p>
        <p style={setup.privacy}>🔒 The photo never leaves your device — it's only used once to inspire missions.</p>
        {!capturing && !preview && (
          <button style={setup.btn} onClick={startCamera}>📸 Take Play Area Photo</button>
        )}
        {capturing && (
          <div style={setup.cameraBox}>
            <video ref={videoRef} autoPlay playsInline style={setup.video} />
            <button style={setup.snapBtn} onClick={takePhoto}>⭕ Snap Photo</button>
          </div>
        )}
        {preview && (
          <div style={setup.previewBox}>
            <img src={preview} alt="Play area" style={setup.preview} />
            <div style={setup.previewBtns}>
              <button style={setup.retakeBtn} onClick={retake}>🔄 Retake</button>
              <button style={setup.goBtn} onClick={() => handleStart(roomImage)}>🚀 Start Adventure!</button>
            </div>
          </div>
        )}
        <button style={setup.skipBtn} onClick={() => handleStart(null)}>
          Skip photo — start chatting!
        </button>
      </div>
    </div>
  );
}

// ─── Chat Screen ──────────────────────────────────────────────────────────────
function ChatScreen({ roomImage }) {
  const welcomeText = WELCOME_MESSAGE(!!roomImage);

  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: welcomeText,
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showGrownUp, setShowGrownUp] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [readyToTalk, setReadyToTalk] = useState(false);

  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);
  const isFirstMessage = useRef(true);
  const isPausedRef = useRef(false);
  const audioRef = useRef(new Audio());
  const sessionStarted = useRef(false);

  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Speak via ElevenLabs
  const speak = useCallback(async (text, onDone) => {
    setIsSpeaking(true);
    setReadyToTalk(false);
    try {
      const response = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error('TTS failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = audioRef.current;
      if (audio.src && audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
      audio.src = url;
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        if (onDone) onDone();
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        if (onDone) onDone();
      };
      await audio.play();
    } catch (e) {
      console.error('Speak error:', e);
      setIsSpeaking(false);
      if (onDone) onDone();
    }
  }, []);

  // Start mic — only ever called from a direct button tap
  const startListening = useCallback(() => {
    if (isPausedRef.current) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Voice chat isn't supported on this browser. Try Safari!"); return; }

    setReadyToTalk(false);
    setIsListening(true);

    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      sendMessage(transcript);
    };
    recognition.start();
  }, []); // eslint-disable-line

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  // Speak welcome on mount
  useEffect(() => {
    if (sessionStarted.current) return;
    sessionStarted.current = true;
    setTimeout(() => {
      speak(welcomeText, () => {
        if (!isPausedRef.current) setReadyToTalk(true);
      });
    }, 600);
  }, []); // eslint-disable-line

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput('');
    setLoading(true);
    setReadyToTalk(false);
    stopListening();

    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);

    const imageToSend = isFirstMessage.current ? roomImage : null;
    isFirstMessage.current = false;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          roomImage: imageToSend,
        }),
      });
      const data = await response.json();
      const reply = data.reply || "Houston, we have a problem! Can you try asking me again?";
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
      setLoading(false);
      speak(reply, () => {
        if (!isPausedRef.current) setReadyToTalk(true);
      });
    } catch {
      const err = "Uh oh, my radio signal got lost in space! Can you try again?";
      setMessages([...newMessages, { role: 'assistant', content: err }]);
      setLoading(false);
      speak(err, () => {
        if (!isPausedRef.current) setReadyToTalk(true);
      });
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const togglePause = () => {
    const next = !isPaused;
    setIsPaused(next);
    if (next) {
      stopListening();
      audioRef.current.pause();
      setIsSpeaking(false);
      setReadyToTalk(false);
    } else {
      setReadyToTalk(true);
    }
  };

  const bigButtonProps = {
    paused:    { emoji: '⏸️', label: 'Paused',              bg: '#666666', pulse: false, disabled: true  },
    thinking:  { emoji: '🌌', label: 'Cosmo is thinking...', bg: '#764ba2', pulse: true,  disabled: true  },
    speaking:  { emoji: '🔊', label: 'Cosmo is speaking...', bg: '#667eea', pulse: true,  disabled: true  },
    listening: { emoji: '👂', label: 'Listening...',         bg: '#ff4444', pulse: true,  disabled: false },
    ready:     { emoji: '🎤', label: 'Push to Continue!',    bg: '#43e97b', pulse: true,  disabled: false },
    idle:      { emoji: '🎤', label: 'Push to Continue!',    bg: '#43e97b', pulse: false, disabled: false },
  }[isPaused ? 'paused' : loading ? 'thinking' : isSpeaking ? 'speaking' : isListening ? 'listening' : readyToTalk ? 'ready' : 'idle'];

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.avatar}>🚀</span>
          <div>
            <div style={styles.characterName}>Cosmo</div>
            <div style={styles.characterTitle}>Space Explorer</div>
          </div>
        </div>
        <div style={styles.headerRight}>
          <button
            style={{ ...styles.pauseBtn, background: isPaused ? '#ffd700' : 'rgba(255,255,255,0.15)', color: isPaused ? '#0a0a2e' : 'white' }}
            onClick={togglePause}
          >
            {isPaused ? '▶️ Resume' : '⏸️ Pause'}
          </button>
          <button style={styles.grownUpBtn} onClick={() => setShowGrownUp(true)}>👨‍👩‍👧</button>
        </div>
      </div>

      {/* Chat messages */}
      <div style={styles.chatArea}>
        {messages.map((msg, i) => (
          <div key={i} style={msg.role === 'user' ? styles.userRow : styles.assistantRow}>
            {msg.role === 'assistant' && <span style={styles.msgAvatar}>🚀</span>}
            <div style={msg.role === 'user' ? styles.userBubble : styles.assistantBubble}>{msg.content}</div>
          </div>
        ))}
        {loading && (
          <div style={styles.assistantRow}>
            <span style={styles.msgAvatar}>🚀</span>
            <div style={styles.assistantBubble}>
              <span style={styles.typing}>Cosmo is thinking</span><span style={styles.dots}>...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Big talk button */}
      <div style={styles.talkArea}>
        <button
          style={{
            ...styles.bigMicBtn,
            background: `radial-gradient(circle, ${bigButtonProps.bg}cc, ${bigButtonProps.bg})`,
            animation: bigButtonProps.pulse ? 'cosmo-pulse 1.5s infinite' : 'none',
            opacity: bigButtonProps.disabled && !isListening ? 0.85 : 1,
            cursor: bigButtonProps.disabled && !isListening ? 'default' : 'pointer',
          }}
          onClick={isListening ? stopListening : startListening}
          disabled={bigButtonProps.disabled && !isListening}
        >
          <span style={styles.bigMicEmoji}>{bigButtonProps.emoji}</span>
        </button>
        <div style={{ ...styles.bigMicLabel, color: bigButtonProps.bg === '#43e97b' ? '#43e97b' : '#a0c4ff' }}>
          {bigButtonProps.label}
        </div>

        {/* Suggested questions */}
        <div style={styles.suggestions}>
          {suggestedQuestions.map((q, i) => (
            <button key={i} style={styles.suggestionBtn} onClick={() => sendMessage(q)}>{q}</button>
          ))}
        </div>
      </div>

      {/* Type fallback */}
      <div style={styles.inputArea}>
        <input
          style={styles.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Or type to Cosmo... 🌟"
          disabled={loading}
        />
        <button
          style={{ ...styles.sendBtn, opacity: loading || !input.trim() ? 0.5 : 1 }}
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
        >🚀</button>
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes cosmo-pulse {
          0%   { box-shadow: 0 0 0 0px ${bigButtonProps.bg}99, 0 8px 32px ${bigButtonProps.bg}44; }
          70%  { box-shadow: 0 0 0 24px ${bigButtonProps.bg}00, 0 8px 32px ${bigButtonProps.bg}44; }
          100% { box-shadow: 0 0 0 0px ${bigButtonProps.bg}00, 0 8px 32px ${bigButtonProps.bg}44; }
        }
      `}</style>

      {/* Grown-up modal */}
      {showGrownUp && (
        <div style={styles.modalOverlay} onClick={() => setShowGrownUp(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalTitle}>👨‍👩‍👧 For Grown-Ups</div>
            <div style={styles.modalText}>Your child is chatting with <strong>Cosmo</strong>, an AI space explorer powered by Claude AI from Anthropic. Voice by ElevenLabs.</div>
            <div style={styles.modalText}>
              ✅ No personal information is collected<br />
              ✅ All responses are child-safe<br />
              ✅ No accounts or sign-ups required<br />
              ✅ Room photo is never stored or uploaded
            </div>
            <div style={styles.modalText}>
              <strong>How it works:</strong> Cosmo speaks, then the big green button pulses. Your child pushes it to reply. Simple enough for any age!
            </div>
            <div style={styles.modalText}>Use <em>⏸️ Pause</em> to stop the conversation at any time.</div>
            <button style={styles.modalClose} onClick={() => setShowGrownUp(false)}>Got it! Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
function App() {
  const [roomImage, setRoomImage] = useState(undefined);
  if (roomImage === undefined) return <SetupScreen onComplete={img => setRoomImage(img)} />;
  return <ChatScreen roomImage={roomImage} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const setup = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg,#0a0a2e 0%,#1a1a4e 50%,#0d0d3b 100%)', padding: '20px', fontFamily: '"Segoe UI",Roboto,sans-serif' },
  card: { background: 'rgba(255,255,255,0.08)', borderRadius: '24px', padding: '32px 24px', maxWidth: '420px', width: '100%', border: '1px solid rgba(255,255,255,0.15)', textAlign: 'center', color: 'white' },
  rocket: { fontSize: '3.5rem', marginBottom: '12px' },
  title: { fontSize: '1.8rem', fontWeight: 'bold', color: '#ffd700', margin: '0 0 12px' },
  subtitle: { fontSize: '1rem', lineHeight: '1.6', color: '#e0e0ff', marginBottom: '12px' },
  privacy: { fontSize: '0.85rem', color: '#a0c4ff', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '10px 14px', marginBottom: '24px' },
  btn: { background: 'linear-gradient(135deg,#667eea,#764ba2)', color: 'white', border: 'none', borderRadius: '16px', padding: '14px 28px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', width: '100%', marginBottom: '12px' },
  cameraBox: { marginBottom: '16px' },
  video: { width: '100%', borderRadius: '16px', marginBottom: '12px' },
  snapBtn: { background: '#ff6b6b', color: 'white', border: 'none', borderRadius: '16px', padding: '12px 24px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', width: '100%' },
  previewBox: { marginBottom: '16px' },
  preview: { width: '100%', borderRadius: '16px', marginBottom: '12px' },
  previewBtns: { display: 'flex', gap: '10px' },
  retakeBtn: { flex: 1, background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', padding: '12px', fontSize: '0.95rem', cursor: 'pointer' },
  goBtn: { flex: 2, background: 'linear-gradient(135deg,#43e97b,#38f9d7)', color: '#0a0a2e', border: 'none', borderRadius: '12px', padding: '12px', fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer' },
  skipBtn: { background: 'none', color: '#a0c4ff', border: 'none', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline', marginTop: '8px' },
};

const styles = {
  page: { display: 'flex', flexDirection: 'column', height: '100vh', background: 'linear-gradient(180deg,#0a0a2e 0%,#1a1a4e 50%,#0d0d3b 100%)', fontFamily: '"Segoe UI",Roboto,sans-serif', color: 'white', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '8px' },
  avatar: { fontSize: '2rem' },
  characterName: { fontSize: '1.1rem', fontWeight: 'bold', color: '#ffd700' },
  characterTitle: { fontSize: '0.75rem', color: '#a0c4ff' },
  pauseBtn: { border: 'none', borderRadius: '16px', padding: '6px 14px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s' },
  grownUpBtn: { background: '#ff6b6b', color: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', fontSize: '1rem', cursor: 'pointer', flexShrink: 0 },
  chatArea: { flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' },
  assistantRow: { display: 'flex', alignItems: 'flex-end', gap: '8px', maxWidth: '85%' },
  userRow: { display: 'flex', justifyContent: 'flex-end', maxWidth: '85%', alignSelf: 'flex-end' },
  msgAvatar: { fontSize: '1.4rem', flexShrink: 0 },
  assistantBubble: { background: 'rgba(255,255,255,0.12)', borderRadius: '18px 18px 18px 4px', padding: '10px 14px', fontSize: '0.95rem', lineHeight: '1.5', border: '1px solid rgba(255,255,255,0.15)' },
  userBubble: { background: 'linear-gradient(135deg,#667eea,#764ba2)', borderRadius: '18px 18px 4px 18px', padding: '10px 14px', fontSize: '0.95rem', lineHeight: '1.5' },
  typing: { color: '#a0c4ff', fontStyle: 'italic' },
  dots: { color: '#ffd700' },
  talkArea: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 16px 4px', flexShrink: 0, gap: '10px' },
  bigMicBtn: { width: '130px', height: '130px', borderRadius: '50%', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.15s', flexShrink: 0 },
  bigMicEmoji: { fontSize: '3.2rem', lineHeight: 1 },
  bigMicLabel: { fontSize: '1.05rem', fontWeight: 'bold', letterSpacing: '0.02em' },
  suggestions: { display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' },
  suggestionBtn: { background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', padding: '5px 10px', fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' },
  inputArea: { display: 'flex', gap: '8px', padding: '8px 14px', background: 'rgba(255,255,255,0.05)', borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, alignItems: 'center' },
  input: { flex: 1, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '24px', padding: '10px 16px', color: 'white', fontSize: '0.95rem', outline: 'none' },
  sendBtn: { background: 'linear-gradient(135deg,#667eea,#764ba2)', color: 'white', border: 'none', borderRadius: '50%', width: '44px', height: '44px', fontSize: '1.2rem', cursor: 'pointer', flexShrink: 0 },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 100 },
  modal: { background: '#1a1a4e', borderRadius: '20px', padding: '24px', maxWidth: '400px', width: '100%', border: '1px solid rgba(255,255,255,0.2)' },
  modalTitle: { fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '16px', color: '#ffd700' },
  modalText: { fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '12px', color: '#e0e0ff' },
  modalClose: { background: '#667eea', color: 'white', border: 'none', borderRadius: '12px', padding: '12px 24px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', width: '100%', marginTop: '8px' },
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
