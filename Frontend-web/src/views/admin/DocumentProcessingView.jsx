import React, { useState, useEffect } from 'react';
import { FileText, Upload, CheckCircle2, AlertTriangle, Clock, Eye, Send, Sparkles, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchDocuments, processDocument, reviewDocument } from '../../services/api';

const FORM_TYPES = [
  { value: 'admission', label: 'Admission Form', icon: '📋', color: '#2E5090' },
  { value: 'id_proof', label: 'ID Proof / Aadhaar', icon: '🪪', color: '#7C3AED' },
  { value: 'marksheet', label: 'Marksheet / Report Card', icon: '📊', color: '#059669' },
  { value: 'leave_application', label: 'Leave Application', icon: '✉️', color: '#D97706' },
];

const STATUS_STYLES = {
  Pending:       { bg: '#FEF3C7', color: '#92400E', icon: <Clock size={12}/> },
  Processing:    { bg: '#EFF6FF', color: '#1E40AF', icon: <RefreshCw size={12}/> },
  Reviewed:      { bg: '#ECFDF5', color: '#065F46', icon: <Eye size={12}/> },
  Written_to_ERP:{ bg: '#F0FDF4', color: '#14532D', icon: <CheckCircle2 size={12}/> },
};

const ConfidenceBar = ({ value }) => {
  const pct = Math.round(value * 100);
  const color = pct >= 90 ? '#16A34A' : pct >= 75 ? '#D97706' : '#DC2626';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: '#E2E8F0', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: '3px', background: color, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: '0.78rem', fontWeight: '700', color, minWidth: '36px' }}>{pct}%</span>
    </div>
  );
};

