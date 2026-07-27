const { prisma } = require("./prisma");
const memoryStore = require("../store");

let useDatabase = false;

async function initDataStore() {
  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL not set — using in-memory store");
    return false;
  }

  try {
    await prisma.$connect();
    const schoolCount = await prisma.school.count();
    useDatabase = true;
    console.log(
      schoolCount > 0
        ? `PostgreSQL connected (${schoolCount} schools loaded)`
        : "PostgreSQL connected (run npm run db:seed to populate)"
    );

    // Ensure 7th agent (Resource Predictor) exists in DB
    await prisma.agentConfig.upsert({
      where: { id: "resource_predictor" },
      create: {
        id: "resource_predictor",
        name: "Resource Predictor",
        icon: "🔮",
        trigger: "Weekly trend analysis",
        action: "Forecast staff/room shortages → Proactive alerts",
        active: true,
        executionCount: 4,
        lastRun: "3 days ago",
      },
      update: {},
    });

    return true;
  } catch (err) {
    console.warn("PostgreSQL unavailable — falling back to in-memory store:", err.message);
    useDatabase = false;
    return false;
  }
}

function isUsingDatabase() {
  return useDatabase;
}

function getSubscribers() {
  return memoryStore.subscribers;
}

async function getSchools() {
  if (!useDatabase) return memoryStore.schools;
  return prisma.school.findMany({ orderBy: { name: "asc" } });
}

async function addSchool(schoolData) {
  const school = {
    id: schoolData.id || `school-${Date.now()}`,
    name: schoolData.name,
    code: schoolData.code || `SCH-${Math.floor(100 + Math.random() * 900)}`,
    location: schoolData.location || "Central Region",
    studentsCount: Number(schoolData.studentsCount || 0),
    status: "Active",
  };
  if (!useDatabase) {
    memoryStore.schools.push(school);
    memoryStore.students[school.id] = [];
    memoryStore.staff[school.id] = [];
    memoryStore.rooms[school.id] = [];
    memoryStore.subjects[school.id] = [];
    return school;
  }
  return prisma.school.create({ data: school });
}

async function updateSchool(id, updates) {
  if (!useDatabase) {
    const idx = memoryStore.schools.findIndex(s => s.id === id);
    if (idx >= 0) {
      memoryStore.schools[idx] = { ...memoryStore.schools[idx], ...updates };
      return memoryStore.schools[idx];
    }
    return null;
  }
  return prisma.school.update({ where: { id }, data: updates });
}

async function deleteSchool(id) {
  if (!useDatabase) {
    const idx = memoryStore.schools.findIndex(s => s.id === id);
    if (idx >= 0) {
      const [removed] = memoryStore.schools.splice(idx, 1);
      return removed;
    }
    return null;
  }
  return prisma.school.delete({ where: { id } });
}

async function getSchoolAdmins() {
  return memoryStore.schoolAdmins || [];
}

async function addSchoolAdmin(adminData) {
  const admin = {
    id: `sa-${Date.now()}`,
    name: adminData.name,
    email: adminData.email,
    schoolId: adminData.schoolId,
    role: "School Admin",
    status: "Active",
    phone: adminData.phone || "+91-9876500000",
    appointedDate: new Date().toISOString().slice(0, 10),
  };
  if (!memoryStore.schoolAdmins) memoryStore.schoolAdmins = [];
  memoryStore.schoolAdmins.push(admin);
  return admin;
}

async function getSuperAdminStats() {
  const schools = await getSchools();
  const schoolAdmins = await getSchoolAdmins();
  let totalStudents = 0;
  let totalStaff = 0;

  for (const s of schools) {
    const students = await getStudents(s.id);
    const staff = await getStaff(s.id);
    totalStudents += students.length;
    totalStaff += staff.length;
  }

  const logs = await getAgentLogs();
  const alerts = memoryStore.alerts || [];

  return {
    totalSchools: schools.length,
    totalSchoolAdmins: schoolAdmins.length,
    totalStudents,
    totalStaff,
    totalAgentLogs: logs.length,
    totalActiveAlerts: alerts.filter(a => a.status !== "Resolved").length,
    systemHealth: "Optimal (100% Operational)",
    databaseIsolation: "Tenant Row-Level Isolated",
  };
}


