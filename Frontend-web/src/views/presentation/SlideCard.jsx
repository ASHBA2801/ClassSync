import React from 'react';
import ArchitectureDiagram from './ArchitectureDiagram';
import { Sparkles, TrendingUp, CheckCircle2, ShieldCheck, Users, Cpu, Rocket } from 'lucide-react';

export default function SlideCard({ slide, showSpeakerNotes }) {
  if (!slide) return null;

  return (
    <div
      className="glass-card animate-fade-in"
      style={{
        minHeight: '520px',
        padding: '36px',
        borderRadius: '16px',
        background: '#FFFFFF',
        boxShadow: '0 10px 35px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative'
      }}
    >
      {/* Slide Header */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span className="badge badge-low" style={{ background: '#2E5090', color: '#fff' }}>
            SLIDE {slide.slideNumber} / 13
          </span>
          <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: '600' }}>
            EduSync Pitch Deck
          </span>
        </div>

        <h2 style={{ fontSize: '2.2rem', fontWeight: '800', color: '#1a1a1a', lineHeight: 1.2 }}>
          {slide.title}
        </h2>
        {slide.subtitle && (
          <p style={{ fontSize: '1.1rem', color: '#2E5090', fontWeight: '600', marginTop: '6px' }}>
            {slide.subtitle}
          </p>
        )}
      </div>

      {/* Slide Specific Visual Content */}
      <div style={{ margin: '24px 0', flex: 1 }}>
        
        {/* Slide 1: Title Slide */}
        {slide.slideNumber === 1 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: 'linear-gradient(135deg, #1E386B 0%, #2E5090 100%)', borderRadius: '16px', color: '#fff' }}>
            <div style={{ width: '70px', height: '70px', background: '#FF6B35', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', boxShadow: '0 8px 20px rgba(255, 107, 53, 0.4)' }}>
              <Cpu size={36} color="#fff" />
            </div>
            <h1 style={{ fontSize: '3rem', fontWeight: '800', letterSpacing: '-0.03em' }}>EduSync</h1>
            <p style={{ fontSize: '1.3rem', color: '#93C5FD', fontWeight: '500', marginTop: '8px' }}>
              AI-Powered Autonomous School Management Platform
            </p>
            <p style={{ fontSize: '0.95rem', color: '#CBD5E1', marginTop: '16px' }}>
              Autonomous agents that monitor, evaluate, and act—24/7
            </p>
          </div>
        )}

        {/* Slide 2: Problem */}
        {slide.slideNumber === 2 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {slide.problems.map((prob, idx) => (
              <div key={idx} style={{ padding: '16px', borderRadius: '12px', background: '#FEF2F2', borderLeft: '5px solid #DC2626', fontSize: '0.98rem', fontWeight: '600', color: '#1e293b' }}>
                {prob}
              </div>
            ))}
          </div>
        )}

        {/* Slide 3: Solution */}
        {slide.slideNumber === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {slide.solutions.map((sol, idx) => (
              <div key={idx} style={{ padding: '16px', borderRadius: '12px', background: '#F0FDF4', borderLeft: '5px solid #4CAF50', fontSize: '1rem', fontWeight: '700', color: '#166534' }}>
                {sol}
              </div>
            ))}
          </div>
        )}

        {/* Slide 4: 3-Tier Architecture Diagram */}
        {slide.slideNumber === 4 && (
          <ArchitectureDiagram />
        )}

        {/* Slide 5: AI Core Agents */}
        {slide.slideNumber === 5 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {slide.agents.map((agent, idx) => (
              <div key={idx} style={{ padding: '16px', borderRadius: '12px', background: '#FFF3E0', border: '1px solid #FFD8A8' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#C2410C' }}>{agent.name}</h4>
                <p style={{ fontSize: '0.85rem', color: '#475569', marginTop: '4px' }}>
                  <strong>Trigger:</strong> {agent.trigger}
                </p>
                <p style={{ fontSize: '0.85rem', color: '#166534', fontWeight: '600', marginTop: '2px' }}>
                  <strong>Action:</strong> {agent.action}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Slide 6: Key Features */}
        {slide.slideNumber === 6 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            {slide.features.map((feat, idx) => (
              <div key={idx} style={{ padding: '16px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#2E5090' }}>{feat.title}</h4>
                <p style={{ fontSize: '0.88rem', color: '#475569', marginTop: '6px' }}>{feat.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Slide 7: Tech Stack */}
        {slide.slideNumber === 7 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#2E5090', color: '#fff', textTransform: 'uppercase', fontSize: '0.8rem' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Layer</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Technology</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Why This Choice</th>
                </tr>
              </thead>
              <tbody>
                {slide.stack.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ padding: '12px', fontWeight: '700', color: '#1e293b' }}>{item.layer}</td>
                    <td style={{ padding: '12px', fontWeight: '700', color: '#4CAF50' }}>{item.tech}</td>
                    <td style={{ padding: '12px', color: '#64748b' }}>{item.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Slide 8: Roadmap */}
        {slide.slideNumber === 8 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            {slide.roadmap.map((phase, idx) => (
              <div key={idx} style={{ padding: '16px', borderRadius: '12px', background: phase.color, border: '1px solid #cbd5e1' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#1e293b', marginBottom: '10px' }}>{phase.phase}</h4>
                <ul style={{ paddingLeft: '16px', fontSize: '0.82rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {phase.milestones.map((m, mIdx) => (
                    <li key={mIdx}>{m}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Slide 9: Market Opportunity */}
        {slide.slideNumber === 9 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '18px', background: '#FFF3E0', borderLeft: '6px solid #FF6B35', borderRadius: '10px', fontSize: '1.2rem', fontWeight: '800', color: '#C2410C' }}>
              {slide.stat}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              {slide.regions.map((r, idx) => (
                <div key={idx} style={{ padding: '14px', borderRadius: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <h4 style={{ fontWeight: '700', color: '#2E5090' }}>{r.region}</h4>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>{r.detail}</p>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '0.9rem', color: '#475569', fontStyle: 'italic', background: '#F1F5F9', padding: '12px', borderRadius: '8px' }}>
              {slide.tam}
            </p>
          </div>
        )}

        {/* Slide 10: Why We Win */}
        {slide.slideNumber === 10 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            {slide.advantages.map((adv, idx) => (
              <div key={idx} style={{ padding: '18px', borderRadius: '12px', background: '#F0FDF4', border: '1px solid #86EFAC' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#166534' }}>{adv.title}</h4>
                <p style={{ fontSize: '0.88rem', color: '#334155', marginTop: '6px' }}>{adv.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Slide 11: Team */}
        {slide.slideNumber === 11 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#1a1a1a', color: '#fff' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Role</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Count</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Expertise</th>
                </tr>
              </thead>
              <tbody>
                {slide.team.map((t, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px', fontWeight: '700' }}>{t.role}</td>
                    <td style={{ padding: '12px', fontWeight: '800', color: '#FF6B35' }}>{t.count}</td>
                    <td style={{ padding: '12px', color: '#475569' }}>{t.expertise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Slide 12: Success Metrics */}
        {slide.slideNumber === 12 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            {slide.metrics.map((m, idx) => (
              <div key={idx} style={{ padding: '16px', borderRadius: '12px', background: '#F8FAFC', borderLeft: '5px solid #2E5090' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#64748b' }}>{m.metric}</h4>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#16A34A', margin: '4px 0' }}>{m.target}</div>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{m.note}</p>
              </div>
            ))}
          </div>
        )}

        {/* Slide 13: Closing */}
        {slide.slideNumber === 13 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: 'linear-gradient(135deg, #166534 0%, #4CAF50 100%)', borderRadius: '16px', color: '#fff' }}>
            <Rocket size={48} color="#fff" style={{ margin: '0 auto 16px auto' }} />
            <h2 style={{ fontSize: '2.5rem', fontWeight: '800' }}>Let's Transform Education</h2>
            <p style={{ fontSize: '1.2rem', color: '#DCFCE7', marginTop: '8px' }}>
              One School at a Time
            </p>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '0.95rem', fontWeight: '600' }}>
              <span>🌐 {slide.contact.website}</span>
              <span>✉️ {slide.contact.email}</span>
              <span>🐦 {slide.contact.twitter}</span>
            </div>
          </div>
        )}

      </div>

      {/* Speaker Notes Toggle Section */}
      {showSpeakerNotes && slide.speakerNote && (
        <div style={{ marginTop: '16px', padding: '14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#D97706', textTransform: 'uppercase' }}>
            🗣️ Speaker Notes
          </span>
          <p style={{ fontSize: '0.88rem', color: '#78350F', fontStyle: 'italic', marginTop: '4px', margin: 0 }}>
            "{slide.speakerNote}"
          </p>
        </div>
      )}

    </div>
  );
}
