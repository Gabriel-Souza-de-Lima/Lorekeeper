ALTER TABLE sessions ADD COLUMN summary TEXT NOT NULL DEFAULT '' CHECK (length(summary) <= 600);
ALTER TABLE sessions ADD COLUMN highlights TEXT NOT NULL DEFAULT '' CHECK (length(highlights) <= 2000);
PRAGMA user_version = 13;
