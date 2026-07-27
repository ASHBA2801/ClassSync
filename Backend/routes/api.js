const express = require("express");
const router = express.Router();
const dataStore = require("../lib/dataStore");
const agentEngine = require("../agents/agentEngine");

router.get("/schools", async (req, res) => {
  const schools = await dataStore.getSchools();
  res.json({ success: true, schools });
});

router.get("/students", async (req, res) => {
  const schoolId = req.query.schoolId || "school-a";
  const students = await dataStore.getStudents(schoolId);
  res.json({ success: true, students });
});

router.get("/attendance", async (req, res) => {
  const schoolId = req.query.schoolId || "school-a";
  const attendance = await dataStore.getAttendance(schoolId);
  res.json({ success: true, attendance });
});

router.post("/attendance/bulk", async (req, res) => {
  const { schoolId = "school-a", records, date = new Date().toISOString().slice(0, 10) } = req.body;
  const attendance = await dataStore.upsertAttendanceRecords(schoolId, records, date);
  await agentEngine.runAttendanceMonitor(schoolId);

  res.json({
    success: true,
    message: `Marked attendance for ${records.length} students in 30s. AI Attendance Agent executed automatically!`,
    attendance,
  });
});

router.get("/grades", async (req, res) => {
  const schoolId = req.query.schoolId || "school-a";
  const grades = await dataStore.getGrades(schoolId);
  res.json({ success: true, grades });
});

router.post("/grades", async (req, res) => {
  const {
    schoolId = "school-a",
    studentId,
    studentName,
    subject,
    score,
    total = 100,
    teacher = "Teacher",
    feedback = "",
  } = req.body;

  const newGrade = {
    id: `g-${Date.now()}`,
    studentId,
    studentName,
    subject,
    score: Number(score),
    total: Number(total),
    date: new Date().toISOString().slice(0, 10),
    teacher,
    feedback,
  };

  const grade = await dataStore.addGrade(schoolId, newGrade);
  await agentEngine.runGradeAlertAgent(schoolId, grade);

  res.json({
    success: true,
    message: "Grade saved successfully! Grade Alert AI agent evaluated the entry.",
    grade,
  });
});

router.get("/homework", async (req, res) => {
  const schoolId = req.query.schoolId || "school-a";
  const homework = await dataStore.getHomework(schoolId);
  res.json({ success: true, homework });
});

router.post("/homework", async (req, res) => {
  const { schoolId = "school-a", title, subject, dueDate, assignedTo = "10-A" } = req.body;
  const newHw = {
    id: `hw-${Date.now()}`,
    title,
    subject,
    dueDate,
    status: "Active",
    assignedTo,
    overdueDays: 0,
    pendingStudents: ["Raj Patel", "Rohan Verma", "Aarav Sharma"],
  };

  const homework = await dataStore.addHomework(schoolId, newHw);
  res.json({ success: true, homework });
});

router.get("/behavioral", async (req, res) => {
  const schoolId = req.query.schoolId || "school-a";
  const notes = await dataStore.getBehavioralNotes(schoolId);
  res.json({ success: true, notes });
});

router.post("/behavioral", async (req, res) => {
  const { schoolId = "school-a", studentId, studentName, note, author = "Teacher", sentiment = "Neutral" } = req.body;
  const newNote = {
    id: `b-${Date.now()}`,
    studentId,
    studentName,
    note,
    date: new Date().toISOString().slice(0, 10),
    author,
    sentiment,
  };

  const saved = await dataStore.addBehavioralNote(schoolId, newNote);
  if (sentiment === "Negative") {
    await agentEngine.runBehavioralInsightAgent(schoolId);
  }

  res.json({ success: true, note: saved });
});

router.get("/fees", async (req, res) => {
  const schoolId = req.query.schoolId || "school-a";
  const fees = await dataStore.getFees(schoolId);
  res.json({ success: true, fees });
});

router.get("/alerts", async (req, res) => {
  const schoolId = req.query.schoolId || "school-a";
  const alerts = await dataStore.getAlerts(schoolId);
  res.json({ success: true, alerts });
});

router.post("/alerts/:id/resolve", async (req, res) => {
  const { id } = req.params;
  const alert = await dataStore.resolveAlert(id);
  if (alert) {
    agentEngine.broadcast("ALERT_RESOLVED", alert);
    res.json({ success: true, alert });
  } else {
    res.status(404).json({ success: false, message: "Alert not found" });
  }
});

router.get("/agents", async (req, res) => {
  const agents = await dataStore.getAgentConfigs();
  res.json({ success: true, agents });
});

router.post("/agents/toggle", async (req, res) => {
  const { agentId, active } = req.body;
  const agent = await dataStore.toggleAgent(agentId, active);
  if (agent) {
    await agentEngine.logAgentExecution(agent.name, `Agent ${active ? "enabled" : "disabled"} by Admin.`);
    res.json({ success: true, agent });
  } else {
    res.status(404).json({ success: false, message: "Agent not found" });
  }
});

