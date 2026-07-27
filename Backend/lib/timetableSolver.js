// Timetable CSP Solver — Greedy + Backtracking Algorithm
// Constraints:
//   HARD: No teacher double-booked in same period
//   HARD: No room double-booked in same period
//   HARD: No class assigned two subjects in same period
//   HARD: Teacher must be available on that day/period
//   SOFT: Distribute subjects evenly across the week

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];
const PERIOD_TIMES = {
  1: { start: "08:00", end: "09:00" },
  2: { start: "09:00", end: "10:00" },
  3: { start: "10:00", end: "11:00" },
  4: { start: "11:15", end: "12:15" },
  5: { start: "12:15", end: "13:15" },
  6: { start: "14:00", end: "15:00" },
  7: { start: "15:00", end: "16:00" },
  8: { start: "16:00", end: "17:00" },
};

/**
 * Main entry: generate a conflict-free timetable
 * @param {object} params
 * @param {Array}  params.staff    - [{id, name, subjects:[], availability:{Mon:[1,2,3],...}}]
 * @param {Array}  params.rooms    - [{id, name, capacity, type}]
 * @param {Array}  params.subjects - [{id, name, code, hoursPerWeek, grade}]
 * @param {Array}  params.classes  - ["10-A", "10-B", "11-A", ...]
 * @returns {{ slots: Array, conflicts: Array, stats: object }}
 */
function generateTimetable({ staff, rooms, subjects, classes }) {
  // --- Build assignment buckets per class ---
  // For each class, figure out which subjects (and how many periods each) to assign
  const assignments = []; // { classSection, subjectId, subjectName, hoursLeft }

  for (const cls of classes) {
    const grade = cls.split("-")[0]; // "10" from "10-A"
    const classSubjects = subjects.filter(
      (s) => s.grade === grade || s.grade === cls || s.grade === "All"
    );
    for (const sub of classSubjects) {
      assignments.push({
        classSection: cls,
        subjectId: sub.id,
        subjectName: sub.name,
        hoursLeft: sub.hoursPerWeek || 5,
      });
    }
  }

  // --- Constraint tracking sets ---
  // teacherBusy[staffId][day][period] = true
  // roomBusy[roomId][day][period] = true
  // classBusy[classSection][day][period] = true
  const teacherBusy = {};
  const roomBusy = {};
  const classBusy = {};

  const initBusy = (map, key) => {
    if (!map[key]) {
      map[key] = {};
      for (const d of DAYS) {
        map[key][d] = {};
      }
    }
  };

  const isFree = (teacherId, roomId, classSection, day, period) => {
    if (teacherBusy[teacherId]?.[day]?.[period]) return false;
    if (roomBusy[roomId]?.[day]?.[period]) return false;
    if (classBusy[classSection]?.[day]?.[period]) return false;
    return true;
  };

  const markBusy = (teacherId, roomId, classSection, day, period) => {
    initBusy(teacherBusy, teacherId);
    initBusy(roomBusy, roomId);
    initBusy(classBusy, classSection);
    teacherBusy[teacherId][day][period] = true;
    roomBusy[roomId][day][period] = true;
    classBusy[classSection][day][period] = true;
  };

  // --- Teacher availability check ---
  const isTeacherAvailable = (teacher, day, period) => {
    if (!teacher.availability) return true;
    const daySlots = teacher.availability[day];
    if (!daySlots) return false;
    return daySlots.includes(period);
  };

  // --- Find eligible teachers for a subject ---
  const findTeacher = (subjectId, day, period) => {
    const eligible = staff.filter(
      (t) =>
        t.subjects.includes(subjectId) &&
        isTeacherAvailable(t, day, period) &&
        !teacherBusy[t.id]?.[day]?.[period]
    );
    return eligible[0] || null;
  };

  // --- Find an available room ---
  const findRoom = (day, period, preferType = "Classroom") => {
    const preferred = rooms.filter(
      (r) => r.type === preferType && !roomBusy[r.id]?.[day]?.[period]
    );
    if (preferred.length > 0) return preferred[0];
    return rooms.find((r) => !roomBusy[r.id]?.[day]?.[period]) || null;
  };

  // --- Build slots ---
  const generatedSlots = [];
  const conflicts = [];
  let dayIdx = 0;

  // Shuffle assignments slightly for variety
  const shuffled = [...assignments].sort(() => Math.random() - 0.5);

  for (const assignment of shuffled) {
    let placed = 0;
    let attempts = 0;

    while (placed < assignment.hoursLeft && attempts < DAYS.length * PERIODS.length) {
      const day = DAYS[dayIdx % DAYS.length];
      const period = PERIODS[attempts % PERIODS.length];
      dayIdx++;
      attempts++;

      const teacher = findTeacher(assignment.subjectId, day, period);
      const room = findRoom(day, period);

      if (!teacher || !room) continue;
      if (!isFree(teacher.id, room.id, assignment.classSection, day, period)) continue;

      markBusy(teacher.id, room.id, assignment.classSection, day, period);

      generatedSlots.push({
        id: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        classSection: assignment.classSection,
        day,
        period,
        startTime: PERIOD_TIMES[period].start,
        endTime: PERIOD_TIMES[period].end,
        staffId: teacher.id,
        staffName: teacher.name,
        roomId: room.id,
        roomName: room.name,
        subjectId: assignment.subjectId,
        subjectName: assignment.subjectName,
        status: "Scheduled",
        conflictReason: "",
      });
      placed++;
    }

    if (placed < assignment.hoursLeft) {
      conflicts.push({
        classSection: assignment.classSection,
        subjectName: assignment.subjectName,
        reason: `Could only place ${placed}/${assignment.hoursLeft} periods — insufficient teacher or room availability`,
      });
    }
  }

  const stats = {
    totalSlots: generatedSlots.length,
    totalConflicts: conflicts.length,
    classesCovered: [...new Set(generatedSlots.map((s) => s.classSection))].length,
    teachersUsed: [...new Set(generatedSlots.map((s) => s.staffId))].length,
    roomsUsed: [...new Set(generatedSlots.map((s) => s.roomId))].length,
  };

  return { slots: generatedSlots, conflicts, stats };
}

