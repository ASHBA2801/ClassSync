const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api";

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  return res.json();
}

export function fetchStudents(schoolId = "school-a") {
  return request(`/students?schoolId=${schoolId}`);
}

export function fetchGrades(schoolId = "school-a") {
  return request(`/grades?schoolId=${schoolId}`);
}

export function fetchAttendance(schoolId = "school-a") {
  return request(`/attendance?schoolId=${schoolId}`);
}

export function submitBulkAttendance(schoolId: string, records: Array<{ studentId: string; studentName: string; status: string }>) {
  return request("/attendance/bulk", {
    method: "POST",
    body: JSON.stringify({ schoolId, records }),
  });
}

export function submitGrade(data: Record<string, unknown>) {
  return request("/grades", { method: "POST", body: JSON.stringify(data) });
}

export function fetchHomework(schoolId = "school-a") {
  return request(`/homework?schoolId=${schoolId}`);
}

export function fetchAlerts(schoolId = "school-a") {
  return request(`/alerts?schoolId=${schoolId}`);
}

export function fetchSchools() {
  return request("/schools");
}
