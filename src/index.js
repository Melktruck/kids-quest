import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

const suggestedQuestions = [
  "🌙 What's the moon made of?",
  "🚀 How fast does a rocket go?",
  "⭐ Why do stars twinkle?",
  "👽 Is there life on other planets?",
];

function App() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Blast off! 🚀 Hello there, space cadet! I'm Cosmo, your friendly space explorer! I've zoomed past Saturn's rings and danced with shooting stars! What would you like to explore today?",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showGrownUp, setShowGrownUp] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput('');
    setLoading(true);

    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();
      const reply = data.reply || "Houston, we have a problem! Can you try asking me again?";
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch {
      setMessages([...newMessages, {
        role: 'assistant',
        content: "Uh oh, my radio signal got lost in space! Can you try again? 📡",
      }]);
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
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.avatar}>🚀</span>
          <div>
            <div style={styles.characterName}>Cosmo</div>
            <div style={styles.characterTitle}>Space Explorer</div>
          </div>
        </div>
        <button style={styles.grownUpBtn} onClick={() => setShowGrownUp(true)}>
          👨‍👩‍👧 Tell a Grown-Up
        </button>
      </div>

      {/* Chat area */}
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

      {/* Suggested questions */}
      <div style={styles.suggestions}>
        {suggestedQuestions.map((q, i) => (
          <button key={i} style={styles.suggestionBtn} onClick={() => sendMessage(q)}>
            {q}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div style={styles.inputArea}>
        <input
          style={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask Cosmo anything about space! 🌟"
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

      {/* Grown-up modal */}
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
              ✅ No accounts or sign-ups required
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
    flexShrink: 0,
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
