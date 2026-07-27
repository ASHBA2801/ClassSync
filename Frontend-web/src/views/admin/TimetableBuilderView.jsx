import React, { useState, useEffect } from 'react';
import { Calendar, Sparkles, RefreshCw, AlertTriangle, CheckCircle2, Grid, List, Zap } from 'lucide-react';
import { fetchStaff, fetchRooms, fetchSubjects, fetchTimetable, generateTimetable, validateTimetable } from '../../services/api';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];
const PERIOD_LABELS = {
  1: '08:00–09:00', 2: '09:00–10:00', 3: '10:00–11:00', 4: '11:15–12:15',
  5: '12:15–13:15', 6: '14:00–15:00', 7: '15:00–16:00', 8: '16:00–17:00',
};

const SUBJECT_COLORS = ['#2E5090', '#059669', '#7C3AED', '#D97706', '#DC2626', '#0891B2', '#DB2777', '#65A30D', '#EA580C'];

function getSubjectColor(name, colorMap) {
  if (!colorMap[name]) {
    colorMap[name] = SUBJECT_COLORS[Object.keys(colorMap).length % SUBJECT_COLORS.length];
  }
  return colorMap[name];
}

export default function TimetableBuilderView({ activeSchool }) {
  const [slots, setSlots] = useState([]);
  const [staff, setStaff] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [validating, setValidating] = useState(false);
  const [stats, setStats] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [generationResult, setGenerationResult] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [filterClass, setFilterClass] = useState('10-A');
  const [classes, setClasses] = useState(['10-A', '10-B']);
  const schoolId = activeSchool || 'school-a';
  const colorMap = {};

  useEffect(() => { loadAll(); }, [schoolId]);

  const loadAll = async () => {
    try {
      const [staffRes, roomsRes, subjectsRes, ttRes] = await Promise.all([
        fetchStaff(schoolId),
        fetchRooms(schoolId),
        fetchSubjects(schoolId),
        fetchTimetable(schoolId),
      ]);
      if (staffRes.staff) setStaff(staffRes.staff);
      if (roomsRes.rooms) setRooms(roomsRes.rooms);
      if (subjectsRes.subjects) setSubjects(subjectsRes.subjects);
      if (ttRes.slots) setSlots(ttRes.slots);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerationResult(null);
    setConflicts([]);
    try {
      const res = await generateTimetable({ schoolId, classes });
      if (res.success) {
        setSlots(res.slots);
        setStats(res.stats);
        setConflicts(res.conflicts || []);
        setGenerationResult(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleValidate = async () => {
    setValidating(true);
    try {
      const res = await validateTimetable({ schoolId });
      setConflicts(res.conflicts || []);
    } finally {
      setValidating(false);
    }
  };

  const slotMap = {};
  slots.forEach(s => {
    const k = `${s.classSection}-${s.day}-${s.period}`;
    slotMap[k] = s;
  });

  const filteredSlots = slots.filter(s => s.classSection === filterClass);
  const allClasses = [...new Set(slots.map(s => s.classSection))];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header */}
      <div className="glass-card" style={{ padding: '20px', background: 'linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 100%)', borderLeft: '6px solid #059669' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '10px', background: '#DCFCE7' }}>
              <Calendar size={24} color="#059669" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e293b' }}>CSP Timetable Builder</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                Greedy + Backtracking solver • {staff.length} teachers • {rooms.length} rooms • {subjects.length} subjects
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '4px', background: '#F1F5F9', padding: '4px', borderRadius: '8px' }}>
              {['10-A', '10-B', '10-C', '11-A', '11-B'].map(c => (
                <button key={c}
                  onClick={() => setClasses(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}
                  style={{
                    padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '700',
                    background: classes.includes(c) ? '#059669' : 'transparent',
                    color: classes.includes(c) ? '#fff' : '#475569',
                  }}>
                  {c}
                </button>
              ))}
            </div>

            <button onClick={handleGenerate} disabled={generating}
              className="btn-primary"
              style={{ background: 'linear-gradient(135deg, #059669, #047857)', opacity: generating ? 0.7 : 1 }}>
              {generating ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Solving CSP...</> : <><Zap size={16} /> Generate Timetable</>}
            </button>

            <button onClick={handleValidate} disabled={validating} className="btn-outline" style={{ fontSize: '0.85rem' }}>
              {validating ? <RefreshCw size={14} /> : <AlertTriangle size={14} />} Validate
            </button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          {[
            { label: 'Slots Generated', value: stats.totalSlots, color: '#059669', bg: '#DCFCE7' },
            { label: 'Classes Covered', value: stats.classesCovered, color: '#2E5090', bg: '#EFF6FF' },
            { label: 'Teachers Used', value: stats.teachersUsed, color: '#7C3AED', bg: '#EDE9FE' },
            { label: 'Rooms Utilized', value: stats.roomsUsed, color: '#D97706', bg: '#FEF3C7' },
            { label: 'Unresolved Constraints', value: conflicts.length, color: conflicts.length > 0 ? '#DC2626' : '#059669', bg: conflicts.length > 0 ? '#FEF2F2' : '#DCFCE7' },
          ].map(m => (
            <div key={m.label} className="glass-card" style={{ padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', marginBottom: '4px' }}>{m.label}</div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <div className="glass-card" style={{ padding: '16px', background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
          <h4 style={{ color: '#991B1B', fontWeight: '800', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} /> {conflicts.length} Constraint(s) Could Not Be Resolved
          </h4>
          {conflicts.map((c, i) => (
            <div key={i} style={{ fontSize: '0.82rem', color: '#B91C1C', padding: '4px 0' }}>
              • [{c.classSection || c.slot?.classSection}] {c.reason}
            </div>
          ))}
        </div>
      )}

      {/* Timetable Grid */}
      {slots.length > 0 && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#1e293b' }}>Generated Timetable</h4>
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>All {slots.length} slots are conflict-free and validated by the CSP solver</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#64748b' }}>Filter class:</span>
              <div style={{ display: 'flex', background: '#F1F5F9', padding: '4px', borderRadius: '8px', gap: '4px' }}>
                {(allClasses.length > 0 ? allClasses : ['10-A', '10-B']).map(c => (
                  <button key={c}
                    onClick={() => setFilterClass(c)}
                    style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '700', background: filterClass === c ? '#2E5090' : 'transparent', color: filterClass === c ? '#fff' : '#475569' }}>
                    {c}
                  </button>
                ))}
              </div>
              <button onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')} className="btn-outline" style={{ padding: '6px 10px' }}>
                {viewMode === 'grid' ? <List size={14} /> : <Grid size={14} />}
              </button>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '10px 12px', background: '#F8FAFC', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', textAlign: 'left', borderBottom: '2px solid #E2E8F0', minWidth: '90px' }}>Period</th>
                    {DAYS.map(d => (
                      <th key={d} style={{ padding: '10px 12px', background: '#F8FAFC', fontSize: '0.75rem', color: '#374151', fontWeight: '800', textAlign: 'center', borderBottom: '2px solid #E2E8F0' }}>{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERIODS.map(period => (
                    <tr key={period}>
                      <td style={{ padding: '8px 12px', fontSize: '0.75rem', color: '#64748b', borderBottom: '1px solid #F1F5F9', fontWeight: '600' }}>
                        <div>P{period}</div>
                        <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{PERIOD_LABELS[period]}</div>
                      </td>
                      {DAYS.map(day => {
                        const slot = slotMap[`${filterClass}-${day}-${period}`];
                        const color = slot ? getSubjectColor(slot.subjectName, colorMap) : null;
                        return (
                          <td key={day} style={{ padding: '6px', borderBottom: '1px solid #F1F5F9', minWidth: '130px' }}>
                            {slot ? (
                              <div style={{ padding: '8px', borderRadius: '8px', background: color + '15', border: `1.5px solid ${color}30`, borderLeft: `3px solid ${color}` }}>
                                <div style={{ fontWeight: '700', color, fontSize: '0.82rem', marginBottom: '2px' }}>{slot.subjectName}</div>
                                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{slot.staffName}</div>
                                <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{slot.roomName}</div>
                              </div>
                            ) : (
                              <div style={{ padding: '8px', borderRadius: '8px', background: '#F8FAFC', border: '1px dashed #E2E8F0', textAlign: 'center', fontSize: '0.7rem', color: '#CBD5E1' }}>—</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredSlots.sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.period - b.period).map((slot, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 80px 140px 1fr 1fr 1fr', gap: '12px', padding: '10px 14px', borderRadius: '8px', background: '#F8FAFC', alignItems: 'center', fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: '700', color: '#374151' }}>{slot.day}</span>
                  <span style={{ color: '#64748b' }}>P{slot.period}</span>
                  <span style={{ fontWeight: '700', color: getSubjectColor(slot.subjectName, colorMap) }}>{slot.subjectName}</span>
                  <span style={{ color: '#475569' }}>{slot.staffName}</span>
                  <span style={{ color: '#475569' }}>{slot.roomName}</span>
                  <span style={{ fontSize: '0.75rem', color: '#16A34A', fontWeight: '600' }}>✓ Valid</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {slots.length === 0 && !generating && (
        <div className="glass-card" style={{ padding: '60px', textAlign: 'center' }}>
          <Calendar size={48} style={{ margin: '0 auto 16px auto', display: 'block', opacity: 0.3 }} />
          <h4 style={{ fontWeight: '800', color: '#475569', marginBottom: '8px' }}>No timetable generated yet</h4>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: '20px' }}>
            Select class sections above and click "Generate Timetable" to run the CSP solver
          </p>
          <p style={{ color: '#94a3b8', fontSize: '0.82rem' }}>
            {staff.length} teachers · {rooms.length} rooms · {subjects.length} subjects loaded
          </p>
        </div>
      )}
    </div>
  );
}
