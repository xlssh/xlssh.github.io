export interface TableJson<T> {
  table: string;
  rowCount: number;
  generatedAt: string;
  rows: T[];
}

export interface Article {
  id: number;
  name: string | null;
  major_type: number | null;
  minor_type: number | null;
  level: number | null;
  quality: number | null;
  card_type: number | null;
  sort: number | null;
  overlay_number: number | null;
  bind_mode: number | null;
  obtain: number | null;
  function_desc: string | null;
  picture: number | null;
  expands: any | null; // JSON parsed or string
  cost_price: number | null;
  sell_price: number | null;
  item_function: number | null;
  function_value: number | null;
}

export interface Hero {
  id: number;
  is_main: boolean | number | null;
  description: string | null;
  name: string | null;
  assess: string | null;
  sex: number | null;
  level: number | null;
  need_level: number | null;
  profession: number | null;
  source: number | null;
  quality: number | null;
  power: number | null;
  agile: number | null;
  intelligence: number | null;
  life: number | null;
  speed: number | null;
  power_grow: number | null;
  agile_grow: number | null;
  intelligence_grow: number | null;
  life_grow: number | null;
  speed_grow: number | null;
  near_attack: number | null;
  near_defense: number | null;
  far_attack: number | null;
  far_defense: number | null;
  strategy_attack: number | null;
  strategy_defense: number | null;
  hit_rate: number | null;
  dodge_rate: number | null;
  crit_rate: number | null;
  block_rate: number | null;
  punch_rate: number | null;
  help_rate: number | null;
  hurt_rate: number | null;
  avoid_hurt_rate: number | null;
  wreck_rate: number | null;
  antiknock_rate: number | null;
  attach_rate: number | null;
  defense_rate: number | null;
  recover_rate: number | null;
  active: number | null;
  attack_effect: string | null;
  normal_attack: number | null;
  talent: number | null;
  sound: number | null;
  weakness: number | null;
  head_style: string | null;
  country: number | null;
  hero_soul: string | null;
  crash_jade_open_level: string | null;
  role: string | null;
}

export interface City {
  id: number;
  type: number | null;
  map_id: number | null;
  start: number | null;
  last: number | null;
  name: string | null;
  icon: number | null;
  open_level: number | null;
  pre_city: number | null;
}

export interface Stage {
  id: number;
  name: string | null;
  hard: string | null;
  desc: string | null;
  level: number | null;
  start_id: number | null;
  end_id: number | null;
  big_image: number | null;
  award_json: any | null; // JSON parsed or string
}

export interface DailyQuest {
  id: number;
  type: number | null;
  event_type: number | null;
  rewards_json: any | null; // JSON parsed or string
  small_picture: number | null;
  point: number | null;
  cancel: number | null;
  task_name: string | null;
  rate: number | null;
  isgoto: number | null;
  instant_json: any | null; // JSON parsed or string
  complete: number | null;
  description: string | null;
}

export interface StoryQuest {
  id: number;
  type: number | null;
  event_type: number | null;
  gate: number | null;
  point: number | null;
  rewards_json: any | null; // JSON parsed or string
  cancel: number | null;
  name: string | null;
  pre_task_id: number | null;
  accept: number | null;
  auto_accept: number | null;
  instant: number | null;
  complete_json: any | null; // JSON parsed or string
  content_json: any | null; // JSON parsed or string
  plot: string | null;
  description: string | null;
  guide_before: string | null;
  guide: string | null;
  guide_end: string | null;
  talk_before: string | null;
  talk_end: string | null;
  start_npc_id: number | null;
  finish_npc_id: number | null;
}

export interface MallItem {
  id: number;
  model: number | null;
  name: string | null;
  major_type: number | null;
  item_id: number | null;
  type_str: string | null;
  integration: number | null;
  level: number | null;
  is_vip: boolean | number | null;
  is_display: boolean | number | null;
  amount: number | null;
  gold: number | null;
  discount: number | null;
  hotprice: number | null;
  page: number | null;
  vip: number | null;
  is_hot: boolean | number | null;
  is_new: boolean | number | null;
  times: number | null;
  total_times: number | null;
  items_json: any | null; // JSON parsed or string
  honour: number | null;
}

export interface PromotionalActivity {
  id: number;
  act_id: number | null;
  name: string | null;
  act_type: number | null;
  time_type: number | null;
  start_time: string | null;
  end_time: string | null;
  act_icon: number | null;
  position: number | null;
  act_position: number | null;
  player_lv: number | null;
  vip_lv: number | null;
  start_time_show: number | null;
}

