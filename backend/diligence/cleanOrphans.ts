import { createClient } from '@supabase/supabase-js';

export interface CleanOrphansResult {
  success: boolean;
  deletedSynthesesCount: number;
  deletedDocumentsCount: number;
  message: string;
  error?: string;
}

/**
 * Server-side cleanup utility to purge orphaned test records from Supabase tables:
 * - project_syntheses rows where project_id IS NULL or project_id = '' or project_id = 'blank'
 * - documents rows where project_id IS NULL or project_id = '' or project_id = 'blank'
 */
export async function cleanOrphanRecords(): Promise<CleanOrphansResult> {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    return {
      success: false,
      deletedSynthesesCount: 0,
      deletedDocumentsCount: 0,
      message: 'Supabase URL or Key missing in environment.',
    };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Purge orphaned project_syntheses
    const { data: synthData, error: synthErr } = await supabase
      .from('project_syntheses')
      .delete()
      .or('project_id.is.null,project_id.eq.,project_id.eq.blank')
      .select('id');

    if (synthErr) {
      console.warn('Warning deleting orphaned project_syntheses:', synthErr.message);
    }

    // 2. Purge orphaned documents
    const { data: docData, error: docErr } = await supabase
      .from('documents')
      .delete()
      .or('project_id.is.null,project_id.eq.,project_id.eq.blank')
      .select('id');

    if (docErr) {
      console.warn('Warning deleting orphaned documents:', docErr.message);
    }

    const deletedSynthesesCount = synthData?.length || 0;
    const deletedDocumentsCount = docData?.length || 0;

    return {
      success: true,
      deletedSynthesesCount,
      deletedDocumentsCount,
      message: `Successfully cleaned ${deletedSynthesesCount} orphaned synthesis row(s) and ${deletedDocumentsCount} orphaned document row(s).`,
    };
  } catch (err: any) {
    return {
      success: false,
      deletedSynthesesCount: 0,
      deletedDocumentsCount: 0,
      message: 'Failed to clean orphan records.',
      error: err.message || String(err),
    };
  }
}
