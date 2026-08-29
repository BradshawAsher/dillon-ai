-- Avoid collisions between RETURNS TABLE output variables and synthesis_runs columns.

drop function if exists public.claim_project_synthesis(text, jsonb, text, integer);

create or replace function public.claim_project_synthesis(
    p_project_id text,
    p_evidence_manifest jsonb,
    p_execution_id text default null,
    p_lease_seconds integer default 900
)
returns table (
    claimed boolean,
    run_id bigint,
    run_claim_token uuid,
    claim_status text,
    evidence_hash text
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
