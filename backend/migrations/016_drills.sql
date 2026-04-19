-- Drills library
CREATE TABLE drills (
  id SERIAL PRIMARY KEY,
  created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  youtube_url TEXT,
  diagram_data JSONB DEFAULT '{}',
  diagram_image_url TEXT,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'club', 'community')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training sessions
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
  team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session items (drills + breaks/elements in order)
CREATE TABLE session_items (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  drill_id INTEGER REFERENCES drills(id) ON DELETE SET NULL,
  position INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'drill' CHECK (type IN ('drill', 'element')),
  label TEXT,
  start_time TEXT,
  duration_mins INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_drills_created_by ON drills(created_by);
CREATE INDEX idx_drills_visibility ON drills(visibility);
CREATE INDEX idx_sessions_created_by ON sessions(created_by);
CREATE INDEX idx_sessions_team_id ON sessions(team_id);
CREATE INDEX idx_session_items_session_id ON session_items(session_id);
