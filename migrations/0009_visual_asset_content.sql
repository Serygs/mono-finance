-- D1 BLOB storage keeps small owner-uploaded visual assets free-tier compatible.
-- Files remain separate from immutable imported transaction/category records.
ALTER TABLE visual_assets ADD COLUMN content BLOB;