export default function DocumentProcessingView({ activeSchool }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [activeResult, setActiveResult] = useState(null);
  const [form, setForm] = useState({ fileName: 'student_form.pdf', formType: 'admission' });
  const schoolId = activeSchool || 'school-a';

  useEffect(() => { loadDocuments(); }, [schoolId]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetchDocuments(schoolId);
      if (res.documents) setDocuments(res.documents);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    setProcessing(true);
    setActiveResult(null);
    try {
      const res = await processDocument({ schoolId, ...form });
      if (res.success) {
        setActiveResult(res);
        await loadDocuments();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleReview = async (docId, status) => {
    try {
      await reviewDocument(docId, { status, reviewNotes: 'Human reviewed and confirmed.' });
      await loadDocuments();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header */}
      <div className="glass-card" style={{ padding: '20px', background: 'linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 100%)', borderLeft: '6px solid #7C3AED' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', borderRadius: '10px', background: '#EDE9FE' }}>
            <FileText size={24} color="#7C3AED" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e293b' }}>AI Document Processing Pipeline</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
              Upload scanned forms → OCR extraction → Confidence scoring → Human review queue → Write to ERP
            </p>
          </div>
          <span style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: '6px', background: '#EDE9FE', color: '#7C3AED', fontSize: '0.78rem', fontWeight: '700' }}>
            🤖 AI-Powered
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

        {/* Upload Panel */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#1e293b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={18} color="#7C3AED" /> Simulate Document Upload
          </h4>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px' }}>
              Document Form Type
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {FORM_TYPES.map(ft => (
                <button
                  key={ft.value}
                  onClick={() => setForm(f => ({ ...f, formType: ft.value }))}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `2px solid ${form.formType === ft.value ? ft.color : '#E2E8F0'}`,
                    background: form.formType === ft.value ? ft.color + '15' : '#F8FAFC',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '0.82rem',
                    fontWeight: form.formType === ft.value ? '700' : '500',
                    color: form.formType === ft.value ? ft.color : '#475569',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: '1.1rem', display: 'block', marginBottom: '2px' }}>{ft.icon}</span>
                  {ft.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px' }}>
              File Name (simulated)
            </label>
            <input
              value={form.fileName}
              onChange={e => setForm(f => ({ ...f, fileName: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #E2E8F0', fontSize: '0.88rem', background: '#F8FAFC', boxSizing: 'border-box' }}
              placeholder="e.g. admission_form_2026.pdf"
            />
          </div>

          {/* Pipeline visualization */}
          <div style={{ padding: '12px', borderRadius: '8px', background: '#F8FAFC', marginBottom: '20px', fontSize: '0.78rem' }}>
            <div style={{ fontWeight: '700', color: '#374151', marginBottom: '8px' }}>Processing Pipeline:</div>
            {['Image Upload', 'Preprocessing (deskew)', 'OCR Extraction', 'Field Classification (AI)', 'Confidence Scoring', 'Human Review Queue', 'ERP Write'].map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 0', color: '#64748b' }}>
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#2E5090', color: '#fff', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', flexShrink: 0 }}>
                  {i + 1}
                </div>
                {step}
                {i < 6 && <div style={{ marginLeft: 'auto', width: '1px', height: '12px', background: '#CBD5E1' }} />}
              </div>
            ))}
          </div>

          <button
            onClick={handleProcess}
            disabled={processing}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', opacity: processing ? 0.7 : 1 }}
          >
            {processing ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Processing with AI...</> : <><Sparkles size={16} /> Run AI Document Extraction</>}
          </button>
        </div>

        {/* Result Panel */}
        <div className="glass-card" style={{ padding: '24px', overflowY: 'auto', maxHeight: '520px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="#7C3AED" /> AI Extraction Result
          </h4>

          {!activeResult && !processing && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <FileText size={40} style={{ margin: '0 auto 12px auto', display: 'block', opacity: 0.4 }} />
              <p style={{ fontWeight: '600' }}>Run the pipeline to see extracted fields</p>
            </div>
          )}

          {processing && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⚙️</div>
              <p style={{ fontWeight: '700', color: '#7C3AED', marginBottom: '4px' }}>AI is processing your document...</p>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>OCR → Field extraction → Confidence scoring</p>
            </div>
          )}

          {activeResult && (
            <div>
              {/* Confidence summary */}
              <div style={{ padding: '12px 14px', borderRadius: '8px', background: activeResult.pipeline.autoApproved ? '#F0FDF4' : '#FFF7ED', border: `1px solid ${activeResult.pipeline.autoApproved ? '#86EFAC' : '#FED7AA'}`, marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.9rem', color: activeResult.pipeline.autoApproved ? '#15803D' : '#92400E' }}>
                    {activeResult.pipeline.autoApproved ? '✅ Auto-Approved' : '⚠️ Requires Human Review'}
                  </span>
                  <span style={{ fontWeight: '800', fontSize: '1.1rem', color: activeResult.pipeline.autoApproved ? '#16A34A' : '#D97706' }}>
                    {activeResult.pipeline.overallConfidence}% confidence
                  </span>
                </div>
                {activeResult.pipeline.lowConfidenceFields.length > 0 && (
                  <p style={{ fontSize: '0.78rem', color: '#92400E' }}>
                    Low-confidence fields: {activeResult.pipeline.lowConfidenceFields.join(', ')}
                  </p>
                )}
              </div>

              {/* Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.entries(activeResult.document.extractedData).map(([key, field]) => (
                  <div key={key} style={{ padding: '10px 12px', borderRadius: '8px', background: field.requiresReview ? '#FFFBEB' : '#F8FAFC', border: `1px solid ${field.requiresReview ? '#FDE68A' : '#E2E8F0'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#64748b' }}>{field.label}</span>
                      {field.requiresReview && <span style={{ fontSize: '0.7rem', background: '#FEF3C7', color: '#92400E', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>REVIEW</span>}
                    </div>
                    <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.9rem', marginBottom: '6px' }}>
                      {field.value || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Not extracted</span>}
                    </div>
                    <ConfidenceBar value={field.confidence} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Document Queue */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#1e293b' }}>📁 Document Queue ({documents.length})</h4>
          <button onClick={loadDocuments} className="btn-outline" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Loading documents...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {documents.map(doc => {
              const statusStyle = STATUS_STYLES[doc.status] || STATUS_STYLES.Pending;
              const isExpanded = expandedDoc === doc.id;
              return (
                <div key={doc.id} style={{ borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: '#F8FAFC', cursor: 'pointer' }} onClick={() => setExpandedDoc(isExpanded ? null : doc.id)}>
                    <span style={{ fontSize: '1.4rem' }}>{FORM_TYPES.find(f => f.value === doc.formType)?.icon || '📄'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.9rem' }}>{doc.fileName}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                        {FORM_TYPES.find(f => f.value === doc.formType)?.label} • {new Date(doc.uploadedAt).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '6px', background: statusStyle.bg, color: statusStyle.color, fontSize: '0.78rem', fontWeight: '700' }}>
                      {statusStyle.icon} {doc.status}
                    </div>
                    <div style={{ minWidth: '60px' }}>
                      <ConfidenceBar value={doc.confidence || 0} />
                    </div>
                    {isExpanded ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
                  </div>

                  {isExpanded && (
                    <div style={{ padding: '16px', borderTop: '1px solid #E2E8F0' }}>
                      <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '12px' }}>
                        <strong>Review Notes:</strong> {doc.reviewNotes}
                      </p>
                      {doc.extractedData && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px', marginBottom: '12px' }}>
                          {Object.entries(doc.extractedData).map(([key, field]) => (
                            <div key={key} style={{ padding: '8px', borderRadius: '6px', background: '#F1F5F9', fontSize: '0.82rem' }}>
                              <div style={{ color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>{field.label || key}</div>
                              <div style={{ color: '#1e293b', fontWeight: '700' }}>{field.value || '—'}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {doc.status === 'Pending' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleReview(doc.id, 'Reviewed')} className="btn-outline" style={{ fontSize: '0.8rem', padding: '6px 14px', color: '#059669', borderColor: '#059669' }}>
                            <CheckCircle2 size={14} /> Approve & Mark Reviewed
                          </button>
                          <button onClick={() => handleReview(doc.id, 'Written_to_ERP')} className="btn-primary" style={{ fontSize: '0.8rem', padding: '6px 14px', background: '#7C3AED' }}>
                            <Send size={14} /> Write to ERP
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {documents.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                <FileText size={36} style={{ margin: '0 auto 12px auto', display: 'block', opacity: 0.3 }} />
                <p style={{ fontWeight: '600' }}>No documents yet. Process a document above.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
