/** One change that has a place on the screenshot, for the review overlay. */
export type OverlayPin = {
  /** From 1; the number on the image and in the list under it. */
  number: number;
  kind: string;
  /** The image it is true for. */
  side: 'baseline' | 'actual' | 'both';
  text: string;
  /** Where, in percent of the image. */
  boxes: { left: number; top: number; width: number; height: number }[];
};

export type CompareImagesTaskReturn = null | {
  error?: boolean;
  message?: string;
  imgDiff?: number;
  imgNewBase64?: string;
  imgDiffBase64?: string;
  imgOldBase64?: string;
  maxDiffThreshold?: number;
  /** What changed, in one sentence; only for a comparison that found differences. */
  description?: string;
  /** The changes that have a place on the screenshot; only when the page's layout was known on both sides. */
  pins?: OverlayPin[];
  /** The changes that have none, in words. */
  rest?: string[];
  /** The baseline exists but was saved before page layouts were recorded, and was not replaced now. */
  oldBaseline?: boolean;
};

export type PendingDiffRecord = {
  title: string;
  imgPath: string;
  imgOldPath: string;
  imgNewBase64: string;
  imgOldBase64: string;
  imgDiffBase64: string;
  message: string;
  description?: string;
  pins?: OverlayPin[];
  rest?: string[];
  /** Compared against a baseline that has no page layout. */
  oldBaseline?: boolean;
  passed?: boolean;
  deferred?: boolean;
};

// the run manifest contract lives in visual-regression-manifest;
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
} from 'visual-regression-manifest';
