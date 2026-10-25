-- Also created idempotently by the authenticated workout API so an existing
-- deployment can adopt this feature without an out-of-band migration step.
CREATE TABLE IF NOT EXISTS workout_settings (user_id TEXT PRIMARY KEY, revision INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS workout_sessions (user_id TEXT NOT NULL, id TEXT NOT NULL, plan_id TEXT NOT NULL, status TEXT NOT NULL, started_at TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL, PRIMARY KEY(user_id,id));
CREATE UNIQUE INDEX IF NOT EXISTS one_active_workout ON workout_sessions(user_id) WHERE status='active';
CREATE TABLE IF NOT EXISTS private_documents (user_id TEXT NOT NULL, id TEXT NOT NULL, name TEXT NOT NULL, data BLOB NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(user_id,id));

CREATE TRIGGER IF NOT EXISTS learning_blocks_workout BEFORE INSERT ON workout_sessions WHEN NEW.status='active' AND EXISTS(SELECT 1 FROM visits WHERE user_id=NEW.user_id AND finished_at IS NULL) BEGIN SELECT RAISE(IGNORE); END;
CREATE TRIGGER IF NOT EXISTS workout_blocks_learning BEFORE INSERT ON visits WHEN NEW.finished_at IS NULL AND EXISTS(SELECT 1 FROM workout_sessions WHERE user_id=NEW.user_id AND status='active') BEGIN SELECT RAISE(IGNORE); END;
