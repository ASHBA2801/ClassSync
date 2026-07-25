import React, { useState, useEffect } from 'react';
import { Calendar, AlertTriangle, CheckCircle2, Sparkles, RefreshCw } from 'lucide-react';
import { fetchTimetableConflict } from '../../services/api';

export default function TimetableSolver() {
  const [data, setData] = useState(null);
  const [solved, setSolved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchTimetableConflict();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSolve = () => {
    setSolved(true);
  };

  if (loading || !data) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Loading AI Timetable Solver Engine...</div>;
  }

  const currentSchedule = solved ? data.aiSuggestedSchedule : data.originalSchedule;

  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={22} color="#FF6B35" />
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e293b' }}>
              Timetable Conflict Resolver Agent
            </h3>
            <span className="badge badge-medium">AI Stretch Agent</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
            Validates schedule edits in real-time, detects double-booked teachers/rooms, and auto-suggests optimal fixes.
          </p>
        </div>

        <div>
          {!solved ? (
            <button
              onClick={handleAutoSolve}
              className="btn-primary"
              style={{ background: 'linear-gradient(135deg, #FF6B35, #E0531F)' }}
            >
              <Sparkles size={16} /> Auto-Resolve Conflicts with AI
            </button>
          ) : (
            <button
              onClick={() => setSolved(false)}
              className="btn-outline"
            >
              <RefreshCw size={16} /> Reset to Original Conflict
            </button>
          )}
        </div>
      </div>

      {/* Status banner */}
      <div style={{
        padding: '14px 18px',
        borderRadius: '10px',
        background: solved ? '#F0FDF4' : '#FEF2F2',
        border: solved ? '1px solid #86EFAC' : '1px solid #FCA5A5',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px'
      }}>
        {solved ? <CheckCircle2 size={22} color="#16A34A" /> : <AlertTriangle size={22} color="#DC2626" />}
        <div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: solved ? '#166534' : '#991B1B' }}>
            {solved ? 'AI Auto-Resolved Conflict: Schedule 100% Validated!' : 'Timetable Conflict Detected in Period 1!'}
          </h4>
          <p style={{ fontSize: '0.85rem', color: solved ? '#15803D' : '#B91C1C', margin: 0 }}>
            {solved 
              ? 'AI swapped Period 1 Math with Period 2 English for Class 10-B, clearing Mr. Davis’s double booking.'
              : 'Mr. Davis is double booked for Period 1 (09:00 AM) across Class 10-A (Room 101) and Class 10-B (Room 102).'
            }
          </p>
        </div>
      </div>

      {/* Timetable Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ background: '#f8fafc', textTransform: 'uppercase', fontSize: '0.78rem', color: '#64748b', textAlign: 'left' }}>
            <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Class</th>
            <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Time / Period</th>
            <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Subject</th>
            <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Assigned Teacher</th>
            <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Room</th>
            <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>AI Verification</th>
          </tr>
        </thead>
        <tbody>
          {currentSchedule.map((row, idx) => (
            <tr 
              key={idx} 
              style={{ 
                borderBottom: '1px solid #f1f5f9',
                background: row.conflict ? '#FEF2F2' : row.resolved ? '#F0FDF4' : 'transparent' 
              }}
            >
              <td style={{ padding: '12px', fontWeight: '700', color: '#1e293b' }}>{row.class}</td>
              <td style={{ padding: '12px', color: '#475569' }}>{row.period}</td>
              <td style={{ padding: '12px', fontWeight: '600', color: '#2E5090' }}>{row.subject}</td>
              <td style={{ padding: '12px', color: '#334155' }}>{row.teacher}</td>
              <td style={{ padding: '12px', color: '#64748b' }}>{row.room}</td>
              <td style={{ padding: '12px' }}>
                {row.conflict ? (
                  <span className="badge badge-high" style={{ fontSize: '0.75rem' }}>
                    <AlertTriangle size={12} /> Double Booked
                  </span>
                ) : row.resolved ? (
                  <span className="badge badge-low" style={{ fontSize: '0.75rem' }}>
                    <Sparkles size={12} /> AI Auto-Optimized
                  </span>
                ) : (
                  <span className="badge badge-low" style={{ fontSize: '0.75rem' }}>
                    Valid
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