export interface Manifest {
  generatedAt: string;
  tables: {
    [key: string]: {
      path: string;
      rowCount: number;
    };
  };
}

export interface Knife {
  id: number;
  name: string | null;
  bind_skill_id: number | null;
  type_id: number | null;
  handbook_id: number | null;
  appraise: string | null;
  get_road: string | null;
  attack: number | null;
  defense: number | null;
  recovery: number | null;
  resistance: number | null;
  speed: number | null;
  direction: number | null;
  attribute_type: number[];
  base_value: number[];
  growth_value: number[];
  active_effects: number[];
}

export interface RecommendHero {
  id: number;
  ability: string | null;
  if_recommend: number | null;
  get_rode: string | null;
  friends: number[];
  sort_id: number | null;
}

export interface RelatedPartner {
  id: number;
  hero_id: number;
  type: number;
  connect_id: number;
  condition_point: number;
  condition_star: number;
  condition_id: number;
}

export interface RelatedPartnerTypeProperty {
  type: number;
  value: number;
  oper: number;
}

export interface RelatedPartnerType {
  id: number;
  type: number;
  name: string;
  level: number;
  material_count: number;
  properties: RelatedPartnerTypeProperty[];
}

export interface RelatedCondition {
  id: number;
  description: string;
  condition_html: string;
}

export interface RelatedPartnerPoint {
  id: number;
  name: string;
  is_boss: boolean;
  army: { army: number[] };
  battle_scene: number;
  stars: number[][];
}

export interface KnifeStrengthen {
  id: number;
  effect_ids: number[];
  heros: number[];
  attributes: { type: number; value: number; oper: number }[];
}

export interface Skill {
  id: number;
  skill_id: number;
  name: string;
  description: string;
  icon: number;
  sort_id: number;
}

export interface PartnerChange {
  id: number;
  name: string;
  effect: { addType: number; addValue: number; oper: number }[] | null;
  hero_level: number;
  rewards: { type: number; code: number; amount: number }[] | null;
  description: string;
}

export interface HeroChangeAttr {
  id: number;
  tab_index: number;
  star: number[];
  chip_id: number;
  chip_val: number;
  reborn_gold: number[];
  reset_gold: number[];
  start_time: number[];
  end_time: number[];
  is_open: boolean | number;
  city_id: number;
}

export interface KnifeExpand {
  id: number;
  relation_id: number;
  level: number;
  skill_id: number;
  turns: number[];
  effects: any | null;
  soul_level_need: number;
  quality: number;
  soul_added: number;
  added_front: { type: number; target: number; value: number }[] | null;
  added_middle: { type: number; target: number; value: number }[] | null;
  added_back: { type: number; target: number; value: number }[] | null;
  normal_exp: number;
  gold_exp: number;
  need_exp: number;
}

export interface BaseStone {
  id: number;
  add_type: number;
  add_value: number;
  next_id: number;
}

export interface HomeGirlFriend {
  id: number;
  image_id: number;
  level: number;
  name: string;
  level_up_article: { type: number; code: number; amount: number }[] | null;
  description: string;
  home_level_limit: number;
  tofu_num: number;
  tofu_cd: number;
  tofu_award: { type: number; code: number; amount: number }[] | null;
  sprite_num: number;
  normal_sprite_cost: { type: number; code: number; amount: number }[] | null;
  gold_sprite_cost: { type: number; code: number; amount: number }[] | null;
  sprite_cd: number;
}

export interface HomeGirlAward {
  id: number;
  title_level: number;
  interactive_type: number;
  cost: { type: number; code: number; amount: number }[] | null;
  get_score: number;
  award: { type: number; code: number; amount: number }[] | null;
}

export interface HomeGirlInteract {
  id: number;
  score_blank: number;
  name_title: string;
  title_color: number;
  added: number;
}

export interface HomeGirlMood {
  id: number;
  mood: number;
  normal_communicate_reward: { type: number; code: number; amount: number }[] | null;
  gold_communicate_reward: { type: number; code: number; amount: number }[] | null;
}

export interface BaseEquip {
  id: number;
  dress_profession: string;
  main_type: number[];
  main_value: number[];
  main_additional_type: number;
  max_additional_count: number;
  hole_count: number;
  suit_id: number;
  skill_revise: number;
  edge_color: number;
  flush_spirit_coefficient: number;
  drill_hole_num: number;
}

