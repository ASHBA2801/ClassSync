#!/usr/bin/env node
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const docs = await prisma.document.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, name: true, status: true, extractionConfidence: true, reviewNote: true, s3Key: true, createdAt: true },
    });
    console.log('Latest documents:');
    for (const d of docs) {
      console.log('---');
      console.log('id:', d.id);
      console.log('name:', d.name);
      console.log('s3Key:', d.s3Key);
      console.log('status:', d.status);
      console.log('confidence:', d.extractionConfidence);
      console.log('reviewNote:', d.reviewNote ? d.reviewNote.substring(0, 400) : null);
      console.log('createdAt:', d.createdAt);
    }
  } catch (err) {
    console.error('Error inspecting documents:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
