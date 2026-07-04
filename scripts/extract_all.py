#!/usr/bin/env python3
"""
Consolidated extractor for all game database tables.
Reads 0F000000.binPackage, 0F000001.binPackage, and 01000005.bin,
extracts all bin tables and generates manifest.json.

Usage:
    python extract_all.py
"""

import struct
import zlib
import json
import os
import sys
import subprocess
import re
from datetime import datetime


# ─── Shared Utilities ────────────────────────────────────────────────────────

class BinReader:
    def __init__(self, data):
        self.data = data
        self.pos = 0

    def read_int(self):
        val = struct.unpack_from("<i", self.data, self.pos)[0]
        self.pos += 4
        return val

    def read_uint(self):
        val = struct.unpack_from("<I", self.data, self.pos)[0]
        self.pos += 4
        return val

    def read_float(self):
        val = struct.unpack_from("<f", self.data, self.pos)[0]
        self.pos += 4
        return val

    def read_double(self):
        val = struct.unpack_from("<d", self.data, self.pos)[0]
        self.pos += 8
        return val

    def read_ushort(self):
        val = struct.unpack_from("<H", self.data, self.pos)[0]
        self.pos += 2
        return val

    def read_utf(self):
        if self.pos + 2 > len(self.data):
            return ""
        length = self.read_ushort()
        if self.pos + length > len(self.data):
            return ""
        val = self.data[self.pos:self.pos+length].decode("utf-8", errors="ignore")
        self.pos += length
        return val

    def bytes_left(self):
        return len(self.data) - self.pos


def try_json_load(val):
    if not val or not isinstance(val, str):
        return val
    stripped = val.strip()
    if (stripped.startswith('[') and stripped.endswith(']')) or \
       (stripped.startswith('{') and stripped.endswith('}')):
        try:
            return json.loads(stripped)
        except Exception:
            return val
    return val


def scan_package(file_path):
    if not os.path.exists(file_path):
        return {}
    with open(file_path, "rb") as f:
        data = f.read()
    package_id, bin_count = struct.unpack_from("<IH", data, 0)
    offset = 6
    bins = {}
    for _ in range(bin_count):
        if offset + 4 > len(data):
            break
        bin_len = struct.unpack_from("<I", data, offset)[0]
        offset += 4
        if offset + bin_len > len(data):
            break
        bin_bytes = data[offset:offset+bin_len]
        offset += bin_len
        try:
            decomp = zlib.decompress(bin_bytes)
            res_id = struct.unpack_from("<I", decomp, 0)[0]
            bins[res_id] = decomp
        except Exception:
            pass
    return bins


