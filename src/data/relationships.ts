import { Article, Hero, City, Stage, DailyQuest, StoryQuest, MallItem } from '../types/db';

export interface RewardItem {
  type: number;
  code: number;
  amount: number;
}

export function parseRewards(rewardsJson: any): RewardItem[] {
  if (!rewardsJson) return [];
  
  // daily_quests: array of rewards
  if (Array.isArray(rewardsJson)) {
    return rewardsJson.filter(r => typeof r === 'object' && r !== null && 'type' in r && 'code' in r);
  }
  
  // story_quests: {"rewards": [...]}
  if (typeof rewardsJson === 'object' && rewardsJson !== null) {
    if (Array.isArray(rewardsJson.rewards)) {
      return rewardsJson.rewards.filter((r: any) => typeof r === 'object' && r !== null && 'type' in r && 'code' in r);
    }
    // Single reward item object inside story_quest items_json or similar
    if ('type' in rewardsJson && 'code' in rewardsJson) {
      return [rewardsJson as RewardItem];
    }
  }
  
  return [];
}

export function isArticleReference(reward: RewardItem): boolean {
  // Usually type 1 in rewards is Article (Item).
  return reward.type === 1 && typeof reward.code === 'number';
}

export function getArticleById(articles: Article[], id: number): Article | undefined {
  return articles.find(a => a.id === id);
}

export function getHeroById(heroes: Hero[], id: number): Hero | undefined {
  return heroes.find(h => h.id === id);
}

export function getCityById(cities: City[], id: number): City | undefined {
  return cities.find(c => c.id === id);
}

export function getStageById(stages: Stage[], id: number): Stage | undefined {
  return stages.find(s => s.id === id);
}

export function getDailyQuestById(quests: DailyQuest[], id: number): DailyQuest | undefined {
  return quests.find(q => q.id === id);
}

export function getStoryQuestById(quests: StoryQuest[], id: number): StoryQuest | undefined {
  return quests.find(q => q.id === id);
}

// Find what mall items sell a given article
export function getMallItemsSellingArticle(mallItems: MallItem[], articleId: number): MallItem[] {
  return mallItems.filter(item => item.item_id === articleId);
}

// Find quests that award a given article
export function getQuestsAwardingArticle(
  storyQuests: StoryQuest[],
  dailyQuests: DailyQuest[],
  articleId: number
): { story: StoryQuest[]; daily: DailyQuest[] } {
  const story = storyQuests.filter(quest => {
    const rewards = parseRewards(quest.rewards_json);
    return rewards.some(r => isArticleReference(r) && r.code === articleId);
  });
  
  const daily = dailyQuests.filter(quest => {
    const rewards = parseRewards(quest.rewards_json);
    return rewards.some(r => isArticleReference(r) && r.code === articleId);
  });
  
  return { story, daily };
}

export function getProfessionLabel(val: number | null): string {
  if (val === null) return 'Unknown';
  switch (val) {
    case 0: return 'None';
    case 1: return 'Agility';
    case 2: return 'Defending';
    case 3: return 'Intellect';
    case 4: return 'Strength';
    case 5: return 'Warlock';
    default: return `Class ${val}`;
  }
}

export function getFactionLabel(val: number | null): string {
  if (val === null || val === 0) return 'None';
  switch (val) {
    case 1: return 'Shinigami';
    case 2: return 'Quincy';
    case 3: return 'Arrancar';
    default: return `Faction ${val}`;
  }
}

export function getMajorTypeLabel(val: number | null): string {
  if (val === null) return 'Unknown';
  switch (val) {
    case 1: return 'Consumable';
    case 2: return 'Equipment';
    case 3: return 'Gem';
    case 4: return 'Treasure';
    case 5: return 'Material';
    case 6: return 'Ornament';
    case 12: return 'Title Card';
    case 13: return 'Soul Weapon';
    case 20: return 'Soul Jade';
    case 21: return 'Mod Soul Fragment';
    case 22: return 'Gikongan';
    case 23: return 'Mod Soul Pill';
    default: return `Type ${val}`;
  }
}

