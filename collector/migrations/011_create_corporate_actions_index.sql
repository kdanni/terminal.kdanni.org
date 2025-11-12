CREATE INDEX IF NOT EXISTS ix_corp_actions_sec_date
  ON corporate_actions (security_id, action_date);
