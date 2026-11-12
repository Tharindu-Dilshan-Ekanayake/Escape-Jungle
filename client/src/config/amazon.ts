/** How much Amazon life goes round each zone and the Landing Site (world/props/amazonScatter.ts). */
export interface AmazonCounts {
  heliconia: number;
  monstera: number;
  bromeliad: number;
  pitcher: number;
  palm: number;
  pond: number;
  web: number;
  totem: number;
  snake: number;
  bones: number;
}

export const AMAZON = {
  /** Around every zone (just outside its grass, in the jungle wall band). */
  zone: { heliconia: 4, monstera: 4, bromeliad: 5, pitcher: 2, palm: 3, pond: 1, web: 1, totem: 1, snake: 1, bones: 1 } as AmazonCounts,
  /** Round the Landing Site clearing edge. */
  camp: { heliconia: 4, monstera: 4, bromeliad: 6, pitcher: 2, palm: 3, pond: 0, web: 1, totem: 0, snake: 1, bones: 1 } as AmazonCounts,
  /** Landing Site ring (m from the centre). */
  campRing: [10.5, 16] as [number, number],
};
