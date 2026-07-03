import struct
import zlib
import json
import os

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

    def read_ushort(self):
        val = struct.unpack_from("<H", self.data, self.pos)[0]
        self.pos += 2
        return val

    def read_float(self):
        val = struct.unpack_from("<f", self.data, self.pos)[0]
        self.pos += 4
        return val

    def read_double(self):
        val = struct.unpack_from("<d", self.data, self.pos)[0]
        self.pos += 8
        return val

    def read_utf(self):
        length = self.read_ushort()
        val = self.data[self.pos:self.pos+length].decode("utf-8", errors="ignore")
        self.pos += length
        return val

def try_json_load(val):
    if not val:
        return []
    try:
        return json.loads(val)
    except:
        return val

def scan_package(file_path):
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found.")
        return {}
    
    with open(file_path, "rb") as f:
        data = f.read()
    
    package_id, bin_count = struct.unpack_from("<IH", data, 0)
    
    offset = 6
    decompressed_bins = {}
    for i in range(bin_count):
        bin_len = struct.unpack_from("<I", data, offset)[0]
        offset += 4
        bin_bytes = data[offset:offset+bin_len]
        offset += bin_len
        try:
            decomp = zlib.decompress(bin_bytes)
            res_id = struct.unpack_from("<I", decomp, 0)[0]
            decompressed_bins[res_id] = decomp
        except Exception as e:
            pass
    return decompressed_bins

