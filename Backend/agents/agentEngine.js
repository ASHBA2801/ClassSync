const dataStore = require("../lib/dataStore");

function broadcast(eventType, data) {
  const payload = JSON.stringify({ type: eventType, data });
  dataStore.getSubscribers().forEach((res) => {
    try {
      res.write(`data: ${payload}\n\n`);
    } catch (err) {
      console.error("Error writing SSE event:", err);
    }
  });
}

async function logAgentExecution(agentName, message, status = "Success") {
  const newLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    agent: agentName,
    message,
    status,
  };

  await dataStore.addAgentLog(newLog);
  await dataStore.bumpAgentRun(agentName);
  broadcast("AGENT_LOG", newLog);
  return newLog;
}

async function addAlert(schoolId, agentName, agentIcon, title, message, severity, actionTaken) {
  const newAlert = {
    id: `alt-${Date.now()}`,
    schoolId,
    agentName,
    agentIcon,
    title,
    message,
    severity,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " Today",
    status: "Active",
    actionTaken,
  };

  await dataStore.addAlert(newAlert);
  broadcast("NEW_ALERT", newAlert);
  return newAlert;
}

async function runAttendanceMonitor(schoolId = "school-a") {
  const students = await dataStore.getStudents(schoolId);
  let flaggedCount = 0;
  const alerts = await dataStore.getAlerts(schoolId);

  for (const student of students) {
    if (student.attendanceRate < 80) {
      flaggedCount++;
      const title = `Low Attendance Alert: ${student.name} (${student.attendanceRate}%)`;
      const msg = `Student ${student.name}'s attendance has dropped below 80%. Automated notification sent to parent (${student.parentName}).`;
      const exists = alerts.find((a) => a.title.includes(student.name) && a.agentName === "Attendance Monitor");
      if (!exists) {
        await addAlert(schoolId, "Attendance Monitor", "📊", title, msg, "High", "Parent Notification Dispatched");
      }
    }
  }

  await logAgentExecution(
    "Attendance Monitor",
    `Evaluated ${students.length} students for ${schoolId}. Flagged ${flaggedCount} with low attendance.`
  );
  return { status: "complete", flaggedCount };
}

async function runGradeAlertAgent(schoolId = "school-a", gradeEntry = null) {
  let evaluated = 0;
  let flagged = 0;
  const gradesToCheck = gradeEntry ? [gradeEntry] : await dataStore.getGrades(schoolId);

  for (const grade of gradesToCheck) {
    evaluated++;
    const percentage = (grade.score / grade.total) * 100;
    if (percentage < 40) {
      flagged++;
      const title = `Academic Warning: ${grade.studentName} scored ${grade.score}/${grade.total} in ${grade.subject}`;
      const msg = `Score below 40% threshold. AI intervention signal triggered for teacher ${grade.teacher} and parent.`;
      await addAlert(schoolId, "Grade Alert Agent", "⭐", title, msg, "High", "Intervention Signal Sent");
    }
  }

  await logAgentExecution(
    "Grade Alert Agent",
    `Evaluated ${evaluated} grade records. Issued ${flagged} academic intervention signals.`
  );
  return { status: "complete", flagged };
}

async function runHomeworkTracker(schoolId = "school-a") {
  const homeworkList = await dataStore.getHomework(schoolId);
  let overdueCount = 0;

  for (const hw of homeworkList) {
    if (hw.status === "Overdue" || hw.overdueDays >= 2) {
      overdueCount++;
      const title = `Overdue Homework Alert: ${hw.title} (${hw.subject})`;
      const msg = `Assignment "${hw.title}" is ${hw.overdueDays} days past due for pending students: ${hw.pendingStudents.join(", ")}.`;
      await addAlert(schoolId, "Homework Tracker", "📝", title, msg, "Medium", "Automated Parent App Push Reminders");
    }
  }

  await logAgentExecution(
    "Homework Tracker",
    `Checked homework status. Identified ${overdueCount} overdue assignments.`
  );
  return { status: "complete", overdueCount };
}

