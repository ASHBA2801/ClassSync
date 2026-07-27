// API service & SSE Real-time client for EduSync

const BASE_URL = "/api";

export async function fetchSchools() {
  const res = await fetch(`${BASE_URL}/schools`);
  return res.json();
}

export async function fetchStudents(schoolId) {
  const res = await fetch(`${BASE_URL}/students?schoolId=${schoolId}`);
  return res.json();
}

export async function fetchAttendance(schoolId) {
  const res = await fetch(`${BASE_URL}/attendance?schoolId=${schoolId}`);
  return res.json();
}

export async function submitBulkAttendance(schoolId, records) {
  const res = await fetch(`${BASE_URL}/attendance/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ schoolId, records })
  });
  return res.json();
}

export async function fetchGrades(schoolId) {
  const res = await fetch(`${BASE_URL}/grades?schoolId=${schoolId}`);
  return res.json();
}

export async function submitGrade(data) {
  const res = await fetch(`${BASE_URL}/grades`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function fetchHomework(schoolId) {
  const res = await fetch(`${BASE_URL}/homework?schoolId=${schoolId}`);
  return res.json();
}

export async function submitHomework(data) {
  const res = await fetch(`${BASE_URL}/homework`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function fetchBehavioralNotes(schoolId) {
  const res = await fetch(`${BASE_URL}/behavioral?schoolId=${schoolId}`);
  return res.json();
}

export async function submitBehavioralNote(data) {
  const res = await fetch(`${BASE_URL}/behavioral`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function fetchFees(schoolId) {
  const res = await fetch(`${BASE_URL}/fees?schoolId=${schoolId}`);
  return res.json();
}

export async function fetchAlerts(schoolId) {
  const res = await fetch(`${BASE_URL}/alerts?schoolId=${schoolId}`);
  return res.json();
}

export async function resolveAlert(alertId) {
  const res = await fetch(`${BASE_URL}/alerts/${alertId}/resolve`, {
    method: "POST"
  });
  return res.json();
}

export async function fetchAgents() {
  const res = await fetch(`${BASE_URL}/agents`);
  return res.json();
}

export async function toggleAgent(agentId, active) {
  const res = await fetch(`${BASE_URL}/agents/toggle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId, active })
  });
  return res.json();
}

export async function triggerAgent(agentId, schoolId) {
  const res = await fetch(`${BASE_URL}/agents/trigger`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId, schoolId })
  });
  return res.json();
}

export async function fetchAgentLogs() {
  const res = await fetch(`${BASE_URL}/agent-logs`);
  return res.json();
}

export async function fetchTimetableConflict() {
  const res = await fetch(`${BASE_URL}/timetable/conflict-check`);
  return res.json();
}

export async function fetchPitchData() {
  const res = await fetch(`${BASE_URL}/pitch`);
  return res.json();
}

// SSE Real-time Event Listener Setup
export function initSSE(onMessageCallback) {
  let eventSource = null;
  try {
    eventSource = new EventSource(`${BASE_URL}/events`);
    
    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (onMessageCallback) onMessageCallback(parsed);
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn("SSE connection interrupted, retrying...", err);
    };
  } catch (err) {
    console.error("Failed to connect SSE:", err);
  }

  return () => {
    if (eventSource) eventSource.close();
  };
}