async function getStudents(schoolId) {
  if (!useDatabase) return memoryStore.students[schoolId] || [];
  return prisma.student.findMany({ where: { schoolId }, orderBy: { name: "asc" } });
}

async function getGrades(schoolId) {
  if (!useDatabase) return memoryStore.grades[schoolId] || [];
  return prisma.grade.findMany({ where: { schoolId }, orderBy: { date: "desc" } });
}

async function addGrade(schoolId, grade) {
  if (!useDatabase) {
    if (!memoryStore.grades[schoolId]) memoryStore.grades[schoolId] = [];
    memoryStore.grades[schoolId].unshift(grade);
    return grade;
  }
  return prisma.grade.create({
    data: {
      schoolId,
      studentId: grade.studentId,
      studentName: grade.studentName,
      subject: grade.subject,
      score: grade.score,
      total: grade.total,
      date: grade.date,
      teacher: grade.teacher,
      feedback: grade.feedback,
    },
  });
}

async function getAttendance(schoolId) {
  if (!useDatabase) return memoryStore.attendance[schoolId] || [];
  return prisma.attendance.findMany({ where: { schoolId }, orderBy: { date: "desc" } });
}

async function upsertAttendanceRecords(schoolId, records, date) {
  if (!useDatabase) {
    if (!memoryStore.attendance[schoolId]) memoryStore.attendance[schoolId] = [];
    records.forEach((rec) => {
      const existingIdx = memoryStore.attendance[schoolId].findIndex(
        (a) => a.studentId === rec.studentId && a.date === date
      );
      const newRecord = {
        id: `att-${Date.now()}-${rec.studentId}`,
        studentId: rec.studentId,
        studentName: rec.studentName,
        date,
        status: rec.status,
        session: "Morning",
      };
      if (existingIdx >= 0) {
        memoryStore.attendance[schoolId][existingIdx] = newRecord;
      } else {
        memoryStore.attendance[schoolId].push(newRecord);
      }
      const student = (memoryStore.students[schoolId] || []).find((s) => s.id === rec.studentId);
      if (student) {
        if (rec.status === "Absent") {
          student.attendanceRate = Math.max(50, +(student.attendanceRate - 3.5).toFixed(1));
        } else if (rec.status === "Present") {
          student.attendanceRate = Math.min(100, +(student.attendanceRate + 1.2).toFixed(1));
        }
      }
    });
    return memoryStore.attendance[schoolId];
  }

  for (const rec of records) {
    await prisma.attendance.upsert({
      where: {
        schoolId_studentId_date: { schoolId, studentId: rec.studentId, date },
      },
      create: {
        schoolId,
        studentId: rec.studentId,
        studentName: rec.studentName,
        date,
        status: rec.status,
        session: "Morning",
      },
      update: { status: rec.status, studentName: rec.studentName },
    });

    const delta = rec.status === "Absent" ? -3.5 : rec.status === "Present" ? 1.2 : 0;
    if (delta !== 0) {
      const student = await prisma.student.findUnique({ where: { id: rec.studentId } });
      if (student) {
        const nextRate =
          delta < 0
            ? Math.max(50, +(student.attendanceRate + delta).toFixed(1))
            : Math.min(100, +(student.attendanceRate + delta).toFixed(1));
        await prisma.student.update({
          where: { id: rec.studentId },
          data: { attendanceRate: nextRate },
        });
      }
    }
  }
  return getAttendance(schoolId);
}

async function getHomework(schoolId) {
  if (!useDatabase) return memoryStore.homework[schoolId] || [];
  return prisma.homework.findMany({ where: { schoolId }, orderBy: { dueDate: "desc" } });
}

async function addHomework(schoolId, hw) {
  if (!useDatabase) {
    if (!memoryStore.homework[schoolId]) memoryStore.homework[schoolId] = [];
    memoryStore.homework[schoolId].unshift(hw);
    return hw;
  }
  return prisma.homework.create({ data: { schoolId, ...hw } });
}

async function getBehavioralNotes(schoolId) {
  if (!useDatabase) return memoryStore.behavioralNotes[schoolId] || [];
  return prisma.behavioralNote.findMany({ where: { schoolId }, orderBy: { date: "desc" } });
}

