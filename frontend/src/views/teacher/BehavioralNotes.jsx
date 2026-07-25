import React, { useState } from 'react';
import { MessageSquarePlus, Activity, CheckCircle2 } from 'lucide-react';
import { submitBehavioralNote } from '../../services/api';

export default function BehavioralNotes({ activeSchool, students = [], refreshData }) {
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || 's101');
  const [note, setNote] = useState('');
  const [sentiment, setSentiment] = useState('Negative');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    setSubmitting(true);
    try {
      const student = students.find(s => s.id === selectedStudentId);
      const res = await submitBehavioralNote({
        schoolId: activeSchool,
        studentId: selectedStudentId,
        studentName: student?.name || 'Student',
        note,
        author: 'Teacher Mr. Davis',
        sentiment
      });

      setSuccessMsg(`Note added! Behavioral Insight AI Agent scanned the log.`);
      setNote('');
      refreshData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <MessageSquarePlus size={22} color="#9333EA" />
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>
            Behavioral Observations & Log
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Scanned automatically by Behavioral Insight Agent to flag counselor counseling patterns.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
        <div>
          <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>Student</label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
          >
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>Observation Note</label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Student seemed distracted during group work and did not turn in worksheet."
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontFamily: 'inherit' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>Sentiment Pattern Tag</label>
          <div style={{ display: 'flex', gap: '12px' }}>
            {['Negative', 'Neutral', 'Positive'].map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setSentiment(s)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  background: sentiment === s ? (s === 'Negative' ? '#DC2626' : s === 'Positive' ? '#16A34A' : '#475569') : '#F1F5F9',
                  color: sentiment === s ? '#ffffff' : '#64748B'
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary"
          style={{ background: '#9333EA', justifyContent: 'center' }}
        >
          <Activity size={16} /> Record Observation Note
        </button>
      </form>

      {successMsg && (
        <div style={{ marginTop: '16px', padding: '12px', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '8px', color: '#166534', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} color="#16A34A" /> {successMsg}
        </div>
      )}
    </div>
  );
}
