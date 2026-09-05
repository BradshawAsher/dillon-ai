-- Keep project synthesis ownership aligned with the authenticated document
-- owner. This is required for per-user API reads and Postgres Changes RLS.
--
-- A project is stamped only when all attributable non-demo documents agree on
-- one user_id. Ambiguous legacy project IDs remain unassigned and therefore
-- admin-only rather than risking cross-user disclosure.

create or replace function public.stamp_project_synthesis_user_ownership()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
    resolved_user_id uuid;
    resolved_team text;
    distinct_owner_count bigint;
begin
    if new.is_demo = true or new.user_id is not null then
        return new;
    end if;

    select count(distinct d.user_id)
    into distinct_owner_count
    from public.documents as d
    where d.project_id = new.project_id
      and d.is_demo = false
      and d.user_id is not null;

    if distinct_owner_count = 1 then
        select d.user_id, d.team
        into resolved_user_id, resolved_team
        from public.documents as d
        where d.project_id = new.project_id
          and d.is_demo = false
          and d.user_id is not null
        order by d.updated_at desc, d.id desc
        limit 1;

        new.user_id := resolved_user_id;
        if coalesce(new.team, '') = '' then
            new.team := resolved_team;
        end if;
    end if;

    return new;
end;
$$;

drop trigger if exists stamp_project_synthesis_user_ownership
on public.project_syntheses;

create trigger stamp_project_synthesis_user_ownership
before insert or update of project_id, user_id
on public.project_syntheses
for each row
execute function public.stamp_project_synthesis_user_ownership();

with project_owners as (
    select
        d.project_id,
        (array_agg(d.user_id order by d.updated_at desc, d.id desc))[1] as user_id,
        (array_agg(d.team order by (d.team is null), d.updated_at desc, d.id desc))[1] as team
    from public.documents as d
    where d.is_demo = false
      and d.user_id is not null
      and coalesce(d.project_id, '') <> ''
    group by d.project_id
    having count(distinct d.user_id) = 1
)
update public.project_syntheses as synthesis
set
    user_id = project_owners.user_id,
    team = case
        when coalesce(synthesis.team, '') = '' then project_owners.team
        else synthesis.team
    end
from project_owners
where synthesis.project_id = project_owners.project_id
  and synthesis.is_demo = false
  and synthesis.user_id is null;