router.post("/agents/trigger", async (req, res) => {
  const { agentId, schoolId = "school-a" } = req.body;

  let result;
  switch (agentId) {
    case "attendance_monitor":
      result = await agentEngine.runAttendanceMonitor(schoolId);
      break;
    case "grade_alert":
      result = await agentEngine.runGradeAlertAgent(schoolId);
      break;
    case "homework_tracker":
      result = await agentEngine.runHomeworkTracker(schoolId);
      break;
    case "fee_reminder":
      result = await agentEngine.runFeeReminderAgent(schoolId);
      break;
    case "behavioral_insight":
      result = await agentEngine.runBehavioralInsightAgent(schoolId);
      break;
    case "report_generator":
      result = await agentEngine.runReportGeneratorAgent(schoolId);
      break;
    case "all":
    default:
      result = await agentEngine.runAllAgents(schoolId);
      break;
  }

  res.json({ success: true, result, message: `Agent '${agentId}' executed successfully.` });
});

router.get("/agent-logs", async (req, res) => {
  const logs = await dataStore.getAgentLogs();
  res.json({ success: true, logs });
});

router.get("/timetable/conflict-check", (req, res) => {
  const demoSchedule = [
    { class: "10-A", period: "Period 1 (09:00 AM)", teacher: "Mr. Davis", subject: "Math", room: "Room 101" },
    {
      class: "10-B",
      period: "Period 1 (09:00 AM)",
      teacher: "Mr. Davis",
      subject: "Math",
      room: "Room 102",
      conflict: true,
      conflictReason: "Teacher Mr. Davis double booked across 10-A and 10-B!",
    },
    { class: "10-A", period: "Period 2 (10:00 AM)", teacher: "Mrs. Curie", subject: "Physics", room: "Room 101" },
    { class: "10-B", period: "Period 2 (10:00 AM)", teacher: "Ms. Austen", subject: "English", room: "Room 102" },
  ];

  const suggestedResolution = [
    { class: "10-A", period: "Period 1 (09:00 AM)", teacher: "Mr. Davis", subject: "Math", room: "Room 101" },
    {
      class: "10-B",
      period: "Period 1 (09:00 AM)",
      teacher: "Ms. Austen",
      subject: "English",
      room: "Room 102",
      resolved: true,
      note: "AI Auto-swapped Period 1 Math with Period 2 English for 10-B",
    },
    { class: "10-A", period: "Period 2 (10:00 AM)", teacher: "Mrs. Curie", subject: "Physics", room: "Room 101" },
    {
      class: "10-B",
      period: "Period 2 (10:00 AM)",
      teacher: "Mr. Davis",
      subject: "Math",
      room: "Room 102",
      resolved: true,
    },
  ];

  res.json({
    success: true,
    agent: "Timetable Conflict Resolver",
    hasConflict: true,
    originalSchedule: demoSchedule,
    aiSuggestedSchedule: suggestedResolution,
  });
});

