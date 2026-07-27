import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import LiveAgentStatusBar from './components/LiveAgentStatusBar';
import Toast from './components/Toast';
import LoginPortalModal from './components/LoginPortalModal';
import SuperAdminDashboard from './views/superadmin/SuperAdminDashboard';
import AdminDashboard from './views/admin/AdminDashboard';
import TeacherDashboard from './views/teacher/TeacherDashboard';
import ParentDashboard from './views/parent/ParentDashboard';
import PitchDeckView from './views/presentation/PitchDeckView';
import { 
  fetchSchools, fetchStudents, fetchAlerts, fetchAgents, fetchAgentLogs, initSSE 
} from './services/api';

export default function App() {
  const [viewMode, setViewMode] = useState('app'); // 'app' | 'pitch'
  const [userRole, setUserRole] = useState('admin'); // 'superadmin' | 'admin' | 'teacher' | 'parent'
  const [activeSchool, setActiveSchool] = useState('school-a');
  
  // Currently authenticated user state
  const [currentUser, setCurrentUser] = useState({
    name: 'Dr. Robert Vance',
    email: 'admin@springfield.edu',
    role: 'admin',
    schoolId: 'school-a'
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const [schools, setSchools] = useState([]);
  const [students, setStudents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [agents, setAgents] = useState([]);
  const [agentLogs, setAgentLogs] = useState([]);
  const [toast, setToast] = useState(null);
  const [sseConnected, setSseConnected] = useState(false);

  // Load backend data
  const loadData = useCallback(async () => {
    try {
      const [schRes, stuRes, altRes, agtRes, logRes] = await Promise.all([
        fetchSchools(),
        fetchStudents(activeSchool),
        fetchAlerts(activeSchool),
        fetchAgents(),
        fetchAgentLogs()
      ]);

      if (schRes.schools) setSchools(schRes.schools);
      if (stuRes.students) setStudents(stuRes.students);
      if (altRes.alerts) setAlerts(altRes.alerts);
      if (agtRes.agents) setAgents(agtRes.agents);
      if (logRes.logs) setAgentLogs(logRes.logs);
    } catch (err) {
      console.error("Data load error:", err);
    }
  }, [activeSchool]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Subscribe to SSE stream for instant real-time AI agent alerts
  useEffect(() => {
    const unsubscribe = initSSE((event) => {
      if (event.type === "CONNECTED") {
        setSseConnected(true);
      } else if (event.type === "NEW_ALERT") {
        setAlerts(prev => [event.data, ...prev]);
        setToast({
          title: event.data.title,
          message: event.data.message,
          type: event.data.severity === 'High' ? 'error' : 'alert'
        });
      } else if (event.type === "AGENT_LOG") {
        setAgentLogs(prev => [event.data, ...prev]);
        loadData();
      } else if (event.type === "ALERT_RESOLVED") {
        setAlerts(prev => prev.map(a => a.id === event.data.id ? event.data : a));
      }
    });

    return () => unsubscribe();
  }, [loadData]);

  // Login & Persona switch handler with auto-redirection
  const handleLoginSuccess = (userData) => {
    setCurrentUser(userData);
    setUserRole(userData.role);
    if (userData.schoolId) {
      setActiveSchool(userData.schoolId);
    }
    setToast({
      title: 'Authentication Successful',
      message: `Logged in as ${userData.name} (${userData.role.toUpperCase()}). Redirected to workspace.`,
      type: 'info'
    });
  };

  const handleSwitchTenantAndRole = (schoolId, role = 'admin') => {
    setActiveSchool(schoolId);
    setUserRole(role);
    setToast({
      title: 'Context Switched',
      message: `Switched to School Tenant [${schoolId}] as ${role.toUpperCase()}.`,
      type: 'info'
    });
  };

  return (
    <div className="app-container">
      {/* Platform Navigation Header */}
      <Header
        viewMode={viewMode}
        setViewMode={setViewMode}
        userRole={userRole}
        setUserRole={setUserRole}
        currentUser={currentUser}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        activeSchool={activeSchool}
        setActiveSchool={setActiveSchool}
        schools={schools}
        sseConnected={sseConnected}
      />

      {/* Live AI Agent Hub Status Bar (Shown when in App view mode) */}
      {viewMode === 'app' && (
        <LiveAgentStatusBar
          agents={agents}
          activeSchool={activeSchool}
          onTriggerSuccess={(msg) => setToast({ title: 'AI Simulation', message: msg, type: 'info' })}
        />
      )}

      {/* Main Body Content View */}
      <main className="main-content">
        {viewMode === 'pitch' ? (
          <PitchDeckView />
        ) : (
          <>
            {userRole === 'superadmin' && (
              <SuperAdminDashboard
                activeSchool={activeSchool}
                setActiveSchool={setActiveSchool}
                userRole={userRole}
                setUserRole={setUserRole}
                onSwitchTenantAndRole={handleSwitchTenantAndRole}
              />
            )}

            {userRole === 'admin' && (
              <AdminDashboard
                alerts={alerts}
                agents={agents}
                agentLogs={agentLogs}
                activeSchool={activeSchool}
                schools={schools}
                refreshData={loadData}
              />
            )}

            {userRole === 'teacher' && (
              <TeacherDashboard
                activeSchool={activeSchool}
                students={students}
                refreshData={loadData}
              />
            )}

            {userRole === 'parent' && (
              <ParentDashboard
                activeSchool={activeSchool}
                students={students}
                alerts={alerts}
                refreshData={loadData}
              />
            )}
          </>
        )}
      </main>

      {/* Login & Role Redirection Portal Modal */}
      <LoginPortalModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Instant Real-Time Toast Alert */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
