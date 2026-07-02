import {
  TableJson, Article, Hero, City, Stage, DailyQuest, StoryQuest, MallItem, PromotionalActivity, Manifest,
  Knife, RecommendHero, RelatedPartner, RelatedPartnerType, RelatedCondition, RelatedPartnerPoint,
  KnifeStrengthen, Skill, BaseStone, HomeGirlFriend, HomeGirlAward, HomeGirlInteract, HomeGirlMood,
  BaseEquip, Suit, EquipUpgrade, EquipAdditional, EquipGenerate, WakeUp, LeaderWakeUp, WakeUpEquip,
  PetLevelUp, VicePetMake, VicePetRankUp, VicePetTrain, MainPetRankUp, Achievement, AchievementTitle,
  AchievementGroup, AchievementClass, TavernGrade, TavernPayConfig, TavernWarrior, TreasureLevelup,
  TreasureUpgrade, SpiritSchool, SpiritSchoolExp, Butterfly, ButterflyFeeding, BlackMarketItem,
  Award, Enemy, EnemyArmy, ConfigValue, OrganizationBase, OrganizationAddition, OrganizationDevotion, VipConfig,
  OrnamentValue, OrnamentUpgrade, StarMap, StarPoint, TemplePoint, TempleValue, TemplePVP, TemplePliesNumber,
  Military, CullingMagic, CullingStage, EquipForging, EquipAdvancement, NightmarePoint, NightmareCity,
  SevenHeroStar, SevenHeroLittleStar, SevenHeroSoul, SevenHeroArmy, SevenHeroDailyAward,
  SoulCollectionRnd, SoulCollectionShop, SoulCollectionBase,
  BeautifulClothes, Beauty, HeroTalent, HdBigTurntable, HdJigsaw, BleachJigsaw, BuffEffect,
  OrgPointInfo, OrgPointAward, WeaponSkill
} from '../types/db';

const cache: { [key: string]: any } = {};

const withBaseUrl = (path: string) => {
  const base = import.meta.env.BASE_URL;
  // In dev, base is '/', in build for gh-pages it's '/repo-name/'
  // We need to ensure there's no double slash and the path is relative to the base
  const finalPath = `${base}${path.replace(/^\//, '')}`;
  return finalPath;
};

async function fetchWithCache<T>(url: string): Promise<T> {
  const fullUrl = withBaseUrl(url);
  if (cache[fullUrl]) {
    return cache[fullUrl];
  }
  const response = await fetch(fullUrl);
  if (!response.ok) {
    throw new Error(`Failed to load data from ${fullUrl}`);
  }
  const data = await response.json();
  cache[fullUrl] = data;
  return data;
}

export async function loadManifest(): Promise<Manifest> {
  return fetchWithCache<Manifest>('data/manifest.json');
}

export async function loadHeroes(): Promise<TableJson<Hero>> {
  return fetchWithCache<TableJson<Hero>>('data/heroes.json');
}

export async function loadArticles(): Promise<TableJson<Article>> {
  return fetchWithCache<TableJson<Article>>('data/articles.json');
}

export async function loadCities(): Promise<TableJson<City>> {
  return fetchWithCache<TableJson<City>>('data/cities.json');
}

export async function loadDailyQuests(): Promise<TableJson<DailyQuest>> {
  return fetchWithCache<TableJson<DailyQuest>>('data/daily_quests.json');
}

export async function loadStoryQuests(): Promise<TableJson<StoryQuest>> {
  return fetchWithCache<TableJson<StoryQuest>>('data/story_quests.json');
}

export async function loadMallItems(): Promise<TableJson<MallItem>> {
  return fetchWithCache<TableJson<MallItem>>('data/mall_items.json');
}

export async function loadPromotionalActivities(): Promise<TableJson<PromotionalActivity>> {
  return fetchWithCache<TableJson<PromotionalActivity>>('data/promotional_activities.json');
}

