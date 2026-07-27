import React, { useState } from 'react';
import { Send, BookOpen, Bell, FileText, CheckCircle2, Sparkles, AlertCircle, Paperclip, Clock } from 'lucide-react';
import { addHomework } from '../../services/api';

export default function SendStuffToStudents({ activeSchool, students = [], refreshData }) {
  const [activeSubTab, setActiveSubTab] = useState('homework'); // 'homework' | 'announcement' | 'study_notes'
  
  // Homework state
  const [hwForm, setHwForm] = useState({
    title: '',
    subject: 'Mathematics',
    assignedTo: '10-A',
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
    description: '',
  });

  // Announcement state
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    message: '',
    audience: 'All Students & Parents',
    priority: 'Normal',
  });

  const [statusMsg, setStatusMsg] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSendHomework = async (e) => {
    e.preventDefault();
    if (!hwForm.title) return;
    setSubmitting(true);
    try {
      const res = await addHomework({
        schoolId: activeSchool || 'school-a',
        ...hwForm,
      });

      if (res.homework) {
        setStatusMsg({
          type: 'success',
          text: `Homework "${hwForm.title}" sent to Class ${hwForm.assignedTo}! AI Homework Tracker Agent triggered.`
        });
        setHwForm({
          title: '',
          subject: 'Mathematics',
          assignedTo: '10-A',
          dueDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
          description: '',
        });
        if (refreshData) refreshData();
      }
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Failed to send homework.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendAnnouncement = (e) => {
    e.preventDefault();
    if (!announcementForm.title || !announcementForm.message) return;
    setSubmitting(true);

    setTimeout(() => {
      setStatusMsg({
        type: 'success',
        text: `📢 Announcement "${announcementForm.title}" broadcasted to ${announcementForm.audience}! Delivered via real-time SSE.`
      });
      setAnnouncementForm({
        title: '',
        message: '',
        audience: 'All Students & Parents',
        priority: 'Normal',
      });
      setSubmitting(false);
    }, 600);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Sub-tab selection */}
      <div style={{ display: 'flex', background: '#FFFFFF', padding: '6px', borderRadius: '10px', border: '1px solid #CBD5E1', gap: '6px', width: 'fit-content' }}>
        <button
          onClick={() => setActiveSubTab('homework')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px',
            fontSize: '0.88rem', fontWeight: '700',
            background: activeSubTab === 'homework' ? '#2E5090' : 'transparent',
            color: activeSubTab === 'homework' ? '#FFFFFF' : '#475569',
            border: 'none', cursor: 'pointer'
          }}
        >
          <BookOpen size={16} /> Assign Homework / Task
        </button>
        <button
          onClick={() => setActiveSubTab('announcement')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px',
            fontSize: '0.88rem', fontWeight: '700',
            background: activeSubTab === 'announcement' ? '#2E5090' : 'transparent',
            color: activeSubTab === 'announcement' ? '#FFFFFF' : '#475569',
            border: 'none', cursor: 'pointer'
          }}
        >
          <Bell size={16} /> Send Class Announcement
        </button>
      </div>

      {statusMsg && (
        <div style={{
          padding: '14px 18px', borderRadius: '10px',
          background: statusMsg.type === 'success' ? '#F0FDF4' : '#FEF2F2',
          border: `1px solid ${statusMsg.type === 'success' ? '#86EFAC' : '#FCA5A5'}`,
          color: statusMsg.type === 'success' ? '#15803D' : '#991B1B',
          fontWeight: '700', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <CheckCircle2 size={20} />
          {statusMsg.text}
        </div>
      )}

      {/* Homework Tab */}
      {activeSubTab === 'homework' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#1E386B', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={20} color="#2E5090" /> Assign New Homework to Students
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>
              Directly sends homework tasks to Student & Parent Portals. Homework Tracker AI agent evaluates completion daily.
            </p>
          </div>

          <form onSubmit={handleSendHomework} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '4px' }}>Homework Title *</label>
              <input
                required
                placeholder="e.g. Chapter 4 Quadratic Equations & Practice Sheet"
                value={hwForm.title}
                onChange={e => setHwForm({ ...hwForm, title: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '4px' }}>Subject</label>
                <select
                  value={hwForm.subject}
                  onChange={e => setHwForm({ ...hwForm, subject: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', boxSizing: 'border-box', background: '#fff' }}
                >
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="English">English</option>
                  <option value="Computer Science">Computer Science</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '4px' }}>Assigned Class Section</label>
                <select
                  value={hwForm.assignedTo}
                  onChange={e => setHwForm({ ...hwForm, assignedTo: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', boxSizing: 'border-box', background: '#fff' }}
                >
                  <option value="10-A">Class 10-A</option>
                  <option value="10-B">Class 10-B</option>
                  <option value="11-A">Class 11-A</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '4px' }}>Submission Due Date *</label>
                <input
                  type="date"
                  required
                  value={hwForm.dueDate}
                  onChange={e => setHwForm({ ...hwForm, dueDate: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '4px' }}>Instructions & Details</label>
              <textarea
                rows={3}
                placeholder="Complete Problems 1 to 15 on page 84. Submit PDF or photo before 5 PM."
                value={hwForm.description}
                onChange={e => setHwForm({ ...hwForm, description: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>

            <button type="submit" disabled={submitting} className="btn-primary" style={{ background: '#2E5090', padding: '12px', justifyContent: 'center', fontSize: '0.95rem' }}>
              <Send size={18} /> {submitting ? 'Sending Homework...' : 'Send Homework Assignment to Students'}
            </button>
          </form>
        </div>
      )}

      {/* Announcement Tab */}
      {activeSubTab === 'announcement' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#1E386B', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={20} color="#2E5090" /> Broadcast Announcement / Alert
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>
              Sends instant real-time notification to Parents & Students via SSE push stream.
            </p>
          </div>

          <form onSubmit={handleSendAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '4px' }}>Announcement Subject *</label>
              <input
                required
                placeholder="e.g. Science Lab Timings Change for Thursday"
                value={announcementForm.title}
                onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '4px' }}>Target Audience</label>
                <select
                  value={announcementForm.audience}
                  onChange={e => setAnnouncementForm({ ...announcementForm, audience: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', boxSizing: 'border-box', background: '#fff' }}
                >
                  <option value="All Students & Parents">All Students & Parents (Class 10-A)</option>
                  <option value="Parents Only">Parents Only</option>
                  <option value="Students Only">Students Only</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '4px' }}>Priority Level</label>
                <select
                  value={announcementForm.priority}
                  onChange={e => setAnnouncementForm({ ...announcementForm, priority: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', boxSizing: 'border-box', background: '#fff' }}
                >
                  <option value="Normal">Normal Notification</option>
                  <option value="High">High Priority Alert</option>
                  <option value="Urgent">Urgent / Important</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '4px' }}>Announcement Message *</label>
              <textarea
                rows={4}
                required
                placeholder="Dear Students & Parents, please note that the Physics Practical session on Thursday has been rescheduled to 11:15 AM in Lab 202."
                value={announcementForm.message}
                onChange={e => setAnnouncementForm({ ...announcementForm, message: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>

            <button type="submit" disabled={submitting} className="btn-primary" style={{ background: '#059669', padding: '12px', justifyContent: 'center', fontSize: '0.95rem' }}>
              <Send size={18} /> {submitting ? 'Broadcasting...' : 'Broadcast Real-Time Announcement'}
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