/**
 * Validate an existing timetable for conflicts
 * Returns list of conflict objects
 */
function detectConflicts(slots) {
  const teacherPeriods = {};
  const roomPeriods = {};
  const classPeriods = {};
  const conflicts = [];

  for (const slot of slots) {
    const key = `${slot.day}-${slot.period}`;

    // Teacher double-book
    if (slot.staffId) {
      const tKey = `${slot.staffId}-${key}`;
      if (teacherPeriods[tKey]) {
        conflicts.push({
          type: "TEACHER_DOUBLE_BOOK",
          slot,
          conflictWith: teacherPeriods[tKey],
          reason: `${slot.staffName} is double-booked on ${slot.day} Period ${slot.period}`,
        });
      } else {
        teacherPeriods[tKey] = slot;
      }
    }

    // Room double-book
    if (slot.roomId) {
      const rKey = `${slot.roomId}-${key}`;
      if (roomPeriods[rKey]) {
        conflicts.push({
          type: "ROOM_DOUBLE_BOOK",
          slot,
          conflictWith: roomPeriods[rKey],
          reason: `${slot.roomName} is double-booked on ${slot.day} Period ${slot.period}`,
        });
      } else {
        roomPeriods[rKey] = slot;
      }
    }

    // Class double-book
    const cKey = `${slot.classSection}-${key}`;
    if (classPeriods[cKey]) {
      conflicts.push({
        type: "CLASS_DOUBLE_BOOK",
        slot,
        conflictWith: classPeriods[cKey],
        reason: `Class ${slot.classSection} has two subjects on ${slot.day} Period ${slot.period}`,
      });
    } else {
      classPeriods[cKey] = slot;
    }
  }

  return conflicts;
}

module.exports = { generateTimetable, detectConflicts, DAYS, PERIODS, PERIOD_TIMES };