export function getMinorTypeLabel(major: number | null, minor: number | null): string {
  if (minor === null) return 'Unknown';
  if (major === 1) {
    switch (minor) {
      case 1: return 'Hollowfied Fragment';
      case 55: return 'Growth Fruit';
      case 70: return 'Inventory Expansion';
      case 71: return 'Cultivation Pill';
      case 72: return 'Soul Talisman';
      case 73: return 'Hōgu Enhance Talisman';
      case 74: return 'Hōgu Covert Talisman';
      case 75: return 'Spirit Soul';
      case 76: return 'Skill Scroll';
      case 77: return 'Zanpakuto Book';
      case 78: return 'Enchant Stone';
      case 79: return 'Real Estate Deed';
      case 80: return 'Silver Card';
      case 81: return 'Comrade Contract';
      case 82: return 'Elite Contract';
      case 83: return 'Shinigami Token';
      case 84: return 'Challenge Stone';
      case 90: return 'EXP Scroll';
      case 95: return 'Gift Pack';
      case 96: return 'Bond Fragment';
      case 97: return 'Resource Chest';
      case 98: return 'Level Gift Pack';
      case 99: return 'Name-changing Card';
      case 100: return 'Currency Card';
      case 101: return 'Refining Crystal';
      case 110: return 'Mod Soul Fragment';
      case 111: return 'Mod Soul Exp Card';
      case 200: return 'Seal / Tears';
      case 300: return 'Hero Card';
      case 400: return 'Maniacs Pack';
      case 500: return 'Reishi Material';
      case 999: return 'Partner Expansion / Top-up';
    }
  }
  if (major === 2) {
    switch (minor) {
      case 1: return 'Weapon';
      case 2: return 'Headgear';
      case 3: return 'Clothing';
      case 4: return 'Cloak';
      case 5: return 'Shoe';
      case 6: return 'Belt';
    }
  }
  if (major === 3) {
    switch (minor) {
      case 1: return 'Strength Spirit Stone';
      case 2: return 'Agility Spirit Stone';
      case 3: return 'Wisdom Spirit Stone';
      case 4: return 'Stamina Spirit Stone';
      case 22: return 'Hit Spirit Stone';
      case 23: return 'Dodge Spirit Stone';
      case 24: return 'Crit Spirit Stone';
      case 25: return 'Block Spirit Stone';
      case 30: return 'Break Defense Spirit Stone';
      case 31: return 'Counter Spirit Stone';
      case 104: return 'Fury Spirit Stone';
    }
  }
  if (major === 4) {
    switch (minor) {
      case 7: return 'Treasure (Power)';
      case 8: return 'Treasure (Intellect)';
      case 9: return 'Treasure (Agility)';
      case 10: return 'Treasure (Life)';
    }
  }
  if (major === 5) {
    switch (minor) {
      case 1: return 'Forge Material';
      case 2: return 'Spirit Water';
    }
  }
  if (major === 6) {
    switch (minor) {
      case 11: return 'Necklace';
      case 12: return 'Talisman';
      case 13: return 'Ring';
      case 14: return 'Earrings';
      case 15: return 'Glove';
      case 16: return 'Bangle';
      case 17: return 'Bracelet';
      case 18: return 'Anklet';
    }
  }
  if (major === 12) {
    switch (minor) {
      case 22: return 'Title Card';
    }
  }
  if (major === 13) {
    switch (minor) {
      case 1: return 'Soul Weapon';
      case 2: return 'Soul Weapon Fragment';
      case 3: return 'Hollowfied Weapon';
      case 4: return 'Hollowfied Spirit Stone';
      case 5: return 'Hollowfied Set';
    }
  }
  if (major === 20) {
    switch (minor) {
      case 1: return 'Hōgyoku';
    }
  }
  if (major === 21) {
    switch (minor) {
      case 100: return 'Mod Soul Fragment';
    }
  }
  if (major === 22) {
    switch (minor) {
      case 100: return 'Gikongan Fragment';
      case 101: return 'Gikongan';
    }
  }
  if (major === 23) {
    switch (minor) {
      case 100: return 'Mod Soul Pill';
    }
  }
  // Fallback switch
  switch (minor) {
    case 1: return 'Forge Material';
    case 2: return 'Sprite Water';
    case 22: return 'Title';
    case 70: return 'Inventory Expansion';
    case 71: return 'Psychic Reel';
    case 72: return 'Five Ghosts Treasure';
    case 73: return 'Treasure Upgrade';
    case 74: return 'Treasure Transform';
    case 75: return 'Soul Refining';
    case 77: return 'Soul Cutter Scroll';
    case 78: return 'Magic Stone';
    case 80: return 'Silver Card';
    case 90: return 'Exp Book/Reel';
    case 95: return 'Gem Chest';
    case 96: return 'Common Material';
    case 97: return 'Special Material';
    case 98: return 'Level Gift Pack';
    case 99: return 'Rename Card';
    case 100: return 'Faction Change Card';
    case 101: return 'Class Refine Item';
    case 300: return 'Hero Card';
    case 1000: return 'Recharge Card';
  }
  return `Sub-type ${minor}`;
}

