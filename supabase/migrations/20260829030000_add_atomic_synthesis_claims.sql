-- Prevent concurrent document-completion events from starting duplicate project syntheses.
-- The database owns the claim because workflow-level read/check/write sequences are not atomic.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.synthesis_runs (
    id bigint generated always as identity primary key,
    project_id text not null,
    evidence_signature text not null,
    evidence_manifest jsonb not null,
    run_kind text not null default 'automatic'
        check (run_kind in ('automatic', 'manual')),
    status text not null default 'running'
        check (status in ('running', 'succeeded', 'failed')),
    claim_token uuid not null default gen_random_uuid(),
    execution_id text,
    claimed_at timestamptz not null default now(),
    lease_expires_at timestamptz not null default (now() + interval '15 minutes'),
    completed_at timestamptz,
    synthesis_id bigint references public.project_syntheses(id) on delete set null,
    error_message text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists synthesis_runs_automatic_evidence_uq
    on public.synthesis_runs (project_id, evidence_signature)
    where run_kind = 'automatic';

create index if not exists synthesis_runs_project_claimed_at_idx
    on public.synthesis_runs (project_id, claimed_at desc);

alter table public.synthesis_runs enable row level security;

revoke all on table public.synthesis_runs from anon, authenticated;
grant select, insert, update on table public.synthesis_runs to service_role;
grant usage, select on sequence public.synthesis_runs_id_seq to service_role;

alter table public.project_syntheses
    add column if not exists evidence_signature text,
    add column if not exists synthesis_run_id bigint references public.synthesis_runs(id) on delete set null,
    add column if not exists run_kind text default 'automatic'
        check (run_kind is null or run_kind in ('automatic', 'manual'));

create unique index if not exists project_syntheses_automatic_evidence_uq
    on public.project_syntheses (project_id, evidence_signature)
    where evidence_signature is not null
      and run_kind = 'automatic'
      and is_placeholder is not true;

create or replace function public.claim_project_synthesis(
    p_project_id text,
    p_evidence_manifest jsonb,
    p_execution_id text default null,
    p_lease_seconds integer default 900
)
returns table (
    claimed boolean,
    run_id bigint,
    claim_token uuid,
    claim_status text,
    evidence_signature text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
    v_signature text;
    v_lease_seconds integer;
begin
    if nullif(btrim(p_project_id), '') is null then
        raise exception 'project_id is required' using errcode = '22023';
    end if;

    if p_evidence_manifest is null
       or jsonb_typeof(p_evidence_manifest) <> 'array'
       or jsonb_array_length(p_evidence_manifest) = 0 then
        raise exception 'evidence_manifest must be a non-empty JSON array' using errcode = '22023';
    end if;

    v_lease_seconds := greatest(60, least(coalesce(p_lease_seconds, 900), 3600));
    v_signature := encode(
        extensions.digest(convert_to(p_evidence_manifest::text, 'UTF8'), 'sha256'),
        'hex'
    );

    return query
    insert into public.synthesis_runs as synthesis_runs (
        project_id,
        evidence_signature,
        evidence_manifest,
        run_kind,
        status,
        claim_token,
        execution_id,
        claimed_at,
        lease_expires_at,
        completed_at,
        synthesis_id,
        error_message,
        updated_at
    )
    values (
        btrim(p_project_id),
        v_signature,
        p_evidence_manifest,
        'automatic',
        'running',
        gen_random_uuid(),
        nullif(btrim(coalesce(p_execution_id, '')), ''),
        now(),
        now() + make_interval(secs => v_lease_seconds),
        null,
        null,
        null,
        now()
    )
    on conflict (project_id, evidence_signature)
        where run_kind = 'automatic'
    do update set
        evidence_manifest = excluded.evidence_manifest,
        status = 'running',
        claim_token = gen_random_uuid(),
        execution_id = excluded.execution_id,
        claimed_at = now(),
        lease_expires_at = excluded.lease_expires_at,
        completed_at = null,
        synthesis_id = null,
        error_message = null,
        updated_at = now()
    where synthesis_runs.status = 'failed'
       or (synthesis_runs.status = 'running' and synthesis_runs.lease_expires_at <= now())
    returning
        true,
        synthesis_runs.id,
        synthesis_runs.claim_token,
        synthesis_runs.status,
        synthesis_runs.evidence_signature;

    if found then
        return;
    end if;

    return query
    select
        false,
        existing.id,
        null::uuid,
        existing.status,
        existing.evidence_signature
    from public.synthesis_runs as existing
    where existing.project_id = btrim(p_project_id)
      and existing.evidence_signature = v_signature
      and existing.run_kind = 'automatic'
    limit 1;
end;
$$;

revoke all on function public.claim_project_synthesis(text, jsonb, text, integer)
    from public, anon, authenticated;
grant execute on function public.claim_project_synthesis(text, jsonb, text, integer)
    to service_role;

comment on table public.synthesis_runs is
    'Atomic ownership and audit records for automatic and manual project synthesis attempts.';
comment on function public.claim_project_synthesis(text, jsonb, text, integer) is
    'Atomically claims one automatic synthesis per project evidence manifest; failed or expired claims may be reclaimed.';
