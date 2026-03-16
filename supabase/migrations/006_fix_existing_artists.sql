UPDATE madiheen SET status = 'approved' WHERE status IS NULL OR status = 'pending';
UPDATE ruwat SET status = 'approved' WHERE status IS NULL OR status = 'pending';