import React, { useState, useEffect } from 'react';
import { BookOpen, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { fetchHomework } from '../../services/api';

export default function HomeworkTracker({ activeSchool, child }) {
  const [homeworkList, setHomeworkList] = useState([]);

  useEffect(() => {
    loadHomework();
  }, [activeSchool]);

  const loadHomework = async () => {
    try {
      const res = await fetchHomework(activeSchool);
      setHomeworkList(res.homework || []);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <BookOpen size={22} color="#4CAF50" />
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>
            Homework & Due Dates Tracker — {child.name}
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Monitored 24/7 by Homework Tracker AI Agent (Auto-reminders sent 2 days overdue)
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {homeworkList.map(hw => {
          const isPendingForChild = hw.pendingStudents.includes(child.name);

          return (
            <div
              key={hw.id}
              style={{
                padding: '16px',
                borderRadius: '10px',
                background: hw.status === 'Overdue' ? '#FEF2F2' : '#FFFFFF',
                border: hw.status === 'Overdue' ? '1px solid #FCA5A5' : '1px solid #E2E8F0',
                display: 'flex',
                justify: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#1e293b' }}>{hw.title}</h4>
                  <span className="badge badge-low" style={{ background: '#E3F2FD', color: '#1E386B' }}>{hw.subject}</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                  Due Date: <strong>{hw.dueDate}</strong> • Class: {hw.assignedTo}
                </p>
              </div>

              <div>
                {hw.status === 'Overdue' ? (
                  <span className="badge badge-high" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                    <AlertTriangle size={14} /> {hw.overdueDays} Days Overdue (AI Alert Dispatched)
                  </span>
                ) : (
                  <span className="badge badge-low" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                    <CheckCircle2 size={14} /> Assigned & Active
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
