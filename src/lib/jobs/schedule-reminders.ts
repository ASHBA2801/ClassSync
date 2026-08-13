import { prisma } from "@/lib/db/prisma";
import { sendNotification } from "@/lib/notifications";
import { resolveEffectiveSlots, dateToDayOfWeek, startOfDay } from "@/lib/scheduler/smart-scheduler";

/** Runs inside the worker service (on a schedule). Notifies teachers of classes starting within 5 minutes. */
export async function runScheduleReminders() {
  const schools = await prisma.school.findMany({ where: { status: "ACTIVE" } });
  const now = new Date();
  const today = startOfDay(now);
  const dayOfWeek = dateToDayOfWeek(now);

  for (const school of schools) {
    const version = await prisma.scheduleVersion.findFirst({
      where: { schoolId: school.id, isActive: true },
    });
    if (!version) continue;

    const effective = await resolveEffectiveSlots(school.id, today);
    const daySlots = effective.filter((s) => s.dayOfWeek === dayOfWeek);

    const timings = await prisma.periodTiming.findMany({
      where: { schoolId: school.id },
    });

    for (const slot of daySlots) {
      const timing = timings.find((t) => t.periodNo === slot.periodNo);
      if (!timing) continue;

      const [hours, minutes] = timing.startTime.split(":").map(Number);
      const periodStart = new Date(now);
      periodStart.setHours(hours, minutes, 0, 0);

      const diffMs = periodStart.getTime() - now.getTime();
      if (diffMs > 0 && diffMs <= 5 * 60 * 1000) {
        const sectionName = slot.classSection?.name ?? "class";
        const subjectName = slot.subject?.name ?? "subject";
        await sendNotification({
          schoolId: school.id,
          userId: slot.teacherId,
          title: "Upcoming Class",
          body: `${subjectName} with ${sectionName} starts at ${timing.startTime}`,
          metadata: { slotId: slot.id, isAltered: slot.isAltered },
        });
      }
    }
  }
}
