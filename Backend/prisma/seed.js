require("../scripts/load-root-env");

const { PrismaClient } = require("@prisma/client");
const store = require("../store");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding PostgreSQL database...");

  await prisma.agentLog.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.behavioralNote.deleteMany();
  await prisma.fee.deleteMany();
  await prisma.homework.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.student.deleteMany();
  await prisma.school.deleteMany();
  await prisma.agentConfig.deleteMany();

  for (const school of store.schools) {
    await prisma.school.create({ data: school });
  }

  for (const [schoolId, students] of Object.entries(store.students)) {
    for (const student of students) {
      await prisma.student.create({ data: { ...student, schoolId } });
    }
  }

  for (const [schoolId, grades] of Object.entries(store.grades)) {
    for (const grade of grades) {
      const { id, ...data } = grade;
      await prisma.grade.create({ data: { ...data, schoolId } });
    }
  }

  for (const [schoolId, records] of Object.entries(store.attendance)) {
    for (const record of records) {
      const { id, ...data } = record;
      await prisma.attendance.create({ data: { ...data, schoolId } });
    }
  }

  for (const [schoolId, items] of Object.entries(store.homework)) {
    for (const hw of items) {
      const { id, ...data } = hw;
      await prisma.homework.create({ data: { ...data, schoolId } });
    }
  }

  for (const [schoolId, items] of Object.entries(store.fees)) {
    for (const fee of items) {
      const { id, ...data } = fee;
      await prisma.fee.create({ data: { ...data, schoolId } });
    }
  }

  for (const [schoolId, notes] of Object.entries(store.behavioralNotes)) {
    for (const note of notes) {
      const { id, ...data } = note;
      await prisma.behavioralNote.create({ data: { ...data, schoolId } });
    }
  }

  for (const alert of store.alerts) {
    await prisma.alert.create({ data: alert });
  }

  for (const agent of store.agentConfigs) {
    await prisma.agentConfig.create({ data: agent });
  }

  for (const log of store.agentLogs) {
    await prisma.agentLog.create({
      data: {
        agent: log.agent,
        message: log.message,
        status: log.status,
        timestamp: new Date(log.timestamp),
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