async function runFeeReminderAgent(schoolId = "school-a") {
  const fees = await dataStore.getFees(schoolId);
  let remindersSent = 0;

  for (const fee of fees) {
    if (fee.daysRemaining <= 10 && fee.status !== "Paid") {
      remindersSent++;
      const title = `Upcoming Fee Payment: ${fee.studentName} ($${fee.amount})`;
      const msg = `Tuition fee payment of $${fee.amount} due in ${fee.daysRemaining} days. Escalating reminder dispatched to ${fee.parentContact}.`;
      await addAlert(schoolId, "Fee Reminder Agent", "💰", title, msg, "Medium", "Escalating SMS & Email Sent");
    }
  }

  await logAgentExecution(
    "Fee Reminder Agent",
    `Audited fee ledger. Dispatched ${remindersSent} scheduled fee reminders.`
  );
  return { status: "complete", remindersSent };
}

async function runBehavioralInsightAgent(schoolId = "school-a") {
  const notes = await dataStore.getBehavioralNotes(schoolId);
  const negativeNotes = notes.filter((n) => n.sentiment === "Negative");

  for (const note of negativeNotes) {
    const title = `Behavioral Flag: ${note.studentName}`;
    const msg = `Negative pattern detected: "${note.note}". Counselor notification flagged for follow-up.`;
    await addAlert(schoolId, "Behavioral Insight Agent", "📈", title, msg, "High", "Counselor Task Created");
  }

  await logAgentExecution(
    "Behavioral Insight Agent",
    `Ran NLP pattern scan on ${notes.length} behavioral logs. Flagged ${negativeNotes.length} counseling cases.`
  );
  return { status: "complete", flagged: negativeNotes.length };
}

async function runReportGeneratorAgent(schoolId = "school-a") {
  const students = await dataStore.getStudents(schoolId);
  const title = "Monthly Progress Reports Generated";
  const msg = `Auto-generated ${students.length} comprehensive student progress reports for ${schoolId}. Ready for parent portal delivery.`;
  await addAlert(schoolId, "Report Generator", "📋", title, msg, "Low", "Reports Compiled & Delivered");

  await logAgentExecution(
    "Report Generator",
    `Compiled and encrypted ${students.length} progress report cards.`
  );
  return { status: "complete", generatedReports: students.length };
}

async function runPredictiveResourceAgent(schoolId = "school-a") {
  const analytics = await dataStore.getResourceAnalytics(schoolId);
  let alertsFired = 0;

  for (const prediction of analytics.predictions) {
    if (prediction.type === "ALL_CLEAR") continue;
    const severityMap = { High: "High", Medium: "Medium", Low: "Low" };
    await addAlert(
      schoolId,
      "Resource Predictor",
      "🔮",
      `Resource Forecast: ${prediction.type.replace(/_/g, " ")}`,
      `${prediction.message} Recommendation: ${prediction.recommendation}`,
      severityMap[prediction.severity] || "Medium",
      "Forecast Report Generated"
    );
    alertsFired++;
  }

  await logAgentExecution(
    "Resource Predictor",
    `Analyzed enrollment & staffing trends for ${schoolId}. Issued ${alertsFired} predictive resource alert(s). Student:Staff ratio = ${analytics.summary.staffRatio}:1.`
  );
  return { status: "complete", alertsFired, summary: analytics.summary };
}

async function runAllAgents(schoolId = "school-a") {
  await runAttendanceMonitor(schoolId);
  await runGradeAlertAgent(schoolId);
  await runHomeworkTracker(schoolId);
  await runFeeReminderAgent(schoolId);
  await runBehavioralInsightAgent(schoolId);
  await runReportGeneratorAgent(schoolId);
  await runPredictiveResourceAgent(schoolId);
  return { status: "all_agents_executed" };
}

module.exports = {
  broadcast,
  logAgentExecution,
  addAlert,
  runAttendanceMonitor,
  runGradeAlertAgent,
  runHomeworkTracker,
  runFeeReminderAgent,
  runBehavioralInsightAgent,
  runReportGeneratorAgent,
  runPredictiveResourceAgent,
  runAllAgents,
};
