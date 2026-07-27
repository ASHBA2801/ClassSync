import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit2, Mail, Phone, BookOpen, CheckCircle2, XCircle, RefreshCw, TrendingUp, AlertTriangle } from 'lucide-react';
import { fetchStaff, addStaff, deleteStaff, fetchResourceAnalytics } from '../../services/api';

const DEPT_COLORS = {
  Mathematics: '#2E5090', Science: '#059669', Languages: '#7C3AED',
  'Social Sciences': '#D97706', 'Physical Education': '#DC2626',
  Technology: '#0891B2', General: '#64748b',
};

const PREDICTION_ICONS = {
  STAFF_SHORTAGE: { icon: '👥', color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5' },
  STAFF_WARNING:  { icon: '⚠️', color: '#D97706', bg: '#FFF7ED', border: '#FED7AA' },
  ROOM_SHORTAGE:  { icon: '🏫', color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5' },
  ATTENDANCE_RISK:{ icon: '📉', color: '#D97706', bg: '#FFF7ED', border: '#FED7AA' },
  ALL_CLEAR:      { icon: '✅', color: '#059669', bg: '#F0FDF4', border: '#86EFAC' },
};

export default function StaffManagementView({ activeSchool }) {
  const [staff, setStaff] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('roster'); // 'roster' | 'analytics'
  const [form, setForm] = useState({ name: '', email: '', phone: '', department: 'Mathematics', qualification: '', joinDate: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);
  const schoolId = activeSchool || 'school-a';

  useEffect(() => { loadAll(); }, [schoolId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [staffRes, analyticsRes] = await Promise.all([
        fetchStaff(schoolId),
        fetchResourceAnalytics(schoolId),
      ]);
      if (staffRes.staff) setStaff(staffRes.staff);
      if (analyticsRes.summary) setAnalytics(analyticsRes);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!form.name || !form.email) return;
    setSaving(true);
    try {
      const res = await addStaff({ schoolId, ...form, subjects: [], availability: { Mon: [1,2,3,4,5,6], Tue: [1,2,3,4,5,6], Wed: [1,2,3,4,5,6], Thu: [1,2,3,4,5,6], Fri: [1,2,3,4,5,6] } });
      if (res.success) {
        setShowForm(false);
        setForm({ name: '', email: '', phone: '', department: 'Mathematics', qualification: '', joinDate: new Date().toISOString().slice(0, 10) });
        await loadAll();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this staff member?')) return;
    await deleteStaff(id);
    await loadAll();
  };

  const departments = [...new Set(staff.map(s => s.department))];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header */}
      <div className="glass-card" style={{ padding: '20px', background: 'linear-gradient(135deg, #FFF7ED 0%, #FFFFFF 100%)', borderLeft: '6px solid #D97706' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '10px', background: '#FEF3C7' }}>
              <Users size={24} color="#D97706" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e293b' }}>Staff Management & Resource Analytics</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                {staff.length} staff members · {departments.length} departments · AI predictive forecasting
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ display: 'flex', background: '#F1F5F9', padding: '4px', borderRadius: '8px', gap: '4px' }}>
              {['roster', 'analytics'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '700', background: activeTab === tab ? '#2E5090' : 'transparent', color: activeTab === tab ? '#fff' : '#475569', textTransform: 'capitalize' }}>
                  {tab === 'roster' ? '👥 Staff Roster' : '🔮 Predictive Analytics'}
                </button>
              ))}
            </div>
            <button onClick={() => setShowForm(!showForm)} className="btn-primary" style={{ background: 'linear-gradient(135deg, #D97706, #B45309)' }}>
              <Plus size={16} /> Add Staff
            </button>
          </div>
        </div>
      </div>

      {/* Add Staff Form */}
      {showForm && (
        <div className="glass-card" style={{ padding: '24px', background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <h4 style={{ fontWeight: '800', color: '#92400E', marginBottom: '16px' }}>➕ Add New Staff Member</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            {[
              { key: 'name', label: 'Full Name *', placeholder: 'e.g. Mr. Sharma' },
              { key: 'email', label: 'Email *', placeholder: 'staff@school.edu' },
              { key: 'phone', label: 'Phone', placeholder: '+91-98765XXXXX' },
              { key: 'qualification', label: 'Qualification', placeholder: 'M.Sc Physics' },
              { key: 'joinDate', label: 'Join Date', placeholder: '', type: 'date' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: '0.78rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>{f.label}</label>
                <input
                  type={f.type || 'text'}
                  value={form[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1.5px solid #E2E8F0', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>
            ))}
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Department</label>
              <select value={form.department} onChange={e => setForm(prev => ({ ...prev, department: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1.5px solid #E2E8F0', fontSize: '0.85rem', background: '#fff', boxSizing: 'border-box' }}>
                {['Mathematics', 'Science', 'Languages', 'Social Sciences', 'Physical Education', 'Technology', 'General'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleAdd} disabled={saving} className="btn-primary" style={{ background: '#D97706' }}>
              {saving ? <RefreshCw size={14} /> : <CheckCircle2 size={14} />} {saving ? 'Saving...' : 'Save Staff Member'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-outline">Cancel</button>
          </div>
        </div>
      )}

      {activeTab === 'roster' && (
        <>
          {/* Dept summary */}
          {departments.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
              {departments.map(dept => {
                const deptStaff = staff.filter(s => s.department === dept);
                const color = DEPT_COLORS[dept] || '#64748b';
                return (
                  <div key={dept} className="glass-card" style={{ padding: '14px', borderLeft: `4px solid ${color}` }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', marginBottom: '4px' }}>{dept}</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color }}>{deptStaff.length}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>staff member{deptStaff.length !== 1 ? 's' : ''}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Staff Table */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#1e293b', marginBottom: '16px' }}>Staff Roster</h4>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading staff...</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', textTransform: 'uppercase', fontSize: '0.73rem', color: '#64748b' }}>
                      {['Name', 'Department', 'Qualification', 'Email', 'Phone', 'Join Date', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #E2E8F0', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map(member => {
                      const color = DEPT_COLORS[member.department] || '#64748b';
                      return (
                        <tr key={member.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '12px', fontWeight: '700', color: '#1e293b' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: color + '20', color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.85rem', flexShrink: 0 }}>
                                {member.name.split(' ').pop()?.[0] || '?'}
                              </div>
                              {member.name}
                            </div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ padding: '3px 8px', borderRadius: '4px', background: color + '15', color, fontSize: '0.75rem', fontWeight: '700' }}>{member.department}</span>
                          </td>
                          <td style={{ padding: '12px', color: '#475569' }}>{member.qualification || '—'}</td>
                          <td style={{ padding: '12px', color: '#475569' }}>
                            <a href={`mailto:${member.email}`} style={{ color: '#2E5090', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem' }}>
                              <Mail size={12} /> {member.email}
                            </a>
                          </td>
                          <td style={{ padding: '12px', color: '#475569', fontSize: '0.82rem' }}>{member.phone || '—'}</td>
                          <td style={{ padding: '12px', color: '#64748b', fontSize: '0.82rem' }}>{member.joinDate}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '4px', background: member.status === 'Active' ? '#DCFCE7' : '#FEE2E2', color: member.status === 'Active' ? '#15803D' : '#DC2626', fontSize: '0.75rem', fontWeight: '700', width: 'fit-content' }}>
                              {member.status === 'Active' ? <CheckCircle2 size={11} /> : <XCircle size={11} />} {member.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <button onClick={() => handleDelete(member.id)} style={{ padding: '4px 8px', borderRadius: '6px', background: '#FEF2F2', color: '#DC2626', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                              <Trash2 size={12} /> Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {staff.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <Users size={36} style={{ margin: '0 auto 12px auto', display: 'block', opacity: 0.3 }} />
                    <p style={{ fontWeight: '600' }}>No staff records. Add your first staff member.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'analytics' && analytics && (
        <>
          {/* Summary metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            {[
              { label: 'Total Students', value: analytics.summary.studentCount, icon: '🎓', color: '#2E5090', bg: '#EFF6FF' },
              { label: 'Total Staff', value: analytics.summary.staffCount, icon: '👨‍🏫', color: '#D97706', bg: '#FEF3C7' },
              { label: 'Student:Staff Ratio', value: `${analytics.summary.staffRatio}:1`, icon: '⚖️', color: analytics.summary.staffRatio > 15 ? '#DC2626' : '#059669', bg: analytics.summary.staffRatio > 15 ? '#FEF2F2' : '#F0FDF4' },
              { label: 'Avg Attendance', value: `${analytics.summary.avgAttendance}%`, icon: '📊', color: '#7C3AED', bg: '#EDE9FE' },
              { label: 'Classrooms', value: `${analytics.summary.classroomRooms} / ${analytics.summary.estimatedRoomsNeeded} needed`, icon: '🏫', color: analytics.summary.classroomRooms < analytics.summary.estimatedRoomsNeeded ? '#DC2626' : '#059669', bg: '#F8FAFC' },
              { label: 'At-Risk Students', value: analytics.summary.atRiskStudents, icon: '⚠️', color: '#DC2626', bg: '#FEF2F2' },
            ].map(m => (
              <div key={m.label} className="glass-card" style={{ padding: '16px', background: m.bg, border: `1px solid ${m.color}20` }}>
                <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>{m.icon}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', marginBottom: '4px' }}>{m.label}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: '800', color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* AI Predictions */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🔮 AI Predictive Resource Forecasts
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {analytics.predictions.map((pred, i) => {
                const style = PREDICTION_ICONS[pred.type] || PREDICTION_ICONS.ALL_CLEAR;
                return (
                  <div key={i} style={{ padding: '16px', borderRadius: '10px', background: style.bg, border: `1px solid ${style.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{style.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{ fontWeight: '800', color: style.color, fontSize: '0.9rem' }}>{pred.type.replace(/_/g, ' ')}</span>
                          <span style={{ padding: '2px 6px', borderRadius: '4px', background: style.color + '20', color: style.color, fontSize: '0.7rem', fontWeight: '700' }}>{pred.severity}</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '6px' }}>{pred.message}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#059669', fontWeight: '600' }}>
                          <TrendingUp size={12} /> Recommendation: {pred.recommendation}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Enrollment trend */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#1e293b', marginBottom: '16px' }}>📈 Enrollment Trend</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
              {analytics.trend.enrollment.map((t, i) => {
                const isProjected = t.term.includes('projected');
                return (
                  <div key={i} style={{ textAlign: 'center', padding: '14px', borderRadius: '8px', background: isProjected ? '#EFF6FF' : '#F8FAFC', border: `1px solid ${isProjected ? '#BFDBFE' : '#E2E8F0'}` }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: isProjected ? '#2E5090' : '#1e293b' }}>{t.count}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>{t.term}</div>
                    {isProjected && <div style={{ fontSize: '0.65rem', color: '#2E5090', fontWeight: '700', marginTop: '2px' }}>PROJECTED</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
