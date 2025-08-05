DROP PROCEDURE IF EXISTS sp_Archive_SP;

CREATE PROCEDURE sp_Archive_SP ()
BEGIN

    -- DELETE old rows
    -- DELETE FROM table1 WHERE updated_at < now() - INTERVAL 40 day;
    -- DELETE FROM table1 WHERE inserted_at < now() - INTERVAL 100 day;
    

    -- DELETE FROM table2 WHERE inserted_at < now() - INTERVAL 365 day;
    
    
    -- DELETE FROM table3 WHERE updated_at < now() - INTERVAL 365 day;


END