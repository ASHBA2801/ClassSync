import React from 'react';
import { Heart, Bell, AlertTriangle, CheckCircle, TrendingUp, Calendar, Award } from 'lucide-react';

export default function ProgressOverview({ child, alerts = [] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Key Child Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        
        <div className="glass-card" style={{ padding: '18px', borderLeft: child.attendanceRate < 80 ? '5px solid #DC2626' : '5px solid #4CAF50' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Attendance Rate</span>
            <Calendar size={18} color={child.attendanceRate < 80 ? '#DC2626' : '#4CAF50'} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: child.attendanceRate < 80 ? '#DC2626' : '#1e293b', marginTop: '6px' }}>
            {child.attendanceRate}%
          </div>
          <span style={{ fontSize: '0.78rem', color: child.attendanceRate < 80 ? '#DC2626' : '#16A34A', fontWeight: '600' }}>
            {child.attendanceRate < 80 ? 'Below 80% Threshold Alert' : 'Good Attendance'}
          </span>
        </div>

        <div className="glass-card" style={{ padding: '18px', borderLeft: '5px solid #2E5090' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Current GPA</span>
            <Award size={18} color="#2E5090" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1e293b', marginTop: '6px' }}>
            {child.gpa || '3.2'} / 4.0
          </div>
          <span style={{ fontSize: '0.78rem', color: '#2E5090', fontWeight: '600' }}>Grade 10-A Class Rank: #14</span>
        </div>

        <div className="glass-card" style={{ padding: '18px', borderLeft: '5px solid #FF6B35' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Automated AI Alerts</span>
            <Bell size={18} color="#FF6B35" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1e293b', marginTop: '6px' }}>
            {alerts.length} Active
          </div>
          <span style={{ fontSize: '0.78rem', color: '#FF6B35', fontWeight: '600' }}>Pushed instantly to app</span>
        </div>

      </div>

      {/* Proactive Automated AI Notifications Feed */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Bell size={22} color="#FF6B35" />
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>
              Proactive Automated AI Notifications for {child.name}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
              No information overload — only essential actionable alerts sent by EduSync AI agents.
            </p>
          </div>
        </div>

        {alerts.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', background: '#F8FAFC', borderRadius: '10px' }}>
            <CheckCircle size={36} color="#16A34A" style={{ margin: '0 auto 8px auto', display: 'block' }} />
            <p style={{ fontWeight: '700', color: '#166534' }}>All clear! No urgent alerts for {child.name}.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {alerts.map(a => (
              <div
                key={a.id}
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  background: a.severity === 'High' ? '#FEF2F2' : '#FFFBEB',
                  border: a.severity === 'High' ? '1px solid #FCA5A5' : '1px solid #FDE68A',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start'
                }}
              >
                <div style={{ fontSize: '1.5rem' }}>{a.agentIcon}</div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1e293b' }}>{a.title}</h4>
                    <span className={`badge badge-${a.severity.toLowerCase()}`}>{a.severity}</span>
                  </div>
                  <p style={{ fontSize: '0.88rem', color: '#475569', marginTop: '4px' }}>
                    {a.message}
                  </p>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', display: 'block', marginTop: '6px' }}>
                    Triggered by AI Agent: {a.agentName} ({a.timestamp})
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
