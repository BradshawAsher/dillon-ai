-- Preserve the folder hierarchy selected by the user without storing an
-- absolute local filesystem path. Existing rows remain backward compatible.
alter table public.documents
    add column if not exists source_relative_path text not null default '';

comment on column public.documents.source_relative_path is
    'Normalized browser or ZIP path relative to the selected upload root; never an absolute local path.';
