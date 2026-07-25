import React, { useState } from 'react';
import { Users, Bell, BookOpen, MessageCircle, Heart, CheckCircle2 } from 'lucide-react';
import ProgressOverview from './ProgressOverview';
import HomeworkTracker from './HomeworkTracker';
import Messaging from './Messaging';

export default function ParentDashboard({ activeSchool, students = [], alerts = [], refreshData }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'homework' | 'messaging'

  // Default to Raj Patel for demonstration of low attendance & alerts
  const child = students.find(s => s.name === 'Raj Patel') || students[0] || {
    name: 'Raj Patel', grade: '10-A', parentName: 'Anil Patel', attendanceRate: 74.5, gpa: '3.2'
  };

  const childAlerts = alerts.filter(a => a.title.includes(child.name) || a.message.includes(child.name));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Parent App Mobile-First Header */}
      <div className="glass-card" style={{ padding: '20px', background: 'linear-gradient(135deg, #F3E5F5 0%, #FFFFFF 100%)', borderLeft: '6px solid #4CAF50' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#4CAF50', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1.2rem' }}>
              {child.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.4rem', color: '#1e293b', fontWeight: '800' }}>
                  Parent Portal — {child.name}'s Dashboard
                </h2>
                <span className="badge badge-low" style={{ background: '#DCFCE7', color: '#15803D' }}>
                  Grade {child.grade}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                Logged in as <strong>{child.parentName}</strong> • Proactive automated alerts enabled
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', background: '#ffffff', padding: '4px', borderRadius: '10px', border: '1px solid #cbd5e1', gap: '4px' }}>
            <button
              onClick={() => setActiveTab('overview')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: '700',
                background: activeTab === 'overview' ? '#4CAF50' : 'transparent',
                color: activeTab === 'overview' ? '#fff' : '#475569'
              }}
            >
              <Heart size={16} /> Progress & Alerts ({childAlerts.length})
            </button>
            <button
              onClick={() => setActiveTab('homework')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: '700',
                background: activeTab === 'homework' ? '#4CAF50' : 'transparent',
                color: activeTab === 'homework' ? '#fff' : '#475569'
              }}
            >
              <BookOpen size={16} /> Homework & Due Dates
            </button>
            <button
              onClick={() => setActiveTab('messaging')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: '700',
                background: activeTab === 'messaging' ? '#4CAF50' : 'transparent',
                color: activeTab === 'messaging' ? '#fff' : '#475569'
              }}
            >
              <MessageCircle size={16} /> Teacher Chat & Meetings
            </button>
          </div>
        </div>
      </div>

      {/* Sub views */}
      {activeTab === 'overview' && (
        <ProgressOverview child={child} alerts={childAlerts} refreshData={refreshData} />
      )}

      {activeTab === 'homework' && (
        <HomeworkTracker activeSchool={activeSchool} child={child} />
      )}

      {activeTab === 'messaging' && (
        <Messaging child={child} />
      )}

    </div>
  );
}
