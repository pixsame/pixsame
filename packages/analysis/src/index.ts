export { analyze, type AnalyzeInput } from './analyze';
export { analysisOf, bundle, type Bundle, type BundleEntry } from './bundle';
export { descriptions, type Descriptions } from './describe';
export { regionHash } from './hash';
export {
  analysisPlugin,
  captureComparison,
  withAnalysis,
  type AnalysisPlugin,
} from './plugin';
export { findRegions, maskFromPixelmatchDiff, type Regions } from './regions';
export { detectRegionShift, detectShift } from './shift';
export type {
  Analysis,
  Box,
  Label,
  Region,
  RegionKind,
  RgbaImage,
  Shift,
  Size,
} from './types';
