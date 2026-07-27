import React, { useState, useEffect } from 'react';
import { 
  Building2, ShieldCheck, Users, Plus, Trash2, Edit2, ArrowRight, 
  Activity, Database, CheckCircle2, Lock, Cpu, RefreshCw, Server, AlertCircle 
} from 'lucide-react';
import { 
  fetchSchools, addSchool, updateSchool, deleteSchool, 
  fetchSchoolAdmins, addSchoolAdmin, fetchSuperAdminStats 
} from '../../services/api';

export default function SuperAdminDashboard({ 
  activeSchool, 
  setActiveSchool, 
  userRole, 
  setUserRole, 
  onSwitchTenantAndRole 
}) {
  const [stats, setStats] = useState(null);
  const [schools, setSchools] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('schools'); // 'schools' | 'admins' | 'audit'

  // Forms
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [schoolForm, setSchoolForm] = useState({ name: '', code: '', location: '', studentsCount: 300 });

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminForm, setAdminForm] = useState({ name: '', email: '', phone: '', schoolId: 'school-a' });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [statsRes, schRes, admRes] = await Promise.all([
        fetchSuperAdminStats(),
        fetchSchools(),
        fetchSchoolAdmins()
      ]);

      if (statsRes.stats) setStats(statsRes.stats);
      if (schRes.schools) setSchools(schRes.schools);
      if (admRes.admins) setAdmins(admRes.admins);
    } catch (err) {
      console.error("Error loading Super Admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchool = async (e) => {
    e.preventDefault();
    if (!schoolForm.name || !schoolForm.code) return;
    setSubmitting(true);
    try {
      const res = await addSchool(schoolForm);
      if (res.success) {
        setSchoolForm({ name: '', code: '', location: '', studentsCount: 300 });
        setShowSchoolModal(false);
        await loadAllData();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSchool = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete the school tenant "${name}"?`)) return;
    try {
      await deleteSchool(id);
      await loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!adminForm.name || !adminForm.email) return;
    setSubmitting(true);
    try {
      const res = await addSchoolAdmin(adminForm);
      if (res.success) {
        setAdminForm({ name: '', email: '', phone: '', schoolId: 'school-a' });
        setShowAdminModal(false);
        await loadAllData();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Super Admin Top Banner */}
      <div className="glass-card" style={{ padding: '24px', background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)', color: '#fff', borderLeft: '6px solid #818CF8' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(124, 58, 237, 0.4)' }}>
              <ShieldCheck size={28} color="#fff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#FFFFFF', margin: 0 }}>
                  Super Admin Multi-Tenant Control Console
                </h2>
                <span style={{ padding: '3px 10px', borderRadius: '12px', background: '#4F46E5', color: '#EEF2FF', fontSize: '0.72rem', fontWeight: '800' }}>
                  GLOBAL SYSTEM OWNER
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#C7D2FE', margin: '4px 0 0 0' }}>
                Manage all school tenants, assign school principals/admins, monitor multi-tenant database isolation & AI telemetry.
              </p>
            </div>
          </div>

          <button onClick={loadAllData} className="btn-outline" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
            <RefreshCw size={16} /> Refresh Platform Data
          </button>
        </div>
      </div>

      {/* Cross-Platform Global Telemetry Metric Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div className="glass-card" style={{ padding: '18px', borderLeft: '4px solid #4F46E5' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700' }}>TOTAL SCHOOL TENANTS</span>
              <Building2 size={18} color="#4F46E5" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1E1B4B', marginTop: '6px' }}>
              {stats.totalSchools}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: '600' }}>100% Operational Tenants</span>
          </div>

          <div className="glass-card" style={{ padding: '18px', borderLeft: '4px solid #7C3AED' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700' }}>APPOINTED SCHOOL ADMINS</span>
              <Users size={18} color="#7C3AED" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1E1B4B', marginTop: '6px' }}>
              {stats.totalSchoolAdmins}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#4F46E5', fontWeight: '600' }}>Managing Active Schools</span>
          </div>

          <div className="glass-card" style={{ padding: '18px', borderLeft: '4px solid #059669' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700' }}>TOTAL ENROLLED STUDENTS</span>
              <Users size={18} color="#059669" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1E1B4B', marginTop: '6px' }}>
              {stats.totalStudents}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>Across All School Accounts</span>
          </div>

          <div className="glass-card" style={{ padding: '18px', borderLeft: '4px solid #D97706' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700' }}>AI AGENT EXECUTIONS</span>
              <Cpu size={18} color="#D97706" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1E1B4B', marginTop: '6px' }}>
              {stats.totalAgentLogs}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#D97706', fontWeight: '600' }}>Autonomous AI Actions Logged</span>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', background: '#FFFFFF', padding: '6px', borderRadius: '12px', border: '1px solid #E2E8F0', gap: '8px', width: 'fit-content' }}>
        <button
          onClick={() => setActiveTab('schools')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px', borderRadius: '8px',
            fontSize: '0.88rem', fontWeight: '700',
            background: activeTab === 'schools' ? '#4F46E5' : 'transparent',
            color: activeTab === 'schools' ? '#FFFFFF' : '#475569',
            border: 'none', cursor: 'pointer'
          }}
        >
          <Building2 size={16} /> Manage Schools ({schools.length})
        </button>
        <button
          onClick={() => setActiveTab('admins')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px', borderRadius: '8px',
            fontSize: '0.88rem', fontWeight: '700',
            background: activeTab === 'admins' ? '#4F46E5' : 'transparent',
            color: activeTab === 'admins' ? '#FFFFFF' : '#475569',
            border: 'none', cursor: 'pointer'
          }}
        >
          <Users size={16} /> School Admins ({admins.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px', borderRadius: '8px',
            fontSize: '0.88rem', fontWeight: '700',
            background: activeTab === 'audit' ? '#4F46E5' : 'transparent',
            color: activeTab === 'audit' ? '#FFFFFF' : '#475569',
            border: 'none', cursor: 'pointer'
          }}
        >
          <Lock size={16} /> Multi-Tenant Security & Isolation
        </button>
      </div>

      {/* Tab 1: School Tenant Management */}
      {activeTab === 'schools' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>Registered School Tenants</h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '2px 0 0 0' }}>Every school has strict data isolation and custom AI configuration</p>
            </div>
            <button onClick={() => setShowSchoolModal(true)} className="btn-primary" style={{ background: '#4F46E5' }}>
              <Plus size={16} /> Create New School Tenant
            </button>
          </div>

          {/* School Grid Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {schools.map(s => {
              const assignedAdmin = admins.find(a => a.schoolId === s.id);
              return (
                <div key={s.id} style={{ borderRadius: '12px', border: '1px solid #E2E8F0', background: '#F8FAFC', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ padding: '10px', borderRadius: '10px', background: '#EEF2FF', color: '#4F46E5' }}>
                          <Building2 size={20} />
                        </div>
                        <div>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#1E1B4B', margin: 0 }}>{s.name}</h4>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>CODE: {s.code}</span>
                        </div>
                      </div>
                      <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#DCFCE7', color: '#15803D', fontSize: '0.72rem', fontWeight: '800' }}>
                        ACTIVE
                      </span>
                    </div>

                    <div style={{ marginTop: '14px', fontSize: '0.82rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div>📍 <strong>Location:</strong> {s.location || 'Central Region'}</div>
                      <div>🎓 <strong>Enrolled Students:</strong> {s.studentsCount || 0} students</div>
                      <div>👤 <strong>School Admin:</strong> {assignedAdmin ? `${assignedAdmin.name} (${assignedAdmin.email})` : 'Unassigned'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #E2E8F0', paddingTop: '12px' }}>
                    <button
                      onClick={() => onSwitchTenantAndRole(s.id, 'admin')}
                      className="btn-primary"
                      style={{ flex: 1, fontSize: '0.8rem', padding: '6px 12px', background: '#2E5090', justifyContent: 'center' }}
                    >
                      Enter School Admin Console <ArrowRight size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteSchool(s.id, s.name)}
                      style={{ padding: '6px 10px', borderRadius: '6px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', cursor: 'pointer' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Appointed School Admins */}
      {activeTab === 'admins' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>Appointed School Admins & Principals</h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '2px 0 0 0' }}>School Admins manage teachers, timetables, and documents for their assigned school</p>
            </div>
            <button onClick={() => setShowAdminModal(true)} className="btn-primary" style={{ background: '#7C3AED' }}>
              <Plus size={16} /> Appoint New School Admin
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', textTransform: 'uppercase', fontSize: '0.73rem', color: '#64748b' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #E2E8F0' }}>Admin Name</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #E2E8F0' }}>Email Address</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #E2E8F0' }}>Assigned School</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #E2E8F0' }}>Phone</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #E2E8F0' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #E2E8F0' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {admins.map(adm => {
                  const sch = schools.find(s => s.id === adm.schoolId);
                  return (
                    <tr key={adm.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px', fontWeight: '700', color: '#1E1B4B' }}>{adm.name}</td>
                      <td style={{ padding: '12px', color: '#2E5090', fontWeight: '600' }}>{adm.email}</td>
                      <td style={{ padding: '12px', fontWeight: '700', color: '#059669' }}>
                        {sch ? sch.name : adm.schoolId}
                      </td>
                      <td style={{ padding: '12px', color: '#64748b' }}>{adm.phone}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#DCFCE7', color: '#15803D', fontSize: '0.75rem', fontWeight: '800' }}>
                          {adm.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <button
                          onClick={() => onSwitchTenantAndRole(adm.schoolId, 'admin')}
                          className="btn-outline"
                          style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                        >
                          Login as Admin
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Security & Multi-Tenant Audit */}
      {activeTab === 'audit' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={18} color="#4F46E5" /> Multi-Tenant Data Isolation & Security Audit
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '16px', borderRadius: '10px', background: '#F0FDF4', border: '1px solid #86EFAC' }}>
              <div style={{ fontWeight: '800', color: '#166534', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} /> Row-Level Tenant Isolation
              </div>
              <p style={{ fontSize: '0.82rem', color: '#15803D', margin: 0 }}>
                Every database query filters strictly by <code>schoolId</code>. Teachers and admins cannot cross-read tenant data.
              </p>
            </div>

            <div style={{ padding: '16px', borderRadius: '10px', background: '#EFF6FF', border: '1px solid #93C5FD' }}>
              <div style={{ fontWeight: '800', color: '#1E40AF', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Server size={16} /> PostgreSQL + Neon Cloud Integration
              </div>
              <p style={{ fontSize: '0.82rem', color: '#1D4ED8', margin: 0 }}>
                Prisma ORM schema enforces foreign key constraints and multi-school indexing.
              </p>
            </div>

            <div style={{ padding: '16px', borderRadius: '10px', background: '#FAF5FF', border: '1px solid #D8B4FE' }}>
              <div style={{ fontWeight: '800', color: '#6B21A8', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Cpu size={16} /> Autonomous AI Security Guardrails
              </div>
              <p style={{ fontSize: '0.82rem', color: '#7E22CE', margin: 0 }}>
                AI Agents process background jobs isolated per school context stream.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create School Tenant */}
      {showSchoolModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-card" style={{ padding: '24px', width: '100%', maxWidth: '480px', background: '#fff' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1E1B4B', marginBottom: '16px' }}>Create New School Tenant</h3>
            <form onSubmit={handleCreateSchool} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '4px' }}>School Name *</label>
                <input
                  required
                  placeholder="e.g. St. Xavier High School"
                  value={schoolForm.name}
                  onChange={e => setSchoolForm({ ...schoolForm, name: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '4px' }}>School Code *</label>
                  <input
                    required
                    placeholder="e.g. XAV-04"
                    value={schoolForm.code}
                    onChange={e => setSchoolForm({ ...schoolForm, code: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '4px' }}>Capacity</label>
                  <input
                    type="number"
                    placeholder="300"
                    value={schoolForm.studentsCount}
                    onChange={e => setSchoolForm({ ...schoolForm, studentsCount: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '4px' }}>Location</label>
                <input
                  placeholder="e.g. South Bay City"
                  value={schoolForm.location}
                  onChange={e => setSchoolForm({ ...schoolForm, location: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowSchoolModal(false)} className="btn-outline" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary" style={{ flex: 1, background: '#4F46E5', justifyContent: 'center' }}>
                  {submitting ? 'Creating...' : 'Create School Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Appoint School Admin */}
      {showAdminModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-card" style={{ padding: '24px', width: '100%', maxWidth: '480px', background: '#fff' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1E1B4B', marginBottom: '16px' }}>Appoint School Admin</h3>
            <form onSubmit={handleCreateAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '4px' }}>Full Name *</label>
                <input
                  required
                  placeholder="e.g. Dr. Arthur Pendelton"
                  value={adminForm.name}
                  onChange={e => setAdminForm({ ...adminForm, name: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '4px' }}>Email Address *</label>
                <input
                  required
                  type="email"
                  placeholder="admin@school.edu"
                  value={adminForm.email}
                  onChange={e => setAdminForm({ ...adminForm, email: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '4px' }}>Assign to School *</label>
                <select
                  value={adminForm.schoolId}
                  onChange={e => setAdminForm({ ...adminForm, schoolId: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', boxSizing: 'border-box', background: '#fff' }}
                >
                  {schools.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '4px' }}>Phone Number</label>
                <input
                  placeholder="+91-9876500000"
                  value={adminForm.phone}
                  onChange={e => setAdminForm({ ...adminForm, phone: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowAdminModal(false)} className="btn-outline" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary" style={{ flex: 1, background: '#7C3AED', justifyContent: 'center' }}>
                  {submitting ? 'Appointing...' : 'Appoint Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
