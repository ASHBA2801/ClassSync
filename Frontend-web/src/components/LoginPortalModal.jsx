import React, { useState } from 'react';
import { ShieldCheck, Shield, GraduationCap, Users, Lock, ArrowRight, CheckCircle2, Sparkles, X, KeyRound, Mail } from 'lucide-react';

const PRESET_USERS = [
  {
    role: 'superadmin',
    roleTitle: 'Super Admin',
    name: 'Alex Vance',
    email: 'superadmin@classsync.io',
    schoolId: 'school-a',
    schoolName: 'All School Tenants',
    badgeColor: '#4F46E5',
    bgGradient: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
    icon: <ShieldCheck size={24} color="#818CF8" />,
    description: 'Global system owner. Manages all school tenants, appoints school admins, monitors multi-tenant isolation.',
    targetWorkspace: 'Super Admin Console',
  },
  {
    role: 'admin',
    roleTitle: 'School Admin',
    name: 'Dr. Robert Vance',
    email: 'admin@springfield.edu',
    schoolId: 'school-a',
    schoolName: 'Springfield Academy',
    badgeColor: '#2E5090',
    bgGradient: 'linear-gradient(135deg, #1E386B 0%, #2E5090 100%)',
    icon: <Shield size={24} color="#93C5FD" />,
    description: 'School principal/admin. Manages teachers/staff, CSP timetables, AI document processing, & school alerts.',
    targetWorkspace: 'School Admin Dashboard',
  },
  {
    role: 'teacher',
    roleTitle: 'Teacher',
    name: 'Mr. Davis',
    email: 'davis@spring.edu',
    schoolId: 'school-a',
    schoolName: 'Springfield Academy',
    badgeColor: '#059669',
    bgGradient: 'linear-gradient(135deg, #064E3B 0%, #059669 100%)',
    icon: <GraduationCap size={24} color="#A7F3D0" />,
    description: 'Class 10-A Teacher. Marks attendance (<30s), enters grades, sends homework & announcements to students.',
    targetWorkspace: 'Teacher Workspace',
  },
  {
    role: 'parent',
    roleTitle: 'Parent / Student',
    name: 'Anil Patel',
    email: 'anil.patel@example.com',
    schoolId: 'school-a',
    schoolName: 'Springfield Academy',
    badgeColor: '#7C3AED',
    bgGradient: 'linear-gradient(135deg, #4C1D95 0%, #7C3AED 100%)',
    icon: <Users size={24} color="#DDD6FE" />,
    description: 'Parent of Raj Patel. Views attendance, grade report cards, teacher homework, & pays fee balances.',
    targetWorkspace: 'Parent & Student Portal',
  },
];

export default function LoginPortalModal({ 
  isOpen, 
  onClose, 
  currentUser, 
  onLoginSuccess 
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSelectPersona = (preset) => {
    onLoginSuccess({
      name: preset.name,
      email: preset.email,
      role: preset.role,
      schoolId: preset.schoolId,
    });
    onClose();
  };

  const handleManualLogin = (e) => {
    e.preventDefault();
    setError('');

    const lowerEmail = email.toLowerCase().trim();
    let foundRole = 'parent';
    let foundSchool = 'school-a';
    let foundName = email.split('@')[0] || 'User';

    if (lowerEmail.includes('superadmin')) {
      foundRole = 'superadmin';
      foundName = 'Alex Vance (Super Admin)';
    } else if (lowerEmail.includes('admin')) {
      foundRole = 'admin';
      foundName = 'School Admin';
    } else if (lowerEmail.includes('davis') || lowerEmail.includes('teacher')) {
      foundRole = 'teacher';
      foundName = 'Teacher User';
    }

    onLoginSuccess({
      name: foundName,
      email: email,
      role: foundRole,
      schoolId: foundSchool,
    });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justify: 'center',
      zIndex: 2000,
      padding: '20px',
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '20px',
        maxWidth: '860px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        border: '1px solid #E2E8F0',
        padding: '32px',
        position: 'relative'
      }}>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '20px', right: '20px',
            background: '#F1F5F9', border: 'none', borderRadius: '50%',
            width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#64748b'
          }}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#EEF2FF', color: '#4F46E5', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '800', marginBottom: '10px' }}>
            <Sparkles size={14} /> MULTI-ROLE AUTHENTICATION & REDIRECTION PORTAL
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0F172A', margin: 0, fontFamily: 'Outfit, sans-serif' }}>
            Choose Persona or Log In
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '6px 0 0 0' }}>
            Click any demo role to instantly authenticate & redirect to their dedicated workspace
          </p>
        </div>

        {/* 1-Click Persona Login Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          {PRESET_USERS.map((preset) => (
            <div
              key={preset.role}
              onClick={() => handleSelectPersona(preset)}
              style={{
                borderRadius: '16px',
                padding: '20px',
                background: preset.bgGradient,
                color: '#FFFFFF',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
                border: '1px solid rgba(255,255,255,0.15)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(255,255,255,0.15)' }}>
                      {preset.icon}
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.85 }}>
                        ROLE: {preset.roleTitle}
                      </span>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0 }}>{preset.name}</h3>
                    </div>
                  </div>

                  <span style={{ padding: '4px 10px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', fontSize: '0.72rem', fontWeight: '800' }}>
                    1-CLICK LOGIN
                  </span>
                </div>

                <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.4, margin: '8px 0 14px 0' }}>
                  {preset.description}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '10px', fontSize: '0.8rem' }}>
                <span style={{ opacity: '0.8' }}>🔑 {preset.email}</span>
                <span style={{ fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Redirect to {preset.targetWorkspace} <ArrowRight size={14} />
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '600' }}>
          <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
          <span>OR LOG IN WITH CUSTOM CREDENTIALS</span>
          <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
        </div>

        {/* Standard Manual Login Form */}
        <form onSubmit={handleManualLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '440px', margin: '0 auto' }}>
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="email"
                required
                placeholder="superadmin@classsync.io or admin@springfield.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '0.9rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <KeyRound size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '0.9rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', padding: '12px', justifyContent: 'center', fontSize: '0.95rem', background: '#4F46E5', marginTop: '6px' }}
          >
            Authenticate & Auto-Redirect <ArrowRight size={16} />
          </button>
        </form>

      </div>
    </div>
  );
}
