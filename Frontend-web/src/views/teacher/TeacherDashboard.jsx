import React, { useState } from 'react';
import { CheckSquare, BookOpen, MessageSquarePlus, GraduationCap, Zap } from 'lucide-react';
import BulkAttendance from './BulkAttendance';
import GradeEntry from './GradeEntry';
import BehavioralNotes from './BehavioralNotes';

export default function TeacherDashboard({ activeSchool, students = [], refreshData }) {
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'grades' | 'behavior'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Teacher App Mobile-First Header Banner */}
      <div className="glass-card" style={{ padding: '20px', background: 'linear-gradient(135deg, #E3F2FD 0%, #FFFFFF 100%)', borderLeft: '6px solid #2E5090' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <GraduationCap size={28} color="#2E5090" />
              <div>
                <h2 style={{ fontSize: '1.4rem', color: '#1E386B', fontWeight: '800' }}>
                  Teacher Mobile Workspace — Class 10-A
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0 }}>
                  Optimized for speed • Fast attendance marking in &lt;30s • Real-time AI agent triggers
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', background: '#ffffff', padding: '4px', borderRadius: '10px', border: '1px solid #cbd5e1', gap: '4px' }}>
            <button
              onClick={() => setActiveTab('attendance')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: '700',
                background: activeTab === 'attendance' ? '#2E5090' : 'transparent',
                color: activeTab === 'attendance' ? '#fff' : '#475569'
              }}
            >
              <CheckSquare size={16} /> Bulk Attendance (&lt;30s)
            </button>
            <button
              onClick={() => setActiveTab('grades')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: '700',
                background: activeTab === 'grades' ? '#2E5090' : 'transparent',
                color: activeTab === 'grades' ? '#fff' : '#475569'
              }}
            >
              <BookOpen size={16} /> Enter Grades & Feedback
            </button>
            <button
              onClick={() => setActiveTab('behavior')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: '700',
                background: activeTab === 'behavior' ? '#2E5090' : 'transparent',
                color: activeTab === 'behavior' ? '#fff' : '#475569'
              }}
            >
              <MessageSquarePlus size={16} /> Behavioral Notes
            </button>
          </div>
        </div>
      </div>

      {/* Render active sub-view */}
      {activeTab === 'attendance' && (
        <BulkAttendance activeSchool={activeSchool} students={students} refreshData={refreshData} />
      )}

      {activeTab === 'grades' && (
        <GradeEntry activeSchool={activeSchool} students={students} refreshData={refreshData} />
      )}

      {activeTab === 'behavior' && (
        <BehavioralNotes activeSchool={activeSchool} students={students} refreshData={refreshData} />
      )}

    </div>
  );
}
