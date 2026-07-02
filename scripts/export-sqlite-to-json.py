import os
import sqlite3
import json
from datetime import datetime

def try_parse_json(val):
    if not val or not isinstance(val, str):
        return val
    stripped = val.strip()
    if (stripped.startswith('[') and stripped.endswith(']')) or (stripped.startswith('{') and stripped.endswith('}')):
        try:
            return json.loads(stripped)
        except Exception:
            return val
    return val

def main():
    db_path = "../catalogs.db"
    if not os.path.exists(db_path):
        db_path = "catalogs.db"
    if not os.path.exists(db_path):
        db_path = "/home/marko/bleachflash/catalogs.db"
        
    if not os.path.exists(db_path):
        print(f"Error: Database file not found.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    tables = [
        "articles",
        "cities",
        "daily_quests",
        "heroes",
        "mall_items",
        "promotional_activities",
        "stages",
        "story_quests"
    ]

    output_dir = "public/data"
    os.makedirs(output_dir, exist_ok=True)

    generated_at = datetime.utcnow().isoformat() + "Z"
    manifest_tables = {}

    for table in tables:
        print(f"Exporting table '{table}'...")
        try:
            cursor.execute(f"PRAGMA table_info({table})")
            columns = [col[1] for col in cursor.fetchall()]

            cursor.execute(f"SELECT * FROM {table}")
            rows = cursor.fetchall()

            json_rows = []
            for row in rows:
                row_dict = {}
                for col_name, val in zip(columns, row):
                    # Special field handling / general JSON parsing
                    row_dict[col_name] = try_parse_json(val)
                json_rows.append(row_dict)

            output_file = os.path.join(output_dir, f"{table}.json")
            data = {
                "table": table,
                "rowCount": len(json_rows),
                "generatedAt": generated_at,
                "rows": json_rows
            }

            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

            manifest_tables[table] = {
                "path": f"/data/{table}.json",
                "rowCount": len(json_rows)
            }
            print(f"Table '{table}' exported. Rows: {len(json_rows)}")

        except Exception as e:
            print(f"Failed to export table '{table}': {e}")

    # Generate manifest
    manifest_tables["knives"] = {
        "path": "/data/knives.json",
        "rowCount": 24
    }
    manifest_tables["recommend_heroes"] = {
        "path": "/data/recommend_heroes.json",
        "rowCount": 19
    }
    manifest_tables["related_partners"] = {
        "path": "/data/related_partners.json",
        "rowCount": 1151
    }
    manifest_tables["related_partner_types"] = {
        "path": "/data/related_partner_types.json",
        "rowCount": 7590
    }
    manifest_tables["related_conditions"] = {
        "path": "/data/related_conditions.json",
        "rowCount": 51
    }
    manifest_tables["related_partner_points"] = {
        "path": "/data/related_partner_points.json",
        "rowCount": 9
    }
    manifest_tables["knife_strengthens"] = {
        "path": "/data/knife_strengthens.json",
        "rowCount": 72
    }
    manifest_tables["skills"] = {
        "path": "/data/skills.json",
        "rowCount": 8048
    }
    manifest_tables["partner_changes"] = {
        "path": "/data/partner_changes.json",
        "rowCount": 931
    }
    manifest_tables["hero_change_attrs"] = {
        "path": "/data/hero_change_attrs.json",
        "rowCount": 133
    }
    manifest_tables["knife_expands"] = {
        "path": "/data/knife_expands.json",
        "rowCount": 96
    }
    manifest_tables["base_stones"] = {
        "path": "/data/base_stones.json",
        "rowCount": 132
    }
    manifest_tables["home_girl_friends"] = {
        "path": "/data/home_girl_friends.json",
        "rowCount": 10
    }
    manifest_tables["home_girl_awards"] = {
        "path": "/data/home_girl_awards.json",
        "rowCount": 24
    }
    manifest_tables["home_girl_interacts"] = {
        "path": "/data/home_girl_interacts.json",
        "rowCount": 8
    }
    manifest_tables["home_girl_moods"] = {
        "path": "/data/home_girl_moods.json",
        "rowCount": 5
    }
    manifest_tables["base_equips"] = {
        "path": "/data/base_equips.json",
        "rowCount": 800
    }
    manifest_tables["suits"] = {
        "path": "/data/suits.json",
        "rowCount": 158
    }
    manifest_tables["equip_upgrades"] = {
        "path": "/data/equip_upgrades.json",
        "rowCount": 88
    }
    manifest_tables["equip_additionals"] = {
        "path": "/data/equip_additionals.json",
        "rowCount": 144
    }
    manifest_tables["equip_generates"] = {
        "path": "/data/equip_generates.json",
        "rowCount": 180
    }
    manifest_tables["wake_ups"] = {
        "path": "/data/wake_ups.json",
        "rowCount": 147
    }
    manifest_tables["leader_wake_ups"] = {
        "path": "/data/leader_wake_ups.json",
        "rowCount": 104
    }
    manifest_tables["wake_up_equips"] = {
        "path": "/data/wake_up_equips.json",
        "rowCount": 160
    }
    manifest_tables["pet_level_ups"] = {
        "path": "/data/pet_level_ups.json",
        "rowCount": 4655
    }
    manifest_tables["vice_pet_makes"] = {
        "path": "/data/vice_pet_makes.json",
        "rowCount": 21
    }
    manifest_tables["vice_pet_rank_ups"] = {
        "path": "/data/vice_pet_rank_ups.json",
        "rowCount": 105
    }
    manifest_tables["vice_pet_trains"] = {
        "path": "/data/vice_pet_trains.json",
        "rowCount": 3
    }
    manifest_tables["main_pet_rank_ups"] = {
        "path": "/data/main_pet_rank_ups.json",
        "rowCount": 15
    }
    manifest_tables["achievements"] = {
        "path": "/data/achievements.json",
        "rowCount": 164
    }
    manifest_tables["achievement_titles"] = {
        "path": "/data/achievement_titles.json",
        "rowCount": 78
    }
    manifest_tables["achievement_groups"] = {
        "path": "/data/achievement_groups.json",
        "rowCount": 30
    }
    manifest_tables["achievement_classes"] = {
        "path": "/data/achievement_classes.json",
        "rowCount": 6
    }
    manifest_tables["tavern_grades"] = {
        "path": "/data/tavern_grades.json",
        "rowCount": 7
    }
    manifest_tables["tavern_pay_configs"] = {
        "path": "/data/tavern_pay_configs.json",
        "rowCount": 18
    }
    manifest_tables["tavern_warriors"] = {
        "path": "/data/tavern_warriors.json",
        "rowCount": 32
    }
    manifest_tables["treasure_levelups"] = {
        "path": "/data/treasure_levelups.json",
        "rowCount": 108
    }
    manifest_tables["treasure_upgrades"] = {
        "path": "/data/treasure_upgrades.json",
        "rowCount": 924
    }
    manifest_tables["spirit_schools"] = {
        "path": "/data/spirit_schools.json",
        "rowCount": 6
    }
    manifest_tables["spirit_school_exps"] = {
        "path": "/data/spirit_school_exps.json",
        "rowCount": 3018
    }
    manifest_tables["butterflies"] = {
        "path": "/data/butterflies.json",
        "rowCount": 159
    }
    manifest_tables["butterfly_feedings"] = {
        "path": "/data/butterfly_feedings.json",
        "rowCount": 1749
    }
    manifest_tables["black_market_items"] = {
        "path": "/data/black_market_items.json",
        "rowCount": 1071
    }
    manifest_tables["enemy_armies"] = {
        "path": "/data/enemy_armies.json",
        "rowCount": 4187
    }
    manifest_tables["enemies"] = {
        "path": "/data/enemies.json",
        "rowCount": 18382
    }
    manifest_tables["awards"] = {
        "path": "/data/awards.json",
        "rowCount": 10066
    }
    manifest_tables["config_values"] = {
        "path": "/data/config_values.json",
        "rowCount": 665
    }
    manifest_tables["org_base"] = {
        "path": "/data/org_base.json",
        "rowCount": 51
    }
    manifest_tables["org_additions"] = {
        "path": "/data/org_additions.json",
        "rowCount": 52
    }
    manifest_tables["org_devotions"] = {
        "path": "/data/org_devotions.json",
        "rowCount": 159
    }
    manifest_tables["vip_configs"] = {
        "path": "/data/vip_configs.json",
        "rowCount": 11
    }
    manifest_tables["ornament_values"] = {
        "path": "/data/ornament_values.json",
        "rowCount": 15200
    }
    manifest_tables["ornament_upgrades"] = {
        "path": "/data/ornament_upgrades.json",
        "rowCount": 48
    }
    manifest_tables["star_maps"] = {
        "path": "/data/star_maps.json",
        "rowCount": 15
    }
    manifest_tables["star_points"] = {
        "path": "/data/star_points.json",
        "rowCount": 225
    }
    manifest_tables["temple_points"] = {
        "path": "/data/temple_points.json",
        "rowCount": 360
    }
    manifest_tables["temple_values"] = {
        "path": "/data/temple_values.json",
        "rowCount": 1320
    }
    manifest_tables["temple_pvps"] = {
        "path": "/data/temple_pvps.json",
        "rowCount": 39
    }
    manifest_tables["temple_plies"] = {
        "path": "/data/temple_plies.json",
        "rowCount": 12
    }
    manifest_tables["military"] = {
        "path": "/data/military.json",
        "rowCount": 36
    }
    manifest_tables["culling_magics"] = {
        "path": "/data/culling_magics.json",
        "rowCount": 1204
    }
    manifest_tables["culling_stages"] = {
        "path": "/data/culling_stages.json",
        "rowCount": 42
    }
    manifest_tables["equip_forging"] = {
        "path": "/data/equip_forging.json",
        "rowCount": 40
    }
    manifest_tables["equip_advancement"] = {
        "path": "/data/equip_advancement.json",
        "rowCount": 112
    }
    manifest_tables["nightmare_points"] = {
        "path": "/data/nightmare_points.json",
        "rowCount": 180
    }
    manifest_tables["nightmare_cities"] = {
        "path": "/data/nightmare_cities.json",
        "rowCount": 12
    }
    manifest_tables["seven_hero_stars"] = {
        "path": "/data/seven_hero_stars.json",
        "rowCount": 7
    }
    manifest_tables["seven_hero_little_stars"] = {
        "path": "/data/seven_hero_little_stars.json",
        "rowCount": 42
    }
    manifest_tables["seven_hero_souls"] = {
        "path": "/data/seven_hero_souls.json",
        "rowCount": 8
    }
    manifest_tables["seven_hero_armies"] = {
        "path": "/data/seven_hero_armies.json",
        "rowCount": 21
    }
    manifest_tables["seven_hero_daily_awards"] = {
        "path": "/data/seven_hero_daily_awards.json",
        "rowCount": 7
    }
    manifest_tables["soul_collection_rnds"] = {
        "path": "/data/soul_collection_rnds.json",
        "rowCount": 633
    }
    manifest_tables["soul_collection_shops"] = {
        "path": "/data/soul_collection_shops.json",
        "rowCount": 21
    }
    manifest_tables["soul_collection_bases"] = {
        "path": "/data/soul_collection_bases.json",
        "rowCount": 3
    }
    manifest_data = {
        "generatedAt": generated_at,
        "tables": manifest_tables
    }
    manifest_path = os.path.join(output_dir, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, ensure_ascii=False, indent=2)
    print("Manifest file generated successfully.")

    conn.close()

if __name__ == "__main__":
    main()