export function getStagesAwardingArticle(stages: Stage[], articleId: number): Stage[] {
  return stages.filter(s => s.award_json && Array.isArray(s.award_json.award) && s.award_json.award.includes(articleId));
}

export function getAttributeName(param1: number): string {
  switch (param1) {
    case 1: return 'Strength';
    case 2: return 'Agility';
    case 3: return 'Wisdom';
    case 4: return 'Stamina';
    case 11: return 'Speed';
    case 12: return 'Strength Growth Rate';
    case 13: return 'Agility Growth Rate';
    case 14: return 'Int Growth Rate';
    case 15: return 'Stamina Growth Rate';
    case 16: return 'Physical Attack';
    case 17: return 'Physical Defense';
    case 18: return 'Ranged Attack';
    case 19: return 'Defense against Ranged';
    case 20: return 'Kido Attack';
    case 21: return 'Kido Defense';
    case 22: return 'Hit Rate';
    case 23: return 'Dodge Rate';
    case 24: return 'Crit Rate';
    case 25: return 'Block Rate';
    case 26: return 'Combo Rate';
    case 27: return 'Aid Rate';
    case 28: return 'Damage Rate';
    case 29: return 'Damage Immunity Rate';
    case 30: return 'Break Defense Rate';
    case 31: return 'Counter Rate';
    case 32: return 'Attack Rate';
    case 33: return 'Defense Rate';
    case 34: return 'Recovery Rate';
    case 35: return 'Reduce Enemy Attack';
    case 36: return 'Reduce Enemy Defense';
    case 37: return 'Silence Rate';
    case 38: return 'Anti-silence Rate';
    case 39: return 'Stun Rate';
    case 40: return 'Anti-stun Rate';
    case 41: return 'Fury Deduction Percentage';
    case 42: return 'Anti-fury-restriction Rate';
    case 43: return 'Increase Crit Damage';
    case 44: return 'Physical Damage Rate';
    case 45: return 'Physical Damage Rate';
    case 46: return 'Physical Damage Immune Rate';
    case 47: return 'Spell Immunity Rate';
    case 48: return 'Attack';
    case 49: return 'Defense';
    case 50: return 'Strength Spirit Stone Growth';
    case 51: return 'Intelligence Spirit Stone Growth';
    case 52: return 'Agility Spirit Stone Growth';
    case 53: return 'Stamina Spirit Stone Growth';
    case 101: return 'Max HP';
    case 102: return 'Current HP';
    case 103: return 'Max Fury';
    case 104: return 'Current Fury';
    case 105: return 'Status / Control Immunity';
    case 199: return 'Partner Speed Boost';
    case 200: return 'Starting Skill';
    case 201: return 'Passive Skill';
    case 202: return 'Skill after Death';
    case 203: return 'Halo';
    case 204: return 'Round End Buff';
    case 901: return 'Hit';
    case 902: return 'Dodge';
    case 903: return 'Crit Hit';
    case 904: return 'Block';
    case 905: return 'Combo';
    case 906: return 'Aid';
    case 907: return 'Damage';
    case 908: return 'Damage Immune';
    case 909: return 'Break Defense';
    case 910: return 'Counter';
    case 911: return 'Attack';
    case 912: return 'Defense';
    case 913: return 'Recovery';
    case 914: return 'HP';
    default: return `Attribute #${param1}`;
  }
}

