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
    await pool.query(`
      CREATE TABLE IF NOT EXISTS opponent_stats (
        id SERIAL PRIMARY KEY,
        game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
        stat_type VARCHAR(50) NOT NULL,
        value INTEGER NOT NULL,
        logged_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_opponent_stats_game_id ON opponent_stats(game_id)`);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS plays (
        id SERIAL PRIMARY KEY,
        team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(20) DEFAULT 'offense',
        season VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_plays_team_id ON plays(team_id)`);
    
    await pool.query(`ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS play_id INTEGER REFERENCES plays(id) ON DELETE SET NULL`);

// score_locked on games
    await pool.query(`ALTER TABLE games ADD COLUMN IF NOT EXISTS score_locked BOOLEAN DEFAULT false`);
    // Lock all existing games so their manual scores are preserved
    await pool.query(`UPDATE games SET score_locked = true WHERE score_locked = false AND (our_score > 0 OR opponent_score > 0)`);
    // score_adjustments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS score_adjustments (
        id SERIAL PRIMARY KEY,
        game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
        team VARCHAR(10) NOT NULL CHECK (team IN ('ours', 'opponent')),
        adjustment INTEGER NOT NULL,
        reason TEXT NOT NULL,
        logged_by INTEGER REFERENCES users(id),
        logged_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_score_adjustments_game_id ON score_adjustments(game_id)`);

    await pool.query(`ALTER TABLE games ADD COLUMN IF NOT EXISTS game_status VARCHAR(20) DEFAULT 'scheduled'`);
    await pool.query(`ALTER TABLE games ADD COLUMN IF NOT EXISTS whistle_game_id VARCHAR(20) DEFAULT NULL`);

    // Team type (flag/contact)
    await pool.query(`ALTER TABLE teams ADD COLUMN IF NOT EXISTS team_type VARCHAR(10) DEFAULT NULL`);

    // Club players table — identity anchor for cross-team player tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS club_players (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Link players to a club identity (nullable — existing players unaffected)
    await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS club_player_id INTEGER REFERENCES club_players(id) ON DELETE SET NULL`);

    // Player retirement
    await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS retired_at TIMESTAMPTZ DEFAULT NULL`);

    // New stat types — add to existing player_stats table via application logic only, no schema change needed

    // New positions — handled in frontend stats.js, no schema change needed

    // Subscriptions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        stripe_customer_id VARCHAR(255) UNIQUE,
        stripe_subscription_id VARCHAR(255) UNIQUE,
        plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'individual', 'club')),
        status VARCHAR(20) DEFAULT 'active',
        current_period_end TIMESTAMPTZ,
        cancel_at_period_end BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id)`);    

    // Team restriction for downgraded plans
    await pool.query(`ALTER TABLE teams ADD COLUMN IF NOT EXISTS restricted BOOLEAN DEFAULT false`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_opt_out BOOLEAN DEFAULT false`);
    await pool.query(`ALTER TABLE teams ADD COLUMN IF NOT EXISTS notify_on_join BOOLEAN DEFAULT true`);

    console.log('✅ Database schema ready');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };