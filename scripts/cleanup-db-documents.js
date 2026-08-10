#!/usr/bin/env node
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    const docs = await prisma.document.findMany({
      where: { s3Key: { startsWith: 'documents/' } },
      select: { id: true, name: true, s3Key: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`Found ${docs.length} document rows with s3Key starting with 'documents/'`);
    if (docs.length === 0) return;

    const ids = docs.map((d) => d.id);
    const res = await prisma.document.deleteMany({ where: { id: { in: ids } } });
    console.log(`Deleted ${res.count} document rows from database.`);
  } catch (err) {
    console.error('Error cleaning up documents in DB:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