export async function loadStages(): Promise<TableJson<Stage>> {
  return fetchWithCache<TableJson<Stage>>('data/stages.json');
}

export async function loadKnives(): Promise<TableJson<Knife>> {
  return fetchWithCache<TableJson<Knife>>('data/knives.json');
}

export async function loadRecommendHeroes(): Promise<TableJson<RecommendHero>> {
  return fetchWithCache<TableJson<RecommendHero>>('data/recommend_heroes.json');
}

export async function loadRelatedPartners(): Promise<TableJson<RelatedPartner>> {
  return fetchWithCache<TableJson<RelatedPartner>>('data/related_partners.json');
}

export async function loadRelatedPartnerTypes(): Promise<TableJson<RelatedPartnerType>> {
  return fetchWithCache<TableJson<RelatedPartnerType>>('data/related_partner_types.json');
}

export async function loadRelatedConditions(): Promise<TableJson<RelatedCondition>> {
  return fetchWithCache<TableJson<RelatedCondition>>('data/related_conditions.json');
}

export async function loadRelatedPartnerPoints(): Promise<TableJson<RelatedPartnerPoint>> {
  return fetchWithCache<TableJson<RelatedPartnerPoint>>('data/related_partner_points.json');
}

export async function loadKnifeStrengthens(): Promise<TableJson<KnifeStrengthen>> {
  return fetchWithCache<TableJson<KnifeStrengthen>>('data/knife_strengthens.json');
}

export async function loadSkills(): Promise<TableJson<Skill>> {
  return fetchWithCache<TableJson<Skill>>('data/skills.json');
}

export async function loadPartnerChanges(): Promise<TableJson<any>> {
  return fetchWithCache<TableJson<any>>('data/partner_changes.json');
}

export async function loadHeroChangeAttrs(): Promise<TableJson<any>> {
  return fetchWithCache<TableJson<any>>('data/hero_change_attrs.json');
}

export async function loadKnifeExpands(): Promise<TableJson<any>> {
  return fetchWithCache<TableJson<any>>('data/knife_expands.json');
}

export async function loadBaseStones(): Promise<TableJson<BaseStone>> {
  return fetchWithCache<TableJson<BaseStone>>('data/base_stones.json');
}

export async function loadHomeGirlFriends(): Promise<TableJson<HomeGirlFriend>> {
  return fetchWithCache<TableJson<HomeGirlFriend>>('data/home_girl_friends.json');
}

export async function loadHomeGirlAwards(): Promise<TableJson<HomeGirlAward>> {
  return fetchWithCache<TableJson<HomeGirlAward>>('data/home_girl_awards.json');
}

export async function loadHomeGirlInteracts(): Promise<TableJson<HomeGirlInteract>> {
  return fetchWithCache<TableJson<HomeGirlInteract>>('data/home_girl_interacts.json');
}

export async function loadHomeGirlMoods(): Promise<TableJson<HomeGirlMood>> {
  return fetchWithCache<TableJson<HomeGirlMood>>('data/home_girl_moods.json');
}

export async function loadBaseEquips(): Promise<TableJson<BaseEquip>> {
  return fetchWithCache<TableJson<BaseEquip>>('data/base_equips.json');
}

export async function loadSuits(): Promise<TableJson<Suit>> {
  return fetchWithCache<TableJson<Suit>>('data/suits.json');
}

export async function loadEquipUpgrades(): Promise<TableJson<EquipUpgrade>> {
  return fetchWithCache<TableJson<EquipUpgrade>>('data/equip_upgrades.json');
}

export async function loadEquipAdditionals(): Promise<TableJson<EquipAdditional>> {
  return fetchWithCache<TableJson<EquipAdditional>>('data/equip_additionals.json');
}

export async function loadEquipGenerates(): Promise<TableJson<EquipGenerate>> {
  return fetchWithCache<TableJson<EquipGenerate>>('data/equip_generates.json');
}

