const express = require("express");
const router = express.Router();
const store = require("../store");
const agentEngine = require("../agents/agentEngine");

// --- Schools ---
router.get("/schools", (req, res) => {
  res.json({ success: true, schools: store.schools });
});

// --- Students ---
router.get("/students", (req, res) => {
  const schoolId = req.query.schoolId || "school-a";
  res.json({ success: true, students: store.students[schoolId] || [] });
});

// --- Attendance ---
router.get("/attendance", (req, res) => {
  const schoolId = req.query.schoolId || "school-a";
  res.json({ success: true, attendance: store.attendance[schoolId] || [] });
});

router.post("/attendance/bulk", (req, res) => {
  const { schoolId = "school-a", records, date = new Date().toISOString().slice(0,10) } = req.body;
  if (!store.attendance[schoolId]) store.attendance[schoolId] = [];

  records.forEach(rec => {
    const existingIdx = store.attendance[schoolId].findIndex(a => a.studentId === rec.studentId && a.date === date);
    const newRecord = {
      id: `att-${Date.now()}-${rec.studentId}`,
      studentId: rec.studentId,
      studentName: rec.studentName,
      date,
      status: rec.status,
      session: "Morning"
    };

    if (existingIdx >= 0) {
      store.attendance[schoolId][existingIdx] = newRecord;
    } else {
      store.attendance[schoolId].push(newRecord);
    }

    // Recalculate attendance rate for student
    const student = (store.students[schoolId] || []).find(s => s.id === rec.studentId);
    if (student) {
      if (rec.status === "Absent") {
        student.attendanceRate = Math.max(50, +(student.attendanceRate - 3.5).toFixed(1));
      } else if (rec.status === "Present") {
        student.attendanceRate = Math.min(100, +(student.attendanceRate + 1.2).toFixed(1));
      }
    }
  });

  // Trigger Attendance Monitor Agent after bulk submission!
  agentEngine.runAttendanceMonitor(schoolId);

  res.json({
    success: true,
    message: `Marked attendance for ${records.length} students in 30s. AI Attendance Agent executed automatically!`,
    attendance: store.attendance[schoolId]
  });
});

// --- Grades ---
router.get("/grades", (req, res) => {
  const schoolId = req.query.schoolId || "school-a";
  res.json({ success: true, grades: store.grades[schoolId] || [] });
});

router.post("/grades", (req, res) => {
  const { schoolId = "school-a", studentId, studentName, subject, score, total = 100, teacher = "Teacher", feedback = "" } = req.body;
  
  if (!store.grades[schoolId]) store.grades[schoolId] = [];

  const newGrade = {
    id: `g-${Date.now()}`,
    studentId,
    studentName,
    subject,
    score: Number(score),
    total: Number(total),
    date: new Date().toISOString().slice(0, 10),
    teacher,
    feedback
  };

  store.grades[schoolId].unshift(newGrade);

  // Trigger Grade Alert Agent immediately (real-time trigger)
  agentEngine.runGradeAlertAgent(schoolId, newGrade);

  res.json({
    success: true,
    message: "Grade saved successfully! Grade Alert AI agent evaluated the entry.",
    grade: newGrade
  });
});

// --- Homework / Assignments ---
router.get("/homework", (req, res) => {
  const schoolId = req.query.schoolId || "school-a";
  res.json({ success: true, homework: store.homework[schoolId] || [] });
});

router.post("/homework", (req, res) => {
  const { schoolId = "school-a", title, subject, dueDate, assignedTo = "10-A" } = req.body;
  if (!store.homework[schoolId]) store.homework[schoolId] = [];

  const newHw = {
    id: `hw-${Date.now()}`,
    title,
    subject,
    dueDate,
    status: "Active",
    assignedTo,
    overdueDays: 0,
    pendingStudents: ["Raj Patel", "Rohan Verma", "Aarav Sharma"]
  };

  store.homework[schoolId].unshift(newHw);
  res.json({ success: true, homework: newHw });
});

// --- Behavioral Notes ---
router.get("/behavioral", (req, res) => {
  const schoolId = req.query.schoolId || "school-a";
  res.json({ success: true, notes: store.behavioralNotes[schoolId] || [] });
});

router.post("/behavioral", (req, res) => {
  const { schoolId = "school-a", studentId, studentName, note, author = "Teacher", sentiment = "Neutral" } = req.body;
  if (!store.behavioralNotes[schoolId]) store.behavioralNotes[schoolId] = [];

  const newNote = {
    id: `b-${Date.now()}`,
    studentId,
    studentName,
    note,
    date: new Date().toISOString().slice(0, 10),
    author,
    sentiment
  };

  store.behavioralNotes[schoolId].unshift(newNote);

  if (sentiment === "Negative") {
    agentEngine.runBehavioralInsightAgent(schoolId);
  }

  res.json({ success: true, note: newNote });
});

