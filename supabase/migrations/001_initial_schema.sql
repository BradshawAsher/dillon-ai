-- Due Diligence Dashboard — initial Supabase/Postgres schema
-- Run this in Supabase SQL Editor or via supabase db push.

-- ============================================================
-- documents (submission history)
-- ============================================================
create table if not exists documents (
    id bigint generated always as identity primary key,
    request_id text unique not null,
    project_id text not null default '',
    deal_name text not null default '',
    company_name text not null default '',
    workstream text not null default '',
    submission_notes text not null default '',
    analyst_name text not null default '',
    analyst_email text not null default '',
    project_stage text not null default '',
    document_type text not null default '',
    detected_document_type text not null default '',
    detected_document_types_json text not null default '[]',
    table_structure_status text not null default '',
    table_structure_issues text not null default '',
    detected_header_row int default 0,
    column_map_confidence numeric default 0,
    validated_column_map text not null default '',
    employee_count numeric,
    employee_type text not null default '',
    employee_as_of_date text not null default '',
    employee_confidence numeric,
    employee_citation text not null default '',
    employee_evidence_status text not null default '',
    financial_facts_json text not null default '',
    reconciliation_json text not null default '',
    math_check_status text not null default '',
    submission_batch_id text not null default '',
    expected_batch_document_count int not null default 0,
    file_name text not null default '',
    source_relative_path text not null default '',
    file_size bigint not null default 0,
    file_type text not null default '',
    trigger_timestamp text not null default '',
    status text not null default 'unknown',
    environment text not null default 'production',
    received_at text not null default '',
    processing_started_at text not null default '',
    processed_at text not null default '',
    error_message text not null default '',
    risk_level text not null default '',
    category text not null default '',
    traffic_light text not null default '',
    ebitda_extracted text not null default '',
    extracted_json text not null default '',
    storage_file_id text not null default '',
    storage_file_url text not null default '',
    needs_human_review boolean not null default false,
    ai_summary text not null default '',
    ai_target_value text not null default '',
    ai_variance text not null default '',
    ai_escalation_reason text not null default '',
    ai_intent text not null default '',
    ai_citations text not null default '',
    ai_red_flags text not null default '',
    ai_yellow_flags text not null default '',
    ai_green_flags text not null default '',
    ai_confidence text not null default '',
    valuation_lower_bound text not null default '',
    valuation_base_estimate text not null default '',
    valuation_upper_bound text not null default '',
    valuation_currency text not null default '',
    investment_is_favorable boolean,
    investment_buy_reasoning text not null default '',
    is_considered boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_documents_project_id on documents(project_id);
create index if not exists idx_documents_status on documents(status);
create index if not exists idx_documents_environment on documents(environment);
create index if not exists idx_documents_updated_at on documents(updated_at desc);

-- ============================================================
-- project_syntheses
-- ============================================================
create table if not exists project_syntheses (
    id bigint generated always as identity primary key,
    project_id text unique not null,
    project_name text not null default '',
    company_name text not null default '',
    project_status text not null default '',
    documents_received_count int not null default 0,
    documents_completed_count int not null default 0,
    missing_documents_json text not null default '[]',
    cross_document_conflicts_json text not null default '[]',
    open_questions_json text not null default '[]',
    negotiation_levers_json text not null default '[]',
    final_judgment_json text not null default '',
    final_recommendation text not null default '',
    final_risk_level text not null default '',
    final_traffic_light text not null default '',
    ai_error_message text not null default '',
    ai_confidence text not null default '',
    ai_citations text not null default '',
    valuation_lower_bound text not null default '',
    valuation_base_estimate text not null default '',
    valuation_upper_bound text not null default '',
    valuation_currency text not null default '',
    project_processed_at text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_syntheses_project_id on project_syntheses(project_id);

-- ============================================================
-- deal_models
-- ============================================================
create table if not exists deal_models (
    id bigint generated always as identity primary key,
    project_id text unique not null,
    asking_price numeric,
    purchase_price numeric,
    debt_assumed numeric,
    cash_acquired numeric,
    working_capital_requirement numeric,
    transaction_fees numeric,
    hold_period_years numeric,
    tax_rate numeric,
    closing_costs numeric,
    maintenance_capex numeric,
    exit_multiple numeric,
    exit_costs numeric,
    equity_contribution_percent numeric,
    interest_rate numeric,
    amortization_years numeric,
    seller_note_amount numeric,
    bear_revenue_growth numeric,
    base_revenue_growth numeric,
    bull_revenue_growth numeric,
    bear_ebitda_margin numeric,
    base_ebitda_margin numeric,
    bull_ebitda_margin numeric,
    bear_exit_multiple numeric,
    base_exit_multiple numeric,
    bull_exit_multiple numeric,
    revenue_multiple numeric,
    ebitda_multiple numeric,
    asset_haircut_percent numeric,
    documented_facts_json text not null default '',
    documented_facts_status text not null default '',
    model_updated_at text not null default '',
    model_updated_by text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_deal_models_project_id on deal_models(project_id);

-- ============================================================
-- workflow_errors
-- ============================================================
create table if not exists workflow_errors (
    id bigint generated always as identity primary key,
    workflow_id text not null default '',
    workflow_name text not null default '',
    execution_id text not null default '',
    failed_node text not null default '',
    error_message text not null default '',
    last_node_executed text not null default '',
    severity text not null default 'uncaught',
    occurred_at text not null default '',
    created_at timestamptz not null default now()
);

create index if not exists idx_workflow_errors_occurred_at on workflow_errors(created_at desc);

-- ============================================================
-- project_action_trackers
-- ============================================================
create table if not exists project_action_trackers (
    id bigint generated always as identity primary key,
    project_id text unique not null,
    checklist_json text not null default '[]',
    questions_json text not null default '[]',
    last_modified_at text not null default '',
    last_modified_by text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_action_trackers_project_id on project_action_trackers(project_id);

-- ============================================================
-- updated_at auto-refresh trigger
-- ============================================================
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create or replace trigger documents_updated_at before update on documents for each row execute function update_updated_at_column();
create or replace trigger project_syntheses_updated_at before update on project_syntheses for each row execute function update_updated_at_column();
create or replace trigger deal_models_updated_at before update on deal_models for each row execute function update_updated_at_column();
create or replace trigger project_action_trackers_updated_at before update on project_action_trackers for each row execute function update_updated_at_column();
