import React, { useState } from 'react';
import { MessageCircle, Send, Calendar, Sparkles } from 'lucide-react';

export default function Messaging({ child }) {
  const [messages, setMessages] = useState([
    { id: 1, sender: 'Teacher Mr. Davis', text: `Hello Mr. Patel, I noticed Raj missed homework #4. We scheduled a 10-minute catch-up session.`, time: 'Yesterday 04:30 PM', isTeacher: true },
    { id: 2, sender: 'You (Anil Patel)', text: `Thank you Mr. Davis. I received the automated AI alert yesterday and helped him complete it.`, time: 'Today 08:15 AM', isTeacher: false }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [meetingScheduled, setMeetingScheduled] = useState(false);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    setMessages(prev => [
      ...prev,
      { id: Date.now(), sender: `You (${child.parentName})`, text: inputMsg, time: 'Just now', isTeacher: false }
    ]);
    setInputMsg('');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
      
      {/* Async Teacher Chat */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <MessageCircle size={22} color="#4CAF50" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>
            Async Parent-Teacher Chat
          </h3>
        </div>

        {/* Message Bubble Container */}
        <div style={{ height: '260px', overflowY: 'auto', background: '#F8FAFC', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
          {messages.map(msg => (
            <div
              key={msg.id}
              style={{
                alignSelf: msg.isTeacher ? 'flex-start' : 'flex-end',
                maxWidth: '80%',
                background: msg.isTeacher ? '#E3F2FD' : '#DCFCE7',
                border: msg.isTeacher ? '1px solid #90CAF9' : '1px solid #86EFAC',
                padding: '10px 14px',
                borderRadius: '12px'
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#1e293b', marginBottom: '2px' }}>
                {msg.sender} • <span style={{ color: '#64748b' }}>{msg.time}</span>
              </div>
              <p style={{ fontSize: '0.88rem', color: '#334155', margin: 0 }}>
                {msg.text}
              </p>
            </div>
          ))}
        </div>

        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            placeholder="Type your message to Mr. Davis..."
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
          />
          <button type="submit" className="btn-secondary" style={{ padding: '10px 16px' }}>
            <Send size={16} /> Send
          </button>
        </form>
      </div>

      {/* Parent-Teacher Meeting Matchmaker */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Sparkles size={22} color="#FF6B35" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>
            Parent-Teacher Matchmaker Agent
          </h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
          AI analyzes teacher office hours & parent availability to automatically suggest optimal meeting slots.
        </p>

        {!meetingScheduled ? (
          <div style={{ background: '#FFF3E0', padding: '16px', borderRadius: '10px', border: '1px solid #FFD8A8' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#C2410C', marginBottom: '8px' }}>
              Suggested Slot: Tomorrow at 04:30 PM (15 mins)
            </h4>
            <p style={{ fontSize: '0.85rem', color: '#7C2D12', marginBottom: '14px' }}>
              With: Mr. Davis (Mathematics Teacher) • Topic: Academic Progress Review
            </p>
            <button
              onClick={() => setMeetingScheduled(true)}
              className="btn-primary"
              style={{ background: '#FF6B35' }}
            >
              <Calendar size={16} /> Confirm 1-Click Meeting Booking
            </button>
          </div>
        ) : (
          <div style={{ background: '#F0FDF4', padding: '16px', borderRadius: '10px', border: '1px solid #86EFAC', color: '#166534' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: '800', marginBottom: '4px' }}>
              🎉 Meeting Booked & Confirmed!
            </h4>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>
              Calendar invite sent to your email and added to Mr. Davis's schedule.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
