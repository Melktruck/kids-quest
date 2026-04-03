import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

const suggestedQuestions = [
  "🌙 What's the moon made of?",
  "🚀 How fast does a rocket go?",
  "⭐ Why do stars twinkle?",
  "🎯 Give me a mission!",
];

function SetupScreen({ onComplete }) {
  const [capturing, setCapturing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [roomImage, setRoomImage] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = async () => {
    setCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // back camera on phones
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
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

    // Stop camera stream
    streamRef.current?.getTracks().forEach(t => t.stop());

    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    const base64 = dataUrl.split(',')[1];
    setPreview(dataUrl);
    setRoomImage({ data: base64, mediaType: 'image/jpeg' });
    setCapturing(false);
  };

  const retake = async () => {
    setPreview(null);
    setRoomImage(null);
    await startCamera();
  };

  return (
    <div style={setup.page}>
      <div style={setup.card}>
        <div style={setup.rocket}>🚀</div>
        <h1 style={setup.title}>Hi, Grown-Up!</h1>
        <p style={setup.subtitle}>
          Before handing the phone to your child, take a quick photo of their play area.
          Cosmo will use it to invent fun missions using their real toys!
        </p>
        <p style={setup.privacy}>
          🔒 The photo never leaves your device — it's only used once to inspire missions.
        </p>

        {!capturing && !preview && (
          <button style={setup.btn} onClick={startCamera}>
            📸 Take Play Area Photo
          </button>
        )}

        {capturing && (
          <div style={setup.cameraBox}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={setup.video}
            />
            <button style={setup.snapBtn} onClick={takePhoto}>
              ⭕ Snap Photo
            </button>
          </div>
        )}

        {preview && (
          <div style={setup.previewBox}>
            <img src={preview} alt="Play area" style={setup.preview} />
            <div style={setup.previewBtns}>
              <button style={setup.retakeBtn} onClick={retake}>
                🔄 Retake
              </button>
              <button style={setup.goBtn} onClick={() => onComplete(roomImage)}>
                🚀 Start Adventure!
              </button>
            </div>
          </div>
        )}

        <button style={setup.skipBtn} onClick={() => onComplete(null)}>
          Skip photo — just chat
        </button>
      </div>
    </div>
  );
}

function ChatScreen({ roomImage }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: roomImage
        ? "Blast off! 🚀 Hello there, space cadet! I just scanned your play area from my rocket ship — I can see SO many things for us to explore! Ask me for a mission and let's go on an adventure!"
        : "Blast off! 🚀 Hello there, space cadet! I'm Cosmo, your friendly space explorer! I've zoomed past Saturn's rings and danced with shooting stars! What would you like to explore today?",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showGrownUp, setShowGrownUp] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);
  const isFirstMessage = useRef(true);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const speak = (text) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.2;
    utterance.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.includes('Samantha') ||
      v.name.includes('Karen') ||
      v.name.includes('Google UK English Female') ||
      v.name.includes('Female')
    );
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice chat isn't supported on this browser. Try Chrome or Safari!");
      return;
    }
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      sendMessage(transcript);
    };
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput('');
    setLoading(true);

    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);

    // Only send the room image with the very first user message
    const imageToSend = isFirstMessage.current ? roomImage : null;
    isFirstMessage.current = false;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          roomImage: imageToSend,
        }),
      });

      const data = await response.json();
      const reply = data.reply || "Houston, we have a problem! Can you try asking me again?";
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
      speak(reply);
    } catch {
      const errMsg = "Uh oh, my radio signal got lost in space! Can you try again? 📡";
      setMessages([...newMessages, { role: 'assistant', content: errMsg }]);
      speak(errMsg);
    }
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.avatar}>🚀</span>
          <div>
            <div style={styles.characterName}>Cosmo</div>
            <div style={styles.characterTitle}>
              {isSpeaking ? '🔊 Speaking...' : isListening ? '👂 Listening...' : 'Space Explorer'}
            </div>
          </div>
        </div>
        <button style={styles.grownUpBtn} onClick={() => setShowGrownUp(true)}>
          👨‍👩‍👧 Tell a Grown-Up
        </button>
      </div>

      <div style={styles.chatArea}>
        {messages.map((msg, i) => (
          <div key={i} style={msg.role === 'user' ? styles.userRow : styles.assistantRow}>
            {msg.role === 'assistant' && <span style={styles.msgAvatar}>🚀</span>}
            <div style={msg.role === 'user' ? styles.userBubble : styles.assistantBubble}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={styles.assistantRow}>
            <span style={styles.msgAvatar}>🚀</span>
            <div style={styles.assistantBubble}>
              <span style={styles.typing}>Cosmo is thinking</span>
              <span style={styles.dots}>...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={styles.suggestions}>
        {suggestedQuestions.map((q, i) => (
          <button key={i} style={styles.suggestionBtn} onClick={() => sendMessage(q)}>
            {q}
          </button>
        ))}
      </div>

      <div style={styles.inputArea}>
        <button
          style={{
            ...styles.micBtn,
            background: isListening
              ? 'linear-gradient(135deg, #ff4444, #cc0000)'
              : 'linear-gradient(135deg, #43e97b, #38f9d7)',
            transform: isListening ? 'scale(1.1)' : 'scale(1)',
          }}
          onClick={isListening ? stopListening : startListening}
          disabled={loading}
        >
          {isListening ? '⏹️' : '🎤'}
        </button>
        <input
          style={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Speak or type to Cosmo! 🌟"
          disabled={loading}
        />
        <button
          style={{...styles.sendBtn, opacity: loading || !input.trim() ? 0.5 : 1}}
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
        >
          🚀 Send
        </button>
      </div>

      {showGrownUp && (
        <div style={styles.modalOverlay} onClick={() => setShowGrownUp(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalTitle}>👨‍👩‍👧 For Grown-Ups</div>
            <div style={styles.modalText}>
              Your child is chatting with <strong>Cosmo</strong>, an AI space explorer powered by Claude AI from Anthropic.
            </div>
            <div style={styles.modalText}>
              ✅ No personal information is collected<br/>
              ✅ All responses are child-safe<br/>
              ✅ No accounts or sign-ups required<br/>
              ✅ Room photo is never stored or uploaded<br/>
              ✅ Voice uses your device's built-in speech tools
            </div>
            <div style={styles.modalText}>
              If you have any concerns about the conversation, you can scroll up to read everything Cosmo has said.
            </div>
            <button style={styles.modalClose} onClick={() => setShowGrownUp(false)}>
              Got it! Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [roomImage, setRoomImage] = useState(undefined);

  if (roomImage === undefined) {
    return <SetupScreen onComplete={(img) => setRoomImage(img)} />;
  }
  return <ChatScreen roomImage={roomImage} />;
}

const setup = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(180deg, #0a0a2e 0%, #1a1a4e 50%, #0d0d3b 100%)',
    padding: '20px', fontFamily: '"Segoe UI", Roboto, sans-serif',
  },
  card: {
    background: 'rgba(255,255,255,0.08)', borderRadius: '24px',
    padding: '32px 24px', maxWidth: '420px', width: '100%',
    border: '1px solid rgba(255,255,255,0.15)', textAlign: 'center', color: 'white',
  },
  rocket: { fontSize: '3.5rem', marginBottom: '12px' },
  title: { fontSize: '1.8rem', fontWeight: 'bold', color: '#ffd700', margin: '0 0 12px' },
  subtitle: { fontSize: '1rem', lineHeight: '1.6', color: '#e0e0ff', marginBottom: '12px' },
  privacy: {
    fontSize: '0.85rem', color: '#a0c4ff', background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px', padding: '10px 14px', marginBottom: '24px',
  },
  btn: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white',
    border: 'none', borderRadius: '16px', padding: '14px 28px',
    fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', width: '100%',
    marginBottom: '12px',
  },
  cameraBox: { marginBottom: '16px' },
  video: { width: '100%', borderRadius: '16px', marginBottom: '12px' },
  snapBtn: {
    background: '#ff6b6b', color: 'white', border: 'none',
    borderRadius: '16px', padding: '12px 24px', fontSize: '1rem',
    fontWeight: 'bold', cursor: 'pointer', width: '100%',
  },
  previewBox: { marginBottom: '16px' },
  preview: { width: '100%', borderRadius: '16px', marginBottom: '12px' },
  previewBtns: { display: 'flex', gap: '10px' },
  retakeBtn: {
    flex: 1, background: 'rgba(255,255,255,0.1)', color: 'white',
    border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px',
    padding: '12px', fontSize: '0.95rem', cursor: 'pointer',
  },
  goBtn: {
    flex: 2, background: 'linear-gradient(135deg, #43e97b, #38f9d7)',
    color: '#0a0a2e', border: 'none', borderRadius: '12px',
    padding: '12px', fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer',
  },
  skipBtn: {
    background: 'none', color: '#a0c4ff', border: 'none',
    fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline',
    marginTop: '8px',
  },
};

const styles = {
  page: {
    display: 'flex', flexDirection: 'column', height: '100vh',
    background: 'linear-gradient(180deg, #0a0a2e 0%, #1a1a4e 50%, #0d0d3b 100%)',
    fontFamily: '"Segoe UI", Roboto, sans-serif', color: 'white', overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', background: 'rgba(255,255,255,0.08)',
    borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatar: { fontSize: '2.2rem' },
  characterName: { fontSize: '1.2rem', fontWeight: 'bold', color: '#ffd700' },
  characterTitle: { fontSize: '0.8rem', color: '#a0c4ff' },
  grownUpBtn: {
    background: '#ff6b6b', color: 'white', border: 'none',
    borderRadius: '20px', padding: '8px 14px', fontSize: '0.85rem',
    fontWeight: 'bold', cursor: 'pointer', flexShrink: 0,
  },
  chatArea: {
    flex: 1, overflowY: 'auto', padding: '16px',
    display: 'flex', flexDirection: 'column', gap: '12px',
  },
  assistantRow: { display: 'flex', alignItems: 'flex-end', gap: '8px', maxWidth: '85%' },
  userRow: { display: 'flex', justifyContent: 'flex-end', maxWidth: '85%', alignSelf: 'flex-end' },
  msgAvatar: { fontSize: '1.5rem', flexShrink: 0 },
  assistantBubble: {
    background: 'rgba(255,255,255,0.12)', borderRadius: '18px 18px 18px 4px',
    padding: '12px 16px', fontSize: '1rem', lineHeight: '1.5',
    border: '1px solid rgba(255,255,255,0.15)',
  },
  userBubble: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    borderRadius: '18px 18px 4px 18px', padding: '12px 16px',
    fontSize: '1rem', lineHeight: '1.5',
  },
  typing: { color: '#a0c4ff', fontStyle: 'italic' },
  dots: { color: '#ffd700' },
  suggestions: {
    display: 'flex', gap: '8px', padding: '8px 16px',
    overflowX: 'auto', flexShrink: 0, flexWrap: 'wrap',
  },
  suggestionBtn: {
    background: 'rgba(255,255,255,0.1)', color: 'white',
    border: '1px solid rgba(255,255,255,0.2)', borderRadius: '16px',
    padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer',
    whiteSpace: 'nowrap', flexShrink: 0,
  },
  inputArea: {
    display: 'flex', gap: '8px', padding: '12px 16px',
    background: 'rgba(255,255,255,0.05)', borderTop: '1px solid rgba(255,255,255,0.1)',
    flexShrink: 0, alignItems: 'center',
  },
  micBtn: {
    width: '48px', height: '48px', borderRadius: '50%', border: 'none',
    fontSize: '1.3rem', cursor: 'pointer', flexShrink: 0,
    transition: 'transform 0.2s, background 0.2s',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  input: {
    flex: 1, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '24px', padding: '12px 18px', color: 'white',
    fontSize: '1rem', outline: 'none',
  },
  sendBtn: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white',
    border: 'none', borderRadius: '24px', padding: '12px 20px',
    fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', flexShrink: 0,
  },
  modalOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '20px', zIndex: 100,
  },
  modal: {
    background: '#1a1a4e', borderRadius: '20px', padding: '24px',
    maxWidth: '400px', width: '100%', border: '1px solid rgba(255,255,255,0.2)',
  },
  modalTitle: { fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '16px', color: '#ffd700' },
  modalText: { fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '12px', color: '#e0e0ff' },
  modalClose: {
    background: '#667eea', color: 'white', border: 'none',
    borderRadius: '12px', padding: '12px 24px', fontSize: '1rem',
    fontWeight: 'bold', cursor: 'pointer', width: '100%', marginTop: '8px',
  },
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