export interface Suit {
  id: number;
  name: string;
  max_count: number;
  effects: any | null;
}

export interface EquipUpgrade {
  id: number;
  got_equip_id: number;
  datum: string;
  material: number;
  quantity: number;
}

export interface EquipAdditional {
  id: number;
  equip_level: number;
  sort_number: number;
  type_effect: any | null;
  category: number;
  min_value: number;
  max_value: number;
  divisor: number;
  percentage: number;
}

export interface EquipGenerate {
  id: number;
  open_level: number;
  cost: number;
  materials: { material: number; quantity: number }[];
  datum: string;
}

export interface WakeUp {
  id: number;
  index_wakeups: number[][] | null;
}

export interface LeaderWakeUp {
  id: number;
  up_id: number;
  next_id: number;
  pos_equip: number;
  wake_stage: number;
  quality: number;
  max_str: number;
  up_level: number;
  strengthen_price: Array<{ type: number; code: number; amount: number }> | null;
  uplevel_price: Array<{ type: number; code: number; amount: number }> | null;
  equip_attr: Array<{ type: number; value: number; oper: number }> | null;
  value_str: number;
}

export interface WakeUpEquip {
  id: number;
  need_level: number;
  property_items: Array<{ type: number; value: number; oper: number }> | null;
  compose_items: Array<{ type: number; code: number; amount: number }> | null;
  cost_price: number;
  source_items: Array<{ id: number; percent: number }> | null;
}

export interface PetLevelUp {
  id: number;
  pet_id: number;
  is_max_level: number;
  level: number;
  name: string;
  star_level: number[] | null;
  attributes: number[] | null;
  grow_rates: number[] | null;
  need_exp: number;
  total_exp: number;
  quality: number;
  pet_resource_id: number;
  source_pet: number;
}

export interface VicePetMake {
  id: number;
  consume: number[] | null;
  need_silver: number;
  pathway: string;
}

export interface VicePetRankUp {
  id: number;
  next_pet_id: number;
  condition: number[] | null;
  pet_level: number;
  need_silver: number;
}

export interface VicePetTrain {
  id: number;
  need_time: number;
  silver: number;
  get_exp: number;
  need_gold: number[] | null;
  need_exp: number[] | null;
  vip_limit: number;
}

export interface MainPetRankUp {
  id: number;
  condition: number[] | null;
  add_exp: number;
  stage: number;
}

export interface Achievement {
  id: number;
  name: string;
  follow_pic: number;
  conditions_array_1: any | null;
  condition_str: string;
  reward_str: string;
  rewards: Array<{ type: number; code: number; amount: number }> | null;
  conditions_array_2: number[] | null;
  if_have_title: number;
  title_id: number;
}

export interface AchievementTitle {
  id: number;
  name: string;
  level_title: number;
  not_or_prop: number;
  title_type_group: number;
  time_limit_not: number;
  val_time_limit: number;
  formation_type: number;
  add_other_array: Array<{ type: number; value: number; oper: number }> | null;
}

export interface AchievementGroup {
  id: number;
  name: string;
  achievements_id: number[] | null;
}

export interface AchievementClass {
  id: number;
  name: string;
  achievement_groups_id: number[] | null;
}

export interface TavernGrade {
  id: number;
  level: number;
  page: number;
  wine_lvs: number[] | null;
  pay_configs: any | null;
  vips: any | null;
  preview: number;
  tips: string;
  is_tavern: number;
}

export interface TavernPayConfig {
  id: number;
  key: string;
  types: any | null;
  value: number;
  desc: string;
}

export interface TavernWarrior {
  id: number;
  grade: number;
  award_id: number;
  return_type: number;
  return_value: number;
  recruit_soul: number;
  recruit_name: string;
  win_dialogue: string;
  lose_dialogue: string;
  awardsoul: Array<{ type: number; code: number; amount: number }> | null;
}

export interface TreasureLevelup {
  id: number;
  level: number;
  need_gold: number;
  up_item: number;
  up_level: number;
}

export interface TreasureUpgrade {
  id: number;
  item_id: number;
  level: number;
  cost_item_count: number;
  add_value: number[] | null;
  cost_gold: number;
  product_count: number;
  cost_stone_count: number;
}

export interface SpiritSchool {
  id: number;
  name: string;
  level_limit: number;
  effect_name: string;
  add_type: number;
}

export interface SpiritSchoolExp {
  id: number;
  monster_id: number;
  name: string;
  effect_name: string;
  monster_level: number;
  need_exp: number;
  add_type: number;
}

