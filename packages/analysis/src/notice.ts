/** The command that gives old baselines their page layout. */
export const UPDATE_BASELINES_COMMAND = 'npx pixsame baselines --update';

/**
 * What to tell a person once per run when a comparison met a baseline stored
 * before page layouts were recorded: it still compares, but a change in it is
 * described from the pixels only.
 */
export const OLD_BASELINES_NOTICE = `Some baselines were saved before page layouts were recorded, so changes in them are described from pixels only. Run \`${UPDATE_BASELINES_COMMAND}\` to add the layouts.`;
