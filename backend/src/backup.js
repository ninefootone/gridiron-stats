const { exec } = require('child_process');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { promisify } = require('util');
const execAsync = promisify(exec);

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function runBackup() {
  const date = new Date().toISOString().split('T')[0];
  const filename = `backup-${date}.sql`;
  const tmpPath = `/tmp/${filename}`;

  console.log(`Starting backup: ${filename}`);

  try {
    // Run pg_dump
    await execAsync(`pg_dump "${process.env.DATABASE_URL}" -f ${tmpPath} --no-password`);
    console.log('pg_dump complete');

    // Read the dump file
    const fs = require('fs');
    const fileContent = fs.readFileSync(tmpPath);

    // Upload to R2
    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: `backups/${filename}`,
      Body: fileContent,
      ContentType: 'application/sql',
    }));

    console.log(`✅ Backup uploaded: backups/${filename}`);

    // Clean up temp file
    fs.unlinkSync(tmpPath);

    // Delete backups older than 30 days
    const { ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
    const list = await s3.send(new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET,
      Prefix: 'backups/',
    }));

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const obj of list.Contents || []) {
      if (obj.LastModified < thirtyDaysAgo) {
        await s3.send(new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET,
          Key: obj.Key,
        }));
        console.log(`Deleted old backup: ${obj.Key}`);
      }
    }

  } catch (err) {
    console.error('Backup failed:', err);
    process.exit(1);
  }
}

runBackup();
