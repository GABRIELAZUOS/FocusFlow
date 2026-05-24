-- Tarefas do Kanban
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'brain_dump',
  energy_level text,
  estimated_time text,
  notes text,
  category_color text,
  woop_id uuid,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- WOOPs
CREATE TABLE woops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  wish text NOT NULL,
  outcome text,
  obstacle text,
  plan text,
  status text DEFAULT 'active',
  reflection text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Sessões Pomodoro
CREATE TABLE pomodoro_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  mode text NOT NULL,
  focus_minutes integer NOT NULL,
  break_minutes integer NOT NULL,
  completed boolean DEFAULT false,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz
);

-- Configurações do usuário
CREATE TABLE user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  dark_mode boolean DEFAULT false,
  sound_enabled boolean DEFAULT true,
  default_pomodoro_mode text DEFAULT 'classic',
  show_daily_review boolean DEFAULT true
);

-- RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE woops ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "users_own_tasks" ON tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_woops" ON woops FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_sessions" ON pomodoro_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_settings" ON user_settings FOR ALL USING (auth.uid() = user_id);
