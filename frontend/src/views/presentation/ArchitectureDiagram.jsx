import React from 'react';
import { Shield, GraduationCap, Users, Cpu, ArrowRight, Database, Server } from 'lucide-react';

export default function ArchitectureDiagram() {
  return (
    <div style={{ background: '#0F172A', color: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #1E293B' }}>
      <h3 style={{ fontSize: '1.2rem', fontWeight: '800', textAlign: 'center', marginBottom: '20px', color: '#93C5FD' }}>
        EduSync Three-Tier Architecture & Autonomous AI Ecosystem
      </h3>

      {/* 3 Tier Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        {/* Tier 1: Teacher App */}
        <div style={{ background: '#1E293B', border: '2px solid #2E5090', padding: '16px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <GraduationCap size={22} color="#60A5FA" />
            <h4 style={{ color: '#93C5FD', fontWeight: '700' }}>1. Teacher App</h4>
          </div>
          <ul style={{ fontSize: '0.82rem', color: '#94A3B8', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <li>Mark bulk attendance (&lt;30s)</li>
            <li>Grade & feedback entry</li>
            <li>Create & track assignments</li>
            <li>Offline sync support</li>
          </ul>
        </div>

        {/* Tier 2: Parent App */}
        <div style={{ background: '#1E293B', border: '2px solid #4CAF50', padding: '16px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Users size={22} color="#4ADE80" />
            <h4 style={{ color: '#86EFAC', fontWeight: '700' }}>2. Parent App</h4>
          </div>
          <ul style={{ fontSize: '0.82rem', color: '#94A3B8', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <li>Child progress dashboard</li>
            <li>Real-time automated alerts</li>
            <li>Homework due date tracker</li>
            <li>Async teacher messaging</li>
          </ul>
        </div>

        {/* Tier 3: Admin Web */}
        <div style={{ background: '#1E293B', border: '2px solid #FF6B35', padding: '16px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Shield size={22} color="#FB923C" />
            <h4 style={{ color: '#FDBA74', fontWeight: '700' }}>3. Admin Web</h4>
          </div>
          <ul style={{ fontSize: '0.82rem', color: '#94A3B8', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <li>Real-time alert command feed</li>
            <li>AI agent logs & control panel</li>
            <li>Timetable conflict solver</li>
            <li>Multi-tenant data isolation</li>
          </ul>
        </div>

      </div>

      {/* Central AI Hub & Database Core */}
      <div style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #0F172A 100%)', border: '2px dashed #6366F1', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#312E81', padding: '6px 14px', borderRadius: '20px', marginBottom: '12px' }}>
          <Cpu size={18} color="#A5B4FC" />
          <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#E0E7FF' }}>6 AUTONOMOUS AI AGENTS CORE BACKBONE</span>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#C7D2FE', maxWidth: '600px', margin: '0 auto 14px auto' }}>
          Attendance Monitor • Grade Alert Agent • Homework Tracker • Fee Reminder Agent • Behavioral Insight • Report Generator
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '24px', flexWrap: 'wrap', fontSize: '0.85rem', color: '#94A3B8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Server size={16} color="#38BDF8" /> Node.js / Express API
          </div>
          <ArrowRight size={16} color="#64748B" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Database size={16} color="#4ADE80" /> PostgreSQL Multi-Tenant DB
          </div>
          <ArrowRight size={16} color="#64748B" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Cpu size={16} color="#F43F5E" /> Socket.io SSE Stream
          </div>
        </div>
      </div>

    </div>
  );
}