export interface Butterfly {
  id: number;
  upgrade_exp: number;
  model_id: number;
}

export interface ButterflyFeeding {
  id: number;
  vip_level: number;
  powder_level: number;
  butterfly_rewards: Array<{ type: number; code: number; amount: number }> | null;
}

export interface BlackMarketItem {
  id: number;
  model: number;
  item_id: number;
  old_price: any | null;
  price: any | null;
  number: number;
  total_times: number;
}

export interface Award {
  id: number;
  fixed: Array<{ type: number; code: number; amount: number }> | null;
  rewards: Array<{ type: number; code: number; amount: number; prob?: number; isBroadcast?: number }> | null;
}

export interface Enemy {
  id: number;
  name: string;
  is_boss: boolean;
  type: number;
  profession: number;
  hero_icon: number;
  quality: number;
  level: number;
  sex: number;
  hp: number;
  speed: number;
  anger: number;
  state: number;
  attacks: any;
  defenses: any;
  rates: any;
  normal: number;
  skill: number;
  effects: string;
  talent_id: number;
  sound: number;
  skill_desc: any;
  attr_power: number;
  attack_effect: number;
}

export interface EnemyArmy {
  id: number;
  name: string;
  front: number[];
  middle: number[];
  back: number[];
  leader_id: number;
  award_id: number;
  text: string;
}

export interface ConfigValue {
  id: number;
  value: any;
  value_type: string;
}

export interface OrganizationBase {
  id: number;
  org_level: number;
  day_max_activity: number;
  guild_max_activity: number;
  org_max_number: number;
  get_more_siv: number;
  get_more_exp: number;
  camp_upgrade_money: number;
  muyebattle_upgrade_money: number;
  muyebattle_upgrade_addition: number;
  muyeguard_upgrade_money: number;
  muyeguard_upgrade_addition: number;
}

export interface OrganizationAddition {
  id: number;
  org_level: number;
  atk_addition: number;
  atk_consume: number;
  phys_def_addition: number;
  phys_def_consume: number;
  mag_def_addition: number;
  mag_def_consume: number;
  life_addition: number;
  life_consume: number;
  speed_addition: number;
  speed_consume: number;
}

export interface OrganizationDevotion {
  id: number;
  player_level: number;
  devotion_siv_max: number;
}

export interface VipConfig {
  id: number;
  charge_count: number;
  daily_ticket: number;
  free_look: number;
  block_time: number;
  stone_percent: number;
  skip_block: number;
  bag_count: number;
  action_limit: number;
  buy_action_limit: number;
  daily_single_reset: number;
  daily_cha_reset: number;
  skip_charge_fight: number;
  one_wine: number;
  one_win_wine: number;
  more_change: number;
  daily_change_num: number;
  arena_skip: number;
  one_time_pet: number;
  one_water: number;
  auto_buy_act: number;
  boss_fight_up: number;
  one_time_wash: number;
  monster_one_time: number;
  stone_one_time: number;
  digging: number;
  no_clear_time: number;
  day_buy_count: number;
  seven_hero_count: number;
  seven_hero_one_key: number;
  skip_seven_hero_fight: number;
  auto_join_activity: number;
  teamer_expand: number;
  akey_bable_tower: number;
  resources_backvip: number;
  change_hero_enter_buy: number;
  change_hero_reset: number;
  vain_travel_buy: number;
  vain_travel_free: number;
  vain_travel_relive_time: number;
  pet_interaction_count: number;
  pet_train_clear_cd: number;
  can_auto_fight: number;
  related_daily_award: number;
  lottery_recruit_num: number;
}

export interface OrnamentValue {
  id: number;
  item_id: number;
  sub_id: number;
  level: number;
  cost_items: Array<{ type: number; code: number; amount: number }>;
  add_value: number;
}

export interface OrnamentUpgrade {
  id: number;
  old_item_id: number;
  cost_items: Array<{ type: number; code: number; amount: number }>;
  new_item_id: number;
}

export interface StarMap {
  id: number;
  name: string;
  profession: number;
  quality: number;
  point_count: number;
  pic: string;
  desc: string;
  start_id: number;
}

export interface StarPoint {
  id: number;
  map_id: number;
  index: number;
  is_skill: number;
  add_type: { add: Array<{ type: number; target: number; value: number }> };
  need_fetch: number;
  name: string;
  desc: string;
  seven_star_level_limit: number;
}



