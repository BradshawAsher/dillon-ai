-- Enable Realtime replication for documents and project_syntheses tables
-- This allows WebSocket clients to listen for INSERT/UPDATE/DELETE events.

do $$
begin
    -- Add documents table to supabase_realtime publication if not already present
    if not exists (
        select 1 from pg_publication_tables 
        where pubname = 'supabase_realtime' 
        and schemaname = 'public' 
        and tablename = 'documents'
    ) then
        alter publication supabase_realtime add table documents;
    end if;

    -- Add project_syntheses table to supabase_realtime publication if not already present
    if not exists (
        select 1 from pg_publication_tables 
        where pubname = 'supabase_realtime' 
        and schemaname = 'public' 
        and tablename = 'project_syntheses'
    ) then
        alter publication supabase_realtime add table project_syntheses;
    end if;
end $$;