def main():
    pkg0 = scan_package("../0F000000.binPackage")
    pkg1 = scan_package("../0F000001.binPackage")
    all_bins = {**pkg0, **pkg1}

    out_dir = "public/data"
    os.makedirs(out_dir, exist_ok=True)

    # 1. BaseEquip (16777220)
    if 16777220 in all_bins:
        reader = BinReader(all_bins[16777220])
        reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            dress_profession = reader.read_utf()
            main_type = try_json_load(reader.read_utf())
            main_value = try_json_load(reader.read_utf())
            main_additional_type = reader.read_uint()
            max_additional_count = reader.read_int()
            hole_count = reader.read_int()
            suit_id = reader.read_uint()
            skill_revise = reader.read_uint()
            edge_color = reader.read_uint()
            flush_spirit_coeff = reader.read_float()
            drill_hole_num = reader.read_uint()
            rows.append({
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
                "flush_spirit_coefficient": round(flush_spirit_coeff, 4),
                "drill_hole_num": drill_hole_num
            })
        with open(os.path.join(out_dir, "base_equips.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "base_equips", "rowCount": len(rows), "rows": rows}, f, indent=2)
        print(f"Extracted base_equips.json: {len(rows)} rows.")

    # 2. Suit (16777283)
    if 16777283 in all_bins:
        reader = BinReader(all_bins[16777283])
        reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            name = reader.read_utf()
            max_count = reader.read_uint()
            effects = try_json_load(reader.read_utf())
            rows.append({
                "id": row_id,
                "name": name,
                "max_count": max_count,
                "effects": effects
            })
        with open(os.path.join(out_dir, "suits.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "suits", "rowCount": len(rows), "rows": rows}, f, indent=2)
        print(f"Extracted suits.json: {len(rows)} rows.")

    # 3. EquipUpgrade (16777242)
    if 16777242 in all_bins:
        reader = BinReader(all_bins[16777242])
        reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            got_equip_id = reader.read_uint()
            datum = reader.read_utf()
            # Datum split logic
            parts = datum.split("_")
            material = int(parts[0]) if len(parts) > 0 and parts[0].isdigit() else 0
            quantity = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 0
            rows.append({
                "id": row_id,
                "got_equip_id": got_equip_id,
                "datum": datum,
                "material": material,
                "quantity": quantity
            })
        with open(os.path.join(out_dir, "equip_upgrades.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "equip_upgrades", "rowCount": len(rows), "rows": rows}, f, indent=2)
        print(f"Extracted equip_upgrades.json: {len(rows)} rows.")

    # 4. EquipAdditional (16777240)
    if 16777240 in all_bins:
        reader = BinReader(all_bins[16777240])
        reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            equip_level = reader.read_uint()
            sort_number = reader.read_uint()
            type_effect_str = reader.read_utf()
            type_effect = try_json_load(type_effect_str)
            
            category, divisor, percentage, max_value, min_value = 0, 0, 0, 0, 0
            if isinstance(type_effect, dict) and "typeEffect" in type_effect:
                parts = str(type_effect["typeEffect"]).split("_")
                if len(parts) >= 5:
                    category = int(parts[0]) if parts[0].isdigit() else 0
                    min_value = int(parts[1]) if parts[1].isdigit() else 0
                    max_value = int(parts[2]) if parts[2].isdigit() else 0
                    divisor = int(parts[3]) if parts[3].isdigit() else 0
                    percentage = int(parts[4]) if parts[4].isdigit() else 0
            
            rows.append({
                "id": row_id,
                "equip_level": equip_level,
                "sort_number": sort_number,
                "type_effect": type_effect,
                "category": category,
                "min_value": min_value,
                "max_value": max_value,
                "divisor": divisor,
                "percentage": percentage
            })
        with open(os.path.join(out_dir, "equip_additionals.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "equip_additionals", "rowCount": len(rows), "rows": rows}, f, indent=2)
        print(f"Extracted equip_additionals.json: {len(rows)} rows.")

    # 5. EquipGenerate (16777241)
    if 16777241 in all_bins:
        reader = BinReader(all_bins[16777241])
        reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            open_level = reader.read_uint()
            cost = reader.read_uint()
            datum = reader.read_utf()
            
            materials = []
            if datum:
                for part in datum.split("|"):
                    sub = part.split("_")
                    if len(sub) == 2:
                        materials.append({"material": int(sub[0]), "quantity": int(sub[1])})
            rows.append({
                "id": row_id,
                "open_level": open_level,
                "cost": cost,
                "materials": materials,
                "datum": datum
            })
        with open(os.path.join(out_dir, "equip_generates.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "equip_generates", "rowCount": len(rows), "rows": rows}, f, indent=2)
        print(f"Extracted equip_generates.json: {len(rows)} rows.")

    # 6. WakeUp (16777460)
    if 16777460 in all_bins:
        reader = BinReader(all_bins[16777460])
        reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            index_wakeups = try_json_load(reader.read_utf())
            rows.append({
                "id": row_id,
                "index_wakeups": index_wakeups
            })
        with open(os.path.join(out_dir, "wake_ups.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "wake_ups", "rowCount": len(rows), "rows": rows}, f, indent=2)
        print(f"Extracted wake_ups.json: {len(rows)} rows.")

    # 7. LeaderWakeUp (16777487)
    if 16777487 in all_bins:
        reader = BinReader(all_bins[16777487])
        reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            up_id = reader.read_uint()
            next_id = reader.read_uint()
            pos_equip = reader.read_uint()
            wake_stage = reader.read_uint()
            quality = reader.read_uint()
            max_str = reader.read_uint()
            up_level = reader.read_uint()
            strengthen_price = try_json_load(reader.read_utf())
            uplevel_price = try_json_load(reader.read_utf())
            equip_attr = try_json_load(reader.read_utf())
            value_str = reader.read_uint()
            rows.append({
                "id": row_id,
                "up_id": up_id,
                "next_id": next_id,
                "pos_equip": pos_equip,
                "wake_stage": wake_stage,
                "quality": quality,
                "max_str": max_str,
                "up_level": up_level,
                "strengthen_price": strengthen_price,
                "uplevel_price": uplevel_price,
                "equip_attr": equip_attr,
                "value_str": value_str
            })
        with open(os.path.join(out_dir, "leader_wake_ups.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "leader_wake_ups", "rowCount": len(rows), "rows": rows}, f, indent=2)
        print(f"Extracted leader_wake_ups.json: {len(rows)} rows.")

    # 8. WakeUpEquip (16777459)
    if 16777459 in all_bins:
        reader = BinReader(all_bins[16777459])
        reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            need_level = reader.read_int()
            property_items = try_json_load(reader.read_utf())
            compose_items = try_json_load(reader.read_utf())
            cost_price = reader.read_int()
            source_items = try_json_load(reader.read_utf())
            rows.append({
                "id": row_id,
                "need_level": need_level,
                "property_items": property_items,
                "compose_items": compose_items,
                "cost_price": cost_price,
                "source_items": source_items
            })
        with open(os.path.join(out_dir, "wake_up_equips.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "wake_up_equips", "rowCount": len(rows), "rows": rows}, f, indent=2)
        print(f"Extracted wake_up_equips.json: {len(rows)} rows.")

    # 9. PetLevelUp (16777424)
    if 16777424 in all_bins:
        reader = BinReader(all_bins[16777424])
        reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            pet_id = reader.read_uint()
            is_max_level = reader.read_uint()
            level = reader.read_uint()
            name = reader.read_utf()
            star_level = try_json_load(reader.read_utf())
            attributes = try_json_load(reader.read_utf())
            grow_rates = try_json_load(reader.read_utf())
            need_exp = reader.read_uint()
            total_exp = reader.read_uint()
            quality = reader.read_uint()
            pet_resource_id = reader.read_uint()
            source_pet = reader.read_uint()
            rows.append({
                "id": row_id,
                "pet_id": pet_id,
                "is_max_level": is_max_level,
                "level": level,
                "name": name,
                "star_level": star_level,
                "attributes": attributes,
                "grow_rates": grow_rates,
                "need_exp": need_exp,
                "total_exp": total_exp,
                "quality": quality,
                "pet_resource_id": pet_resource_id,
                "source_pet": source_pet
            })
        with open(os.path.join(out_dir, "pet_level_ups.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "pet_level_ups", "rowCount": len(rows), "rows": rows}, f, indent=2)
        print(f"Extracted pet_level_ups.json: {len(rows)} rows.")

    # 10. VicePetMake (16777425)
    if 16777425 in all_bins:
        reader = BinReader(all_bins[16777425])
        reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            consume = try_json_load(reader.read_utf())
            need_silver = reader.read_uint()
            pathway = reader.read_utf()
            rows.append({
                "id": row_id,
                "consume": consume,
                "need_silver": need_silver,
                "pathway": pathway
            })
        with open(os.path.join(out_dir, "vice_pet_makes.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "vice_pet_makes", "rowCount": len(rows), "rows": rows}, f, indent=2)
        print(f"Extracted vice_pet_makes.json: {len(rows)} rows.")

    # 11. VicePetRankUp (16777426)
    if 16777426 in all_bins:
        reader = BinReader(all_bins[16777426])
        reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            next_pet_id = reader.read_uint()
            condition = try_json_load(reader.read_utf())
            pet_level = reader.read_uint()
            need_silver = reader.read_uint()
            rows.append({
                "id": row_id,
                "next_pet_id": next_pet_id,
                "condition": condition,
                "pet_level": pet_level,
                "need_silver": need_silver
            })
        with open(os.path.join(out_dir, "vice_pet_rank_ups.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "vice_pet_rank_ups", "rowCount": len(rows), "rows": rows}, f, indent=2)
        print(f"Extracted vice_pet_rank_ups.json: {len(rows)} rows.")

    # 12. VicePetTrain (16777427)
    if 16777427 in all_bins:
        reader = BinReader(all_bins[16777427])
        reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            need_time = reader.read_uint()
            silver = reader.read_uint()
            get_exp = reader.read_uint()
            need_gold = try_json_load(reader.read_utf())
            need_exp = try_json_load(reader.read_utf())
            vip_limit = reader.read_uint()
            rows.append({
                "id": row_id,
                "need_time": need_time,
                "silver": silver,
                "get_exp": get_exp,
                "need_gold": need_gold,
                "need_exp": need_exp,
                "vip_limit": vip_limit
            })
        with open(os.path.join(out_dir, "vice_pet_trains.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "vice_pet_trains", "rowCount": len(rows), "rows": rows}, f, indent=2)
        print(f"Extracted vice_pet_trains.json: {len(rows)} rows.")

    # 13. MainPetRankUp (16777422)
    if 16777422 in all_bins:
        reader = BinReader(all_bins[16777422])
        reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            condition = try_json_load(reader.read_utf())
            add_exp = reader.read_uint()
            stage = reader.read_uint()
            rows.append({
                "id": row_id,
                "condition": condition,
                "add_exp": add_exp,
                "stage": stage
            })
        with open(os.path.join(out_dir, "main_pet_rank_ups.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "main_pet_rank_ups", "rowCount": len(rows), "rows": rows}, f, indent=2)
        print(f"Extracted main_pet_rank_ups.json: {len(rows)} rows.")

    # 14. Achievement (16777355)
    if 16777355 in all_bins:
        reader = BinReader(all_bins[16777355])
        reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            name = reader.read_utf()
            follow_pic = reader.read_uint()
            cond_array_1 = try_json_load(reader.read_utf())
            cond_str = reader.read_utf()
            reward_str = reader.read_utf()
            rewards = try_json_load(reader.read_utf())
            cond_array_2 = try_json_load(reader.read_utf())
            if_have_title = reader.read_int()
            title_id = reader.read_int()
            rows.append({
                "id": row_id,
                "name": name,
                "follow_pic": follow_pic,
                "conditions_array_1": cond_array_1,
                "condition_str": cond_str,
                "reward_str": reward_str,
                "rewards": rewards,
                "conditions_array_2": cond_array_2,
                "if_have_title": if_have_title,
                "title_id": title_id
            })
        with open(os.path.join(out_dir, "achievements.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "achievements", "rowCount": len(rows), "rows": rows}, f, indent=2)
        print(f"Extracted achievements.json: {len(rows)} rows.")

    # 15. AchievementTitle (16777358)
    if 16777358 in all_bins:
        reader = BinReader(all_bins[16777358])
        reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            name = reader.read_utf()
            level_title = reader.read_int()
            not_or_prop = reader.read_int()
            title_type_group = reader.read_int()
            time_limit_not = reader.read_int()
            val_time_limit = reader.read_int()
            formation_type = reader.read_int()
            add_other_array = try_json_load(reader.read_utf())
            rows.append({
                "id": row_id,
                "name": name,
                "level_title": level_title,
                "not_or_prop": not_or_prop,
                "title_type_group": title_type_group,
                "time_limit_not": time_limit_not,
                "val_time_limit": val_time_limit,
                "formation_type": formation_type,
                "add_other_array": add_other_array
            })
        with open(os.path.join(out_dir, "achievement_titles.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "achievement_titles", "rowCount": len(rows), "rows": rows}, f, indent=2)
        print(f"Extracted achievement_titles.json: {len(rows)} rows.")

    # 16. AchievementGroup (16777356)
    if 16777356 in all_bins:
        reader = BinReader(all_bins[16777356])
        reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            name = reader.read_utf()
            achievements_id = try_json_load(reader.read_utf())
            rows.append({
                "id": row_id,
                "name": name,
                "achievements_id": achievements_id
            })
        with open(os.path.join(out_dir, "achievement_groups.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "achievement_groups", "rowCount": len(rows), "rows": rows}, f, indent=2)
        print(f"Extracted achievement_groups.json: {len(rows)} rows.")

    # 17. AchievementClass (16777357)
    if 16777357 in all_bins:
        reader = BinReader(all_bins[16777357])
        reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            name = reader.read_utf()
            achievement_groups_id = try_json_load(reader.read_utf())
            rows.append({
                "id": row_id,
                "name": name,
                "achievement_groups_id": achievement_groups_id
            })
        with open(os.path.join(out_dir, "achievement_classes.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "achievement_classes", "rowCount": len(rows), "rows": rows}, f, indent=2)
        print(f"Extracted achievement_classes.json: {len(rows)} rows.")

    # 18. Tavern_Grade (16777287)
    if 16777287 in all_bins:
        reader = BinReader(all_bins[16777287])
        reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            level = reader.read_uint()
            page = reader.read_uint()
            wine_lv_raw = try_json_load(reader.read_utf())
            wine_lvs = wine_lv_raw.get("wineLv", []) if isinstance(wine_lv_raw, dict) else wine_lv_raw
            pay_configs = try_json_load(reader.read_utf())
            vips = try_json_load(reader.read_utf())
            preview = reader.read_uint()
            tips = reader.read_utf()
            is_tavern = reader.read_uint()
            rows.append({
                "id": row_id,
                "level": level,
                "page": page,
                "wine_lvs": wine_lvs,
                "pay_configs": pay_configs,
                "vips": vips,
                "preview": preview,
                "tips": tips,
                "is_tavern": is_tavern
            })
        with open(os.path.join(out_dir, "tavern_grades.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "tavern_grades", "rowCount": len(rows), "rows": rows}, f, indent=2)
        print(f"Extracted tavern_grades.json: {len(rows)} rows.")

    # 19. Tavern_PayConfig (16777288)
    if 16777288 in all_bins:
        reader = BinReader(all_bins[16777288])
        reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            key = reader.read_utf()
            types = try_json_load(reader.read_utf())
            value = reader.read_uint()
            desc = reader.read_utf()
            rows.append({
                "id": row_id,
                "key": key,
                "types": types,
                "value": value,
                "desc": desc
            })
        with open(os.path.join(out_dir, "tavern_pay_configs.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "tavern_pay_configs", "rowCount": len(rows), "rows": rows}, f, indent=2)
        print(f"Extracted tavern_pay_configs.json: {len(rows)} rows.")

    # 20. Tavern_Warrior (16777289)
    if 16777289 in all_bins:
        reader = BinReader(all_bins[16777289])
        reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            grade = reader.read_uint()
            award_id = reader.read_uint()
            return_type = reader.read_uint()
            return_value = reader.read_uint()
            recruit_soul = reader.read_uint()
            recruit_name = reader.read_utf()
            win_dialogue = reader.read_utf()
            lose_dialogue = reader.read_utf()
            awardsoul = try_json_load(reader.read_utf())
            rows.append({
                "id": row_id,
                "grade": grade,
                "award_id": award_id,
                "return_type": return_type,
                "return_value": return_value,
                "recruit_soul": recruit_soul,
                "recruit_name": recruit_name,
                "win_dialogue": win_dialogue,
                "lose_dialogue": lose_dialogue,
                "awardsoul": awardsoul
            })
        with open(os.path.join(out_dir, "tavern_warriors.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "tavern_warriors", "rowCount": len(rows), "rows": rows}, f, indent=2)
        print(f"Extracted tavern_warriors.json: {len(rows)} rows.")

    # 21. TreasureLevelup (16777290)
    if 16777290 in all_bins:
        reader = BinReader(all_bins[16777290])
        reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            level = reader.read_uint()
            need_gold = reader.read_uint()
            up_item = reader.read_uint()
            up_level = reader.read_uint()
            rows.append({
                "id": row_id,
                "level": level,
                "need_gold": need_gold,
                "up_item": up_item,
                "up_level": up_level
            })
        with open(os.path.join(out_dir, "treasure_levelups.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "treasure_levelups", "rowCount": len(rows), "rows": rows}, f, indent=2)
        print(f"Extracted treasure_levelups.json: {len(rows)} rows.")

    # 22. TreasureUpgrade (16777291)
    if 16777291 in all_bins:
        reader = BinReader(all_bins[16777291])
        reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            item_id = reader.read_uint()
            level = reader.read_uint()
            cost_item_count = reader.read_uint()
            add_value = try_json_load(reader.read_utf())
            cost_gold = reader.read_uint()
            product_count = reader.read_uint()
            cost_stone_count = reader.read_uint()
            rows.append({
                "id": row_id,
                "item_id": item_id,
                "level": level,
                "cost_item_count": cost_item_count,
                "add_value": add_value,
                "cost_gold": cost_gold,
                "product_count": product_count,
                "cost_stone_count": cost_stone_count
            })
        with open(os.path.join(out_dir, "treasure_upgrades.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "treasure_upgrades", "rowCount": len(rows), "rows": rows}, f, indent=2)
        print(f"Extracted treasure_upgrades.json: {len(rows)} rows.")

    # 23. SpiritSchool (16777410)
    if 16777410 in all_bins:
        reader = BinReader(all_bins[16777410])
        reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            name = reader.read_utf()
            level_limit = reader.read_uint()
            effect_name = reader.read_utf()
            add_type = reader.read_uint()
            rows.append({
                "id": row_id,
                "name": name,
                "level_limit": level_limit,
                "effect_name": effect_name,
                "add_type": add_type
            })
        with open(os.path.join(out_dir, "spirit_schools.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "spirit_schools", "rowCount": len(rows), "rows": rows}, f, indent=2)
        print(f"Extracted spirit_schools.json: {len(rows)} rows.")

    # 24. SpiritSchoolExp (16777411)
    if 16777411 in all_bins:
        reader = BinReader(all_bins[16777411])
        reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            monster_id = reader.read_uint()
            name = reader.read_utf()
            effect_name = reader.read_utf()
            monster_level = reader.read_uint()
            need_exp = reader.read_uint()
            
            add_type_raw = try_json_load(reader.read_utf())
            add_type = add_type_raw.get("addValue", 0) if isinstance(add_type_raw, dict) else add_type_raw
            
            rows.append({
                "id": row_id,
                "monster_id": monster_id,
                "name": name,
                "effect_name": effect_name,
                "monster_level": monster_level,
                "need_exp": need_exp,
                "add_type": add_type
            })
        with open(os.path.join(out_dir, "spirit_school_exps.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "spirit_school_exps", "rowCount": len(rows), "rows": rows}, f, indent=2)
        print(f"Extracted spirit_school_exps.json: {len(rows)} rows.")

    # 25. Butterfly (16777303)
    if 16777303 in all_bins:
        reader = BinReader(all_bins[16777303])
        reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            upgrade_exp = reader.read_uint()
            model_id = reader.read_uint()
            rows.append({
                "id": row_id,
                "upgrade_exp": upgrade_exp,
                "model_id": model_id
            })
        with open(os.path.join(out_dir, "butterflies.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "butterflies", "rowCount": len(rows), "rows": rows}, f, indent=2)
        print(f"Extracted butterflies.json: {len(rows)} rows.")

    # 26. ButterflyFeeding (16777304)
    if 16777304 in all_bins:
        reader = BinReader(all_bins[16777304])
        reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            vip_level = reader.read_uint()
            powder_level = reader.read_uint()
            butterfly_rewards = try_json_load(reader.read_utf())
            rows.append({
                "id": row_id,
                "vip_level": vip_level,
                "powder_level": powder_level,
                "butterfly_rewards": butterfly_rewards
            })
        with open(os.path.join(out_dir, "butterfly_feedings.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "butterfly_feedings", "rowCount": len(rows), "rows": rows}, f, indent=2)
        print(f"Extracted butterfly_feedings.json: {len(rows)} rows.")

    # 27. BlackMarket (16777419)
    if 16777419 in all_bins:
        reader = BinReader(all_bins[16777419])
        reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            model = reader.read_int()
            item_id = reader.read_int()
            old_price = try_json_load(reader.read_utf())
            price = try_json_load(reader.read_utf())
            number = reader.read_int()
            total_times = reader.read_int()
            rows.append({
                "id": row_id,
                "model": model,
                "item_id": item_id,
                "old_price": old_price,
                "price": price,
                "number": number,
                "total_times": total_times
            })
        with open(os.path.join(out_dir, "black_market_items.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "black_market_items", "rowCount": len(rows), "rows": rows}, f, indent=2)
        print(f"Extracted black_market_items.json: {len(rows)} rows.")

    # 28. BuildValue (16777227)
    if 16777227 in all_bins:
        reader = BinReader(all_bins[16777227])
        reader.read_uint() # resource_id
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            build_level = reader.read_uint()
            quality = reader.read_uint()
            equip_type = reader.read_uint()
            value = reader.read_uint()
            add_value = reader.read_uint()
            rows.append({
                "id": row_id,
                "build_level": build_level,
                "quality": quality,
                "equip_type": equip_type,
                "value": value,
                "add_value": add_value
            })
        with open(os.path.join(out_dir, "build_values.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "build_values", "rowCount": len(rows), "rows": rows}, f, indent=2)
        print(f"Extracted build_values.json: {len(rows)} rows.")

    # 29. BuildConsume (16777226)
    if 16777226 in all_bins:
        reader = BinReader(all_bins[16777226])
        reader.read_uint() # resource_id
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            consume = reader.read_uint()
            rows.append({
                "id": row_id,
                "consume": consume,
            })
        with open(os.path.join(out_dir, "build_consumes.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "build_consumes", "rowCount": len(rows), "rows": rows}, f, indent=2)
        print(f"Extracted build_consumes.json: {len(rows)} rows.")

    # 30. TimeHero (16777435)
    if 16777435 in all_bins:
        reader = BinReader(all_bins[16777435])
        reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            one_day_cost = reader.read_uint()
            three_day_cost = reader.read_uint()
            seven_day_cost = reader.read_uint()
            forever_cost = reader.read_uint()
            time_list = try_json_load(reader.read_utf())
            need_candy = reader.read_uint()
            rows.append({
                "id": row_id,
                "one_day_cost": one_day_cost,
                "three_day_cost": three_day_cost,
                "seven_day_cost": seven_day_cost,
                "forever_cost": forever_cost,
                "time_list": time_list,
                "need_candy": need_candy
            })
        with open(os.path.join(out_dir, "ttimehero.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "ttimehero", "rowCount": len(rows), "rows": rows}, f, indent=2, ensure_ascii=False)
        print(f"Extracted ttimehero.json: {len(rows)} rows.")

    # 31. GSPVP_Reward (16777395)
    if 16777395 in all_bins:
        reader = BinReader(all_bins[16777395])
        reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            from_rank = reader.read_int()
            to_rank = reader.read_int()
            awards = try_json_load(reader.read_utf())
            rows.append({
                "id": row_id,
                "from": from_rank,
                "to": to_rank,
                "_loc2_": awards
            })
        with open(os.path.join(out_dir, "tgspvp_reward.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "tgspvp_reward", "rowCount": len(rows), "rows": rows}, f, indent=2, ensure_ascii=False)
        print(f"Extracted tgspvp_reward.json: {len(rows)} rows.")

    # 32. GSPVP_DailyAward (16777394)
    if 16777394 in all_bins:
        reader = BinReader(all_bins[16777394])
        reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            quality = reader.read_int()
            type_val = reader.read_int()
            cost_type = reader.read_int()
            cost = reader.read_int()
            awards = try_json_load(reader.read_utf())
            rows.append({
                "id": row_id,
                "quality": quality,
                "type": type_val,
                "cost_type": cost_type,
                "cost": cost,
                "_loc2_": awards
            })
        with open(os.path.join(out_dir, "tgspvpdailyaward.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "tgspvpdailyaward", "rowCount": len(rows), "rows": rows}, f, indent=2, ensure_ascii=False)
        print(f"Extracted tgspvpdailyaward.json: {len(rows)} rows.")

    # 33. FighterDetail (16777431)
    if 16777431 in all_bins:
        reader = BinReader(all_bins[16777431])
        reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            desc = reader.read_utf()
            name = reader.read_utf()
            ask_need = try_json_load(reader.read_utf())
            enlist_paper = try_json_load(reader.read_utf())
            up_hero_id = reader.read_int()
            stype = reader.read_int()
            vip_limit = reader.read_int()
            main_hero_level = reader.read_int()
            fight_report_addr = reader.read_utf()
            rows.append({
                "id": row_id,
                "desc": desc,
                "name": name,
                "ask_need": ask_need,
                "enlist_paper": enlist_paper,
                "up_hero_id": up_hero_id,
                "stype": stype,
                "vip_limit": vip_limit,
                "main_hero_level": main_hero_level,
                "fight_report_addr": fight_report_addr
            })
        with open(os.path.join(out_dir, "tfighterdetail.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "tfighterdetail", "rowCount": len(rows), "rows": rows}, f, indent=2, ensure_ascii=False)
        print(f"Extracted tfighterdetail.json: {len(rows)} rows.")

    # 34. SystemLanguage (16777284)
    if 16777284 in all_bins:
        reader = BinReader(all_bins[16777284])
        reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            desc = reader.read_utf()
            rows.append({
                "id": row_id,
                "desc": desc
            })
        with open(os.path.join(out_dir, "tsystemlanguage.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "tsystemlanguage", "rowCount": len(rows), "rows": rows}, f, indent=2, ensure_ascii=False)
        print(f"Extracted tsystemlanguage.json: {len(rows)} rows.")

    # 35. ProfessionRefine (16777557)
    if 16777557 in all_bins:
        reader = BinReader(all_bins[16777557])
        reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            cost = reader.read_int()
            phy_atk = reader.read_float()
            magic_atk = reader.read_float()
            phy_def = reader.read_float()
            magic_def = reader.read_float()
            hp = reader.read_float()
            speed = reader.read_float()
            rows.append({
                "id": row_id,
                "cost": cost,
                "phy_atk": round(phy_atk, 6),
                "magic_atk": round(magic_atk, 6),
                "phy_def": round(phy_def, 6),
                "magic_def": round(magic_def, 6),
                "hp": round(hp, 6),
                "speed": round(speed, 6)
            })
        with open(os.path.join(out_dir, "profession_refines.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "profession_refines", "rowCount": len(rows), "rows": rows}, f, indent=2, ensure_ascii=False)
        print(f"Extracted profession_refines.json: {len(rows)} rows.")

    print("\nExtraction of all 35 missing database tables is successfully complete!")

if __name__ == "__main__":
    main()
