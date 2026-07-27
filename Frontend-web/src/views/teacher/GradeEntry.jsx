import React, { useState } from 'react';
import { BookOpen, Star, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react';
import { submitGrade } from '../../services/api';

export default function GradeEntry({ activeSchool, students = [], refreshData }) {
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || 's101');
  const [subject, setSubject] = useState('Mathematics');
  const [score, setScore] = useState(35);
  const [total, setTotal] = useState(100);
  const [feedback, setFeedback] = useState('Needs practice in basic quadratic formulas.');
  const [submitting, setSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState(null);

  const selectedStudent = students.find(s => s.id === selectedStudentId) || students[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        schoolId: activeSchool,
        studentId: selectedStudentId,
        studentName: selectedStudent?.name || 'Student',
        subject,
        score: Number(score),
        total: Number(total),
        teacher: 'Mr. Davis',
        feedback
      };

      const res = await submitGrade(payload);
      setResultMsg(res.message);
      refreshData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const currentPercentage = total > 0 ? ((score / total) * 100).toFixed(1) : 0;
  const isBelowThreshold = currentPercentage < 40;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
      
      {/* Grade Entry Form */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <BookOpen size={22} color="#2E5090" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>
            Grade & Feedback Entry Form
          </h3>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>Select Student</label>
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

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              >
                <option value="Mathematics">Mathematics</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="English">English</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>Score</label>
              <input
                type="number"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>Total</label>
              <input
                type="number"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>Teacher Feedback / Notes</label>
            <textarea
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontFamily: 'inherit' }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
            style={{ marginTop: '8px', justifyContent: 'center' }}
          >
            <Star size={16} /> Submit Grade & Run Grade Alert Agent
          </button>
        </form>

        {resultMsg && (
          <div style={{ marginTop: '16px', padding: '12px', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '8px', color: '#166534', fontSize: '0.85rem', fontWeight: '600' }}>
            {resultMsg}
          </div>
        )}
      </div>

      {/* Real-time AI Agent Trigger Preview Panel */}
      <div className="glass-card" style={{ padding: '24px', background: isBelowThreshold ? '#FEF2F2' : '#F0FDF4', border: isBelowThreshold ? '2px solid #FCA5A5' : '2px solid #86EFAC' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <Sparkles size={22} color={isBelowThreshold ? '#DC2626' : '#16A34A'} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: isBelowThreshold ? '#991B1B' : '#166534' }}>
            Grade Alert AI Agent Live Monitor
          </h3>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <span style={{ fontSize: '0.85rem', color: '#475569' }}>Calculated Percentage:</span>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: isBelowThreshold ? '#DC2626' : '#16A34A' }}>
            {currentPercentage}%
          </div>
        </div>

        {isBelowThreshold ? (
          <div style={{ padding: '14px', background: '#FFFFFF', borderRadius: '10px', border: '1px solid #FCA5A5' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#DC2626', fontWeight: '800', marginBottom: '6px' }}>
              <AlertTriangle size={18} /> &lt;40% Threshold Triggered!
            </div>
            <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0 }}>
              The Grade Alert Agent will instantly generate a high-priority intervention signal, notify parent app, and log an admin action item.
            </p>
          </div>
        ) : (
          <div style={{ padding: '14px', background: '#FFFFFF', borderRadius: '10px', border: '1px solid #86EFAC' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16A34A', fontWeight: '800', marginBottom: '6px' }}>
              <CheckCircle size={18} /> Normal Performance
            </div>
            <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0 }}>
              Score is above 40%. Grade will be updated in the parent portal progress dashboard without triggering critical alerts.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
