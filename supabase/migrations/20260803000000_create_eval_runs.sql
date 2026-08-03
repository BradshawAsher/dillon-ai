-- Migration to store automated eval harness runs for tracking score performance over time
CREATE TABLE IF NOT EXISTS public.eval_runs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    run_at TIMESTAMPTZ DEFAULT NOW(),
    commit_sha TEXT DEFAULT 'local',
    total_documents INTEGER NOT NULL,
    passed_documents INTEGER NOT NULL,
    overall_percentage NUMERIC(5, 2) NOT NULL,
    status TEXT NOT NULL,
    report_json JSONB NOT NULL
);

-- Index for timeline queries
CREATE INDEX IF NOT EXISTS idx_eval_runs_run_at ON public.eval_runs(run_at DESC);
