/** World streaming / culling (CLAUDE.md section 2). */
export const CHUNK_SIZE = 16;
/** Half diagonal of a chunk, added to the view distance when culling. */
export const CHUNK_HALF_DIAG = (CHUNK_SIZE * Math.SQRT2) / 2;
/** How often chunk visibility is re-evaluated (s). */
export const CULL_INTERVAL_S = 0.25;
