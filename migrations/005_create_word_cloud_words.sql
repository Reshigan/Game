# migrations/005_create_word_cloud_words.sql
-- Up
CREATE TABLE word_cloud_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word_cloud_id UUID NOT NULL REFERENCES word_clouds(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  frequency INTEGER NOT NULL CHECK (frequency >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_word_cloud_words_word_cloud_id ON word_cloud_words(word_cloud_id);
CREATE INDEX idx_word_cloud_words_word ON word_cloud_words(word);
CREATE INDEX idx_word_cloud_words_frequency ON word_cloud_words(frequency);
CREATE INDEX idx_word_cloud_words_is_active ON word_cloud_words(is_active);

-- Down
DROP TABLE IF EXISTS word_cloud_words CASCADE;