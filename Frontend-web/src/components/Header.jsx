import React from 'react';
import { ShieldCheck, Shield, GraduationCap, Users, LayoutDashboard, Presentation, Building2, Cpu, LogIn, UserCheck } from 'lucide-react';

export default function Header({ 
  viewMode, 
  setViewMode, 
  userRole, 
  setUserRole, 
  currentUser,
  onOpenLoginModal,
  activeSchool, 
  setActiveSchool, 
  schools = [],
  sseConnected 
}) {
  const ROLE_COLORS = {
    superadmin: { bg: '#818CF8', text: '#1E1B4B', label: 'Super Admin' },
    admin:      { bg: '#FFF3E0', text: '#C2410C', label: 'School Admin' },
    teacher:    { bg: '#E3F2FD', text: '#1D4ED8', label: 'Teacher' },
    parent:     { bg: '#F3E5F5', text: '#6B21A8', label: 'Parent' },
  };

  const currentRoleStyle = ROLE_COLORS[userRole] || ROLE_COLORS.admin;

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
                ClassSync
              </span>
              <span style={{ fontSize: '0.7rem', background: '#FF6B35', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
                AI-POWERED ERP
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
              Multi-Tenant Autonomous School Platform
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
              color: viewMode === 'app' ? '#ffffff' : '#a3a3a3',
              border: 'none', cursor: 'pointer'
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
              color: viewMode === 'pitch' ? '#ffffff' : '#a3a3a3',
              border: 'none', cursor: 'pointer'
            }}
          >
            <Presentation size={16} />
            Pitch Deck
          </button>
        </div>

        {/* Context Controls: School Switcher & User Role (Only in App mode) */}
        {viewMode === 'app' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            
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
                onClick={() => setUserRole('superadmin')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '6px',
                  fontSize: '0.8rem', fontWeight: '700',
                  background: userRole === 'superadmin' ? '#4F46E5' : 'transparent',
                  color: userRole === 'superadmin' ? '#FFFFFF' : '#a3a3a3',
                  border: 'none', cursor: 'pointer'
                }}
              >
                <ShieldCheck size={14} /> Super Admin
              </button>

              <button
                onClick={() => setUserRole('admin')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '6px',
                  fontSize: '0.8rem', fontWeight: '700',
                  background: userRole === 'admin' ? '#FFF3E0' : 'transparent',
                  color: userRole === 'admin' ? '#C2410C' : '#a3a3a3',
                  border: 'none', cursor: 'pointer'
                }}
              >
                <Shield size={14} /> Admin
              </button>

              <button
                onClick={() => setUserRole('teacher')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '6px',
                  fontSize: '0.8rem', fontWeight: '700',
                  background: userRole === 'teacher' ? '#E3F2FD' : 'transparent',
                  color: userRole === 'teacher' ? '#1D4ED8' : '#a3a3a3',
                  border: 'none', cursor: 'pointer'
                }}
              >
                <GraduationCap size={14} /> Teacher
              </button>

              <button
                onClick={() => setUserRole('parent')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '6px',
                  fontSize: '0.8rem', fontWeight: '700',
                  background: userRole === 'parent' ? '#F3E5F5' : 'transparent',
                  color: userRole === 'parent' ? '#6B21A8' : '#a3a3a3',
                  border: 'none', cursor: 'pointer'
                }}
              >
                <Users size={14} /> Parent
              </button>
            </div>

            {/* Persona Login Portal Trigger */}
            <button
              onClick={onOpenLoginModal}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px', borderRadius: '8px',
                background: 'linear-gradient(135deg, #4F46E5, #3B82F6)',
                color: '#fff', fontSize: '0.82rem', fontWeight: '700',
                border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(79, 70, 229, 0.4)'
              }}
            >
              <LogIn size={15} /> Switch Login
            </button>

            {/* SSE Connection Status Indicator */}
            <div title={sseConnected ? "Live AI Agent EventStream Connected" : "Connecting..."} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: sseConnected ? '#4CAF50' : '#eab308' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: sseConnected ? '#4CAF50' : '#eab308', boxShadow: sseConnected ? '0 0 8px #4CAF50' : 'none' }}></div>
              <span>{sseConnected ? 'AI SSE' : 'Connecting'}</span>
            </div>
          </div>
        )}

      </div>
    </header>
  );
}