router.get("/pitch", (req, res) => {
  res.json({
    success: true,
    deckTitle: "EduSync: AI-Powered School Management Platform",
    slidesCount: 13,
    slides: [
      {
        slideNumber: 1,
        title: "EduSync",
        subtitle: "AI-Powered School Management Platform",
        bg: "#2E5090",
        notes: "Introduce the platform as a transformative solution for modern education.",
      },
      {
        slideNumber: 2,
        title: "The Problem",
        problems: [
          "Manual data entry causing delays and errors",
          "Physical documents scattered across departments",
          "Siloed systems with no real-time communication",
          "Poor parent-teacher connection",
          "Inefficient administrative workflows",
          "No proactive alerts — everything is reactive",
        ],
      },
      {
        slideNumber: 3,
        title: "Our Solution: EduSync",
        subtitle: "A comprehensive multi-tenant SaaS platform",
        solutions: [
          "Automates school operations end-to-end",
          "Connects teachers, parents, and admins seamlessly",
          "Uses AI agents for proactive decisions",
          "Provides real-time insights, not data dumps",
          "Works offline & scales across multiple schools",
        ],
      },
      {
        slideNumber: 4,
        title: "Three-Tier Architecture",
        tiers: [
          {
            name: "Teacher App",
            bg: "#E3F2FD",
            border: "#2E5090",
            icon: "👨‍🏫",
            features: ["Mark attendance", "Enter grades", "Track assignments", "Behavioral notes", "AI alerts"],
          },
          {
            name: "Parent App",
            bg: "#F3E5F5",
            border: "#4CAF50",
            icon: "👨‍👩‍👧",
            features: ["Progress dashboard", "Attendance & grades", "Homework tracking", "Automated alerts", "Messaging"],
          },
          {
            name: "Admin Web",
            bg: "#FFF3E0",
            border: "#FF6B35",
            icon: "⚙️",
            features: ["Real-time alert feed", "Operations center", "Analytics", "Timetable", "AI agent control"],
          },
        ],
      },
      {
        slideNumber: 5,
        title: "AI Agents - The Core",
        subtitle: "Autonomous agents that monitor, evaluate, and act—24/7",
        agents: [
          { name: "Attendance Monitor", trigger: "Daily end-of-school", action: "Flags <80% attendance" },
          { name: "Grade Alert Agent", trigger: "Grade entered", action: "<40% marks → Intervention" },
          { name: "Homework Tracker", trigger: "Scheduled daily", action: "Overdue → Reminders" },
          { name: "Fee Reminder Agent", trigger: "Scheduled daily", action: "10 days before → Reminders" },
          { name: "Behavioral Insight", trigger: "Weekly", action: "Negative pattern → Counselor" },
          { name: "Report Generator", trigger: "Monthly", action: "Auto-generate reports" },
        ],
      },
      {
        slideNumber: 6,
        title: "Key Features",
        features: [
          { title: "Mobile-First Design", desc: "iOS/Android apps for teachers & parents." },
          { title: "Real-Time Sync", desc: "Parents notified within minutes of grade entry." },
          { title: "Multi-Tenant SaaS", desc: "Isolated data per school on a single platform." },
          { title: "Offline-Capable", desc: "Works without internet, auto-syncs on reconnect." },
          { title: "Enterprise Security", desc: "Row-level isolation, encryption, GDPR compliant." },
          { title: "Smart Analytics", desc: "Dashboards & insights, not raw data dumps." },
        ],
      },
      {
        slideNumber: 7,
        title: "Tech Stack",
        subtitle: "Built to scale, built to last",
        stack: [
          { layer: "Backend API", tech: "Node.js / Express", reason: "Fast, scalable" },
          { layer: "Database", tech: "PostgreSQL", reason: "Relational, ACID guarantees" },
          { layer: "Mobile Apps", tech: "React Native", reason: "One codebase → iOS + Android" },
          { layer: "Web Dashboard", tech: "React + Vite", reason: "Fast rendering" },
          { layer: "Real-time Sync", tech: "Server-Sent Events", reason: "Push alerts instantly" },
        ],
      },
      {
        slideNumber: 8,
        title: "Implementation Roadmap",
        roadmap: [
          { phase: "Phase 1: Foundation", color: "#E3F2FD", milestones: ["Database schema", "Auth + RBAC", "Core APIs", "Teacher app MVP"] },
          { phase: "Phase 2: Communication & AI", color: "#F3E5F5", milestones: ["Notifications", "Agent Hub", "Parent app MVP", "Admin alert feed"] },
          { phase: "Phase 3: Advanced", color: "#FFF3E0", milestones: ["Assignments", "Timetable", "Messaging", "Reports"] },
          { phase: "Phase 4: Scale & Polish", color: "#E8F5E9", milestones: ["Performance", "Offline sync", "CI/CD", "Testing"] },
        ],
      },
      {
        slideNumber: 9,
        title: "Market Opportunity",
        subtitle: "A $50B+ market growing at 15% CAGR",
        stat: "Global K-12 EdTech Market: $50B+ | 15% CAGR",
        regions: [
          { region: "India", detail: "2M+ schools, under-digitized" },
          { region: "Southeast Asia", detail: "Rapid EdTech adoption" },
          { region: "Africa", detail: "Emerging market, mobile-first" },
          { region: "Global SaaS", detail: "International school chains" },
        ],
      },
      {
        slideNumber: 10,
        title: "Why We Win",
        advantages: [
          { title: "AI-First Architecture", desc: "Agents automate decisions, not just store data." },
          { title: "Mobile-Native Design", desc: "Teachers & parents use mobile apps." },
          { title: "Multi-Tenant SaaS", desc: "Scalable from 1 to 1000s of schools." },
          { title: "Connected Ecosystem", desc: "Teacher → Parent → Admin integrated." },
        ],
      },
      {
        slideNumber: 11,
        title: "Team & Timeline",
        subtitle: "5 experts, 16 weeks to MVP",
        team: [
          { role: "Backend Engineers (2)", count: 2, expertise: "Node.js, PostgreSQL" },
          { role: "Mobile Developer (1)", count: 1, expertise: "React Native" },
          { role: "Frontend Developer (1)", count: 1, expertise: "React" },
          { role: "AI/ML Engineer (1)", count: 1, expertise: "Agent logic" },
          { role: "Product Manager (1)", count: 1, expertise: "Vision, roadmap" },
        ],
      },
      {
        slideNumber: 12,
        title: "Success Metrics",
        metrics: [
          { metric: "Alert Latency", target: "<5 min from event to notification" },
          { metric: "Teacher Adoption", target: ">80% daily active usage" },
          { metric: "Parent Engagement", target: ">50% weekly logins" },
          { metric: "Data Isolation", target: "100% school separation" },
          { metric: "Agent Success Rate", target: ">98% execute without error" },
          { metric: "System Uptime", target: "99.5%" },
        ],
      },
      {
        slideNumber: 13,
        title: "Let's Transform Education",
        subtitle: "One School at a Time",
        contact: { website: "www.edusync.io", email: "contact@edusync.io", twitter: "@edusync" },
      },
    ],
  });
});

module.exports = router;
