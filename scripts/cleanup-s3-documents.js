#!/usr/bin/env node
require('dotenv').config();
const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');

function getS3Client() {
  const endpoint = process.env.S3_ENDPOINT || undefined;
  return new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    credentials: process.env.AWS_ACCESS_KEY_ID
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
  });
}

async function listAllKeys(s3, bucket, prefix) {
  let keys = [];
  let ContinuationToken = undefined;
  do {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken }));
    if (res.Contents) keys.push(...res.Contents.map((c) => c.Key));
    ContinuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (ContinuationToken);
  return keys;
}

async function deleteKeys(s3, bucket, keys) {
  const chunks = [];
  for (let i = 0; i < keys.length; i += 1000) chunks.push(keys.slice(i, i + 1000));
  let deleted = 0;
  for (const chunk of chunks) {
    const res = await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: chunk.map((k) => ({ Key: k })) } }));
    if (res.Deleted) deleted += res.Deleted.length;
    if (res.Errors && res.Errors.length) {
      console.error('Errors deleting some objects:', res.Errors);
    }
  }
  return deleted;
}

(async () => {
  try {
    const bucket = process.env.S3_BUCKET;
    if (!bucket) throw new Error('S3_BUCKET not configured in .env');
    const prefix = 'documents/';
    const s3 = getS3Client();
    console.log('Listing objects with prefix', prefix, 'in bucket', bucket);
    const keys = await listAllKeys(s3, bucket, prefix);
    console.log('Found', keys.length, 'objects');
    if (keys.length === 0) return console.log('Nothing to delete.');
    const deleted = await deleteKeys(s3, bucket, keys);
    console.log(`Deleted ${deleted} objects from ${bucket}`);
  } catch (err) {
    console.error('Error:', err);
    process.exitCode = 1;
  }
})();