def write_json(out_dir, table_name, rows, generated_at=None):
    os.makedirs(out_dir, exist_ok=True)
    data = {
        "table": table_name,
        "rowCount": len(rows),
        "rows": rows
    }
    if generated_at:
        data["generatedAt"] = generated_at
    out_path = os.path.join(out_dir, f"{table_name}.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=True)
    print(f"  Exported {table_name}: {len(rows)} rows")
    return len(rows)


# ─── RESOURCEID mapping (CONST_DATEBASEVO.as) ──────────────────────────────

RESOURCEID_Base = 16777216

# Resource IDs mapped to (table_name, field_list_func)
# field_list_func takes BinReader and returns a dict for one row

RESOURCES = {
    # Bonds & Partners
    16777468: "related_partners",
    16777469: "related_partner_types",
    16777470: "related_conditions",
    16777471: "related_partner_points",
    16777485: "knife_strengthens",
    16777279: "skills",

    # Zanpakuto
    16777296: "knives",
    16777297: "knife_expands",
    16777298: "recommend_heroes",

    # Partner Changes
    16777417: "partner_changes",
    16777420: "hero_change_attrs",

    # Campaign & System
    16777239: "enemy_armies",
    16777238: "enemies",
    16777219: "awards",
    16777232: "config_values",
    16777258: "org_base",
    16777257: "org_additions",
    16777259: "org_devotions",
    16777292: "vip_configs",

    # Equipment & Items
    16777220: "base_equips",
    16777283: "suits",
    16777242: "equip_upgrades",
    16777240: "equip_additionals",
    16777241: "equip_generates",

    # Wake Up
    16777460: "wake_ups",
    16777487: "leader_wake_ups",
    16777459: "wake_up_equips",

    # Pets
    16777424: "pet_level_ups",
    16777425: "vice_pet_makes",
    16777426: "vice_pet_rank_ups",
    16777427: "vice_pet_trains",
    16777422: "main_pet_rank_ups",

    # Achievements
    16777355: "achievements",
    16777358: "achievement_titles",
    16777356: "achievement_groups",
    16777357: "achievement_classes",

    # Tavern
    16777287: "tavern_grades",
    16777288: "tavern_pay_configs",
    16777289: "tavern_warriors",

    # Treasure
    16777290: "treasure_levelups",
    16777291: "treasure_upgrades",

    # Spirit Schools
    16777410: "spirit_schools",
    16777411: "spirit_school_exps",

    # Butterflies
    16777303: "butterflies",
    16777304: "butterfly_feedings",

    # Black Market
    16777419: "black_market_items",

    # Build
    16777227: "build_values",
    16777226: "build_consumes",

    # Base Stones
    16777223: "base_stones",

    # Home Girls
    16777305: "home_girl_friends",
    16777306: "home_girl_awards",
    16777307: "home_girl_interacts",
    16777314: "home_girl_moods",

    # Seven Heroes
    16777317: "seven_hero_stars",
    16777316: "seven_hero_little_stars",
    16777320: "seven_hero_souls",
    16777318: "seven_hero_armies",
    16777319: "seven_hero_daily_awards",

    # Soul Collection
    16777509: "soul_collection_rnds",
    16777510: "soul_collection_shops",
    16777511: "soul_collection_bases",

    # Final Systems
    16777251: "military",
    16777558: "culling_magics",
    16777559: "culling_stages",
    16777531: "equip_forging",
    16777532: "equip_advancement",
    16777481: "nightmare_points",
    16777483: "nightmare_cities",

    # Astrology
    16777280: "star_maps",
    16777281: "star_points",

    # Ornaments
    16777370: "ornament_values",
    16777371: "ornament_upgrades",

    # Temple / Shrine
    16777391: "temple_points",
    16777393: "temple_values",
    16777392: "temple_pvps",
    16777254: "temple_plies",

    # Weapon Skills
    16777295: "weapon_skills",

    # Org Points
    16777440: "org_point_infos",
    16777464: "org_point_awards",

    # Next Features
    16777376: "beautiful_clothes",
    16777375: "beauty",
    16777247: "hero_talents",
    16777400: "hd_big_turntables",
    16777398: "hd_jigsaws",
    16777413: "bleach_jigsaws",
    16777225: "buff_effects",

    # Missing catalogs extras
    16777395: "tgspvp_reward",
    16777394: "tgspvpdailyaward",
    16777435: "ttimehero",
    16777284: "tsystemlanguage",
    16777431: "tfighterdetail",
    16777557: "profession_refines",
}


# ─── Row parsers for each table ─────────────────────────────────────────────

def parse_row(reader, table_name):
    """Parse one row from a bin resource based on table name."""
    row_id = reader.read_uint()

    if table_name == "related_partners":
        return {
            "id": row_id,
            "hero_id": reader.read_uint(),
            "type": reader.read_uint(),
            "connect_id": reader.read_uint(),
            "condition_point": reader.read_uint(),
            "condition_star": reader.read_uint(),
            "condition_id": reader.read_uint()
        }

    elif table_name == "related_partner_types":
        return {
            "id": row_id,
            "type": reader.read_uint(),
            "name": reader.read_utf(),
            "level": reader.read_uint(),
            "material_count": reader.read_uint(),
            "properties": try_json_load(reader.read_utf())
        }

    elif table_name == "related_conditions":
        return {
            "id": row_id,
            "description": reader.read_utf(),
            "condition_html": reader.read_utf()
        }

    elif table_name == "related_partner_points":
        name = reader.read_utf()
        is_boss = reader.read_uint() == 1
        army = try_json_load(reader.read_utf())
        battle_scene = reader.read_uint()
        stars = [try_json_load(reader.read_utf()) for _ in range(3)]
        return {
            "id": row_id,
            "name": name,
            "is_boss": is_boss,
            "army": army,
            "battle_scene": battle_scene,
            "stars": stars
        }

    elif table_name == "knife_strengthens":
        return {
            "id": row_id,
            "effect_ids": try_json_load(reader.read_utf()),
            "heros": try_json_load(reader.read_utf()),
            "attributes": try_json_load(reader.read_utf())
        }

    elif table_name == "skills":
        return {
            "id": row_id,
            "skill_id": reader.read_uint(),
            "name": reader.read_utf(),
            "description": reader.read_utf(),
            "icon": reader.read_uint(),
            "sort_id": reader.read_uint()
        }

    elif table_name == "knives":
        return {
            "id": row_id,
            "name": reader.read_utf(),
            "bind_skill_id": reader.read_int(),
            "type_id": reader.read_int(),
            "handbook_id": reader.read_uint(),
            "appraise": reader.read_utf(),
            "get_road": reader.read_utf(),
            "attack": reader.read_int(),
            "defense": reader.read_int(),
            "recovery": reader.read_int(),
            "resistance": reader.read_int(),
            "speed": reader.read_int(),
            "direction": reader.read_int(),
            "attribute_type": try_json_load(reader.read_utf()),
            "base_value": try_json_load(reader.read_utf()),
            "growth_value": try_json_load(reader.read_utf()),
            "active_effects": try_json_load(reader.read_utf())
        }

    elif table_name == "knife_expands":
        return {
            "id": row_id,
            "relation_id": reader.read_uint(),
            "level": reader.read_int(),
            "skill_id": reader.read_int(),
            "turns": try_json_load(reader.read_utf()),
            "effects": try_json_load(reader.read_utf()),
            "soul_level_need": reader.read_int(),
            "quality": reader.read_int(),
            "soul_added": reader.read_int(),
            "added_front": try_json_load(reader.read_utf()),
            "added_middle": try_json_load(reader.read_utf()),
            "added_back": try_json_load(reader.read_utf()),
            "normal_exp": reader.read_uint(),
            "gold_exp": reader.read_uint(),
            "need_exp": reader.read_uint()
        }

    elif table_name == "recommend_heroes":
        return {
            "id": row_id,
            "ability": reader.read_utf(),
            "if_recommend": reader.read_int(),
            "get_rode": reader.read_utf(),
            "friends": try_json_load(reader.read_utf()),
            "sort_id": reader.read_int()
        }

    elif table_name == "partner_changes":
        return {
            "id": row_id,
            "name": reader.read_utf(),
            "effect": try_json_load(reader.read_utf()),
            "hero_level": reader.read_uint(),
            "rewards": try_json_load(reader.read_utf()),
            "description": reader.read_utf()
        }

    elif table_name == "hero_change_attrs":
        return {
            "id": row_id,
            "tab_index": reader.read_int(),
            "star": try_json_load(reader.read_utf()),
            "chip_id": reader.read_int(),
            "chip_val": reader.read_int(),
            "reborn_gold": try_json_load(reader.read_utf()),
            "reset_gold": try_json_load(reader.read_utf()),
            "start_time": try_json_load(reader.read_utf()),
            "end_time": try_json_load(reader.read_utf()),
            "is_open": reader.read_int(),
            "city_id": reader.read_int()
        }

    elif table_name == "enemy_armies":
        name = reader.read_utf()
        front = try_json_load(reader.read_utf())
        front_lvs = front.get("front", []) if isinstance(front, dict) else (front if isinstance(front, list) else [])
        middle = try_json_load(reader.read_utf())
        middle_lvs = middle.get("middle", []) if isinstance(middle, dict) else (middle if isinstance(middle, list) else [])
        back = try_json_load(reader.read_utf())
        back_lvs = back.get("back", []) if isinstance(back, dict) else (back if isinstance(back, list) else [])
        return {
            "id": row_id,
            "name": name,
            "front": front_lvs,
            "middle": middle_lvs,
            "back": back_lvs,
            "leader_id": reader.read_uint(),
            "award_id": reader.read_uint(),
            "text": reader.read_utf()
        }

    elif table_name == "enemies":
        return {
            "id": row_id,
            "name": reader.read_utf(),
            "is_boss": reader.read_int() != 0,
            "type": reader.read_uint(),
            "profession": reader.read_uint(),
            "hero_icon": reader.read_uint(),
            "quality": reader.read_uint(),
            "level": reader.read_uint(),
            "sex": reader.read_uint(),
            "hp": reader.read_uint(),
            "speed": reader.read_uint(),
            "anger": reader.read_uint(),
            "state": reader.read_uint(),
            "attacks": try_json_load(reader.read_utf()),
            "defenses": try_json_load(reader.read_utf()),
            "rates": try_json_load(reader.read_utf()),
            "normal": reader.read_uint(),
            "skill": reader.read_uint(),
            "effects": reader.read_utf(),
            "talent_id": reader.read_uint(),
            "sound": reader.read_uint(),
            "skill_desc": try_json_load(reader.read_utf()) or [],
            "attr_power": reader.read_uint(),
            "attack_effect": reader.read_uint()
        }

    elif table_name == "awards":
        fixed_raw = try_json_load(reader.read_utf())
        fixed = fixed_raw.get("fixed", []) if isinstance(fixed_raw, dict) else (fixed_raw or [])
        random_raw = try_json_load(reader.read_utf())
        random = random_raw.get("rewards", []) if isinstance(random_raw, dict) else (random_raw or [])
        return {
            "id": row_id,
            "fixed": fixed,
            "rewards": random
        }

    elif table_name == "config_values":
        val = reader.read_utf()
        val_type = reader.read_utf()
        is_client = reader.read_int() != 0
        if is_client:
            parsed = try_json_load(val)
            # Parse plain numbers
            if isinstance(parsed, str):
                try:
                    parsed = int(parsed)
                except ValueError:
                    try:
                        parsed = float(parsed)
                    except ValueError:
                        pass
            return {"id": row_id, "value": parsed, "value_type": val_type}
        return None  # Skip non-client values

    elif table_name == "org_base":
        return {
            "id": row_id,
            "org_level": reader.read_uint(),
            "day_max_activity": reader.read_uint(),
            "guild_max_activity": reader.read_uint(),
            "org_max_number": reader.read_uint(),
            "get_more_siv": reader.read_uint(),
            "get_more_exp": reader.read_uint(),
            "camp_upgrade_money": reader.read_uint(),
            "muyebattle_upgrade_money": reader.read_uint(),
            "muyebattle_upgrade_addition": reader.read_uint(),
            "muyeguard_upgrade_money": reader.read_uint(),
            "muyeguard_upgrade_addition": reader.read_uint()
        }

    elif table_name == "org_additions":
        return {
            "id": row_id,
            "org_level": reader.read_uint(),
            "atk_addition": reader.read_uint(),
            "atk_consume": reader.read_uint(),
            "phys_def_addition": reader.read_uint(),
            "phys_def_consume": reader.read_uint(),
            "mag_def_addition": reader.read_uint(),
            "mag_def_consume": reader.read_uint(),
            "life_addition": reader.read_uint(),
            "life_consume": reader.read_uint(),
            "speed_addition": reader.read_uint(),
            "speed_consume": reader.read_uint()
        }

    elif table_name == "org_devotions":
        return {
            "id": row_id,
            "player_level": reader.read_uint(),
            "devotion_siv_max": reader.read_uint()
        }

    elif table_name == "vip_configs":
        return {
            "id": row_id,
            "charge_count": reader.read_uint(),
            "daily_ticket": reader.read_uint(),
            "free_look": reader.read_uint(),
            "block_time": reader.read_uint(),
            "stone_percent": reader.read_uint(),
            "skip_block": reader.read_uint(),
            "bag_count": reader.read_uint(),
            "action_limit": reader.read_uint(),
            "buy_action_limit": reader.read_uint(),
            "daily_single_reset": reader.read_uint(),
            "daily_cha_reset": reader.read_uint(),
            "skip_charge_fight": reader.read_uint(),
            "one_wine": reader.read_uint(),
            "one_win_wine": reader.read_uint(),
            "more_change": reader.read_uint(),
            "daily_change_num": reader.read_uint(),
            "arena_skip": reader.read_uint(),
            "one_time_pet": reader.read_uint(),
            "one_water": reader.read_uint(),
            "auto_buy_act": reader.read_uint(),
            "boss_fight_up": reader.read_uint(),
            "one_time_wash": reader.read_uint(),
            "monster_one_time": reader.read_uint(),
            "stone_one_time": reader.read_uint(),
            "digging": reader.read_uint(),
            "no_clear_time": reader.read_uint(),
            "day_buy_count": reader.read_uint(),
            "seven_hero_count": reader.read_uint(),
            "seven_hero_one_key": reader.read_uint(),
            "skip_seven_hero_fight": reader.read_uint(),
            "auto_join_activity": reader.read_uint(),
            "teamer_expand": reader.read_uint(),
            "akey_bable_tower": reader.read_uint(),
            "resources_backvip": reader.read_uint(),
            "change_hero_enter_buy": reader.read_uint(),
            "change_hero_reset": reader.read_uint(),
            "vain_travel_buy": reader.read_int(),
            "vain_travel_free": reader.read_int(),
            "vain_travel_relive_time": reader.read_int(),
            "pet_interaction_count": reader.read_uint(),
            "pet_train_clear_cd": reader.read_uint(),
            "can_auto_fight": reader.read_int(),
            "related_daily_award": reader.read_uint(),
            "lottery_recruit_num": reader.read_uint()
        }

    elif table_name == "base_equips":
        dress_profession = reader.read_utf()
        main_type = try_json_load(reader.read_utf())
        main_value = try_json_load(reader.read_utf())
        main_additional_type = reader.read_uint()
        max_additional_count = reader.read_int()
        hole_count = reader.read_int()
        suit_id = reader.read_uint()
        skill_revise = reader.read_uint()
        edge_color = reader.read_uint()
        flush_coeff = reader.read_float()
        drill_hole_num = reader.read_uint()
        return {
            "id": row_id,
            "dress_profession": dress_profession,
            "main_type": main_type,
            "main_value": main_value,
            "main_additional_type": main_additional_type,
            "max_additional_count": max_additional_count,
            "hole_count": hole_count,
            "suit_id": suit_id,
            "skill_revise": skill_revise,
            "edge_color": edge_color,
            "flush_spirit_coefficient": round(flush_coeff, 4),
            "drill_hole_num": drill_hole_num
        }

    elif table_name == "suits":
        return {
            "id": row_id,
            "name": reader.read_utf(),
            "max_count": reader.read_uint(),
            "effects": try_json_load(reader.read_utf())
        }

    elif table_name == "equip_upgrades":
        got_equip_id = reader.read_uint()
        datum = reader.read_utf()
        parts = datum.split("_") if datum else []
        material = int(parts[0]) if len(parts) > 0 and parts[0].isdigit() else 0
        quantity = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 0
        return {
            "id": row_id,
            "got_equip_id": got_equip_id,
            "datum": datum,
            "material": material,
            "quantity": quantity
        }

    elif table_name == "equip_additionals":
        equip_level = reader.read_uint()
        sort_number = reader.read_uint()
        type_effect = try_json_load(reader.read_utf())
        category, divisor, percentage, max_value, min_value = 0, 0, 0, 0, 0
        if isinstance(type_effect, dict) and "typeEffect" in type_effect:
            parts = str(type_effect["typeEffect"]).split("_")
            if len(parts) >= 5:
                category = int(parts[0]) if parts[0].isdigit() else 0
                min_value = int(parts[1]) if parts[1].isdigit() else 0
                max_value = int(parts[2]) if parts[2].isdigit() else 0
                divisor = int(parts[3]) if parts[3].isdigit() else 0
                percentage = int(parts[4]) if parts[4].isdigit() else 0
        return {
            "id": row_id,
            "equip_level": equip_level,
            "sort_number": sort_number,
            "type_effect": type_effect,
            "category": category,
            "min_value": min_value,
            "max_value": max_value,
            "divisor": divisor,
            "percentage": percentage
        }

    elif table_name == "equip_generates":
        open_level = reader.read_uint()
        cost = reader.read_uint()
        datum = reader.read_utf()
        materials = []
        if datum:
            for part in datum.split("|"):
                sub = part.split("_")
                if len(sub) == 2:
                    materials.append({"material": int(sub[0]), "quantity": int(sub[1])})
        return {
            "id": row_id,
            "open_level": open_level,
            "cost": cost,
            "materials": materials,
            "datum": datum
        }

    elif table_name == "wake_ups":
        return {
            "id": row_id,
            "index_wakeups": try_json_load(reader.read_utf())
        }

    elif table_name == "leader_wake_ups":
        return {
            "id": row_id,
            "up_id": reader.read_uint(),
            "next_id": reader.read_uint(),
            "pos_equip": reader.read_uint(),
            "wake_stage": reader.read_uint(),
            "quality": reader.read_uint(),
            "max_str": reader.read_uint(),
            "up_level": reader.read_uint(),
            "strengthen_price": try_json_load(reader.read_utf()),
            "uplevel_price": try_json_load(reader.read_utf()),
            "equip_attr": try_json_load(reader.read_utf()),
            "value_str": reader.read_uint()
        }

    elif table_name == "wake_up_equips":
        return {
            "id": row_id,
            "need_level": reader.read_int(),
            "property_items": try_json_load(reader.read_utf()),
            "compose_items": try_json_load(reader.read_utf()),
            "cost_price": reader.read_int(),
            "source_items": try_json_load(reader.read_utf())
        }

    elif table_name == "pet_level_ups":
        return {
            "id": row_id,
            "pet_id": reader.read_uint(),
            "is_max_level": reader.read_uint(),
            "level": reader.read_uint(),
            "name": reader.read_utf(),
            "star_level": try_json_load(reader.read_utf()),
            "attributes": try_json_load(reader.read_utf()),
            "grow_rates": try_json_load(reader.read_utf()),
            "need_exp": reader.read_uint(),
            "total_exp": reader.read_uint(),
            "quality": reader.read_uint(),
            "pet_resource_id": reader.read_uint(),
            "source_pet": reader.read_uint()
        }

    elif table_name == "vice_pet_makes":
        return {
            "id": row_id,
            "consume": try_json_load(reader.read_utf()),
            "need_silver": reader.read_uint(),
            "pathway": reader.read_utf()
        }

    elif table_name == "vice_pet_rank_ups":
        return {
            "id": row_id,
            "next_pet_id": reader.read_uint(),
            "condition": try_json_load(reader.read_utf()),
            "pet_level": reader.read_uint(),
            "need_silver": reader.read_uint()
        }

    elif table_name == "vice_pet_trains":
        return {
            "id": row_id,
            "need_time": reader.read_uint(),
            "silver": reader.read_uint(),
            "get_exp": reader.read_uint(),
            "need_gold": try_json_load(reader.read_utf()),
            "need_exp": try_json_load(reader.read_utf()),
            "vip_limit": reader.read_uint()
        }

    elif table_name == "main_pet_rank_ups":
        return {
            "id": row_id,
            "condition": try_json_load(reader.read_utf()),
            "add_exp": reader.read_uint(),
            "stage": reader.read_uint()
        }

    elif table_name == "achievements":
        return {
            "id": row_id,
            "name": reader.read_utf(),
            "follow_pic": reader.read_uint(),
            "conditions_array_1": try_json_load(reader.read_utf()),
            "condition_str": reader.read_utf(),
            "reward_str": reader.read_utf(),
            "rewards": try_json_load(reader.read_utf()),
            "conditions_array_2": try_json_load(reader.read_utf()),
            "if_have_title": reader.read_int(),
            "title_id": reader.read_int()
        }

    elif table_name == "achievement_titles":
        return {
            "id": row_id,
            "name": reader.read_utf(),
            "level_title": reader.read_int(),
            "not_or_prop": reader.read_int(),
            "title_type_group": reader.read_int(),
            "time_limit_not": reader.read_int(),
            "val_time_limit": reader.read_int(),
            "formation_type": reader.read_int(),
            "add_other_array": try_json_load(reader.read_utf())
        }

    elif table_name == "achievement_groups":
        return {
            "id": row_id,
            "name": reader.read_utf(),
            "achievements_id": try_json_load(reader.read_utf())
        }

    elif table_name == "achievement_classes":
        return {
            "id": row_id,
            "name": reader.read_utf(),
            "achievement_groups_id": try_json_load(reader.read_utf())
        }

    elif table_name == "tavern_grades":
        level = reader.read_uint()
        page = reader.read_uint()
        wine_raw = try_json_load(reader.read_utf())
        wine_lvs = wine_raw.get("wineLv", []) if isinstance(wine_raw, dict) else wine_raw
        pay_configs = try_json_load(reader.read_utf())
        vips = try_json_load(reader.read_utf())
        preview = reader.read_uint()
        tips = reader.read_utf()
        is_tavern = reader.read_uint()
        return {
            "id": row_id,
            "level": level,
            "page": page,
            "wine_lvs": wine_lvs,
            "pay_configs": pay_configs,
            "vips": vips,
            "preview": preview,
            "tips": tips,
            "is_tavern": is_tavern
        }

    elif table_name == "tavern_pay_configs":
        return {
            "id": row_id,
            "key": reader.read_utf(),
            "types": try_json_load(reader.read_utf()),
            "value": reader.read_uint(),
            "desc": reader.read_utf()
        }

    elif table_name == "tavern_warriors":
        return {
            "id": row_id,
            "grade": reader.read_uint(),
            "award_id": reader.read_uint(),
            "return_type": reader.read_uint(),
            "return_value": reader.read_uint(),
            "recruit_soul": reader.read_uint(),
            "recruit_name": reader.read_utf(),
            "win_dialogue": reader.read_utf(),
            "lose_dialogue": reader.read_utf(),
            "awardsoul": try_json_load(reader.read_utf())
        }

    elif table_name == "treasure_levelups":
        return {
            "id": row_id,
            "level": reader.read_uint(),
            "need_gold": reader.read_uint(),
            "up_item": reader.read_uint(),
            "up_level": reader.read_uint()
        }

    elif table_name == "treasure_upgrades":
        return {
            "id": row_id,
            "item_id": reader.read_uint(),
            "level": reader.read_uint(),
            "cost_item_count": reader.read_uint(),
            "add_value": try_json_load(reader.read_utf()),
            "cost_gold": reader.read_uint(),
            "product_count": reader.read_uint(),
            "cost_stone_count": reader.read_uint()
        }

    elif table_name == "spirit_schools":
        return {
            "id": row_id,
            "name": reader.read_utf(),
            "level_limit": reader.read_uint(),
            "effect_name": reader.read_utf(),
            "add_type": reader.read_uint()
        }

    elif table_name == "spirit_school_exps":
        monster_id = reader.read_uint()
        name = reader.read_utf()
        effect_name = reader.read_utf()
        monster_level = reader.read_uint()
        need_exp = reader.read_uint()
        add_raw = try_json_load(reader.read_utf())
        add_type = add_raw.get("addValue", 0) if isinstance(add_raw, dict) else add_raw
        return {
            "id": row_id,
            "monster_id": monster_id,
            "name": name,
            "effect_name": effect_name,
            "monster_level": monster_level,
            "need_exp": need_exp,
            "add_type": add_type
        }

    elif table_name == "butterflies":
        return {
            "id": row_id,
            "upgrade_exp": reader.read_uint(),
            "model_id": reader.read_uint()
        }

    elif table_name == "butterfly_feedings":
        return {
            "id": row_id,
            "vip_level": reader.read_uint(),
            "powder_level": reader.read_uint(),
            "butterfly_rewards": try_json_load(reader.read_utf())
        }

    elif table_name == "black_market_items":
        return {
            "id": row_id,
            "model": reader.read_int(),
            "item_id": reader.read_int(),
            "old_price": try_json_load(reader.read_utf()),
            "price": try_json_load(reader.read_utf()),
            "number": reader.read_int(),
            "total_times": reader.read_int()
        }

    elif table_name == "build_values":
        return {
            "id": row_id,
            "build_level": reader.read_uint(),
            "quality": reader.read_uint(),
            "equip_type": reader.read_uint(),
            "value": reader.read_uint(),
            "add_value": reader.read_uint()
        }

    elif table_name == "build_consumes":
        return {
            "id": row_id,
            "consume": reader.read_uint()
        }

    elif table_name == "base_stones":
        return {
            "id": row_id,
            "add_type": reader.read_uint(),
            "add_value": reader.read_double(),
            "next_id": reader.read_uint()
        }

    elif table_name == "home_girl_friends":
        image_id = reader.read_uint()
        level = reader.read_int()
        name = reader.read_utf()
        level_up_article = try_json_load(reader.read_utf())
        description = reader.read_utf()
        home_level_limit = reader.read_int()
        tofu_num = reader.read_int()
        tofu_cd = reader.read_int()
        tofu_award = try_json_load(reader.read_utf())
        sprite_num = reader.read_int()
        normal_sprite_cost = try_json_load(reader.read_utf())
        gold_sprite_cost = try_json_load(reader.read_utf())
        sprite_cd = reader.read_int()
        return {
            "id": row_id,
            "image_id": image_id,
            "level": level,
            "name": name,
            "level_up_article": level_up_article,
            "description": description,
            "home_level_limit": home_level_limit,
            "tofu_num": tofu_num,
            "tofu_cd": tofu_cd,
            "tofu_award": tofu_award,
            "sprite_num": sprite_num,
            "normal_sprite_cost": normal_sprite_cost,
            "gold_sprite_cost": gold_sprite_cost,
            "sprite_cd": sprite_cd
        }

    elif table_name == "home_girl_awards":
        return {
            "id": row_id,
            "title_level": reader.read_int(),
            "interactive_type": reader.read_int(),
            "cost": try_json_load(reader.read_utf()),
            "get_score": reader.read_int(),
            "award": try_json_load(reader.read_utf())
        }

    elif table_name == "home_girl_interacts":
        return {
            "id": row_id,
            "score_blank": reader.read_int(),
            "name_title": reader.read_utf(),
            "title_color": reader.read_int(),
            "added": reader.read_float()
        }

    elif table_name == "home_girl_moods":
        return {
            "id": row_id,
            "mood": reader.read_int(),
            "normal_communicate_reward": try_json_load(reader.read_utf()),
            "gold_communicate_reward": try_json_load(reader.read_utf())
        }

    elif table_name == "seven_hero_stars":
        return {
            "id": row_id,
            "position": reader.read_uint(),
            "seven_hero_id": reader.read_uint(),
            "hero_name": reader.read_utf(),
            "desc": reader.read_utf(),
            "final_star_name": reader.read_utf(),
            "add_values": try_json_load(reader.read_utf())
        }

    elif table_name == "seven_hero_little_stars":
        return {
            "id": row_id,
            "big_star": reader.read_uint(),
            "sort": reader.read_uint(),
            "pre_little_star": reader.read_int(),
            "is_last": reader.read_uint(),
            "cost_soul_id": reader.read_uint(),
            "cost_soul": reader.read_uint(),
            "add_values": try_json_load(reader.read_utf()),
            "little_star_name": reader.read_utf()
        }

    elif table_name == "seven_hero_souls":
        return {
            "id": row_id,
            "hero_id": reader.read_uint(),
            "soul_tips": reader.read_utf(),
            "name": reader.read_utf(),
            "color": reader.read_utf()
        }

    elif table_name == "seven_hero_armies":
        return {
            "id": row_id,
            "name": reader.read_utf(),
            "seven_hero": reader.read_uint(),
            "pre_point": reader.read_int(),
            "is_seven_hero": reader.read_uint(),
            "open_level": reader.read_uint(),
            "limit_level": reader.read_uint(),
            "sort_number": reader.read_uint(),
            "one_win_buff": reader.read_utf(),
            "one_fail_buff": reader.read_utf(),
            "many_win_reward": try_json_load(reader.read_utf()),
            "image": reader.read_uint(),
            "model": reader.read_uint()
        }

    elif table_name == "seven_hero_daily_awards":
        return {
            "id": row_id,
            "name": reader.read_utf(),
            "free_count": reader.read_uint(),
            "rewards": try_json_load(reader.read_utf()),
            "cost": try_json_load(reader.read_utf()),
            "crit": reader.read_utf(),
            "starame": reader.read_utf(),
            "tips": reader.read_utf()
        }

    elif table_name == "soul_collection_rnds":
        return {
            "id": row_id,
            "type": reader.read_uint(),
            "reward": try_json_load(reader.read_utf())
        }

    elif table_name == "soul_collection_shops":
        return {
            "id": row_id,
            "exchange_reward": try_json_load(reader.read_utf()),
            "frequency": reader.read_uint()
        }

    elif table_name == "soul_collection_bases":
        return {
            "id": row_id,
            "lottery_consume": try_json_load(reader.read_utf())
        }

    elif table_name == "military":
        name = reader.read_utf()
        prefix_before = reader.read_utf()
        prefix_end = reader.read_utf()
        need_credit = reader.read_uint()
        reader.read_uint()  # ignored field
        salary_str = reader.read_utf()
        max_hero_num = reader.read_uint()
        fight_hero_num = reader.read_uint()
        add_other_str = reader.read_utf()
        return {
            "id": row_id,
            "name": name,
            "prefix_before": prefix_before,
            "prefix_end": prefix_end,
            "need_credit": need_credit,
            "salary": try_json_load(salary_str),
            "max_hero_num": max_hero_num,
            "fight_hero_num": fight_hero_num,
            "add_other": try_json_load(add_other_str)
        }

    elif table_name == "culling_magics":
        return {
            "id": row_id,
            "name": reader.read_utf(),
            "level": reader.read_int(),
            "type": reader.read_int(),
            "need_block": reader.read_int(),
            "need_exp": reader.read_int(),
            "exp_all": reader.read_int(),
            "need_silver": reader.read_int(),
            "silver_exp": reader.read_int(),
            "need_gold": reader.read_int(),
            "gold_exp": reader.read_int(),
            "need_item": reader.read_int(),
            "item_exp": reader.read_int(),
            "power": reader.read_int(),
            "agile": reader.read_int(),
            "intelligence": reader.read_int(),
            "life": reader.read_int(),
            "need_trans_lv": reader.read_int(),
            "next_id": reader.read_int()
        }

    elif table_name == "culling_stages":
        return {
            "id": row_id,
            "name": reader.read_utf(),
            "location": reader.read_int(),
            "type": reader.read_int(),
            "army_id": reader.read_int(),
            "image": reader.read_int(),
            "award": try_json_load(reader.read_utf()),
            "award_ex": try_json_load(reader.read_utf()),
            "stage_clear": reader.read_int(),
            "need_level": reader.read_int()
        }

    elif table_name == "equip_forging":
        return {
            "id": row_id,
            "target_item_id": reader.read_uint(),
            "material_amount": reader.read_uint()
        }

    elif table_name == "equip_advancement":
        return {
            "id": row_id,
            "target_item_id": reader.read_uint(),
            "material_amount": reader.read_uint()
        }

    elif table_name == "nightmare_points":
        name = reader.read_utf()
        army_raw = try_json_load(reader.read_utf())
        army_vec = army_raw.get("army", []) if isinstance(army_raw, dict) else army_raw
        battle_scene = reader.read_uint()
        role_model = reader.read_uint()
        condition = try_json_load(reader.read_utf())
        help_hero_id = reader.read_uint()
        help_hero_pos = reader.read_uint()
        coordinate = try_json_load(reader.read_utf())
        to_target = try_json_load(reader.read_utf())
        return {
            "id": row_id,
            "name": name,
            "army_ids": army_vec,
            "battle_scene": battle_scene,
            "role_model": role_model,
            "condition": condition,
            "help_hero_id": help_hero_id,
            "help_hero_pos": help_hero_pos,
            "coordinate": coordinate,
            "to_target": to_target
        }

    elif table_name == "nightmare_cities":
        return {
            "id": row_id,
            "award_ids": try_json_load(reader.read_utf()),
            "pass_awards": try_json_load(reader.read_utf())
        }

    elif table_name == "star_maps":
        return {
            "id": row_id,
            "name": reader.read_utf(),
            "profession": reader.read_uint(),
            "quality": reader.read_uint(),
            "point_count": reader.read_uint(),
            "pic": reader.read_utf(),
            "desc": reader.read_utf(),
            "start_id": reader.read_uint()
        }

    elif table_name == "star_points":
        map_id = reader.read_uint()
        index = reader.read_uint()
        is_skill = reader.read_uint()
        add_type = try_json_load(reader.read_utf())
        need_fetch = reader.read_uint()
        name = reader.read_utf()
        desc = reader.read_utf()
        limit = reader.read_uint()
        return {
            "id": row_id,
            "map_id": map_id,
            "index": index,
            "is_skill": is_skill,
            "add_type": add_type,
            "need_fetch": need_fetch,
            "name": name,
            "desc": desc,
            "seven_star_level_limit": limit
        }

    elif table_name == "ornament_values":
        item_id_str = reader.read_utf()
        parts = item_id_str.split(":")
        item_id = int(parts[0])
        sub_id = int(parts[1]) if len(parts) > 1 else 0
        return {
            "item_id": item_id,
            "sub_id": sub_id,
            "level": reader.read_uint(),
            "cost_items": try_json_load(reader.read_utf()),
            "add_value": reader.read_uint()
        }

    elif table_name == "ornament_upgrades":
        return {
            "id": row_id,
            "old_item_id": reader.read_uint(),
            "cost_items": try_json_load(reader.read_utf()),
            "new_item_id": reader.read_uint()
        }

    elif table_name == "temple_points":
        name = reader.read_utf()
        next_point_id = reader.read_uint()
        army_raw = try_json_load(reader.read_utf())
        army_ids = army_raw.get("army", []) if isinstance(army_raw, dict) else army_raw
        battle_scene = reader.read_uint()
        akey_price = reader.read_uint()
        return {
            "id": row_id,
            "name": name,
            "next_point_id": next_point_id,
            "army_ids": army_ids,
            "battle_scene": battle_scene,
            "akey_price": akey_price
        }

    elif table_name == "temple_values":
        return {
            "id": row_id,
            "level_coefficient": reader.read_float(),
            "type_coefficient": reader.read_float(),
            "flush_spirit_consume": reader.read_int(),
            "flush_spirit_successrate": reader.read_int(),
            "flush_spirit_stone": try_json_load(reader.read_utf()),
            "protected_stone": reader.read_int()
        }

    elif table_name == "temple_pvps":
        return {
            "id": row_id,
            "layer_id": reader.read_uint(),
            "award_id": reader.read_uint()
        }

    elif table_name == "temple_plies":
        return {
            "id": row_id,
            "number_plies": reader.read_int(),
            "award_id": reader.read_uint()
        }

    elif table_name == "weapon_skills":
        return {
            "id": row_id,
            "name": reader.read_utf(),
            "desc": reader.read_utf(),
            "skill_quality": reader.read_uint()
        }

    elif table_name == "org_point_infos":
        return {
            "id": row_id,
            "name": reader.read_utf(),
            "action_eexertion": reader.read_uint(),
            "remaining_number": reader.read_uint(),
            "army": try_json_load(reader.read_utf()),
            "role_model": reader.read_uint(),
            "show_rate_award": reader.read_uint(),
            "guild_rate_award": reader.read_uint(),
            "next_point": reader.read_uint(),
            "coordinate": try_json_load(reader.read_utf()),
            "battle_scene": reader.read_uint(),
            "to_target": try_json_load(reader.read_utf())
        }

    elif table_name == "org_point_awards":
        return {
            "id": row_id,
            "arr": try_json_load(reader.read_utf())
        }

    elif table_name == "beautiful_clothes":
        factor = reader.read_uint()
        scores = try_json_load(reader.read_utf())
        question = reader.read_utf()
        answers = try_json_load(reader.read_utf())
        return {
            "id": row_id,
            "factor": factor,
            "scores": scores,
            "question": question,
            "answers": answers if isinstance(answers, list) else []
        }

    elif table_name == "beauty":
        return {
            "id": row_id,
            "name": reader.read_utf(),
            "rewards": try_json_load(reader.read_utf()),
            "clothes_id": try_json_load(reader.read_utf()),
            "success_text": try_json_load(reader.read_utf()),
            "fail_text": reader.read_utf(),
            "day": reader.read_uint()
        }

    elif table_name == "hero_talents":
        return {
            "id": row_id,
            "talent_name": reader.read_utf(),
            "talent_desc": reader.read_utf()
        }

    elif table_name == "hd_big_turntables":
        return {
            "id": row_id,
            "name": reader.read_utf(),
            "tname": reader.read_utf(),
            "desc": reader.read_utf(),
            "tip": reader.read_utf(),
            "price": reader.read_uint(),
            "image_id": reader.read_uint(),
            "record_quality_limit": reader.read_int(),
            "lucky_point": try_json_load(reader.read_utf()),
            "lucky_lottery_outter": try_json_load(reader.read_utf()),
            "lucky_lottery_inner": try_json_load(reader.read_utf()),
            "gold_point": try_json_load(reader.read_utf()),
            "gold_lottery_outter": try_json_load(reader.read_utf()),
            "gold_lottery_inner": try_json_load(reader.read_utf()),
            "mall": try_json_load(reader.read_utf()),
            "score_point": try_json_load(reader.read_utf()),
            "lucky_lottery_outter_award": try_json_load(reader.read_utf()),
            "lucky_lottery_inner_award": try_json_load(reader.read_utf()),
            "gold_lottery_outter_award": try_json_load(reader.read_utf()),
            "gold_lottery_inner_award": try_json_load(reader.read_utf()),
            "buy_hero": try_json_load(reader.read_utf())
        }

    elif table_name == "hd_jigsaws":
        return {
            "id": row_id,
            "name": reader.read_utf(),
            "tname": reader.read_utf(),
            "desc": reader.read_utf(),
            "tip": reader.read_utf(),
            "price": reader.read_uint(),
            "image_id": reader.read_uint(),
            "score": try_json_load(reader.read_utf()),
            "buys": try_json_load(reader.read_utf()),
            "awards": try_json_load(reader.read_utf()),
            "title_id": reader.read_uint()
        }

    elif table_name == "bleach_jigsaws":
        return {
            "id": row_id,
            "name": reader.read_utf(),
            "tname": reader.read_utf(),
            "desc": reader.read_utf(),
            "tip": reader.read_utf(),
            "price": reader.read_uint(),
            "image_id": reader.read_uint(),
            "items": try_json_load(reader.read_utf()),
            "needs": try_json_load(reader.read_utf()),
            "btn1": try_json_load(reader.read_utf()),
            "btn2": try_json_load(reader.read_utf()),
            "btn3": try_json_load(reader.read_utf()),
            "final_award": try_json_load(reader.read_utf()),
            "unk": reader.read_int()
        }

    elif table_name == "buff_effects":
        return {
            "id": row_id,
            "buff_type": reader.read_uint(),
            "alter": try_json_load(reader.read_utf()),
            "buff_key": reader.read_uint(),
            "weight": reader.read_uint(),
            "continued": reader.read_uint(),
            "name": reader.read_utf(),
            "description": reader.read_utf(),
            "icon_url": reader.read_uint()
        }

    elif table_name == "tgspvp_reward":
        return {
            "id": row_id,
            "from": reader.read_int(),
            "to": reader.read_int(),
            "_loc2_": try_json_load(reader.read_utf())
        }

    elif table_name == "tgspvpdailyaward":
        return {
            "id": row_id,
            "quality": reader.read_int(),
            "type": reader.read_int(),
            "cost_type": reader.read_int(),
            "cost": reader.read_int(),
            "_loc2_": try_json_load(reader.read_utf())
        }

    elif table_name == "ttimehero":
        return {
            "id": row_id,
            "one_day_cost": reader.read_uint(),
            "three_day_cost": reader.read_uint(),
            "seven_day_cost": reader.read_uint(),
            "forever_cost": reader.read_uint(),
            "time_list": try_json_load(reader.read_utf()),
            "need_candy": reader.read_uint()
        }

    elif table_name == "tsystemlanguage":
        return {
            "id": row_id,
            "desc": reader.read_utf()
        }

    elif table_name == "tfighterdetail":
        return {
            "id": row_id,
            "desc": reader.read_utf(),
            "name": reader.read_utf(),
            "ask_need": try_json_load(reader.read_utf()),
            "enlist_paper": try_json_load(reader.read_utf()),
            "up_hero_id": reader.read_int(),
            "stype": reader.read_int(),
            "vip_limit": reader.read_int(),
            "main_hero_level": reader.read_int(),
            "fight_report_addr": reader.read_utf()
        }

    elif table_name == "profession_refines":
        return {
            "id": row_id,
            "cost": reader.read_int(),
            "phy_atk": round(reader.read_float(), 6),
            "magic_atk": round(reader.read_float(), 6),
            "phy_def": round(reader.read_float(), 6),
            "magic_def": round(reader.read_float(), 6),
            "hp": round(reader.read_float(), 6),
            "speed": round(reader.read_float(), 6)
        }

    else:
        return None


# ─── Special table parsers (complex multi-field tables) ──────────────────────

def parse_activity_details(bins0, bins1, out_dir, generated_at):
    """Parse activity_details from binPackages + ActionScript constants."""
    import re

    all_bins = {**bins0, **bins1}

    # Load promotional activities
    promo_path = os.path.join(out_dir, "promotional_activities.json")
    active_act_ids = set()
    if os.path.exists(promo_path):
        with open(promo_path, "r", encoding="utf-8") as f:
            promos = json.load(f)
        for row in promos.get("rows", []):
            act_id = row.get("act_id")
            if act_id:
                active_act_ids.add(int(act_id))

    # Resolve ActionScript constants
    db_path = "/home/marko/bleachflash/scripts/Resources/Constants/CONST_DATEBASEVO.as"
    mode_path = "/home/marko/bleachflash/scripts/Resources/Constants/CONST_ACTIVITY_MODE.as"
    act_const_path = "/home/marko/bleachflash/scripts/Resources/Constants/CONST_ACTIVITY.as"

    resource_ids = {}
    if os.path.exists(db_path):
        with open(db_path, "r", encoding="utf-8") as f:
            raw = f.read()
        for line in raw.splitlines():
            m = re.search(r'public static const RESOURCEID_(\w+):uint = RESOURCEID_Base \+ (\d+);', line)
            if m:
                name, offset = m.groups()
                resource_ids['RESOURCEID_' + name] = RESOURCEID_Base + int(offset)

    modes = {}
    if os.path.exists(mode_path):
        with open(mode_path, "r", encoding="utf-8") as f:
            raw = f.read()
        for line in raw.splitlines():
            m = re.search(r'public static const Activity_(\w+):uint = (\d+);', line)
            if m:
                name, val = m.groups()
                modes['Activity_' + name] = int(val)

    multiplier_to_resid = {}
    id_to_res_name = {}
    if os.path.exists(act_const_path):
        with open(act_const_path, "r", encoding="utf-8") as f:
            raw = f.read()
        m_ids = re.search(r'CONFIGS_ID_Vect:Vector\.<uint> = Vector\.<uint>\(\[(.*?)\]\);', raw, re.DOTALL)
        m_res = re.search(r'CONFIGS_ResourceID_Vect:Vector\.<uint> = Vector\.<uint>\(\[(.*?)\]\);', raw, re.DOTALL)
        if m_ids and m_res:
            ids_clean = re.sub(r'\s+', '', m_ids.group(1)).replace('CONST_ACTIVITY_MODE.', '').split(',')
            res_clean = re.sub(r'\s+', '', m_res.group(1)).replace('CONST_DATEBASEVO.', '').split(',')
            for mode_name, res_name in zip(ids_clean, res_clean):
                mode_val = modes.get(mode_name)
                res_val = resource_ids.get(res_name)
                if mode_val is not None and res_val is not None:
                    multiplier_to_resid[mode_val] = res_val
                    id_to_res_name[mode_val] = res_name

    # Class name mapping
    CLASS_MAP = {
        "LevelRank": "THDLevelRank", "PowerRank": "THDPowerRank",
        "ArenaRank": "THDArenaRank", "SinglePay": "THDSinglePay",
        "TotalPay": "THDTotalPay", "DailyPay": "THDDailyPay",
        "TotalCost": "THDTotalCost", "DailyCost": "THDDailyCost",
        "DailyTotalPay": "THDDailyTotalPay", "DailyTotalCost": "THDDailyTotalCost",
        "FirstPay": "THDFirstPay", "GrowFundLv": "THDGrowFundLv",
        "SuperTreasure": "THDSuperTreasure", "DayBack": "THDDayBackConfig",
        "VipBox": "THDVipBox", "GBOnline": "THDGBOnline",
        "GBGold": "THDGBGold", "GBSevenDay": "THDGBSevenDay",
        "GBOpenSever": "THDGBOpenServer", "GBCollectgame": "THDGBCollectGame",
        "LevelGiftBag": "THDLevelGiftBag", "KingLegend": "THDKingLegend",
        "KingGuard": "THDKingGuard", "Pyramid": "THDPyramid",
        "RushInSeireitei": "THDRushInSeireitei", "KnifeHeroCollect": "THDKnifeHeroCollect",
        "IceHeros": "THDIceHeros", "ExchangeChip": "THDExchangeChip",
        "TeamBuy": "THDTeamBuy", "Gambling": "THDGambling",
        "DoubleFish": "THDDoubleFish", "LimitBuy": "THDActivityLimitBuy",
        "ChildrenDayShop": "THDChildrenDayShop", "ChildrenDayHero": "THDChildrenDayHero",
        "ChildrenDayCollect": "THDChildrenDayCollect", "DuanwujiePet": "THDDuanwujiePet",
        "DuanwujieBoat": "THDDuanwujieBoat", "LaborConsume": "THDLaborConsume",
        "NationalDayTwo": "THDNationalDayTwo", "NationalDayOne": "THDNationalDayOne",
        "CoolSummer": "THDCoolSummer", "FoolsDayShop": "THDFoolsDayShop",
        "FoolsDayRecharge": "THDFoolsDayRecharge", "HalloweenShop": "THDHalloweenShop",
        "KnifeChessBuy": "THDKnifeChessBuy", "GhostKingForg": "THDGhostKingForg",
        "Sled": "THDSled", "ThanksFeast": "THDThanksFeast",
        "ThankYou": "THDThankYou", "TreasureHuntShop": "THDTreasureHuntShop",
        "TreasureShop": "THDTreasureHuntShop",
    }

    STANDARD_CLASSES = [
        "THDSinglePay", "THDTotalPay", "THDDailyPay", "THDTotalCost", "THDDailyCost",
        "THDDailyTotalPay", "THDDailyTotalCost", "THDFirstPay", "THDYellowDiamonGiftBag",
        "THDVipBox", "THDGBOnline", "THDGBGold", "THDGBSevenDay", "THDGBOpenServer",
        "THDGBCollectGame", "THDLevelGiftBag"
    ]

    extracted = {}
    for mult, res_id in multiplier_to_resid.items():
        if res_id not in all_bins:
            continue

        res_name = id_to_res_name.get(mult, f"Unknown_{res_id}")
        bin_data = all_bins[res_id]
        reader = BinReader(bin_data)
        reader.read_uint()  # skip res_id
        row_count = reader.read_uint()

        # Determine class name
        class_name = "THDActivityBase"
        for key, cls in CLASS_MAP.items():
            if key in res_name:
                class_name = cls
                break

        for _ in range(row_count):
            if reader.bytes_left() < 4:
                break
            act_id = reader.read_uint()
            base_name = reader.read_utf()
            base_tname = reader.read_utf()
            base_desc = reader.read_utf()
            base_tip = reader.read_utf()
            base_price = reader.read_uint()
            base_image_id = reader.read_uint()

            row = {
                "act_id": act_id, "class": class_name, "res_name": res_name,
                "name": base_name, "tname": base_tname,
                "description": base_desc, "tip": base_tip,
                "price": base_price, "image_id": base_image_id,
                "awards": None, "targets": None, "extra": {}
            }

            try:
                if class_name == "THDLevelRank":
                    act_award_str = reader.read_utf()
                    rank_num = reader.read_uint()
                    row["awards"] = try_json_load(act_award_str)
                    row["extra"]["rank_num"] = rank_num

                elif class_name == "THDPowerRank":
                    act_award_str = reader.read_utf()
                    target_power_str = reader.read_utf()
                    rank_num = reader.read_uint()
                    row["awards"] = try_json_load(act_award_str)
                    row["targets"] = try_json_load(target_power_str)
                    row["extra"]["rank_num"] = rank_num

                elif class_name == "THDArenaRank":
                    row["awards"] = try_json_load(reader.read_utf())
                    row["extra"]["rank_day"] = try_json_load(reader.read_utf())
                    row["extra"]["lucky"] = try_json_load(reader.read_utf())
                    row["extra"]["luck_item"] = try_json_load(reader.read_utf())

                elif class_name == "THDGrowFundLv":
                    row["extra"]["bags_normal"] = try_json_load(reader.read_utf())
                    row["extra"]["bags_premium"] = try_json_load(reader.read_utf())

                elif class_name == "THDSuperTreasure":
                    row["extra"]["page1"] = try_json_load(reader.read_utf())
                    row["extra"]["page2"] = try_json_load(reader.read_utf())
                    row["extra"]["page3"] = try_json_load(reader.read_utf())
                    row["extra"]["page3_prompts"] = try_json_load(reader.read_utf())
                    row["extra"]["enter_names"] = try_json_load(reader.read_utf())

                elif class_name == "THDDayBackConfig":
                    row["extra"]["login_gift"] = try_json_load(reader.read_utf())
                    row["extra"]["recharge_idx"] = reader.read_int()
                    row["extra"]["recharge_recv_idx"] = reader.read_int()
                    row["extra"]["recharge_gift"] = try_json_load(reader.read_utf())
                    row["extra"]["final_gift"] = try_json_load(reader.read_utf())

                elif class_name == "THDKingGuard":
                    row["extra"]["guards"] = try_json_load(reader.read_utf())
                    row["extra"]["last_result_index"] = reader.read_uint()
                    row["extra"]["daily_free_count"] = reader.read_uint()
                    row["extra"]["total_free_index"] = reader.read_uint()
                    row["extra"]["daily_free_index"] = reader.read_uint()
                    row["extra"]["recharge"] = try_json_load(reader.read_utf())
                    row["extra"]["game_status_index"] = reader.read_uint()
                    row["extra"]["game"] = try_json_load(reader.read_utf())
                    row["extra"]["game_win"] = try_json_load(reader.read_utf())
                    row["extra"]["buy_day"] = try_json_load(reader.read_utf())
                    row["extra"]["daily_pay_index"] = reader.read_uint()
                    row["extra"]["messages"] = try_json_load(reader.read_utf())

                elif class_name == "THDKingLegend":
                    row["extra"]["recharge"] = try_json_load(reader.read_utf())
                    row["extra"]["exchanges"] = try_json_load(reader.read_utf())
                    row["extra"]["cost_gold"] = try_json_load(reader.read_utf())
                    row["extra"]["turntable"] = try_json_load(reader.read_utf())
                    row["extra"]["cur_day_index"] = reader.read_uint()
                    row["extra"]["cur_cost_index"] = reader.read_uint()
                    row["extra"]["bag"] = try_json_load(reader.read_utf())

                elif class_name == "THDPyramid":
                    row["extra"]["awards_rates"] = try_json_load(reader.read_utf())
                    row["extra"]["smash_fifty"] = reader.read_uint()
                    row["extra"]["smash_ten"] = reader.read_uint()
                    row["extra"]["smash_one"] = reader.read_uint()
                    row["extra"]["gifts"] = try_json_load(reader.read_utf())
                    row["extra"]["recharge_index"] = reader.read_uint()
                    row["extra"]["extract_index"] = reader.read_uint()
                    row["extra"]["score_index"] = reader.read_uint()
                    row["extra"]["position_index"] = reader.read_uint()
                    row["extra"]["proportion"] = reader.read_uint()
                    row["extra"]["award_info"] = try_json_load(reader.read_utf())

                elif class_name == "THDRushInSeireitei":
                    row["extra"]["bosses"] = try_json_load(reader.read_utf())
                    row["extra"]["nomal_attack"] = try_json_load(reader.read_utf())
                    row["extra"]["nomal_attack_idx"] = reader.read_uint()
                    row["extra"]["special_attack"] = try_json_load(reader.read_utf())
                    row["extra"]["special_attack_idx"] = reader.read_uint()
                    row["extra"]["refresh_index"] = reader.read_uint()
                    row["extra"]["attack_index"] = reader.read_uint()
                    row["extra"]["shop"] = try_json_load(reader.read_utf())
                    row["extra"]["score_index"] = reader.read_uint()
                    row["extra"]["total_score_index"] = reader.read_uint()
                    row["extra"]["rank_num"] = reader.read_uint()
                    row["extra"]["rank"] = try_json_load(reader.read_utf())
                    row["extra"]["pet_id_info"] = try_json_load(reader.read_utf())
                    row["extra"]["messages"] = try_json_load(reader.read_utf())

                elif class_name == "THDKnifeHeroCollect":
                    row["extra"]["consume_gold"] = try_json_load(reader.read_utf())
                    row["extra"]["knife_condition"] = try_json_load(reader.read_utf())
                    row["extra"]["knife_award"] = try_json_load(reader.read_utf())
                    row["extra"]["recharge_gold"] = try_json_load(reader.read_utf())
                    row["extra"]["hero_condition"] = try_json_load(reader.read_utf())
                    row["extra"]["hero_award"] = try_json_load(reader.read_utf())
                    row["extra"]["consume_gold_index"] = reader.read_int()
                    row["extra"]["recharge_gold_index"] = reader.read_int()
                    row["extra"]["language"] = try_json_load(reader.read_utf())

                elif class_name == "THDIceHeros":
                    row["extra"]["rank_list"] = try_json_load(reader.read_utf())
                    row["extra"]["awards"] = try_json_load(reader.read_utf())
                    row["extra"]["chip_boxes"] = try_json_load(reader.read_utf())
                    row["extra"]["hero_ids"] = try_json_load(reader.read_utf())
                    row["extra"]["total_player"] = reader.read_uint()
                    row["extra"]["rank_desc"] = reader.read_utf()
                    row["extra"]["loot"] = try_json_load(reader.read_utf())
                    row["extra"]["add_value"] = reader.read_uint()
                    row["extra"]["is_rank_show"] = reader.read_uint()

                elif class_name == "THDExchangeChip":
                    row["extra"]["chips"] = try_json_load(reader.read_utf())
                    row["extra"]["buy_boxes"] = try_json_load(reader.read_utf())
                    row["extra"]["free_draws"] = try_json_load(reader.read_utf())
                    row["extra"]["exchanges"] = try_json_load(reader.read_utf())
                    row["extra"]["page1_desc"] = reader.read_utf()
                    row["extra"]["page2_desc"] = reader.read_utf()
                    row["extra"]["exchange_types"] = try_json_load(reader.read_utf())

                elif class_name == "THDTeamBuy":
                    row["extra"]["awards"] = try_json_load(reader.read_utf())
                    row["extra"]["off_rates"] = try_json_load(reader.read_utf())
                    row["extra"]["sign_times"] = try_json_load(reader.read_utf())
                    row["extra"]["buy_times"] = try_json_load(reader.read_utf())
                    row["extra"]["prompts"] = try_json_load(reader.read_utf())

                elif class_name == "THDGambling":
                    row["extra"]["awards"] = try_json_load(reader.read_utf())
                    row["extra"]["fail_count_info"] = try_json_load(reader.read_utf())
                    row["extra"]["start_count_info"] = try_json_load(reader.read_utf())
                    row["extra"]["wins_info"] = try_json_load(reader.read_utf())
                    row["extra"]["prompts"] = try_json_load(reader.read_utf())
                    row["extra"]["btn_start_cost"] = reader.read_uint()
                    row["extra"]["btn_small_cost"] = reader.read_uint()
                    row["extra"]["btn_big_cost"] = reader.read_uint()

                elif class_name == "THDDoubleFish":
                    row["extra"]["rank_list"] = try_json_load(reader.read_utf())
                    row["extra"]["awards"] = try_json_load(reader.read_utf())
                    row["extra"]["knife_id"] = reader.read_uint()
                    row["extra"]["total_player"] = reader.read_uint()
                    row["extra"]["rank_desc"] = reader.read_utf()
                    row["extra"]["add_value"] = reader.read_uint()

                elif class_name == "THDActivityLimitBuy":
                    row["extra"]["items"] = try_json_load(reader.read_utf())
                    row["extra"]["flush_times"] = try_json_load(reader.read_utf())
                    row["extra"]["prompts"] = try_json_load(reader.read_utf())

                elif class_name == "THDChildrenDayShop":
                    row["extra"]["score_index"] = reader.read_uint()
                    row["extra"]["pay_index"] = reader.read_uint()
                    row["extra"]["login_award"] = try_json_load(reader.read_utf())
                    row["extra"]["pay_award"] = try_json_load(reader.read_utf())
                    row["extra"]["gold_mall"] = try_json_load(reader.read_utf())
                    row["extra"]["score_mall"] = try_json_load(reader.read_utf())
                    row["extra"]["candy_id"] = reader.read_uint()

                elif class_name == "THDChildrenDayHero":
                    row["extra"]["buy_score_index"] = reader.read_uint()
                    row["extra"]["buy_gold_index"] = reader.read_uint()
                    row["extra"]["scale"] = reader.read_uint()
                    row["extra"]["related_id"] = reader.read_uint()

                elif class_name == "THDChildrenDayCollect":
                    row["extra"]["items"] = try_json_load(reader.read_utf())

                elif class_name == "THDDuanwujiePet":
                    row["extra"]["fund"] = try_json_load(reader.read_utf())
                    row["extra"]["fund_gift"] = try_json_load(reader.read_utf())
                    row["extra"]["zongzi_id"] = reader.read_uint()
                    row["extra"]["server_zongzi_id"] = reader.read_uint()
                    row["extra"]["pet_info"] = try_json_load(reader.read_utf())
                    row["extra"]["zongzi_gift"] = try_json_load(reader.read_utf())
                    row["extra"]["mall"] = try_json_load(reader.read_utf())
                    row["extra"]["text"] = reader.read_utf()

                elif class_name == "THDDuanwujieBoat":
                    row["extra"]["game_count"] = try_json_load(reader.read_utf())
                    row["extra"]["cheer"] = try_json_load(reader.read_utf())
                    row["extra"]["start"] = reader.read_uint()
                    row["extra"]["over"] = try_json_load(reader.read_utf())
                    row["extra"]["evaluation"] = try_json_load(reader.read_utf())
                    row["extra"]["score"] = reader.read_uint()
                    row["extra"]["mall"] = try_json_load(reader.read_utf())
                    row["extra"]["big_award"] = try_json_load(reader.read_utf())
                    row["extra"]["morale"] = try_json_load(reader.read_utf())
                    row["extra"]["cheer_awards"] = try_json_load(reader.read_utf())
                    row["extra"]["events"] = try_json_load(reader.read_utf())
                    row["extra"]["length"] = reader.read_uint()
                    row["extra"]["speed"] = reader.read_uint()
                    row["extra"]["npc_speed"] = reader.read_uint()
                    row["extra"]["block_length"] = reader.read_uint()
                    row["extra"]["texts"] = try_json_load(reader.read_utf())

                elif class_name == "THDLaborConsume":
                    row["extra"]["banner"] = try_json_load(reader.read_utf())
                    row["extra"]["condition"] = try_json_load(reader.read_utf())
                    row["extra"]["score"] = reader.read_uint()
                    row["extra"]["refresh"] = reader.read_uint()
                    row["extra"]["free_times"] = reader.read_uint()
                    row["extra"]["refresh_cost"] = reader.read_uint()
                    row["extra"]["banner_index"] = try_json_load(reader.read_utf())
                    row["extra"]["mall"] = try_json_load(reader.read_utf())
                    row["extra"]["bag"] = try_json_load(reader.read_utf())
                    row["extra"]["language"] = try_json_load(reader.read_utf())

                elif class_name == "THDNationalDayTwo":
                    row["extra"]["free_index"] = reader.read_uint()
                    row["extra"]["discount"] = reader.read_uint()
                    row["extra"]["score_index"] = reader.read_uint()
                    row["extra"]["discount_index"] = reader.read_uint()
                    row["extra"]["refresh_index"] = reader.read_uint()
                    row["extra"]["refresh_cost"] = reader.read_uint()
                    row["extra"]["items"] = try_json_load(reader.read_utf())
                    row["extra"]["mall"] = try_json_load(reader.read_utf())
                    row["extra"]["bag"] = try_json_load(reader.read_utf())
                    row["extra"]["cur_pool_index"] = try_json_load(reader.read_utf())

                elif class_name == "THDCoolSummer":
                    row["extra"]["repository"] = try_json_load(reader.read_utf())
                    row["extra"]["shell_index"] = try_json_load(reader.read_utf())
                    row["extra"]["open_once"] = try_json_load(reader.read_utf())
                    row["extra"]["open_all"] = try_json_load(reader.read_utf())
                    row["extra"]["refresh"] = try_json_load(reader.read_utf())
                    row["extra"]["choose"] = reader.read_uint()
                    row["extra"]["score"] = reader.read_uint()
                    row["extra"]["score_shop"] = try_json_load(reader.read_utf())
                    row["extra"]["main_award"] = try_json_load(reader.read_utf())
                    row["extra"]["language"] = try_json_load(reader.read_utf())

                elif class_name == "THDFoolsDayShop":
                    row["extra"]["play_once_index"] = reader.read_uint()
                    row["extra"]["play_five_index"] = reader.read_uint()
                    row["extra"]["score_index"] = reader.read_uint()
                    row["extra"]["re_item_index"] = reader.read_uint()
                    row["extra"]["re_price_index"] = reader.read_uint()
                    row["extra"]["cur_price_index"] = reader.read_uint()
                    row["extra"]["re_start"] = reader.read_uint()
                    row["extra"]["luck_index"] = reader.read_uint()
                    row["extra"]["play_cost"] = reader.read_uint()
                    row["extra"]["re_item_cost"] = reader.read_uint()
                    row["extra"]["re_price_cost"] = reader.read_uint()
                    row["extra"]["cur_items"] = try_json_load(reader.read_utf())
                    row["extra"]["cur_items_index"] = try_json_load(reader.read_utf())
                    row["extra"]["score_shop"] = try_json_load(reader.read_utf())

                elif class_name == "THDFoolsDayRecharge":
                    row["extra"]["recharge_index"] = reader.read_uint()
                    row["extra"]["day_award"] = try_json_load(reader.read_utf())
                    row["extra"]["total_award"] = try_json_load(reader.read_utf())
                    row["extra"]["progress_award"] = try_json_load(reader.read_utf())

                elif class_name == "THDHalloweenShop":
                    row["extra"]["refresh_index"] = reader.read_uint()
                    row["extra"]["total_score_index"] = reader.read_uint()
                    row["extra"]["buy_index"] = reader.read_uint()
                    row["extra"]["buy_cost_gold"] = reader.read_uint()
                    row["extra"]["refresh_cost_gold"] = reader.read_uint()
                    row["extra"]["all_buy_index"] = reader.read_uint()
                    row["extra"]["items"] = try_json_load(reader.read_utf())
                    row["extra"]["mall"] = try_json_load(reader.read_utf())
                    row["extra"]["bag"] = try_json_load(reader.read_utf())
                    row["extra"]["cur_items_index"] = try_json_load(reader.read_utf())
                    row["extra"]["mask_name"] = reader.read_utf()

                elif class_name == "THDKnifeChessBuy":
                    row["extra"]["recharge"] = reader.read_uint()
                    row["extra"]["step_gold"] = reader.read_uint()
                    row["extra"]["step_index"] = reader.read_uint()
                    row["extra"]["cur_step"] = reader.read_uint()
                    row["extra"]["stage_index"] = reader.read_uint()
                    row["extra"]["open_stage_index"] = reader.read_uint()
                    row["extra"]["oper_index"] = reader.read_uint()
                    row["extra"]["onekey_index"] = reader.read_uint()
                    row["extra"]["normal_award"] = reader.read_uint()
                    row["extra"]["stage_award"] = try_json_load(reader.read_utf())
                    row["extra"]["stage_gold"] = try_json_load(reader.read_utf())
                    row["extra"]["stage_score"] = try_json_load(reader.read_utf())
                    row["extra"]["stage_score_id"] = reader.read_uint()
                    row["extra"]["mall"] = try_json_load(reader.read_utf())

                elif class_name == "THDGhostKingForg":
                    row["extra"]["recharge_index"] = reader.read_uint()
                    row["extra"]["forging"] = try_json_load(reader.read_utf())
                    row["extra"]["forging_max"] = reader.read_uint()
                    row["extra"]["forging_award"] = try_json_load(reader.read_utf())
                    row["extra"]["score_index"] = reader.read_uint()
                    row["extra"]["additional_award"] = try_json_load(reader.read_utf())
                    row["extra"]["additional_items"] = try_json_load(reader.read_utf())
                    row["extra"]["big_award"] = try_json_load(reader.read_utf())
                    row["extra"]["score_shop"] = try_json_load(reader.read_utf())
                    row["extra"]["language"] = try_json_load(reader.read_utf())

                elif class_name == "THDSled":
                    row["extra"]["robbery"] = try_json_load(reader.read_utf())
                    row["extra"]["transport"] = try_json_load(reader.read_utf())
                    row["extra"]["christmas_cards_index"] = reader.read_uint()
                    row["extra"]["refresh_quality"] = try_json_load(reader.read_utf())
                    row["extra"]["one_key_red"] = try_json_load(reader.read_utf())
                    row["extra"]["begin_transport"] = try_json_load(reader.read_utf())
                    row["extra"]["sled_infos"] = try_json_load(reader.read_utf())
                    row["extra"]["robbery_interface_index"] = reader.read_uint()
                    row["extra"]["onekey_arrival"] = try_json_load(reader.read_utf())
                    row["extra"]["receive_award_index"] = reader.read_uint()
                    row["extra"]["big_gift"] = try_json_load(reader.read_utf())
                    row["extra"]["max_size"] = reader.read_uint()
                    row["extra"]["transport_time"] = reader.read_uint()
                    row["extra"]["transport_protect"] = reader.read_uint()
                    row["extra"]["robbery_person_index"] = reader.read_uint()
                    row["extra"]["robbery_index"] = try_json_load(reader.read_utf())
                    row["extra"]["shop"] = try_json_load(reader.read_utf())
                    row["extra"]["gold_cards"] = try_json_load(reader.read_utf())
                    row["extra"]["language"] = try_json_load(reader.read_utf())

                elif class_name == "THDThanksFeast":
                    row["extra"]["puzzle"] = try_json_load(reader.read_utf())
                    row["extra"]["pet"] = try_json_load(reader.read_utf())
                    row["extra"]["recharge_index"] = reader.read_uint()
                    row["extra"]["daily_recharge_index"] = reader.read_uint()
                    row["extra"]["daily_gift"] = try_json_load(reader.read_utf())

                elif class_name == "THDThankYou":
                    row["extra"]["recharge_index"] = reader.read_uint()
                    row["extra"]["daily_recharge_index"] = reader.read_uint()
                    row["extra"]["daily_gift"] = try_json_load(reader.read_utf())

                elif class_name == "THDTreasureHuntShop":
                    row["extra"]["dark_index"] = reader.read_uint()
                    row["extra"]["light_index"] = reader.read_uint()
                    row["extra"]["dark_item_index"] = reader.read_uint()
                    row["extra"]["light_item_index"] = reader.read_uint()
                    row["extra"]["items"] = try_json_load(reader.read_utf())
                    row["extra"]["shop"] = try_json_load(reader.read_utf())
                    row["extra"]["big_award"] = try_json_load(reader.read_utf())
                    row["extra"]["cost"] = reader.read_uint()
                    row["extra"]["texts"] = try_json_load(reader.read_utf())

                elif class_name in STANDARD_CLASSES:
                    row["awards"] = try_json_load(reader.read_utf())
                else:
                    pass  # Unknown subclass, skip remaining fields
            except Exception as e:
                pass  # Continue parsing other rows on error

            extracted[act_id] = row

    with open(os.path.join(out_dir, "activity_details.json"), "w", encoding="utf-8") as f:
        json.dump(extracted, f, indent=2, ensure_ascii=True)
    print(f"  Exported activity_details: {len(extracted)} entries")
    return len(extracted)


# ─── Activity details (complex, kept separate) ──────────────────────────────

def export_activity_details(bins0, bins1, out_dir, generated_at):
    """Export activity_details.json from binPackages + ActionScript constants."""
    return parse_activity_details(bins0, bins1, out_dir, generated_at)


# ─── Standalone bin file: heroes from 01000005.bin ─────────────────────────

def export_standalone_heroes(out_dir, generated_at):
    """Parse heroes from standalone 01000005.bin file."""
    bin_paths = [
        "/home/marko/bleachflash/01000005.bin",
        "../01000005.bin",
        "01000005.bin"
    ]
    bin_path = None
    for p in bin_paths:
        if os.path.exists(p):
            bin_path = p
            break

    if not bin_path:
        print("  01000005.bin not found, skipping standalone heroes")
        return 0

    with open(bin_path, "rb") as f:
        data = f.read()

    decompressed = zlib.decompress(data)
    reader = BinReader(decompressed)
    reader.read_uint()  # skip res_id
    row_count = reader.read_uint()
    rows = []

    for _ in range(row_count):
        row_id = reader.read_uint()
        is_main = reader.read_int() != 0
        desc = reader.read_utf()
        name = reader.read_utf()
        assess = reader.read_utf()
        sex = reader.read_int()
        level = reader.read_uint()
        need_level = reader.read_uint()
        profession = reader.read_uint()
        source = reader.read_uint()
        quality = reader.read_uint()
        power = reader.read_uint()
        agile = reader.read_uint()
        intelligence = reader.read_uint()
        life = reader.read_uint()
        speed = reader.read_uint()
        power_grow = round(reader.read_float(), 2)
        agile_grow = round(reader.read_float(), 2)
        intel_grow = round(reader.read_float(), 2)
        life_grow = round(reader.read_float(), 2)
        speed_grow = round(reader.read_float(), 2)
        near_att = reader.read_uint()
        near_def = reader.read_uint()
        far_att = reader.read_uint()
        far_def = reader.read_uint()
        strat_att = reader.read_uint()
        strat_def = reader.read_uint()
        hit = round(reader.read_float(), 2)
        dodge = round(reader.read_float(), 2)
        crit = round(reader.read_float(), 2)
        block = round(reader.read_float(), 2)
        punch = round(reader.read_float(), 2)
        help_rate = round(reader.read_float(), 2)
        hurt = round(reader.read_float(), 2)
        avoid = round(reader.read_float(), 2)
        wreck = round(reader.read_float(), 2)
        antiknock = round(reader.read_float(), 2)
        attach = round(reader.read_float(), 2)
        defense = round(reader.read_float(), 2)
        recover = round(reader.read_float(), 2)
        active = reader.read_uint()
        att_effect = reader.read_utf()
        norm_att = reader.read_uint()
        talent = reader.read_uint()
        sound = reader.read_uint()
        weakness = reader.read_uint()
        head_style = reader.read_utf()
        country = reader.read_uint()
        hero_soul = reader.read_utf()
        crash_jade = reader.read_utf()

        rows.append({
            "id": row_id,
            "is_main": is_main,
            "description": desc,
            "name": name,
            "assess": assess,
            "sex": sex,
            "level": level,
            "need_level": need_level,
            "profession": profession,
            "source": source,
            "quality": quality,
            "power": power,
            "agile": agile,
            "intelligence": intelligence,
            "life": life,
            "speed": speed,
            "power_grow": power_grow,
            "agile_grow": agile_grow,
            "intelligence_grow": intel_grow,
            "life_grow": life_grow,
            "speed_grow": speed_grow,
            "near_attack": near_att,
            "near_defense": near_def,
            "far_attack": far_att,
            "far_defense": far_def,
            "strategy_attack": strat_att,
            "strategy_defense": strat_def,
            "hit_rate": hit,
            "dodge_rate": dodge,
            "crit_rate": crit,
            "block_rate": block,
            "punch_rate": punch,
            "help_rate": help_rate,
            "hurt_rate": hurt,
            "avoid_hurt_rate": avoid,
            "wreck_rate": wreck,
            "antiknock_rate": antiknock,
            "attach_rate": attach,
            "defense_rate": defense,
            "recover_rate": recover,
            "active": active,
            "attack_effect": att_effect,
            "normal_attack": norm_att,
            "talent": talent,
            "sound": sound,
            "weakness": weakness,
            "head_style": head_style,
            "country": country,
            "hero_soul": hero_soul,
            "crash_jade_open_level": crash_jade,
            "role": assess if assess else ("Vanguard" if profession == 1 else "Attacker")
        })

    count = write_json(out_dir, "heroes", rows, generated_at)
    return count


# ─── Revert date-only changes ───────────────────────────────────────────────

def revert_date_only_changes(out_dir):
    """Revert JSON files where the only change is the generatedAt timestamp."""
    try:
        result = subprocess.run(
            ["git", "diff", "--name-only", "--", out_dir],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode != 0:
            return
        changed_files = [f for f in result.stdout.strip().split("\n") if f.endswith(".json")]
        if not changed_files:
            return

        reverted = 0
        for fpath in changed_files:
            if not os.path.exists(fpath):
                continue
            old = subprocess.run(
                ["git", "show", f"HEAD:{fpath}"],
                capture_output=True, text=True, timeout=10
            )
            if old.returncode != 0:
                continue

            try:
                old_json = json.loads(old.stdout)
                new_json = json.loads(open(fpath, encoding="utf-8").read())
                # Remove generatedAt from both for comparison
                old_json.pop("generatedAt", None)
                new_json.pop("generatedAt", None)
                if old_json == new_json:
                    subprocess.run(["git", "checkout", "HEAD", "--", fpath], timeout=10)
                    reverted += 1
            except (json.JSONDecodeError, ValueError):
                pass

        if reverted:
            print(f"Reverted {reverted} file(s) where only the date changed.")
    except Exception:
        pass


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    generated_at = datetime.now().isoformat() + "Z"
    out_dir = "public/data"
    os.makedirs(out_dir, exist_ok=True)

    manifest_tables = {}

    print("Loading binPackages...")
    bins0 = scan_package("0F000000.binPackage")
    if not bins0:
        bins0 = scan_package("../0F000000.binPackage")
    bins1 = scan_package("0F000001.binPackage")
    if not bins1:
        bins1 = scan_package("../0F000001.binPackage")
    all_bins = {**bins0, **bins1}
    print(f"Loaded {len(all_bins)} tables from binPackages.\n")

    # Collect active enemy IDs for filtering
    active_enemy_ids = set()
    if 16777239 in all_bins:
        reader = BinReader(all_bins[16777239])
        reader.read_uint()
        row_count = reader.read_uint()
        for _ in range(row_count):
            reader.read_uint()  # id
            reader.read_utf()   # name
            front = try_json_load(reader.read_utf())
            front_lvs = front.get("front", []) if isinstance(front, dict) else (front if isinstance(front, list) else [])
            middle = try_json_load(reader.read_utf())
            middle_lvs = middle.get("middle", []) if isinstance(middle, dict) else (middle if isinstance(middle, list) else [])
            back = try_json_load(reader.read_utf())
            back_lvs = back.get("back", []) if isinstance(back, dict) else (back if isinstance(back, list) else [])
            reader.read_uint()  # leader_id
            reader.read_uint()  # award_id
            reader.read_utf()   # text
            for eid in (front_lvs or []) + (middle_lvs or []) + (back_lvs or []):
                if isinstance(eid, (int, float)):
                    active_enemy_ids.add(int(eid))

    # Ornament_values need special sorting
    ornament_rows = []

    print("Extracting bin tables...")
    for res_id, table_name in sorted(RESOURCES.items()):
        if res_id not in all_bins:
            continue

        bin_data = all_bins[res_id]
        reader = BinReader(bin_data)
        reader.read_uint()  # skip res_id
        row_count = reader.read_uint()
        rows = []

        failed_rows = 0
        for row_idx in range(row_count):
            if reader.bytes_left() < 4:
                break

            start_pos = reader.pos
            try:
                row = parse_row(reader, table_name)
            except Exception as e:
                failed_rows += 1
                if failed_rows <= 3:
                    print(f"    WARN: Parse error in {table_name} row {row_idx} at offset {start_pos}: {type(e).__name__}: {e}")
                continue

            if row is not None:
                rows.append(row)

        # Handle ornament_values sorting
        if table_name == "ornament_values":
            ornament_rows.extend(rows)
            ornament_rows.sort(key=lambda x: (x["item_id"], x["level"]))
            for idx, r in enumerate(ornament_rows):
                r["id"] = idx + 1
            count = write_json(out_dir, table_name, ornament_rows, generated_at)
            manifest_tables[table_name] = {"path": f"/data/{table_name}.json", "rowCount": count}
            ornament_rows = []
            continue

        count = write_json(out_dir, table_name, rows, generated_at)
        manifest_tables[table_name] = {"path": f"/data/{table_name}.json", "rowCount": count}

    # Activity details
    print("\nExtracting activity_details...")
    count = export_activity_details(bins0, bins1, out_dir, generated_at)
    manifest_tables["activity_details"] = {"path": "/data/activity_details.json", "rowCount": count}

    # Standalone heroes from 01000005.bin
    print("\nExtracting standalone heroes from 01000005.bin...")
    count = export_standalone_heroes(out_dir, generated_at)
    manifest_tables["heroes"] = {"path": "/data/heroes.json", "rowCount": count}

    # Generate manifest
    print("\nGenerating manifest...")
    manifest = {"generatedAt": generated_at, "tables": manifest_tables}
    manifest_path = os.path.join(out_dir, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=True, indent=2)
    print(f"Manifest written: {len(manifest_tables)} tables")

    # Revert JSON files where only the generatedAt date changed
    revert_date_only_changes(out_dir)

    print(f"\nDone! All data exported to {out_dir}/")


if __name__ == "__main__":
    main()