export async function loadWakeUps(): Promise<TableJson<WakeUp>> {
  return fetchWithCache<TableJson<WakeUp>>('data/wake_ups.json');
}

export async function loadLeaderWakeUps(): Promise<TableJson<LeaderWakeUp>> {
  return fetchWithCache<TableJson<LeaderWakeUp>>('data/leader_wake_ups.json');
}

export async function loadWakeUpEquips(): Promise<TableJson<WakeUpEquip>> {
  return fetchWithCache<TableJson<WakeUpEquip>>('data/wake_up_equips.json');
}

export async function loadPetLevelUps(): Promise<TableJson<PetLevelUp>> {
  return fetchWithCache<TableJson<PetLevelUp>>('data/pet_level_ups.json');
}

export async function loadVicePetMakes(): Promise<TableJson<VicePetMake>> {
  return fetchWithCache<TableJson<VicePetMake>>('data/vice_pet_makes.json');
}

export async function loadVicePetRankUps(): Promise<TableJson<VicePetRankUp>> {
  return fetchWithCache<TableJson<VicePetRankUp>>('data/vice_pet_rank_ups.json');
}

export async function loadVicePetTrains(): Promise<TableJson<VicePetTrain>> {
  return fetchWithCache<TableJson<VicePetTrain>>('data/vice_pet_trains.json');
}

export async function loadMainPetRankUps(): Promise<TableJson<MainPetRankUp>> {
  return fetchWithCache<TableJson<MainPetRankUp>>('data/main_pet_rank_ups.json');
}

export async function loadAchievements(): Promise<TableJson<Achievement>> {
  return fetchWithCache<TableJson<Achievement>>('data/achievements.json');
}

export async function loadAchievementTitles(): Promise<TableJson<AchievementTitle>> {
  return fetchWithCache<TableJson<AchievementTitle>>('data/achievement_titles.json');
}

export async function loadAchievementGroups(): Promise<TableJson<AchievementGroup>> {
  return fetchWithCache<TableJson<AchievementGroup>>('data/achievement_groups.json');
}

export async function loadAchievementClasses(): Promise<TableJson<AchievementClass>> {
  return fetchWithCache<TableJson<AchievementClass>>('data/achievement_classes.json');
}

export async function loadTavernGrades(): Promise<TableJson<TavernGrade>> {
  return fetchWithCache<TableJson<TavernGrade>>('data/tavern_grades.json');
}

export async function loadTavernPayConfigs(): Promise<TableJson<TavernPayConfig>> {
  return fetchWithCache<TableJson<TavernPayConfig>>('data/tavern_pay_configs.json');
}

export async function loadTavernWarriors(): Promise<TableJson<TavernWarrior>> {
  return fetchWithCache<TableJson<TavernWarrior>>('data/tavern_warriors.json');
}

export async function loadTreasureLevelups(): Promise<TableJson<TreasureLevelup>> {
  return fetchWithCache<TableJson<TreasureLevelup>>('data/treasure_levelups.json');
}

export async function loadTreasureUpgrades(): Promise<TableJson<TreasureUpgrade>> {
  return fetchWithCache<TableJson<TreasureUpgrade>>('data/treasure_upgrades.json');
}

export async function loadSpiritSchools(): Promise<TableJson<SpiritSchool>> {
  return fetchWithCache<TableJson<SpiritSchool>>('data/spirit_schools.json');
}

export async function loadSpiritSchoolExps(): Promise<TableJson<SpiritSchoolExp>> {
  return fetchWithCache<TableJson<SpiritSchoolExp>>('data/spirit_school_exps.json');
}

export async function loadButterflies(): Promise<TableJson<Butterfly>> {
  return fetchWithCache<TableJson<Butterfly>>('data/butterflies.json');
}

export async function loadButterflyFeedings(): Promise<TableJson<ButterflyFeeding>> {
  return fetchWithCache<TableJson<ButterflyFeeding>>('data/butterfly_feedings.json');
}

