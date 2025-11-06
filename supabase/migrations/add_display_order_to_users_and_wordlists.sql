-- Add display_order column to users table for student ordering
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Update existing students with sequential order based on creation time
WITH ordered_students AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM users
  WHERE role = 'student'
)
UPDATE users
SET display_order = ordered_students.rn
FROM ordered_students
WHERE users.id = ordered_students.id;

-- Create index for better performance on users table
CREATE INDEX IF NOT EXISTS idx_users_display_order ON users(display_order);

-- Add display_order column to wordlists table
ALTER TABLE wordlists ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Update existing wordlists with sequential order based on creation time
WITH ordered_wordlists AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM wordlists
)
UPDATE wordlists
SET display_order = ordered_wordlists.rn
FROM ordered_wordlists
WHERE wordlists.id = ordered_wordlists.id;

-- Create index for better performance on wordlists table
CREATE INDEX IF NOT EXISTS idx_wordlists_display_order ON wordlists(display_order);

