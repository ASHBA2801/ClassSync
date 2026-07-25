import React, { useState, useEffect } from 'react';
import { CheckSquare, CheckCircle, XCircle, Clock, Zap, Sparkles } from 'lucide-react';
import { submitBulkAttendance } from '../../services/api';

export default function BulkAttendance({ activeSchool, students = [], refreshData }) {
  const [attendanceState, setAttendanceState] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState(null);

  useEffect(() => {
    // Default all students to "Present" for ultra-fast workflow
    const initial = {};
    students.forEach(s => {
      initial[s.id] = 'Present';
    });
    setAttendanceState(initial);
  }, [students]);

  const handleToggle = (studentId, status) => {
    setAttendanceState(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleMarkAllPresent = () => {
    const allPresent = {};
    students.forEach(s => {
      allPresent[s.id] = 'Present';
    });
    setAttendanceState(allPresent);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const records = students.map(s => ({
        studentId: s.id,
        studentName: s.name,
        status: attendanceState[s.id] || 'Present'
      }));

      const res = await submitBulkAttendance(activeSchool, records);
      setSubmittedMessage(res.message);
      refreshData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>
              Fast Bulk Attendance Marker (Class 10-A)
            </h3>
            <span className="badge badge-low" style={{ background: '#DCFCE7', color: '#15803D' }}>
              <Clock size={12} /> &lt;30s Speed Workflow
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
            Tap student statuses or use 1-click All Present. Submitting auto-triggers the AI Attendance Monitor agent!
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleMarkAllPresent}
            className="btn-outline"
            style={{ fontSize: '0.85rem' }}
          >
            <CheckCircle size={15} color="#16A34A" /> Mark All Present
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary"
            style={{ background: 'linear-gradient(135deg, #2E5090, #1E386B)' }}
          >
            <Zap size={16} /> Save Attendance & Trigger AI
          </button>
        </div>
      </div>

      {submittedMessage && (
        <div style={{ padding: '12px 16px', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '8px', color: '#166534', fontWeight: '600', fontSize: '0.88rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} color="#16A34A" /> {submittedMessage}
        </div>
      )}

      {/* Student List Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {students.map((student) => {
          const currentStatus = attendanceState[student.id] || 'Present';

          return (
            <div
              key={student.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderRadius: '10px',
                background: currentStatus === 'Absent' ? '#FEF2F2' : '#FFFFFF',
                border: currentStatus === 'Absent' ? '1px solid #FCA5A5' : '1px solid #E2E8F0',
                transition: 'var(--transition)'
              }}
            >
              <div>
                <span style={{ fontWeight: '800', color: '#1e293b', fontSize: '1rem' }}>{student.name}</span>
                <span style={{ fontSize: '0.82rem', color: '#64748b', marginLeft: '12px' }}>
                  Overall Attendance: <strong style={{ color: student.attendanceRate < 80 ? '#DC2626' : '#16A34A' }}>{student.attendanceRate}%</strong>
                </span>
                {student.attendanceRate < 80 && (
                  <span className="badge badge-high" style={{ marginLeft: '10px', fontSize: '0.7rem' }}>
                    AI Alert Trigger Level
                  </span>
                )}
              </div>

              {/* Status Toggle Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleToggle(student.id, 'Present')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: currentStatus === 'Present' ? '#16A34A' : '#F1F5F9',
                    color: currentStatus === 'Present' ? '#ffffff' : '#64748B'
                  }}
                >
                  <CheckCircle size={16} /> Present
                </button>

                <button
                  onClick={() => handleToggle(student.id, 'Absent')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: currentStatus === 'Absent' ? '#DC2626' : '#F1F5F9',
                    color: currentStatus === 'Absent' ? '#ffffff' : '#64748B'
                  }}
                >
                  <XCircle size={16} /> Absent
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