// --- Fees ---
router.get("/fees", (req, res) => {
  const schoolId = req.query.schoolId || "school-a";
  res.json({ success: true, fees: store.fees[schoolId] || [] });
});

// --- Real-time Alerts ---
router.get("/alerts", (req, res) => {
  const schoolId = req.query.schoolId || "school-a";
  const filteredAlerts = store.alerts.filter(a => a.schoolId === schoolId || !a.schoolId);
  res.json({ success: true, alerts: filteredAlerts });
});

router.post("/alerts/:id/resolve", (req, res) => {
  const { id } = req.params;
  const alert = store.alerts.find(a => a.id === id);
  if (alert) {
    alert.status = "Resolved";
    agentEngine.broadcast("ALERT_RESOLVED", alert);
    res.json({ success: true, alert });
  } else {
    res.status(404).json({ success: false, message: "Alert not found" });
  }
});

// --- Agents Control & Logs ---
router.get("/agents", (req, res) => {
  res.json({ success: true, agents: store.agentConfigs });
});

router.post("/agents/toggle", (req, res) => {
  const { agentId, active } = req.body;
  const agent = store.agentConfigs.find(a => a.id === agentId);
  if (agent) {
    agent.active = active;
    agentEngine.logAgentExecution(agent.name, `Agent ${active ? 'enabled' : 'disabled'} by Admin.`);
    res.json({ success: true, agent });
  } else {
    res.status(404).json({ success: false, message: "Agent not found" });
  }
});

router.post("/agents/trigger", (req, res) => {
  const { agentId, schoolId = "school-a" } = req.body;

  let result;
  switch (agentId) {
    case "attendance_monitor":
      result = agentEngine.runAttendanceMonitor(schoolId);
      break;
    case "grade_alert":
      result = agentEngine.runGradeAlertAgent(schoolId);
      break;
    case "homework_tracker":
      result = agentEngine.runHomeworkTracker(schoolId);
      break;
    case "fee_reminder":
      result = agentEngine.runFeeReminderAgent(schoolId);
      break;
    case "behavioral_insight":
      result = agentEngine.runBehavioralInsightAgent(schoolId);
      break;
    case "report_generator":
      result = agentEngine.runReportGeneratorAgent(schoolId);
      break;
    case "all":
    default:
      result = agentEngine.runAllAgents(schoolId);
      break;
  }

  res.json({ success: true, result, message: `Agent '${agentId}' executed successfully.` });
});

router.get("/agent-logs", (req, res) => {
  res.json({ success: true, logs: store.agentLogs });
});

// --- Timetable Conflict Solver Demo ---
router.get("/timetable/conflict-check", (req, res) => {
  const demoSchedule = [
    { class: "10-A", period: "Period 1 (09:00 AM)", teacher: "Mr. Davis", subject: "Math", room: "Room 101" },
    { class: "10-B", period: "Period 1 (09:00 AM)", teacher: "Mr. Davis", subject: "Math", room: "Room 102", conflict: true, conflictReason: "Teacher Mr. Davis double booked across 10-A and 10-B!" },
    { class: "10-A", period: "Period 2 (10:00 AM)", teacher: "Mrs. Curie", subject: "Physics", room: "Room 101" },
    { class: "10-B", period: "Period 2 (10:00 AM)", teacher: "Ms. Austen", subject: "English", room: "Room 102" }
  ];

  const suggestedResolution = [
    { class: "10-A", period: "Period 1 (09:00 AM)", teacher: "Mr. Davis", subject: "Math", room: "Room 101" },
    { class: "10-B", period: "Period 1 (09:00 AM)", teacher: "Ms. Austen", subject: "English", room: "Room 102", resolved: true, note: "AI Auto-swapped Period 1 Math with Period 2 English for 10-B" },
    { class: "10-A", period: "Period 2 (10:00 AM)", teacher: "Mrs. Curie", subject: "Physics", room: "Room 101" },
    { class: "10-B", period: "Period 2 (10:00 AM)", teacher: "Mr. Davis", subject: "Math", room: "Room 102", resolved: true }
  ];

  res.json({
    success: true,
    agent: "Timetable Conflict Resolver",
    hasConflict: true,
    originalSchedule: demoSchedule,
    aiSuggestedSchedule: suggestedResolution
  });
});

