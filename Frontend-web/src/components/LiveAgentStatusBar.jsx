import React from 'react';
import { Cpu, Play, CheckCircle2, Zap } from 'lucide-react';
import { triggerAgent } from '../services/api';

export default function LiveAgentStatusBar({ agents = [], activeSchool, onTriggerSuccess }) {
  const activeCount = agents.filter(a => a.active).length;

  const handleRunAll = async () => {
    try {
      await triggerAgent('all', activeSchool);
      if (onTriggerSuccess) onTriggerSuccess('All 6 AI Autonomous Agents Executed Live!');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '10px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        
        {/* Left: Agent status summary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#E3F2FD', padding: '4px 12px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '700', color: '#1E386B' }}>
            <Cpu size={15} color="#2E5090" />
            <span>AI AGENT HUB: {activeCount}/6 AGENTS ACTIVE</span>
          </div>
          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Monitoring 24/7 • Automatic Triggers & Decision Workflows
          </span>
        </div>

        {/* Middle: Agent Icon pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {agents.map((agent) => (
            <div
              key={agent.id}
              title={`${agent.name} (${agent.trigger})`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '16px',
                fontSize: '0.78rem',
                fontWeight: '600',
                background: agent.active ? '#F0FDF4' : '#F1F5F9',
                color: agent.active ? '#166534' : '#64748B',
                border: agent.active ? '1px solid #BBF7D0' : '1px solid #E2E8F0'
              }}
            >
              <span>{agent.icon}</span>
              <span>{agent.name.split(' ')[0]}</span>
            </div>
          ))}
        </div>

        {/* Right: Quick action */}
        <button
          onClick={handleRunAll}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'linear-gradient(135deg, #FF6B35, #E0531F)',
            color: '#fff',
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: '700',
            boxShadow: '0 2px 6px rgba(255, 107, 53, 0.3)'
          }}
        >
          <Zap size={14} />
          Trigger All Agents Now
        </button>

      </div>
    </div>
  );
}