export async function loadBlackMarketItems(): Promise<TableJson<BlackMarketItem>> {
  return fetchWithCache<TableJson<BlackMarketItem>>('data/black_market_items.json');
}

export async function loadAwards(): Promise<TableJson<Award>> {
  return fetchWithCache<TableJson<Award>>('data/awards.json');
}

export async function loadEnemies(): Promise<TableJson<Enemy>> {
  return fetchWithCache<TableJson<Enemy>>('data/enemies.json');
}

export async function loadEnemyArmies(): Promise<TableJson<EnemyArmy>> {
  return fetchWithCache<TableJson<EnemyArmy>>('data/enemy_armies.json');
}

export async function loadConfigValues(): Promise<TableJson<ConfigValue>> {
  return fetchWithCache<TableJson<ConfigValue>>('data/config_values.json');
}

export async function loadOrgBase(): Promise<TableJson<OrganizationBase>> {
  return fetchWithCache<TableJson<OrganizationBase>>('data/org_base.json');
}

export async function loadOrgAdditions(): Promise<TableJson<OrganizationAddition>> {
  return fetchWithCache<TableJson<OrganizationAddition>>('data/org_additions.json');
}

export async function loadOrgDevotions(): Promise<TableJson<OrganizationDevotion>> {
  return fetchWithCache<TableJson<OrganizationDevotion>>('data/org_devotions.json');
}

export async function loadVipConfigs(): Promise<TableJson<VipConfig>> {
  return fetchWithCache<TableJson<VipConfig>>('data/vip_configs.json');
}

export async function loadOrnamentValues(): Promise<TableJson<OrnamentValue>> {
  return fetchWithCache<TableJson<OrnamentValue>>('data/ornament_values.json');
}

export async function loadOrnamentUpgrades(): Promise<TableJson<OrnamentUpgrade>> {
  return fetchWithCache<TableJson<OrnamentUpgrade>>('data/ornament_upgrades.json');
}

export async function loadStarMaps(): Promise<TableJson<StarMap>> {
  return fetchWithCache<TableJson<StarMap>>('data/star_maps.json');
}

export async function loadStarPoints(): Promise<TableJson<StarPoint>> {
  return fetchWithCache<TableJson<StarPoint>>('data/star_points.json');
}

export async function loadTemplePoints(): Promise<TableJson<TemplePoint>> {
  return fetchWithCache<TableJson<TemplePoint>>('data/temple_points.json');
}

export async function loadTempleValues(): Promise<TableJson<TempleValue>> {
  return fetchWithCache<TableJson<TempleValue>>('data/temple_values.json');
}

export async function loadTemplePVPs(): Promise<TableJson<TemplePVP>> {
  return fetchWithCache<TableJson<TemplePVP>>('data/temple_pvps.json');
}

export async function loadTemplePlies(): Promise<TableJson<TemplePliesNumber>> {
  return fetchWithCache<TableJson<TemplePliesNumber>>('data/temple_plies.json');
}

export async function loadMilitary(): Promise<TableJson<Military>> {
  return fetchWithCache<TableJson<Military>>('data/military.json');
}

export async function loadCullingMagics(): Promise<TableJson<CullingMagic>> {
  return fetchWithCache<TableJson<CullingMagic>>('data/culling_magics.json');
}

export async function loadCullingStages(): Promise<TableJson<CullingStage>> {
  return fetchWithCache<TableJson<CullingStage>>('data/culling_stages.json');
}

export async function loadEquipForging(): Promise<TableJson<EquipForging>> {
  return fetchWithCache<TableJson<EquipForging>>('data/equip_forging.json');
}

export async function loadEquipAdvancement(): Promise<TableJson<EquipAdvancement>> {
  return fetchWithCache<TableJson<EquipAdvancement>>('data/equip_advancement.json');
}

