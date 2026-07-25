const store = require("../store");

function broadcast(eventType, data) {
  const payload = JSON.stringify({ type: eventType, data });
  store.subscribers.forEach((res) => {
    try {
      res.write(`data: ${payload}\n\n`);
    } catch (err) {
      console.error("Error writing SSE event:", err);
    }
  });
}

function logAgentExecution(agentName, message, status = "Success") {
  const newLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    agent: agentName,
    message,
    status
  };
  store.agentLogs.unshift(newLog);
  if (store.agentLogs.length > 50) store.agentLogs.pop();
  
  // Update agent last run
  const config = store.agentConfigs.find(a => a.name === agentName);
  if (config) {
    config.executionCount += 1;
    config.lastRun = "Just now";
  }

  broadcast("AGENT_LOG", newLog);
  return newLog;
}

function addAlert(schoolId, agentName, agentIcon, title, message, severity, actionTaken) {
  const newAlert = {
    id: `alt-${Date.now()}`,
    schoolId,
    agentName,
    agentIcon,
    title,
    message,
    severity,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " Today",
    status: "Active",
    actionTaken
  };
  store.alerts.unshift(newAlert);
  broadcast("NEW_ALERT", newAlert);
  return newAlert;
}

// 1. Attendance Monitor Agent
function runAttendanceMonitor(schoolId = "school-a") {
  const students = store.students[schoolId] || [];
  let flaggedCount = 0;

  students.forEach((student) => {
    if (student.attendanceRate < 80) {
      flaggedCount++;
      const title = `Low Attendance Alert: ${student.name} (${student.attendanceRate}%)`;
      const msg = `Student ${student.name}'s attendance has dropped below 80%. Automated notification sent to parent (${student.parentName}).`;
      
      // Avoid duplicate active alerts for same student
      const exists = store.alerts.find(a => a.title.includes(student.name) && a.agentName === "Attendance Monitor");
      if (!exists) {
        addAlert(schoolId, "Attendance Monitor", "📊", title, msg, "High", "Parent Notification Dispatched");
      }
    }
  });

  logAgentExecution(
    "Attendance Monitor",
    `Evaluated ${students.length} students for ${schoolId}. Flagged ${flaggedCount} with low attendance.`
  );
  return { status: "complete", flaggedCount };
}

// 2. Grade Alert Agent
function runGradeAlertAgent(schoolId = "school-a", gradeEntry = null) {
  let evaluated = 0;
  let flagged = 0;

  const gradesToCheck = gradeEntry ? [gradeEntry] : (store.grades[schoolId] || []);

  gradesToCheck.forEach((grade) => {
    evaluated++;
    const percentage = (grade.score / grade.total) * 100;
    if (percentage < 40) {
      flagged++;
      const title = `Academic Warning: ${grade.studentName} scored ${grade.score}/${grade.total} in ${grade.subject}`;
      const msg = `Score below 40% threshold. AI intervention signal triggered for teacher ${grade.teacher} and parent.`;
      
      addAlert(schoolId, "Grade Alert Agent", "⭐", title, msg, "High", "Intervention Signal Sent");
    }
  });

  logAgentExecution(
    "Grade Alert Agent",
    `Evaluated ${evaluated} grade records. Issued ${flagged} academic intervention signals.`
  );
  return { status: "complete", flagged };
}

// 3. Homework Tracker Agent
function runHomeworkTracker(schoolId = "school-a") {
  const homeworkList = store.homework[schoolId] || [];
  let overdueCount = 0;

  homeworkList.forEach((hw) => {
    if (hw.status === "Overdue" || hw.overdueDays >= 2) {
      overdueCount++;
      const title = `Overdue Homework Alert: ${hw.title} (${hw.subject})`;
      const msg = `Assignment "${hw.title}" is ${hw.overdueDays} days past due for pending students: ${hw.pendingStudents.join(", ")}.`;
      
      addAlert(schoolId, "Homework Tracker", "📝", title, msg, "Medium", "Automated Parent App Push Reminders");
    }
  });

  logAgentExecution(
    "Homework Tracker",
    `Checked homework status. Identified ${overdueCount} overdue assignments.`
  );
  return { status: "complete", overdueCount };
}

// 4. Fee Reminder Agent
function runFeeReminderAgent(schoolId = "school-a") {
  const fees = store.fees[schoolId] || [];
  let remindersSent = 0;

  fees.forEach((fee) => {
    if (fee.daysRemaining <= 10 && fee.status !== "Paid") {
      remindersSent++;
      const title = `Upcoming Fee Payment: ${fee.studentName} ($${fee.amount})`;
      const msg = `Tuition fee payment of $${fee.amount} due in ${fee.daysRemaining} days. Escalating reminder dispatched to ${fee.parentContact}.`;
      
      addAlert(schoolId, "Fee Reminder Agent", "💰", title, msg, "Medium", "Escalating SMS & Email Sent");
    }
  });

  logAgentExecution(
    "Fee Reminder Agent",
    `Audited fee ledger. Dispatched ${remindersSent} scheduled fee reminders.`
  );
  return { status: "complete", remindersSent };
}

// 5. Behavioral Insight Agent
function runBehavioralInsightAgent(schoolId = "school-a") {
  const notes = store.behavioralNotes[schoolId] || [];
  const negativeNotes = notes.filter(n => n.sentiment === "Negative");

  negativeNotes.forEach(note => {
    const title = `Behavioral Flag: ${note.studentName}`;
    const msg = `Negative pattern detected: "${note.note}". Counselor notification flagged for follow-up.`;
    
    addAlert(schoolId, "Behavioral Insight Agent", "📈", title, msg, "High", "Counselor Task Created");
  });

  logAgentExecution(
    "Behavioral Insight Agent",
    `Ran NLP pattern scan on ${notes.length} behavioral logs. Flagged ${negativeNotes.length} counseling cases.`
  );
  return { status: "complete", flagged: negativeNotes.length };
}

// 6. Report Generator Agent
function runReportGeneratorAgent(schoolId = "school-a") {
  const students = store.students[schoolId] || [];
  
  const title = `Monthly Progress Reports Generated`;
  const msg = `Auto-generated ${students.length} comprehensive student progress reports for ${schoolId}. Ready for parent portal delivery.`;
  
  addAlert(schoolId, "Report Generator", "📋", title, msg, "Low", "Reports Compiled & Delivered");

  logAgentExecution(
    "Report Generator",
    `Compiled and encrypted ${students.length} progress report cards.`
  );
  return { status: "complete", generatedReports: students.length };
}

function runAllAgents(schoolId = "school-a") {
  runAttendanceMonitor(schoolId);
  runGradeAlertAgent(schoolId);
  runHomeworkTracker(schoolId);
  runFeeReminderAgent(schoolId);
  runBehavioralInsightAgent(schoolId);
  runReportGeneratorAgent(schoolId);
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
  runAllAgents
};
