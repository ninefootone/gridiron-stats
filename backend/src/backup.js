const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Pool } = require('pg');

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function runBackup() {
  const date = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${date}.json`;

  console.log(`Starting backup: ${filename}`);

  try {
    const tables = [
      'users', 'teams', 'team_members', 'players', 'games',
      'player_stats', 'plays', 'opponent_stats', 'score_adjustments',
      'club_players'
    ];

    const backup = {};
    for (const table of tables) {
      const { rows } = await pool.query(`SELECT * FROM ${table}`);
      backup[table] = rows;
      console.log(`  ${table}: ${rows.length} rows`);
    }

    const content = JSON.stringify(backup, null, 2);

    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: `backups/${filename}`,
      Body: content,
      ContentType: 'application/json',
    }));

    console.log(`✅ Backup uploaded: backups/${filename}`);

    // Delete backups older than 30 days
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

    await pool.end();
    console.log('Backup complete');
    process.exit(0);

  } catch (err) {
    console.error('Backup failed:', err);
    await pool.end();
    process.exit(1);
  }
}

runBackup();
