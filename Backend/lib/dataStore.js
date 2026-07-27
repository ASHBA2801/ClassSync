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

module.exports = {
  initDataStore,
  isUsingDatabase,
  getSubscribers,
  getSchools,
  getStudents,
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
};