export async function loadNightmarePoints(): Promise<TableJson<NightmarePoint>> {
  return fetchWithCache<TableJson<NightmarePoint>>('data/nightmare_points.json');
}

export async function loadNightmareCities(): Promise<TableJson<NightmareCity>> {
  return fetchWithCache<TableJson<NightmareCity>>('data/nightmare_cities.json');
}

export async function loadSevenHeroStars(): Promise<TableJson<SevenHeroStar>> {
  return fetchWithCache<TableJson<SevenHeroStar>>('data/seven_hero_stars.json');
}

export async function loadSevenHeroLittleStars(): Promise<TableJson<SevenHeroLittleStar>> {
  return fetchWithCache<TableJson<SevenHeroLittleStar>>('data/seven_hero_little_stars.json');
}

export async function loadSevenHeroSouls(): Promise<TableJson<SevenHeroSoul>> {
  return fetchWithCache<TableJson<SevenHeroSoul>>('data/seven_hero_souls.json');
}

export async function loadSevenHeroArmies(): Promise<TableJson<SevenHeroArmy>> {
  return fetchWithCache<TableJson<SevenHeroArmy>>('data/seven_hero_armies.json');
}

export async function loadSevenHeroDailyAwards(): Promise<TableJson<SevenHeroDailyAward>> {
  return fetchWithCache<TableJson<SevenHeroDailyAward>>('data/seven_hero_daily_awards.json');
}

export async function loadSoulCollectionRnds(): Promise<TableJson<SoulCollectionRnd>> {
  return fetchWithCache<TableJson<SoulCollectionRnd>>('data/soul_collection_rnds.json');
}

export async function loadSoulCollectionShops(): Promise<TableJson<SoulCollectionShop>> {
  return fetchWithCache<TableJson<SoulCollectionShop>>('data/soul_collection_shops.json');
}

export async function loadSoulCollectionBases(): Promise<TableJson<SoulCollectionBase>> {
  return fetchWithCache<TableJson<SoulCollectionBase>>('data/soul_collection_bases.json');
}

export async function loadBeautifulClothes(): Promise<TableJson<BeautifulClothes>> {
  return fetchWithCache<TableJson<BeautifulClothes>>('data/beautiful_clothes.json');
}

export async function loadBeauty(): Promise<TableJson<Beauty>> {
  return fetchWithCache<TableJson<Beauty>>('data/beauty.json');
}

export async function loadHeroTalents(): Promise<TableJson<HeroTalent>> {
  return fetchWithCache<TableJson<HeroTalent>>('data/hero_talents.json');
}

export async function loadHdBigTurntables(): Promise<TableJson<HdBigTurntable>> {
  return fetchWithCache<TableJson<HdBigTurntable>>('data/hd_big_turntables.json');
}

export async function loadHdJigsaws(): Promise<TableJson<HdJigsaw>> {
  return fetchWithCache<TableJson<HdJigsaw>>('data/hd_jigsaws.json');
}

export async function loadBleachJigsaws(): Promise<TableJson<BleachJigsaw>> {
  return fetchWithCache<TableJson<BleachJigsaw>>('data/bleach_jigsaws.json');
}

export async function loadBuffEffects(): Promise<TableJson<BuffEffect>> {
  return fetchWithCache<TableJson<BuffEffect>>('data/buff_effects.json');
}

export async function loadOrgPointInfos(): Promise<TableJson<OrgPointInfo>> {
  return fetchWithCache<TableJson<OrgPointInfo>>('data/org_point_infos.json');
}

export async function loadOrgPointAwards(): Promise<TableJson<OrgPointAward>> {
  return fetchWithCache<TableJson<OrgPointAward>>('data/org_point_awards.json');
}

export async function loadWeaponSkills(): Promise<TableJson<WeaponSkill>> {
  return fetchWithCache<TableJson<WeaponSkill>>('data/weapon_skills.json');
}




