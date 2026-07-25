import React from 'react';
import { Shield, GraduationCap, Users, LayoutDashboard, Presentation, Building2, Cpu, CheckCircle2 } from 'lucide-react';

export default function Header({ 
  viewMode, 
  setViewMode, 
  userRole, 
  setUserRole, 
  activeSchool, 
  setActiveSchool, 
  schools = [],
  sseConnected 
}) {
  return (
    <header style={{ background: '#1a1a1a', color: '#fff', borderBottom: '3px solid #2E5090' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        
        {/* Brand Logo & Tagline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'linear-gradient(135deg, #2E5090, #4CAF50)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(46, 80, 144, 0.4)' }}>
            <Cpu size={24} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem', fontWeight: '800', letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #FFFFFF, #93C5FD)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                EduSync
              </span>
              <span style={{ fontSize: '0.7rem', background: '#FF6B35', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
                AI-POWERED
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
              Autonomous Agent School Operations Platform
            </p>
          </div>
        </div>

        {/* View Switcher (Live App vs Pitch Deck Presentation) */}
        <div style={{ display: 'flex', background: '#262626', padding: '4px', borderRadius: '10px', border: '1px solid #404040' }}>
          <button
            onClick={() => setViewMode('app')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: '600',
              background: viewMode === 'app' ? '#2E5090' : 'transparent',
              color: viewMode === 'app' ? '#ffffff' : '#a3a3a3'
            }}
          >
            <LayoutDashboard size={16} />
            Live Platform App
          </button>
          <button
            onClick={() => setViewMode('pitch')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: '600',
              background: viewMode === 'pitch' ? '#FF6B35' : 'transparent',
              color: viewMode === 'pitch' ? '#ffffff' : '#a3a3a3'
            }}
          >
            <Presentation size={16} />
            Pitch Deck Presentation
          </button>
        </div>

        {/* Context Controls: School Switcher & User Role (Only in App mode) */}
        {viewMode === 'app' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Multi-Tenant School Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#262626', padding: '6px 12px', borderRadius: '8px', border: '1px solid #404040' }}>
              <Building2 size={16} color="#4CAF50" />
              <select
                value={activeSchool}
                onChange={(e) => setActiveSchool(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.85rem', fontWeight: '600', outline: 'none', cursor: 'pointer' }}
              >
                {schools.map(s => (
                  <option key={s.id} value={s.id} style={{ background: '#1a1a1a', color: '#fff' }}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Role Navigation Selector */}
            <div style={{ display: 'flex', background: '#262626', padding: '4px', borderRadius: '8px', border: '1px solid #404040' }}>
              <button
                onClick={() => setUserRole('admin')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  background: userRole === 'admin' ? '#FFF3E0' : 'transparent',
                  color: userRole === 'admin' ? '#C2410C' : '#a3a3a3'
                }}
              >
                <Shield size={14} /> Admin
              </button>
              <button
                onClick={() => setUserRole('teacher')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  background: userRole === 'teacher' ? '#E3F2FD' : 'transparent',
                  color: userRole === 'teacher' ? '#1D4ED8' : '#a3a3a3'
                }}
              >
                <GraduationCap size={14} /> Teacher
              </button>
              <button
                onClick={() => setUserRole('parent')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  background: userRole === 'parent' ? '#F3E5F5' : 'transparent',
                  color: userRole === 'parent' ? '#6B21A8' : '#a3a3a3'
                }}
              >
                <Users size={14} /> Parent
              </button>
            </div>

            {/* SSE Connection Status Indicator */}
            <div title={sseConnected ? "Live AI Agent EventStream Connected" : "Connecting..."} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: sseConnected ? '#4CAF50' : '#eab308' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: sseConnected ? '#4CAF50' : '#eab308', boxShadow: sseConnected ? '0 0 8px #4CAF50' : 'none' }}></div>
              <span>{sseConnected ? 'AI SSE Connected' : 'Connecting'}</span>
            </div>
          </div>
        )}

      </div>
    </header>
  );
}