// --- Pitch Deck Slide Data ---
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
        notes: "Introduce the platform as a transformative solution for modern education. Set the tone: this is about automation, not just digitization."
      },
      {
        slideNumber: 2,
        title: "The Problem",
        problems: [
          "📋 Manual data entry causing delays and errors",
          "📄 Physical documents scattered across departments",
          "⏱️ Siloed systems with no real-time communication",
          "📞 Poor parent-teacher connection — no automated updates",
          "⚠️ Inefficient administrative workflows — admins hunt for data",
          "❌ No proactive alerts — everything is reactive"
        ],
        speakerNote: "Most schools still rely on spreadsheets, physical registers, and manual phone calls. Admins spend 40% of their time on data entry instead of strategy."
      },
      {
        slideNumber: 3,
        title: "Our Solution: EduSync",
        subtitle: "A comprehensive multi-tenant SaaS platform that:",
        solutions: [
          "✅ Automates school operations end-to-end (Reduces manual work by 60%+)",
          "✅ Connects teachers, parents, and admins seamlessly (One integrated ecosystem)",
          "✅ Uses AI agents for proactive decisions (No more data hunting)",
          "✅ Provides real-time insights, not data dumps (Actionable alert feed)",
          "✅ Works offline & scales across multiple schools (Multi-tenant from day one)"
        ],
        speakerNote: "We're not building another admin dashboard—we're automating the entire school workflow. The key differentiator: AI agents do the thinking!"
      },
      {
        slideNumber: 4,
        title: "Three-Tier Architecture",
        tiers: [
          { name: "Teacher App", bg: "#E3F2FD", border: "#2E5090", icon: "👨‍🏫", features: ["Mark attendance (bulk action <2 mins)", "Enter grades & feedback", "Create & track assignments", "View behavioral notes", "See AI alerts in real-time", "Works offline"] },
          { name: "Parent App", bg: "#F3E5F5", border: "#4CAF50", icon: "👨‍👩‍👧", features: ["View child's progress dashboard", "Track attendance & grades", "See homework & due dates", "Receive automated alerts", "Message teachers (async)", "Schedule PT meetings"] },
          { name: "Admin Web", bg: "#FFF3E0", border: "#FF6B35", icon: "⚙️", features: ["Real-time alert feed", "Operations control center", "Analytics & reports", "Timetable management", "Billing & subscriptions", "AI agent logs & control"] }
        ]
      },
      {
        slideNumber: 5,
        title: "AI Agents - The Core",
        subtitle: "Autonomous agents that monitor, evaluate, and act—24/7",
        agents: [
          { name: "Attendance Monitor", trigger: "Daily end-of-school", action: "Flags <80% attendance → Parent alert" },
          { name: "Grade Alert Agent", trigger: "Grade entered (real-time)", action: "<40% marks → Intervention signal" },
          { name: "Homework Tracker", trigger: "Scheduled daily", action: "2 days overdue → Reminders sent" },
          { name: "Fee Reminder Agent", trigger: "Scheduled daily", action: "10 days before → Escalating reminders" },
          { name: "Behavioral Insight", trigger: "Weekly analysis", action: "Negative pattern → Counselor flag" },
          { name: "Report Generator", trigger: "Monthly (end of month)", action: "Auto-generate progress reports" }
        ]
      },
      {
        slideNumber: 6,
        title: "Key Features",
        features: [
          { title: "📱 Mobile-First Design", desc: "iOS/Android apps for teachers & parents. 60% faster attendance marking vs web." },
          { title: "🔄 Real-Time Sync", desc: "Reactive state management. Parents notified within 2 mins of grade entry." },
          { title: "🏢 Multi-Tenant SaaS", desc: "Isolated data per school on a single platform. Scales to 1000s of schools." },
          { title: "⚡ Offline-Capable", desc: "Works without internet, auto-syncs on reconnect. 99% uptime." },
          { title: "🔒 Enterprise Security", desc: "Row-level isolation, encryption, GDPR compliant. School A cannot see School B." },
          { title: "📊 Smart Analytics", desc: "Dashboards & insights, not raw data dumps. Admin sees 5 alerts instead of 100 rows." }
        ]
      },
      {
        slideNumber: 7,
        title: "Tech Stack",
        subtitle: "Built to scale, built to last",
        stack: [
          { layer: "Backend API", tech: "Node.js / Express + TypeScript", reason: "Fast, scalable, rich ecosystem" },
          { layer: "Database", tech: "PostgreSQL", reason: "Relational data, strong ACID guarantees" },
          { layer: "Mobile Apps", tech: "Flutter", reason: "One codebase → iOS + Android" },
          { layer: "Web Dashboard", tech: "React + Redux Toolkit", reason: "Fast rendering, reactive state" },
          { layer: "Agent Orchestration", tech: "Bull Queue + Redis", reason: "Production-grade job scheduler" },
          { layer: "Real-time Sync", tech: "WebSocket (Socket.io)", reason: "Push alerts to clients instantly" },
          { layer: "File Storage", tech: "AWS S3 / MinIO", reason: "Scalable, reliable, affordable" },
          { layer: "Deployment", tech: "Docker + AWS ECS / Kubernetes", reason: "Container-native, auto-scaling" }
        ]
      },
      {
        slideNumber: 8,
        title: "16-Week Implementation Roadmap",
        roadmap: [
          { phase: "Phase 1: Foundation (Weeks 1-4)", color: "#E3F2FD", milestones: ["Database schema & multi-tenant infra", "JWT auth + RBAC", "Core APIs (students, staff, classes)", "Teacher app MVP (attendance, grades)", "Admin dashboard basic views"] },
          { phase: "Phase 2: Communication & AI (Weeks 5-8)", color: "#F3E5F5", milestones: ["Notification system (in-app + push)", "Agent Hub infrastructure", "4 core agents (Attendance, Grade, Homework, Fee)", "Parent app MVP (progress, alerts)", "Admin dashboard alert feed & logs"] },
          { phase: "Phase 3: Advanced (Weeks 9-12)", color: "#FFF3E0", milestones: ["Assignment management", "Timetable builder with conflict detection", "Parent-teacher messaging", "Monthly report generation", "4+ new agents (Behavioral, Engagement, Analytics)"] },
          { phase: "Phase 4: Scale & Polish (Weeks 13-16)", color: "#E8F5E9", milestones: ["Performance optimization (caching, indexing)", "Offline sync for apps", "Multi-language UI", "Automated testing & CI/CD pipeline", "Stretch agents (predictive allocation)"] }
        ]
      },
      {
        slideNumber: 9,
        title: "Market Opportunity",
        subtitle: "A $50B+ market growing at 15% CAGR",
        stat: "Global K-12 EdTech Market: $50B+ | 15% CAGR",
        regions: [
          { region: "India", detail: "2M+ schools, under-digitized, mobile-first" },
          { region: "Southeast Asia", detail: "Rapid EdTech adoption, government initiatives" },
          { region: "Africa", detail: "Emerging market, mobile-only access pattern" },
          { region: "Global SaaS", detail: "International school chains, multi-country ops" }
        ],
        tam: "Private schools in India alone: 150K schools × $5-50/student/yr = $1.5B - $15B ARR potential. 5-year target: 500+ schools = $25M ARR."
      },
      {
        slideNumber: 10,
        title: "Why We Win",
        advantages: [
          { title: "🤖 AI-First Architecture", desc: "Agents automate decisions, not just store data. Admin time reduced by 60%." },
          { title: "📱 Mobile-Native Design", desc: "Teachers & parents use mobile apps. Offline-capable. 2x faster adoption." },
          { title: "🌐 Multi-Tenant SaaS", desc: "Scalable from 1 to 1000s of schools. 10x lower infrastructure cost." },
          { title: "🔗 Connected Ecosystem", desc: "Teacher → Parent → Admin integrated. 0 integration time." }
        ]
      },
      {
        slideNumber: 11,
        title: "Team & Timeline",
        subtitle: "5 experts, 16 weeks to MVP",
        team: [
          { role: "Backend Engineers (2)", count: 2, expertise: "Node.js, PostgreSQL, API design, scaling" },
          { role: "Mobile Developer (1)", count: 1, expertise: "Flutter, state management (Riverpod)" },
          { role: "Frontend Developer (1)", count: 1, expertise: "React, responsive design, state management" },
          { role: "AI/ML Engineer (1)", count: 1, expertise: "Agent logic, automation, optimization" },
          { role: "Product Manager (1)", count: 1, expertise: "Vision, customer validation, roadmap" }
        ]
      },
      {
        slideNumber: 12,
        title: "Success Metrics",
        subtitle: "How we measure MVP success",
        metrics: [
          { metric: "Alert Latency", target: "<5 min from event to notification", note: "Real-time feel, not async" },
          { metric: "Teacher Adoption", target: ">80% daily active usage", note: "Core users must find value" },
          { metric: "Parent Engagement", target: ">50% of parents log in weekly", note: "Product-market fit" },
          { metric: "Data Isolation", target: "100% (School A cannot see School B)", note: "Non-negotiable" },
          { metric: "Agent Success Rate", target: ">98% execute without error", note: "Reliable automation" },
          { metric: "System Uptime", target: "99.5%", note: "Schools need reliability" }
        ]
      },
      {
        slideNumber: 13,
        title: "Let's Transform Education",
        subtitle: "One School at a Time",
        contact: {
          website: "www.edusync.io",
          email: "contact@edusync.io",
          twitter: "@edusync"
        },
        speakerNote: "Education is the foundation of society. Right now 90% of school ops are manual. We're automating that—letting teachers teach, parents engage, admins strategize!"
      }
    ]
  });
});

module.exports = router;