async function addBehavioralNote(schoolId, note) {
  if (!useDatabase) {
    if (!memoryStore.behavioralNotes[schoolId]) memoryStore.behavioralNotes[schoolId] = [];
    memoryStore.behavioralNotes[schoolId].unshift(note);
    return note;
  }
  return prisma.behavioralNote.create({ data: { schoolId, ...note } });
}

async function getFees(schoolId) {
  if (!useDatabase) return memoryStore.fees[schoolId] || [];
  return prisma.fee.findMany({ where: { schoolId }, orderBy: { dueDate: "asc" } });
}

async function getAlerts(schoolId) {
  if (!useDatabase) {
    return memoryStore.alerts.filter((a) => a.schoolId === schoolId || !a.schoolId);
  }
  return prisma.alert.findMany({
    where: { OR: [{ schoolId }, { schoolId: null }] },
    orderBy: { timestamp: "desc" },
  });
}

async function addAlert(alert) {
  if (!useDatabase) {
    memoryStore.alerts.unshift(alert);
    return alert;
  }
  return prisma.alert.create({ data: alert });
}

async function resolveAlert(id) {
  if (!useDatabase) {
    const alert = memoryStore.alerts.find((a) => a.id === id);
    if (alert) alert.status = "Resolved";
    return alert;
  }
  return prisma.alert.update({ where: { id }, data: { status: "Resolved" } });
}

async function getAgentConfigs() {
  if (!useDatabase) return memoryStore.agentConfigs;
  return prisma.agentConfig.findMany({ orderBy: { name: "asc" } });
}

async function toggleAgent(agentId, active) {
  if (!useDatabase) {
    const agent = memoryStore.agentConfigs.find((a) => a.id === agentId);
    if (agent) agent.active = active;
    return agent;
  }
  return prisma.agentConfig.update({ where: { id: agentId }, data: { active } });
}

async function bumpAgentRun(agentName) {
  if (!useDatabase) {
    const config = memoryStore.agentConfigs.find((a) => a.name === agentName);
    if (config) {
      config.executionCount += 1;
      config.lastRun = "Just now";
    }
    return config;
  }
  const config = await prisma.agentConfig.findFirst({ where: { name: agentName } });
  if (!config) return null;
  return prisma.agentConfig.update({
    where: { id: config.id },
    data: { executionCount: config.executionCount + 1, lastRun: "Just now" },
  });
}

async function addAgentLog(log) {
  if (!useDatabase) {
    memoryStore.agentLogs.unshift(log);
    if (memoryStore.agentLogs.length > 50) memoryStore.agentLogs.pop();
    return log;
  }
  return prisma.agentLog.create({
    data: {
      agent: log.agent,
      message: log.message,
      status: log.status,
      timestamp: log.timestamp ? new Date(log.timestamp) : new Date(),
    },
  });
}

async function getAgentLogs() {
  if (!useDatabase) return memoryStore.agentLogs;
  return prisma.agentLog.findMany({ orderBy: { timestamp: "desc" }, take: 50 });
}

// ─── STAFF (in-memory — run db:generate + db:push to enable DB persistence) ──
async function getStaff(schoolId) {
  return memoryStore.staff?.[schoolId] || [];
}

async function addStaff(schoolId, staffMember) {
  if (!memoryStore.staff) memoryStore.staff = {};
  if (!memoryStore.staff[schoolId]) memoryStore.staff[schoolId] = [];
  memoryStore.staff[schoolId].push(staffMember);
  return staffMember;
}

async function updateStaff(id, updates) {
  for (const school of Object.keys(memoryStore.staff || {})) {
    const idx = memoryStore.staff[school].findIndex((t) => t.id === id);
    if (idx >= 0) {
      memoryStore.staff[school][idx] = { ...memoryStore.staff[school][idx], ...updates };
      return memoryStore.staff[school][idx];
    }
  }
  return null;
}

async function deleteStaff(id) {
  for (const school of Object.keys(memoryStore.staff || {})) {
    const idx = memoryStore.staff[school].findIndex((t) => t.id === id);
    if (idx >= 0) {
      const [removed] = memoryStore.staff[school].splice(idx, 1);
      return removed;
    }
  }
  return null;
}

