export type CompareImagesTaskReturn = null | {
  error?: boolean;
  message?: string;
  imgDiff?: number;
  imgNewBase64?: string;
  imgDiffBase64?: string;
  imgOldBase64?: string;
  maxDiffThreshold?: number;
};

export type PendingDiffRecord = {
  title: string;
  imgPath: string;
  imgOldPath: string;
  imgNewBase64: string;
  imgOldBase64: string;
  imgDiffBase64: string;
  message: string;
  passed?: boolean;
  deferred?: boolean;
};

// the run manifest contract lives in @frsource/visual-regression-manifest;
// re-exported so the plugin's own modules keep importing it from here
export type {
  Manifest,
  ManifestBrowser,
  ManifestCi,
  ManifestEntry,
  ManifestEntryOptions,
  ManifestHashes,
  ManifestImage,
  ManifestPlatform,
  ManifestRenderer,
  ManifestRendererBackend,
  ManifestRunner,
  ManifestStatus,
  ManifestUpload,
} from '@frsource/visual-regression-manifest';
