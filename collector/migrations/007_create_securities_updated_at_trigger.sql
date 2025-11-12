DROP TRIGGER IF EXISTS trg_securities_updated_at ON securities;
CREATE TRIGGER trg_securities_updated_at
BEFORE UPDATE ON securities
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