// ─── ROOMS (in-memory) ────────────────────────────────────────────────────────
async function getRooms(schoolId) {
  return memoryStore.rooms?.[schoolId] || [];
}

async function addRoom(schoolId, room) {
  if (!memoryStore.rooms) memoryStore.rooms = {};
  if (!memoryStore.rooms[schoolId]) memoryStore.rooms[schoolId] = [];
  memoryStore.rooms[schoolId].push(room);
  return room;
}

// ─── SUBJECTS (in-memory) ────────────────────────────────────────────────────
async function getSubjects(schoolId) {
  return memoryStore.subjects?.[schoolId] || [];
}

async function addSubject(schoolId, subject) {
  if (!memoryStore.subjects) memoryStore.subjects = {};
  if (!memoryStore.subjects[schoolId]) memoryStore.subjects[schoolId] = [];
  memoryStore.subjects[schoolId].push(subject);
  return subject;
}

// ─── TIMETABLE SLOTS (in-memory) ─────────────────────────────────────────────
async function getTimetableSlots(schoolId, classSection) {
  const slots = memoryStore.timetableSlots?.[schoolId] || [];
  return classSection ? slots.filter((s) => s.classSection === classSection) : slots;
}

async function saveTimetableSlots(schoolId, slots) {
  if (!memoryStore.timetableSlots) memoryStore.timetableSlots = {};
  memoryStore.timetableSlots[schoolId] = slots;
  return slots;
}

async function clearTimetable(schoolId) {
  if (memoryStore.timetableSlots) memoryStore.timetableSlots[schoolId] = [];
  return true;
}

// ─── DOCUMENTS (in-memory) ───────────────────────────────────────────────────
async function getDocuments(schoolId) {
  return memoryStore.documents?.[schoolId] || [];
}

async function addDocument(doc) {
  const schoolId = doc.schoolId;
  if (!memoryStore.documents) memoryStore.documents = {};
  if (!memoryStore.documents[schoolId]) memoryStore.documents[schoolId] = [];
  memoryStore.documents[schoolId].unshift(doc);
  return doc;
}

async function updateDocumentStatus(id, status, reviewNotes, linkedStudentId) {
  for (const school of Object.keys(memoryStore.documents || {})) {
    const doc = memoryStore.documents[school].find((d) => d.id === id);
    if (doc) {
      doc.status = status;
      if (reviewNotes !== undefined) doc.reviewNotes = reviewNotes;
      if (linkedStudentId !== undefined) doc.linkedStudentId = linkedStudentId;
      return doc;
    }
  }
  return null;
}

// ─── STUDENT CRUD (add / update / delete) ─────────────────────────────────────
async function addStudent(schoolId, student) {
  if (!useDatabase) {
    if (!memoryStore.students[schoolId]) memoryStore.students[schoolId] = [];
    memoryStore.students[schoolId].push(student);
    return student;
  }
  return prisma.student.create({ data: { ...student, schoolId } });
}

async function updateStudent(id, updates) {
  if (!useDatabase) {
    for (const school of Object.keys(memoryStore.students)) {
      const idx = memoryStore.students[school].findIndex((s) => s.id === id);
      if (idx >= 0) {
        memoryStore.students[school][idx] = { ...memoryStore.students[school][idx], ...updates };
        return memoryStore.students[school][idx];
      }
    }
    return null;
  }
  return prisma.student.update({ where: { id }, data: updates });
}

async function deleteStudent(id) {
  if (!useDatabase) {
    for (const school of Object.keys(memoryStore.students)) {
      const idx = memoryStore.students[school].findIndex((s) => s.id === id);
      if (idx >= 0) {
        const [removed] = memoryStore.students[school].splice(idx, 1);
        return removed;
      }
    }
    return null;
  }
  return prisma.student.delete({ where: { id } });
}

