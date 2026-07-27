import React, { useState } from 'react';
import { 
  Bell, ShieldAlert, Cpu, CheckCircle2, Play, Power, Calendar, Lock, 
  TrendingUp, Users, Activity, FileText, AlertTriangle, RefreshCw 
} from 'lucide-react';
import { toggleAgent, triggerAgent, resolveAlert } from '../../services/api';
import TimetableSolver from './TimetableSolver';
import DataIsolation from './DataIsolation';

export default function AdminDashboard({ 
  alerts = [], 
  agents = [], 
  agentLogs = [], 
  activeSchool, 
  schools = [],
  refreshData 
}) {
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'agents' | 'timetable' | 'isolation'
  const [filterSeverity, setFilterSeverity] = useState('All');
  const [runningAgent, setRunningAgent] = useState(null);

  const activeSchoolObj = schools.find(s => s.id === activeSchool) || { name: 'Springfield Academy', studentsCount: 450 };

  const filteredAlerts = alerts.filter(a => {
    if (filterSeverity === 'All') return true;
    return a.severity === filterSeverity;
  });

  const handleToggle = async (agentId, currentActive) => {
    try {
      await toggleAgent(agentId, !currentActive);
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTrigger = async (agentId) => {
    setRunningAgent(agentId);
    try {
      await triggerAgent(agentId, activeSchool);
      setTimeout(() => {
        setRunningAgent(null);
        refreshData();
      }, 600);
    } catch (err) {
      setRunningAgent(null);
      console.error(err);
    }
  };

  const handleResolveAlert = async (alertId) => {
    try {
      await resolveAlert(alertId);
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Banner & Tab Navigation */}
      <div className="glass-card" style={{ padding: '20px', background: 'linear-gradient(135deg, #FFF3E0 0%, #FFFFFF 100%)', borderLeft: '6px solid #FF6B35' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.5rem', color: '#1a1a1a', fontWeight: '800' }}>
                Admin Command Center — {activeSchoolObj.name}
              </h2>
              <span className="badge badge-low" style={{ textTransform: 'none' }}>
                Multi-Tenant Isolated
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>
              Central operations hub • 6 Autonomous AI Agents running 24/7 • Real-time event feed
            </p>
          </div>

          {/* Tab buttons */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px', gap: '4px' }}>
            <button
              onClick={() => setActiveTab('feed')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: '700',
                background: activeTab === 'feed' ? '#2E5090' : 'transparent',
                color: activeTab === 'feed' ? '#fff' : '#475569'
              }}
            >
              <Bell size={16} /> Real-Time Alert Feed ({alerts.length})
            </button>
            <button
              onClick={() => setActiveTab('agents')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: '700',
                background: activeTab === 'agents' ? '#2E5090' : 'transparent',
                color: activeTab === 'agents' ? '#fff' : '#475569'
              }}
            >
              <Cpu size={16} /> AI Agents Control & Logs
            </button>
            <button
              onClick={() => setActiveTab('timetable')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: '700',
                background: activeTab === 'timetable' ? '#2E5090' : 'transparent',
                color: activeTab === 'timetable' ? '#fff' : '#475569'
              }}
            >
              <Calendar size={16} /> Timetable Conflict Solver
            </button>
            <button
              onClick={() => setActiveTab('isolation')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: '700',
                background: activeTab === 'isolation' ? '#2E5090' : 'transparent',
                color: activeTab === 'isolation' ? '#fff' : '#475569'
              }}
            >
              <Lock size={16} /> Data Security Verification
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Active AI Agents</span>
            <div style={{ padding: '8px', borderRadius: '8px', background: '#DCFCE7' }}><Cpu size={20} color="#16A34A" /></div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1e293b', marginTop: '8px' }}>
            {agents.filter(a => a.active).length} / 6
          </div>
          <span style={{ fontSize: '0.78rem', color: '#16A34A', fontWeight: '600' }}>100% Operational</span>
        </div>

        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Active Action Alerts</span>
            <div style={{ padding: '8px', borderRadius: '8px', background: '#FEE2E2' }}><Bell size={20} color="#DC2626" /></div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1e293b', marginTop: '8px' }}>
            {alerts.filter(a => a.status === 'Active').length}
          </div>
          <span style={{ fontSize: '0.78rem', color: '#DC2626', fontWeight: '600' }}>Requires Attention</span>
        </div>

        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Admin Time Saved</span>
            <div style={{ padding: '8px', borderRadius: '8px', background: '#E3F2FD' }}><TrendingUp size={20} color="#2E5090" /></div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1e293b', marginTop: '8px' }}>
            60%+
          </div>
          <span style={{ fontSize: '0.78rem', color: '#2E5090', fontWeight: '600' }}>vs manual spreadsheets</span>
        </div>

        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Enrolled Students</span>
            <div style={{ padding: '8px', borderRadius: '8px', background: '#F3E5F5' }}><Users size={20} color="#9333EA" /></div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1e293b', marginTop: '8px' }}>
            {activeSchoolObj.studentsCount || 450}
          </div>
          <span style={{ fontSize: '0.78rem', color: '#9333EA', fontWeight: '600' }}>Multi-Tenant Row-Level Isolated</span>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'feed' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>
                Real-Time Proactive AI Alert Feed
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Actionable notifications surfaced automatically by AI background agents (Not data dumps)
              </p>
            </div>

            {/* Severity Filter */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {['All', 'High', 'Medium', 'Low'].map(sev => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: '600',
                    background: filterSeverity === sev ? '#2E5090' : '#f1f5f9',
                    color: filterSeverity === sev ? '#fff' : '#475569'
                  }}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          {/* Alert List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredAlerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                <CheckCircle2 size={40} color="#16A34A" style={{ margin: '0 auto 12px auto', display: 'block' }} />
                <p style={{ fontWeight: '600' }}>No active alerts for severity: {filterSeverity}</p>
              </div>
            ) : (
              filteredAlerts.map(alert => (
                <div
                  key={alert.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '16px',
                    padding: '16px',
                    borderRadius: '10px',
                    background: alert.status === 'Resolved' ? '#F8FAFC' : alert.severity === 'High' ? '#FEF2F2' : '#FFFBEB',
                    borderLeft: `5px solid ${alert.severity === 'High' ? '#DC2626' : alert.severity === 'Medium' ? '#FF6B35' : '#4CAF50'}`,
                    opacity: alert.status === 'Resolved' ? 0.6 : 1
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '1.6rem' }}>{alert.agentIcon}</div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: '800', color: '#1e293b', fontSize: '0.98rem' }}>{alert.title}</span>
                        <span className={`badge badge-${alert.severity.toLowerCase()}`}>{alert.severity}</span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>• {alert.agentName} • {alert.timestamp}</span>
                      </div>
                      <p style={{ fontSize: '0.88rem', color: '#475569', marginTop: '4px' }}>
                        {alert.message}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '0.78rem', color: '#166534', fontWeight: '600' }}>
                        <CheckCircle2 size={14} /> Auto-Action Executed: {alert.actionAction || alert.actionTaken}
                      </div>
                    </div>
                  </div>

                  <div>
                    {alert.status !== 'Resolved' ? (
                      <button
                        onClick={() => handleResolveAlert(alert.id)}
                        className="btn-outline"
                        style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                      >
                        Dismiss / Mark Resolved
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>Resolved</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      )}

      {activeTab === 'agents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Agent Configurations */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e293b', marginBottom: '16px' }}>
              6 Autonomous AI Core Agents Management
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              {agents.map(agent => (
                <div
                  key={agent.id}
                  style={{
                    padding: '18px',
                    borderRadius: '12px',
                    border: agent.active ? '1px solid #BBF7D0' : '1px solid #E2E8F0',
                    background: agent.active ? '#F0FDF4' : '#F8FAFC',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.4rem' }}>{agent.icon}</span>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#1e293b' }}>{agent.name}</h4>
                      </div>
                      
                      {/* Active toggle button */}
                      <button
                        onClick={() => handleToggle(agent.id, agent.active)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          borderRadius: '16px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          background: agent.active ? '#16A34A' : '#94A3B8',
                          color: '#fff'
                        }}
                      >
                        <Power size={12} /> {agent.active ? 'ACTIVE' : 'OFF'}
                      </button>
                    </div>

                    <p style={{ fontSize: '0.82rem', color: '#475569', marginTop: '8px' }}>
                      <strong>Trigger:</strong> {agent.trigger}
                    </p>
                    <p style={{ fontSize: '0.82rem', color: '#475569', marginTop: '2px' }}>
                      <strong>Action:</strong> {agent.action}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Executions: <strong>{agent.executionCount}</strong> • Last: {agent.lastRun}
                    </span>
                    <button
                      onClick={() => handleTrigger(agent.id)}
                      disabled={runningAgent === agent.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        background: '#2E5090',
                        color: '#fff'
                      }}
                    >
                      {runningAgent === agent.id ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
                      Run Agent
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Execution Audit Transparency Log */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b', marginBottom: '12px' }}>
              AI Execution Transparency Audit Log
            </h3>
            <div style={{ maxHeight: '280px', overflowY: 'auto', background: '#0F172A', color: '#E2E8F0', padding: '14px', borderRadius: '10px', fontFamily: 'monospace', fontSize: '0.82rem' }}>
              {agentLogs.map(log => (
                <div key={log.id} style={{ marginBottom: '8px', borderBottom: '1px solid #1E293B', paddingBottom: '4px' }}>
                  <span style={{ color: '#38BDF8' }}>[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                  <span style={{ color: '#FACC15', fontWeight: 'bold' }}>[{log.agent}]</span>:{' '}
                  <span>{log.message}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {activeTab === 'timetable' && (
        <TimetableSolver />
      )}

      {activeTab === 'isolation' && (
        <DataIsolation activeSchool={activeSchool} schools={schools} />
      )}

    </div>
  );
}
