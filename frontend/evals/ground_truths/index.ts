import type { ProjectSynthesisItem } from '../../hooks/backend/diligence'
import { werkheiserGroundTruthPass1, werkheiserGroundTruthPass2 } from './business1_werkheiser'
import { irontreeGroundTruth } from './business2_irontree'
import { turnkeyGroundTruth } from './business3_turnkey'
import { conversionxlGroundTruth } from './business4_conversionxl'
import { medspaGroundTruth } from './business5_medspa'
import { happyPathGroundTruth } from './testing1_happy_path'
import { docs24GroundTruth } from './testing_suite_docs24'
import { widgetcoGroundTruth } from './widgetco_forensic'
import { mmlMandaBenchmarkSyntheses } from './mml_manda_benchmark'
import {
    vanguardMedicalGroundTruth,
    apexPrecisionGroundTruth,
    terranovaEnvironmentalGroundTruth,
} from './packet_deal_benchmarks'

export {
    werkheiserGroundTruthPass1,
    werkheiserGroundTruthPass2,
    irontreeGroundTruth,
    turnkeyGroundTruth,
    conversionxlGroundTruth,
    medspaGroundTruth,
    happyPathGroundTruth,
    docs24GroundTruth,
    widgetcoGroundTruth,
    mmlMandaBenchmarkSyntheses,
    vanguardMedicalGroundTruth,
    apexPrecisionGroundTruth,
    terranovaEnvironmentalGroundTruth,
}

export const benchmarkGroundTruthSyntheses: ProjectSynthesisItem[] = [
    werkheiserGroundTruthPass2,
    werkheiserGroundTruthPass1,
    irontreeGroundTruth,
    turnkeyGroundTruth,
    conversionxlGroundTruth,
    medspaGroundTruth,
    happyPathGroundTruth,
    docs24GroundTruth,
    widgetcoGroundTruth,
    vanguardMedicalGroundTruth,
    apexPrecisionGroundTruth,
    terranovaEnvironmentalGroundTruth,
    ...mmlMandaBenchmarkSyntheses,
]