// ─── PREDICTIVE ANALYTICS ────────────────────────────────────────────────────
async function getResourceAnalytics(schoolId) {
  const students = await getStudents(schoolId);
  const staffList = await getStaff(schoolId);
  const rooms = await getRooms(schoolId);
  const subjects = await getSubjects(schoolId);

  const studentCount = students.length;
  const staffCount = staffList.length;
  const staffRatio = staffCount > 0 ? (studentCount / staffCount).toFixed(1) : 0;
  const avgAttendance =
    studentCount > 0
      ? (students.reduce((s, st) => s + st.attendanceRate, 0) / studentCount).toFixed(1)
      : 0;

  const atRiskStudents = students.filter((s) => s.attendanceRate < 80).length;
  const classroomRooms = rooms.filter((r) => r.type === "Classroom").length;
  const estimatedRoomsNeeded = Math.ceil(studentCount / 40);

  const predictions = [];

  if (staffRatio > 15) {
    predictions.push({
      type: "STAFF_SHORTAGE",
      severity: "High",
      message: `Student-to-staff ratio is ${staffRatio}:1 (recommended ≤15:1). ${Math.ceil(studentCount / 15 - staffCount)} additional staff members recommended.`,
      recommendation: "Hire 2-3 subject teachers for next term to meet recommended ratios.",
    });
  } else if (staffRatio > 12) {
    predictions.push({
      type: "STAFF_WARNING",
      severity: "Medium",
      message: `Student-to-staff ratio of ${staffRatio}:1 is approaching the recommended limit.`,
      recommendation: "Plan for 1-2 additional hires before next academic year.",
    });
  }

  if (classroomRooms < estimatedRoomsNeeded) {
    predictions.push({
      type: "ROOM_SHORTAGE",
      severity: "High",
      message: `Only ${classroomRooms} classrooms available for ${studentCount} students. ${estimatedRoomsNeeded} rooms needed at 40 students/room.`,
      recommendation: "Consider scheduling alternate shifts or adding portable classrooms.",
    });
  }

  if (atRiskStudents > studentCount * 0.15) {
    predictions.push({
      type: "ATTENDANCE_RISK",
      severity: "Medium",
      message: `${atRiskStudents} students (${((atRiskStudents / studentCount) * 100).toFixed(0)}%) have attendance below 80%. Trend suggests dropout risk.`,
      recommendation: "Launch targeted intervention program — counselor sessions + parent outreach.",
    });
  }

  if (predictions.length === 0) {
    predictions.push({
      type: "ALL_CLEAR",
      severity: "Low",
      message: "All resource metrics are within healthy parameters.",
      recommendation: "Monitor trends monthly. Consider expanding enrollment by 10% next term.",
    });
  }

  return {
    summary: {
      studentCount,
      staffCount,
      staffRatio,
      avgAttendance,
      classroomRooms,
      estimatedRoomsNeeded,
      atRiskStudents,
    },
    predictions,
    trend: {
      enrollment: [{ term: "Jan 2025", count: Math.max(1, studentCount - 30) }, { term: "Jul 2025", count: Math.max(1, studentCount - 10) }, { term: "Jan 2026", count: studentCount }, { term: "Jul 2026 (projected)", count: studentCount + 25 }],
      staffing: [{ term: "Jan 2025", count: Math.max(1, staffCount - 2) }, { term: "Jul 2025", count: staffCount }, { term: "Jan 2026 (projected)", count: staffCount + 2 }],
    },
  };
}

module.exports = {
  initDataStore,
  isUsingDatabase,
  getSubscribers,
  getSchools,
  addSchool,
  updateSchool,
  deleteSchool,
  getSchoolAdmins,
  addSchoolAdmin,
  getSuperAdminStats,
  getStudents,
  addStudent,
  updateStudent,
  deleteStudent,
  getGrades,
  addGrade,
  getAttendance,
  upsertAttendanceRecords,
  getHomework,
  addHomework,
  getBehavioralNotes,
  addBehavioralNote,
  getFees,
  getAlerts,
  addAlert,
  resolveAlert,
  getAgentConfigs,
  toggleAgent,
  bumpAgentRun,
  addAgentLog,
  getAgentLogs,
  // New entity CRUD
  getStaff,
  addStaff,
  updateStaff,
  deleteStaff,
  getRooms,
  addRoom,
  getSubjects,
  addSubject,
  getTimetableSlots,
  saveTimetableSlots,
  clearTimetable,
  getDocuments,
  addDocument,
  updateDocumentStatus,
  getResourceAnalytics,
};
