/**
 * Governance Level Colors & Ranks
 * 
 * Each governance level has a distinct color representing its rank.
 * Used for visual identification in circular councils and UI elements.
 */

export type GovernanceLevel = 
  | 'ARBAD'      // 10 people
  | 'ZUN'        // 100 people (10 Arbads)
  | 'MYANGAD'    // 1,000 people (10 Zuns)
  | 'TUMED'      // 10,000 people (10 Myangads)
  | 'REPUBLIC'   // Republic Khural
  | 'CONFEDERATION'; // Confederation Khural

export interface LevelConfig {
  name: string;
  color: string;
  glowColor: string;
  borderColor: string;
  textColor: string;
  rank: number;
  memberCount: number;
}

export const GOVERNANCE_LEVELS: Record<GovernanceLevel, LevelConfig> = {
  ARBAD: {
    name: 'Arbad',
    color: '#CD7F32',      // Bronze
    glowColor: 'rgba(205, 127, 50, 0.3)',
    borderColor: '#B87333',
    textColor: '#FFA856',
    rank: 1,
    memberCount: 10,
  },
  ZUN: {
    name: 'Zun',
    color: '#C0C0C0',      // Silver
    glowColor: 'rgba(192, 192, 192, 0.3)',
    borderColor: '#A8A8A8',
    textColor: '#E8E8E8',
    rank: 2,
    memberCount: 100,
  },
  MYANGAD: {
    name: 'Myangad',
    color: '#FFD700',      // Gold
    glowColor: 'rgba(255, 215, 0, 0.3)',
    borderColor: '#DAA520',
    textColor: '#FFF176',
    rank: 3,
    memberCount: 1000,
  },
  TUMED: {
    name: 'Tumed',
    color: '#E5E4E2',      // Platinum
    glowColor: 'rgba(229, 228, 226, 0.3)',
    borderColor: '#C9C9C9',
    textColor: '#F5F5F5',
    rank: 4,
    memberCount: 10000,
  },
  REPUBLIC: {
    name: 'Republic Khural',
    color: '#50C878',      // Emerald
    glowColor: 'rgba(80, 200, 120, 0.3)',
    borderColor: '#3DA35C',
    textColor: '#6EE7A0',
    rank: 5,
    memberCount: 0, // Variable
  },
  CONFEDERATION: {
    name: 'Confederation Khural',
    color: '#0F52BA',      // Sapphire
    glowColor: 'rgba(15, 82, 186, 0.3)',
    borderColor: '#0C3D8A',
    textColor: '#4A90E2',
    rank: 6,
    memberCount: 0, // Variable
  },
};

/**
 * Get level configuration by governance level
 */
export function getLevelConfig(level: GovernanceLevel): LevelConfig {
  return GOVERNANCE_LEVELS[level];
}

/**
 * Get CSS styles for a governance level
 */
export function getLevelStyles(level: GovernanceLevel) {
  const config = getLevelConfig(level);
  return {
    backgroundColor: config.color,
    borderColor: config.borderColor,
    color: config.textColor,
    boxShadow: `0 0 20px ${config.glowColor}`,
  };
}
