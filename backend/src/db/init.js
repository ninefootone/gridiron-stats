const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    auth0_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    picture TEXT,
    role VARCHAR(50) DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    season VARCHAR(50),
    description TEXT,
    join_code VARCHAR(10) UNIQUE,
    view_code VARCHAR(10) UNIQUE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS team_members (
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    PRIMARY KEY (team_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    number INTEGER,
    position VARCHAR(100),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    opponent_name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    game_date DATE NOT NULL,
    game_time VARCHAR(20),
    home_away VARCHAR(10) DEFAULT 'home',
    our_score INTEGER DEFAULT 0,
    opponent_score INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS player_stats (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    stat_type VARCHAR(100) NOT NULL,
    value NUMERIC DEFAULT 1,
    notes TEXT,
    logged_by INTEGER REFERENCES users(id),
    logged_at TIMESTAMPTZ DEFAULT NOW()
  );

  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name='teams' AND column_name='join_code'
    ) THEN
      ALTER TABLE teams ADD COLUMN join_code VARCHAR(10) UNIQUE;
    END IF;
  END $$;

  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name='teams' AND column_name='view_code'
    ) THEN
      ALTER TABLE teams ADD COLUMN view_code VARCHAR(10) UNIQUE;
    END IF;
  END $$;

  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name='players' AND column_name='positions'
    ) THEN
      ALTER TABLE players ADD COLUMN positions TEXT[] DEFAULT '{}';
      UPDATE players SET positions = ARRAY[position] WHERE position IS NOT NULL AND position != '';
    END IF;
  END $$;
`;

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(SCHEMA);
    await pool.query(`ALTER TABLE games ADD COLUMN IF NOT EXISTS stat_count INTEGER DEFAULT 0`);
    await pool.query(`ALTER TABLE games ADD COLUMN IF NOT EXISTS game_type TEXT NOT NULL DEFAULT 'regular'`);
    console.log('✅ Database schema ready');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };