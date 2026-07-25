import React, { useEffect } from 'react';
import { Bell, AlertTriangle, CheckCircle, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div
      className="animate-slide-in"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        maxWidth: '420px',
        width: '100%',
        background: toast.type === 'error' ? '#FEF2F2' : toast.type === 'alert' ? '#FFFBEB' : '#F0FDF4',
        border: toast.type === 'error' ? '2px solid #EF4444' : toast.type === 'alert' ? '2px solid #F59E0B' : '2px solid #22C55E',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start'
      }}
    >
      <div style={{ padding: '6px', borderRadius: '50%', background: toast.type === 'error' ? '#FEE2E2' : toast.type === 'alert' ? '#FEF3C7' : '#DCFCE7' }}>
        {toast.type === 'error' ? <AlertTriangle size={20} color="#DC2626" /> : toast.type === 'alert' ? <Bell size={20} color="#D97706" /> : <CheckCircle size={20} color="#16A34A" />}
      </div>
      
      <div style={{ flex: 1 }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1e293b', marginBottom: '2px' }}>
          {toast.title || 'AI Agent Notification'}
        </h4>
        <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0 }}>
          {toast.message}
        </p>
      </div>

      <button
        onClick={onClose}
        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
