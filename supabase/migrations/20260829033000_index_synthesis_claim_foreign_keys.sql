-- Cover both sides of the optional synthesis run/result relationship.

create index if not exists project_syntheses_synthesis_run_id_idx
    on public.project_syntheses (synthesis_run_id)
    where synthesis_run_id is not null;

create index if not exists synthesis_runs_synthesis_id_idx
    on public.synthesis_runs (synthesis_id)
    where synthesis_id is not null;
