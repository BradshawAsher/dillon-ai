import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

// Load ground truth results and run hydration test
const rootDir = path.resolve('.');
const gtDir = path.join(rootDir, 'test_sets', 'ground_truth');
const resultsDir = path.join(rootDir, 'test_sets', 'results');

console.log('=== VERIFYING PRICE & MULTIPLES FOR ALL PROJECTS ===\n');

// Import the hydration utils via dynamic import of the compiled module
const { deriveDocumentedFacts } = await import('../frontend/utils/documentedFacts.js');
const { hydrateModelFactsFromDocuments, buildReturnsDisplayModel } = await import('../frontend/utils/diligenceDashboardUtils.js');

const resultFiles = fs.readdirSync(resultsDir).filter(f => f.endsWith('.json'));

for (const resFile of resultFiles) {
    const runData = JSON.parse(fs.readFileSync(path.join(resultsDir, resFile), 'utf-8'));
    const projectId = runData.projectId || runData.business || resFile;
    const docs = runData.documents || [];

    const baseModel = {
        projectId,
        askingPrice: null,
        purchasePrice: null,
        ebitdaMultiple: null,
        revenueMultiple: null,
        documentedFactsJson: '',
    };

    const hydrated = hydrateModelFactsFromDocuments(baseModel, docs);
    const returnsModel = buildReturnsDisplayModel(hydrated);

    let facts = {};
    try {
        facts = JSON.parse(hydrated.documentedFactsJson || '{}');
    } catch {}

    console.log(`[PROJECT: ${runData.business || projectId}]`);
    console.log(`  - Doc Count: ${docs.length}`);
    console.log(`  - Extracted Revenue: ${facts.revenue?.value ? '$' + facts.revenue.value.toLocaleString() : 'N/A'}`);
    console.log(`  - Extracted EBITDA: ${facts.ebitda_sde?.value ? '$' + facts.ebitda_sde.value.toLocaleString() : 'N/A'}`);
    console.log(`  - Purchase Price: ${hydrated.purchasePrice ? '$' + hydrated.purchasePrice.toLocaleString() : 'N/A'}`);
    console.log(`  - Asking Price: ${hydrated.askingPrice ? '$' + hydrated.askingPrice.toLocaleString() : 'N/A'}`);
    console.log(`  - EBITDA Multiple: ${hydrated.ebitdaMultiple ? hydrated.ebitdaMultiple + 'x' : 'N/A'}`);
    console.log(`  - Returns Model Resolved Price: $${returnsModel.purchasePrice?.toLocaleString()}`);
    console.log(`  - Returns Model Exit Multiple: ${returnsModel.exitMultiple}x`);
    console.log('--------------------------------------------------');
}
