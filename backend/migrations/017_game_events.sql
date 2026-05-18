CREATE TABLE game_events (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('end_half', 'end_regulation', 'start_ot', 'turnover_on_downs')),
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_game_events_game_id ON game_events(game_id);