import struct
import zlib
import json
import os
import re

class BinReader:
    def __init__(self, data):
        self.data = data
        self.pos = 0

    def read_int(self):
        if self.pos + 4 > len(self.data):
            return 0
        val = struct.unpack_from("<i", self.data, self.pos)[0]
        self.pos += 4
        return val

    def read_uint(self):
        if self.pos + 4 > len(self.data):
            return 0
        val = struct.unpack_from("<I", self.data, self.pos)[0]
        self.pos += 4
        return val

    def read_ushort(self):
        if self.pos + 2 > len(self.data):
            return 0
        val = struct.unpack_from("<H", self.data, self.pos)[0]
        self.pos += 2
        return val

    def read_float(self):
        if self.pos + 4 > len(self.data):
            return 0.0
        val = struct.unpack_from("<f", self.data, self.pos)[0]
        self.pos += 4
        return val

    def read_double(self):
        if self.pos + 8 > len(self.data):
            return 0.0
        val = struct.unpack_from("<d", self.data, self.pos)[0]
        self.pos += 8
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
    if (stripped.startswith('[') and stripped.endswith(']')) or (stripped.startswith('{') and stripped.endswith('}')):
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
    decompressed_bins = {}
    for i in range(bin_count):
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
            decompressed_bins[res_id] = decomp
        except Exception:
            pass
    return decompressed_bins

def main():
    print("Starting activity extra data parser and dataminer...")

    # Load promotional activities json
    promo_path = "public/data/promotional_activities.json"
    if not os.path.exists(promo_path):
        print(f"Error: {promo_path} not found.")
        return

    with open(promo_path, "r", encoding="utf-8") as f:
        promos_data = json.load(f)

    # Collect all unique active promotional act_ids
    active_act_ids = set()
    for row in promos_data.get("rows", []):
        act_id = row.get("act_id")
        if act_id:
            active_act_ids.add(int(act_id))

    print(f"Loaded {len(promos_data.get('rows', []))} promotions, containing {len(active_act_ids)} unique active act_ids.")

    # 1. Resolve CONST_DATEBASEVO RESOURCEID definitions
    db_path = "/home/marko/bleachflash/scripts/Resources/Constants/CONST_DATEBASEVO.as"
    resource_ids = {}
    if os.path.exists(db_path):
        with open(db_path, "r", encoding="utf-8") as f:
            datebasevo_raw = f.read()
        for line in datebasevo_raw.splitlines():
            m = re.search(r'public static const RESOURCEID_(\w+):uint = RESOURCEID_Base \+ (\d+);', line)
            if m:
                name, offset = m.groups()
                resource_ids['RESOURCEID_' + name] = 16777216 + int(offset)

    # 2. Resolve CONST_ACTIVITY_MODE definitions
    mode_path = "/home/marko/bleachflash/scripts/Resources/Constants/CONST_ACTIVITY_MODE.as"
    modes = {}
    if os.path.exists(mode_path):
        with open(mode_path, "r", encoding="utf-8") as f:
            mode_raw = f.read()
        for line in mode_raw.splitlines():
            m = re.search(r'public static const Activity_(\w+):uint = (\d+);', line)
            if m:
                name, val = m.groups()
                modes['Activity_' + name] = int(val)

    # 3. Resolve CONST_ACTIVITY lists
    act_const_path = "/home/marko/bleachflash/scripts/Resources/Constants/CONST_ACTIVITY.as"
    multiplier_to_resid = {}
    id_to_res_name = {}
    if os.path.exists(act_const_path):
        with open(act_const_path, "r", encoding="utf-8") as f:
            activity_raw = f.read()
        m_ids = re.search(r'CONFIGS_ID_Vect:Vector\.<uint> = Vector\.<uint>\(\[(.*?)\]\);', activity_raw, re.DOTALL)
        m_res = re.search(r'CONFIGS_ResourceID_Vect:Vector\.<uint> = Vector\.<uint>\(\[(.*?)\]\);', activity_raw, re.DOTALL)
        if m_ids and m_res:
            ids_clean = re.sub(r'\s+', '', m_ids.group(1)).replace('CONST_ACTIVITY_MODE.', '').split(',')
            res_clean = re.sub(r'\s+', '', m_res.group(1)).replace('CONST_DATEBASEVO.', '').split(',')
            for mode_name, res_name in zip(ids_clean, res_clean):
                mode_val = modes.get(mode_name)
                res_val = resource_ids.get(res_name)
                if mode_val is not None and res_val is not None:
                    multiplier_to_resid[mode_val] = res_val
                    id_to_res_name[mode_val] = res_name

    # Scan binPackage files
    print("Scanning binPackages...")
    pkg0 = scan_package("/home/marko/bleachflash/0F000000.binPackage")
    pkg1 = scan_package("/home/marko/bleachflash/0F000001.binPackage")
    all_bins = {**pkg0, **pkg1}
    print(f"Scanned bins: {len(all_bins)} tables decompressed.")

    # We will build a mapping: act_id -> extra details dictionary
    extracted_details = {}

    # Iterate over unique multipliers and their ResIDs
    for mult, res_id in multiplier_to_resid.items():
        if res_id not in all_bins:
            continue
        
        res_name = id_to_res_name.get(mult, f"RESOURCEID_Unknown_{res_id}")
        bin_data = all_bins[res_id]
        reader = BinReader(bin_data)
        
        # Binary header: skip ResID (4 bytes)
        reader.read_uint()
        row_count = reader.read_uint()
        
        # Map class name based on Resource ID (ResID)
        # Class names derived from scripts/Logics/DatebaseVO/VO/*.as
        class_name = "THDActivityBase"
        if "LevelRank" in res_name: class_name = "THDLevelRank"
        elif "PowerRank" in res_name: class_name = "THDPowerRank"
        elif "ArenaRank" in res_name: class_name = "THDArenaRank"
        elif "SinglePay" in res_name: class_name = "THDSinglePay"
        elif "TotalPay" in res_name: class_name = "THDTotalPay"
        elif "DailyPay" in res_name: class_name = "THDDailyPay"
        elif "TotalCost" in res_name: class_name = "THDTotalCost"
        elif "DailyCost" in res_name: class_name = "THDDailyCost"
        elif "DailyTotalPay" in res_name: class_name = "THDDailyTotalPay"
        elif "DailyTotalCost" in res_name: class_name = "THDDailyTotalCost"
        elif "FirstPay" in res_name: class_name = "THDFirstPay"
        elif "GrowFundLv" in res_name: class_name = "THDGrowFundLv"
        elif "SuperTreasure" in res_name: class_name = "THDSuperTreasure"
        elif "DayBack" in res_name: class_name = "THDDayBackConfig"
        elif "VipBox" in res_name: class_name = "THDVipBox"
        elif "GBOnline" in res_name: class_name = "THDGBOnline"
        elif "GBGold" in res_name: class_name = "THDGBGold"
        elif "GBSevenDay" in res_name: class_name = "THDGBSevenDay"
        elif "GBOpenSever" in res_name: class_name = "THDGBOpenServer"
        elif "GBCollectgame" in res_name: class_name = "THDGBCollectGame"
        elif "LevelGiftBag" in res_name: class_name = "THDLevelGiftBag"
        elif "KingLegend" in res_name: class_name = "THDKingLegend"
        elif "KingGuard" in res_name: class_name = "THDKingGuard"
        elif "Pyramid" in res_name: class_name = "THDPyramid"
        elif "RushInSeireitei" in res_name: class_name = "THDRushInSeireitei"
        elif "KnifeHeroCollect" in res_name: class_name = "THDKnifeHeroCollect"
        elif "IceHeros" in res_name: class_name = "THDIceHeros"
        elif "ExchangeChip" in res_name: class_name = "THDExchangeChip"
        elif "TeamBuy" in res_name: class_name = "THDTeamBuy"
        elif "Gambling" in res_name: class_name = "THDGambling"
        elif "DoubleFish" in res_name: class_name = "THDDoubleFish"
        elif "LimitBuy" in res_name: class_name = "THDActivityLimitBuy"
        elif "ChildrenDayShop" in res_name: class_name = "THDChildrenDayShop"
        elif "ChildrenDayHero" in res_name: class_name = "THDChildrenDayHero"
        elif "ChildrenDayCollect" in res_name: class_name = "THDChildrenDayCollect"
        elif "DuanwujiePet" in res_name: class_name = "THDDuanwujiePet"
        elif "DuanwujieBoat" in res_name: class_name = "THDDuanwujieBoat"
        elif "LaborConsume" in res_name: class_name = "THDLaborConsume"
        elif "NationalDayTwo" in res_name: class_name = "THDNationalDayTwo"
        elif "NationalDayOne" in res_name: class_name = "THDNationalDayOne"
        elif "CoolSummer" in res_name: class_name = "THDCoolSummer"
        elif "FoolsDayShop" in res_name: class_name = "THDFoolsDayShop"
        elif "FoolsDayRecharge" in res_name: class_name = "THDFoolsDayRecharge"
        elif "HalloweenShop" in res_name: class_name = "THDHalloweenShop"
        elif "KnifeChessBuy" in res_name: class_name = "THDKnifeChessBuy"
        elif "GhostKingForg" in res_name: class_name = "THDGhostKingForg"
        elif "Sled" in res_name: class_name = "THDSled"
        elif "ThanksFeast" in res_name: class_name = "THDThanksFeast"
        elif "ThankYou" in res_name: class_name = "THDThankYou"
        elif "TreasureHuntShop" in res_name or "TreasureShop" in res_name: class_name = "THDTreasureHuntShop"
        
        # Read all rows inside this activity's bin table
        for _ in range(row_count):
            if reader.bytes_left() < 4:
                break
            
            act_id = reader.read_uint()
            
            # Read Base HDActivityBase fields
            base_name = reader.read_utf()
            base_tname = reader.read_utf()
            base_desc = reader.read_utf()
            base_tip = reader.read_utf()
            base_price = reader.read_uint()
            base_image_id = reader.read_uint()
            
            row_details = {
                "act_id": act_id,
                "class": class_name,
                "res_name": res_name,
                "name": base_name,
                "tname": base_tname,
                "description": base_desc,
                "tip": base_tip,
                "price": base_price,
                "image_id": base_image_id,
                "awards": None,
                "targets": None,
                "extra": {}
            }
            
            # Read subclass-specific fields based on class_name
            try:
                if class_name == "THDLevelRank":
                    act_award_str = reader.read_utf()
                    rank_num = reader.read_uint()
                    row_details["awards"] = try_json_load(act_award_str)
                    row_details["extra"]["rank_num"] = rank_num
                    
                elif class_name == "THDPowerRank":
                    act_award_str = reader.read_utf()
                    target_power_str = reader.read_utf()
                    rank_num = reader.read_uint()
                    row_details["awards"] = try_json_load(act_award_str)
                    row_details["targets"] = try_json_load(target_power_str)
                    row_details["extra"]["rank_num"] = rank_num
                    
                elif class_name == "THDArenaRank":
                    act_award_str = reader.read_utf()
                    rank_day_str = reader.read_utf()
                    lucky_str = reader.read_utf()
                    luck_item_str = reader.read_utf()
                    row_details["awards"] = try_json_load(act_award_str)
                    row_details["extra"]["rank_day"] = try_json_load(rank_day_str)
                    row_details["extra"]["lucky"] = try_json_load(lucky_str)
                    row_details["extra"]["luck_item"] = try_json_load(luck_item_str)
                    
                elif class_name == "THDGrowFundLv":
                    bags_normal_str = reader.read_utf()
                    bags_premium_str = reader.read_utf()
                    row_details["extra"]["bags_normal"] = try_json_load(bags_normal_str)
                    row_details["extra"]["bags_premium"] = try_json_load(bags_premium_str)
                    
                elif class_name == "THDSuperTreasure":
                    page1 = try_json_load(reader.read_utf())
                    page2 = try_json_load(reader.read_utf())
                    page3 = try_json_load(reader.read_utf())
                    page3_prompts = try_json_load(reader.read_utf())
                    enter_names = try_json_load(reader.read_utf())
                    row_details["extra"]["page1"] = page1
                    row_details["extra"]["page2"] = page2
                    row_details["extra"]["page3"] = page3
                    row_details["extra"]["page3_prompts"] = page3_prompts
                    row_details["extra"]["enter_names"] = enter_names
                    
                elif class_name == "THDDayBackConfig":
                    login_gift = try_json_load(reader.read_utf())
                    recharge_idx = reader.read_int()
                    recharge_recv_idx = reader.read_int()
                    recharge_gift = try_json_load(reader.read_utf())
                    final_gift = try_json_load(reader.read_utf())
                    row_details["extra"]["login_gift"] = login_gift
                    row_details["extra"]["recharge_idx"] = recharge_idx
                    row_details["extra"]["recharge_recv_idx"] = recharge_recv_idx
                    row_details["extra"]["recharge_gift"] = recharge_gift
                    row_details["extra"]["final_gift"] = final_gift

                elif class_name == "THDKingGuard":
                    guards_str = reader.read_utf()
                    last_result_index = reader.read_uint()
                    daily_free_count = reader.read_uint()
                    total_free_index = reader.read_uint()
                    daily_free_index = reader.read_uint()
                    recharge_str = reader.read_utf()
                    game_status_index = reader.read_uint()
                    game_str = reader.read_utf()
                    game_win_str = reader.read_utf()
                    buy_day_str = reader.read_utf()
                    daily_pay_index = reader.read_uint()
                    messages_str = reader.read_utf()
                    row_details["extra"]["guards"] = try_json_load(guards_str)
                    row_details["extra"]["last_result_index"] = last_result_index
                    row_details["extra"]["daily_free_count"] = daily_free_count
                    row_details["extra"]["total_free_index"] = total_free_index
                    row_details["extra"]["daily_free_index"] = daily_free_index
                    row_details["extra"]["recharge"] = try_json_load(recharge_str)
                    row_details["extra"]["game_status_index"] = game_status_index
                    row_details["extra"]["game"] = try_json_load(game_str)
                    row_details["extra"]["game_win"] = try_json_load(game_win_str)
                    row_details["extra"]["buy_day"] = try_json_load(buy_day_str)
                    row_details["extra"]["daily_pay_index"] = daily_pay_index
                    row_details["extra"]["messages"] = try_json_load(messages_str)

                elif class_name == "THDKingLegend":
                    recharge_str = reader.read_utf()
                    exchanges_str = reader.read_utf()
                    cost_gold_str = reader.read_utf()
                    turntable_str = reader.read_utf()
                    cur_day_index = reader.read_uint()
                    cur_cost_index = reader.read_uint()
                    bag_str = reader.read_utf()
                    row_details["extra"]["recharge"] = try_json_load(recharge_str)
                    row_details["extra"]["exchanges"] = try_json_load(exchanges_str)
                    row_details["extra"]["cost_gold"] = try_json_load(cost_gold_str)
                    row_details["extra"]["turntable"] = try_json_load(turntable_str)
                    row_details["extra"]["cur_day_index"] = cur_day_index
                    row_details["extra"]["cur_cost_index"] = cur_cost_index
                    row_details["extra"]["bag"] = try_json_load(bag_str)

                elif class_name == "THDPyramid":
                    awards_str = reader.read_utf()
                    smash_fifty = reader.read_uint()
                    smash_ten = reader.read_uint()
                    smash_one = reader.read_uint()
                    gifts_str = reader.read_utf()
                    recharge_index = reader.read_uint()
                    extract_index = reader.read_uint()
                    score_index = reader.read_uint()
                    position_index = reader.read_uint()
                    proportion = reader.read_uint()
                    award_info_str = reader.read_utf()
                    row_details["extra"]["awards_rates"] = try_json_load(awards_str)
                    row_details["extra"]["smash_fifty"] = smash_fifty
                    row_details["extra"]["smash_ten"] = smash_ten
                    row_details["extra"]["smash_one"] = smash_one
                    row_details["extra"]["gifts"] = try_json_load(gifts_str)
                    row_details["extra"]["recharge_index"] = recharge_index
                    row_details["extra"]["extract_index"] = extract_index
                    row_details["extra"]["score_index"] = score_index
                    row_details["extra"]["position_index"] = position_index
                    row_details["extra"]["proportion"] = proportion
                    row_details["extra"]["award_info"] = try_json_load(award_info_str)

                elif class_name == "THDRushInSeireitei":
                    bosses_str = reader.read_utf()
                    nomal_attack_str = reader.read_utf()
                    nomal_attack_idx = reader.read_uint()
                    special_attack_str = reader.read_utf()
                    special_attack_idx = reader.read_uint()
                    refresh_index = reader.read_uint()
                    attack_index = reader.read_uint()
                    shop_str = reader.read_utf()
                    score_index = reader.read_uint()
                    total_score_index = reader.read_uint()
                    rank_num = reader.read_uint()
                    rank_str = reader.read_utf()
                    pet_id_str = reader.read_utf()
                    messages_str = reader.read_utf()
                    row_details["extra"]["bosses"] = try_json_load(bosses_str)
                    row_details["extra"]["nomal_attack"] = try_json_load(nomal_attack_str)
                    row_details["extra"]["nomal_attack_idx"] = nomal_attack_idx
                    row_details["extra"]["special_attack"] = try_json_load(special_attack_str)
                    row_details["extra"]["special_attack_idx"] = special_attack_idx
                    row_details["extra"]["refresh_index"] = refresh_index
                    row_details["extra"]["attack_index"] = attack_index
                    row_details["extra"]["shop"] = try_json_load(shop_str)
                    row_details["extra"]["score_index"] = score_index
                    row_details["extra"]["total_score_index"] = total_score_index
                    row_details["extra"]["rank_num"] = rank_num
                    row_details["extra"]["rank"] = try_json_load(rank_str)
                    row_details["extra"]["pet_id_info"] = try_json_load(pet_id_str)
                    row_details["extra"]["messages"] = try_json_load(messages_str)

                elif class_name == "THDKnifeHeroCollect":
                    row_details["extra"]["consume_gold"] = try_json_load(reader.read_utf())
                    row_details["extra"]["knife_condition"] = try_json_load(reader.read_utf())
                    row_details["extra"]["knife_award"] = try_json_load(reader.read_utf())
                    row_details["extra"]["recharge_gold"] = try_json_load(reader.read_utf())
                    row_details["extra"]["hero_condition"] = try_json_load(reader.read_utf())
                    row_details["extra"]["hero_award"] = try_json_load(reader.read_utf())
                    row_details["extra"]["consume_gold_index"] = reader.read_int()
                    row_details["extra"]["recharge_gold_index"] = reader.read_int()
                    row_details["extra"]["language"] = try_json_load(reader.read_utf())

                elif class_name == "THDIceHeros":
                    rank_list_str = reader.read_utf()
                    awards_str = reader.read_utf()
                    chip_boxes_str = reader.read_utf()
                    hero_ids_str = reader.read_utf()
                    total_player = reader.read_uint()
                    rank_desc = reader.read_utf()
                    loot_str = reader.read_utf()
                    add_value = reader.read_uint()
                    is_rank_show = reader.read_uint()
                    row_details["extra"]["rank_list"] = try_json_load(rank_list_str)
                    row_details["extra"]["awards"] = try_json_load(awards_str)
                    row_details["extra"]["chip_boxes"] = try_json_load(chip_boxes_str)
                    row_details["extra"]["hero_ids"] = try_json_load(hero_ids_str)
                    row_details["extra"]["total_player"] = total_player
                    row_details["extra"]["rank_desc"] = rank_desc
                    row_details["extra"]["loot"] = try_json_load(loot_str)
                    row_details["extra"]["add_value"] = add_value
                    row_details["extra"]["is_rank_show"] = is_rank_show

                elif class_name == "THDExchangeChip":
                    chips_str = reader.read_utf()
                    buy_boxes_str = reader.read_utf()
                    free_draws_str = reader.read_utf()
                    exchange_str = reader.read_utf()
                    page1_desc = reader.read_utf()
                    page2_desc = reader.read_utf()
                    exchange_types_str = reader.read_utf()
                    row_details["extra"]["chips"] = try_json_load(chips_str)
                    row_details["extra"]["buy_boxes"] = try_json_load(buy_boxes_str)
                    row_details["extra"]["free_draws"] = try_json_load(free_draws_str)
                    row_details["extra"]["exchanges"] = try_json_load(exchange_str)
                    row_details["extra"]["page1_desc"] = page1_desc
                    row_details["extra"]["page2_desc"] = page2_desc
                    row_details["extra"]["exchange_types"] = try_json_load(exchange_types_str)

                elif class_name == "THDTeamBuy":
                    awards_str = reader.read_utf()
                    off_rates_str = reader.read_utf()
                    sign_times_str = reader.read_utf()
                    buy_times_str = reader.read_utf()
                    prompt_str = reader.read_utf()
                    row_details["extra"]["awards"] = try_json_load(awards_str)
                    row_details["extra"]["off_rates"] = try_json_load(off_rates_str)
                    row_details["extra"]["sign_times"] = try_json_load(sign_times_str)
                    row_details["extra"]["buy_times"] = try_json_load(buy_times_str)
                    row_details["extra"]["prompts"] = try_json_load(prompt_str)

                elif class_name == "THDGambling":
                    awards_str = reader.read_utf()
                    fail_count_str = reader.read_utf()
                    start_count_str = reader.read_utf()
                    wins_str = reader.read_utf()
                    prompts_str = reader.read_utf()
                    btn_start_cost = reader.read_uint()
                    btn_small_cost = reader.read_uint()
                    btn_big_cost = reader.read_uint()
                    row_details["extra"]["awards"] = try_json_load(awards_str)
                    row_details["extra"]["fail_count_info"] = try_json_load(fail_count_str)
                    row_details["extra"]["start_count_info"] = try_json_load(start_count_str)
                    row_details["extra"]["wins_info"] = try_json_load(wins_str)
                    row_details["extra"]["prompts"] = try_json_load(prompts_str)
                    row_details["extra"]["btn_start_cost"] = btn_start_cost
                    row_details["extra"]["btn_small_cost"] = btn_small_cost
                    row_details["extra"]["btn_big_cost"] = btn_big_cost

                elif class_name == "THDDoubleFish":
                    rank_list_str = reader.read_utf()
                    awards_list_str = reader.read_utf()
                    knife_id = reader.read_uint()
                    total_player = reader.read_uint()
                    rank_desc = reader.read_utf()
                    add_value = reader.read_uint()
                    row_details["extra"]["rank_list"] = try_json_load(rank_list_str)
                    row_details["extra"]["awards"] = try_json_load(awards_list_str)
                    row_details["extra"]["knife_id"] = knife_id
                    row_details["extra"]["total_player"] = total_player
                    row_details["extra"]["rank_desc"] = rank_desc
                    row_details["extra"]["add_value"] = add_value

                elif class_name == "THDActivityLimitBuy":
                    items_str = reader.read_utf()
                    flush_times_str = reader.read_utf()
                    prompts_str = reader.read_utf()
                    row_details["extra"]["items"] = try_json_load(items_str)
                    row_details["extra"]["flush_times"] = try_json_load(flush_times_str)
                    row_details["extra"]["prompts"] = try_json_load(prompts_str)

                elif class_name == "THDChildrenDayShop":
                    score_index = reader.read_uint()
                    pay_index = reader.read_uint()
                    login_award_str = reader.read_utf()
                    pay_award_str = reader.read_utf()
                    gold_mall_str = reader.read_utf()
                    score_mall_str = reader.read_utf()
                    candy_id = reader.read_uint()
                    row_details["extra"]["score_index"] = score_index
                    row_details["extra"]["pay_index"] = pay_index
                    row_details["extra"]["login_award"] = try_json_load(login_award_str)
                    row_details["extra"]["pay_award"] = try_json_load(pay_award_str)
                    row_details["extra"]["gold_mall"] = try_json_load(gold_mall_str)
                    row_details["extra"]["score_mall"] = try_json_load(score_mall_str)
                    row_details["extra"]["candy_id"] = candy_id

                elif class_name == "THDChildrenDayHero":
                    buy_score_index = reader.read_uint()
                    buy_gold_index = reader.read_uint()
                    scale = reader.read_uint()
                    related_id = reader.read_uint()
                    row_details["extra"]["buy_score_index"] = buy_score_index
                    row_details["extra"]["buy_gold_index"] = buy_gold_index
                    row_details["extra"]["scale"] = scale
                    row_details["extra"]["related_id"] = related_id

                elif class_name == "THDChildrenDayCollect":
                    items_str = reader.read_utf()
                    row_details["extra"]["items"] = try_json_load(items_str)

                elif class_name == "THDDuanwujiePet":
                    fund_str = reader.read_utf()
                    fund_gift_str = reader.read_utf()
                    zongzi_id = reader.read_uint()
                    server_zongzi_id = reader.read_uint()
                    pet_str = reader.read_utf()
                    zongzi_gift_str = reader.read_utf()
                    mall_str = reader.read_utf()
                    text_str = reader.read_utf()
                    
                    row_details["extra"]["fund"] = try_json_load(fund_str)
                    row_details["extra"]["fund_gift"] = try_json_load(fund_gift_str)
                    row_details["extra"]["zongzi_id"] = zongzi_id
                    row_details["extra"]["server_zongzi_id"] = server_zongzi_id
                    row_details["extra"]["pet_info"] = try_json_load(pet_str)
                    row_details["extra"]["zongzi_gift"] = try_json_load(zongzi_gift_str)
                    row_details["extra"]["mall"] = try_json_load(mall_str)
                    row_details["extra"]["text"] = text_str

                elif class_name == "THDDuanwujieBoat":
                    game_count_str = reader.read_utf()
                    cheer_str = reader.read_utf()
                    start_val = reader.read_uint()
                    over_str = reader.read_utf()
                    evaluation_str = reader.read_utf()
                    score_val = reader.read_uint()
                    mall_str = reader.read_utf()
                    big_award_str = reader.read_utf()
                    morale_str = reader.read_utf()
                    cheer_awards_str = reader.read_utf()
                    events_str = reader.read_utf()
                    length_val = reader.read_uint()
                    speed_val = reader.read_uint()
                    npc_speed_val = reader.read_uint()
                    block_length_val = reader.read_uint()
                    texts_str = reader.read_utf()

                    row_details["extra"]["game_count"] = try_json_load(game_count_str)
                    row_details["extra"]["cheer"] = try_json_load(cheer_str)
                    row_details["extra"]["start"] = start_val
                    row_details["extra"]["over"] = try_json_load(over_str)
                    row_details["extra"]["evaluation"] = try_json_load(evaluation_str)
                    row_details["extra"]["score"] = score_val
                    row_details["extra"]["mall"] = try_json_load(mall_str)
                    row_details["extra"]["big_award"] = try_json_load(big_award_str)
                    row_details["extra"]["morale"] = try_json_load(morale_str)
                    row_details["extra"]["cheer_awards"] = try_json_load(cheer_awards_str)
                    row_details["extra"]["events"] = try_json_load(events_str)
                    row_details["extra"]["length"] = length_val
                    row_details["extra"]["speed"] = speed_val
                    row_details["extra"]["npc_speed"] = npc_speed_val
                    row_details["extra"]["block_length"] = block_length_val
                    row_details["extra"]["texts"] = try_json_load(texts_str)

                elif class_name == "THDLaborConsume":
                    row_details["extra"]["banner"] = try_json_load(reader.read_utf())
                    row_details["extra"]["condition"] = try_json_load(reader.read_utf())
                    row_details["extra"]["score"] = reader.read_uint()
                    row_details["extra"]["refresh"] = reader.read_uint()
                    row_details["extra"]["free_times"] = reader.read_uint()
                    row_details["extra"]["refresh_cost"] = reader.read_uint()
                    row_details["extra"]["banner_index"] = try_json_load(reader.read_utf())
                    row_details["extra"]["mall"] = try_json_load(reader.read_utf())
                    row_details["extra"]["bag"] = try_json_load(reader.read_utf())
                    row_details["extra"]["language"] = try_json_load(reader.read_utf())

                elif class_name == "THDNationalDayTwo":
                    row_details["extra"]["free_index"] = reader.read_uint()
                    row_details["extra"]["discount"] = reader.read_uint()
                    row_details["extra"]["score_index"] = reader.read_uint()
                    row_details["extra"]["discount_index"] = reader.read_uint()
                    row_details["extra"]["refresh_index"] = reader.read_uint()
                    row_details["extra"]["refresh_cost"] = reader.read_uint()
                    row_details["extra"]["items"] = try_json_load(reader.read_utf())
                    row_details["extra"]["mall"] = try_json_load(reader.read_utf())
                    row_details["extra"]["bag"] = try_json_load(reader.read_utf())
                    row_details["extra"]["cur_pool_index"] = try_json_load(reader.read_utf())

                elif class_name == "THDCoolSummer":
                    row_details["extra"]["repository"] = try_json_load(reader.read_utf())
                    row_details["extra"]["shell_index"] = try_json_load(reader.read_utf())
                    row_details["extra"]["open_once"] = try_json_load(reader.read_utf())
                    row_details["extra"]["open_all"] = try_json_load(reader.read_utf())
                    row_details["extra"]["refresh"] = try_json_load(reader.read_utf())
                    row_details["extra"]["choose"] = reader.read_uint()
                    row_details["extra"]["score"] = reader.read_uint()
                    row_details["extra"]["score_shop"] = try_json_load(reader.read_utf())
                    row_details["extra"]["main_award"] = try_json_load(reader.read_utf())
                    row_details["extra"]["language"] = try_json_load(reader.read_utf())

                elif class_name == "THDFoolsDayShop":
                    row_details["extra"]["play_once_index"] = reader.read_uint()
                    row_details["extra"]["play_five_index"] = reader.read_uint()
                    row_details["extra"]["score_index"] = reader.read_uint()
                    row_details["extra"]["re_item_index"] = reader.read_uint()
                    row_details["extra"]["re_price_index"] = reader.read_uint()
                    row_details["extra"]["cur_price_index"] = reader.read_uint()
                    row_details["extra"]["re_start"] = reader.read_uint()
                    row_details["extra"]["luck_index"] = reader.read_uint()
                    row_details["extra"]["play_cost"] = reader.read_uint()
                    row_details["extra"]["re_item_cost"] = reader.read_uint()
                    row_details["extra"]["re_price_cost"] = reader.read_uint()
                    row_details["extra"]["cur_items"] = try_json_load(reader.read_utf())
                    row_details["extra"]["cur_items_index"] = try_json_load(reader.read_utf())
                    row_details["extra"]["score_shop"] = try_json_load(reader.read_utf())

                elif class_name == "THDFoolsDayRecharge":
                    row_details["extra"]["recharge_index"] = reader.read_uint()
                    row_details["extra"]["day_award"] = try_json_load(reader.read_utf())
                    row_details["extra"]["total_award"] = try_json_load(reader.read_utf())
                    row_details["extra"]["progress_award"] = try_json_load(reader.read_utf())

                elif class_name == "THDHalloweenShop":
                    row_details["extra"]["refresh_index"] = reader.read_uint()
                    row_details["extra"]["total_score_index"] = reader.read_uint()
                    row_details["extra"]["buy_index"] = reader.read_uint()
                    row_details["extra"]["buy_cost_gold"] = reader.read_uint()
                    row_details["extra"]["refresh_cost_gold"] = reader.read_uint()
                    row_details["extra"]["all_buy_index"] = reader.read_uint()
                    row_details["extra"]["items"] = try_json_load(reader.read_utf())
                    row_details["extra"]["mall"] = try_json_load(reader.read_utf())
                    row_details["extra"]["bag"] = try_json_load(reader.read_utf())
                    row_details["extra"]["cur_items_index"] = try_json_load(reader.read_utf())
                    row_details["extra"]["mask_name"] = reader.read_utf()

                elif class_name == "THDKnifeChessBuy":
                    row_details["extra"]["recharge"] = reader.read_uint()
                    row_details["extra"]["step_gold"] = reader.read_uint()
                    row_details["extra"]["step_index"] = reader.read_uint()
                    row_details["extra"]["cur_step"] = reader.read_uint()
                    row_details["extra"]["stage_index"] = reader.read_uint()
                    row_details["extra"]["open_stage_index"] = reader.read_uint()
                    row_details["extra"]["oper_index"] = reader.read_uint()
                    row_details["extra"]["onekey_index"] = reader.read_uint()
                    row_details["extra"]["normal_award"] = reader.read_uint()
                    row_details["extra"]["stage_award"] = try_json_load(reader.read_utf())
                    row_details["extra"]["stage_gold"] = try_json_load(reader.read_utf())
                    row_details["extra"]["stage_score"] = try_json_load(reader.read_utf())
                    row_details["extra"]["stage_score_id"] = reader.read_uint()
                    row_details["extra"]["mall"] = try_json_load(reader.read_utf())

                elif class_name == "THDGhostKingForg":
                    row_details["extra"]["recharge_index"] = reader.read_uint()
                    row_details["extra"]["forging"] = try_json_load(reader.read_utf())
                    row_details["extra"]["forging_max"] = reader.read_uint()
                    row_details["extra"]["forging_award"] = try_json_load(reader.read_utf())
                    row_details["extra"]["score_index"] = reader.read_uint()
                    row_details["extra"]["additional_award"] = try_json_load(reader.read_utf())
                    row_details["extra"]["additional_items"] = try_json_load(reader.read_utf())
                    row_details["extra"]["big_award"] = try_json_load(reader.read_utf())
                    row_details["extra"]["score_shop"] = try_json_load(reader.read_utf())
                    row_details["extra"]["language"] = try_json_load(reader.read_utf())

                elif class_name == "THDSled":
                    row_details["extra"]["robbery"] = try_json_load(reader.read_utf())
                    row_details["extra"]["transport"] = try_json_load(reader.read_utf())
                    row_details["extra"]["christmas_cards_index"] = reader.read_uint()
                    row_details["extra"]["refresh_quality"] = try_json_load(reader.read_utf())
                    row_details["extra"]["one_key_red"] = try_json_load(reader.read_utf())
                    row_details["extra"]["begin_transport"] = try_json_load(reader.read_utf())
                    row_details["extra"]["sled_infos"] = try_json_load(reader.read_utf())
                    row_details["extra"]["robbery_interface_index"] = reader.read_uint()
                    row_details["extra"]["onekey_arrival"] = try_json_load(reader.read_utf())
                    row_details["extra"]["receive_award_index"] = reader.read_uint()
                    row_details["extra"]["big_gift"] = try_json_load(reader.read_utf())
                    row_details["extra"]["max_size"] = reader.read_uint()
                    row_details["extra"]["transport_time"] = reader.read_uint()
                    row_details["extra"]["transport_protect"] = reader.read_uint()
                    row_details["extra"]["robbery_person_index"] = reader.read_uint()
                    row_details["extra"]["robbery_index"] = try_json_load(reader.read_utf())
                    row_details["extra"]["shop"] = try_json_load(reader.read_utf())
                    row_details["extra"]["gold_cards"] = try_json_load(reader.read_utf())
                    row_details["extra"]["language"] = try_json_load(reader.read_utf())

                elif class_name == "THDThanksFeast":
                    row_details["extra"]["puzzle"] = try_json_load(reader.read_utf())
                    row_details["extra"]["pet"] = try_json_load(reader.read_utf())
                    row_details["extra"]["recharge_index"] = reader.read_uint()
                    row_details["extra"]["daily_recharge_index"] = reader.read_uint()
                    row_details["extra"]["daily_gift"] = try_json_load(reader.read_utf())

                elif class_name == "THDThankYou":
                    row_details["extra"]["recharge_index"] = reader.read_uint()
                    row_details["extra"]["daily_recharge_index"] = reader.read_uint()
                    row_details["extra"]["daily_gift"] = try_json_load(reader.read_utf())

                elif class_name == "THDTreasureHuntShop":
                    row_details["extra"]["dark_index"] = reader.read_uint()
                    row_details["extra"]["light_index"] = reader.read_uint()
                    row_details["extra"]["dark_item_index"] = reader.read_uint()
                    row_details["extra"]["light_item_index"] = reader.read_uint()
                    row_details["extra"]["items"] = try_json_load(reader.read_utf())
                    row_details["extra"]["shop"] = try_json_load(reader.read_utf())
                    row_details["extra"]["big_award"] = try_json_load(reader.read_utf())
                    row_details["extra"]["cost"] = reader.read_uint()
                    row_details["extra"]["texts"] = try_json_load(reader.read_utf())

                elif class_name in [
                    "THDSinglePay", "THDTotalPay", "THDDailyPay", "THDTotalCost", "THDDailyCost", 
                    "THDDailyTotalPay", "THDDailyTotalCost", "THDFirstPay", "THDYellowDiamonGiftBag", 
                    "THDVipBox", "THDGBOnline", "THDGBGold", "THDGBSevenDay", "THDGBOpenServer", 
                    "THDGBCollectGame", "THDLevelGiftBag"
                ]:
                    # Standard 1 UTF award field
                    act_award_str = reader.read_utf()
                    row_details["awards"] = try_json_load(act_award_str)
                else:
                    # Fallback generic reader: sequentially read remaining fields of the record
                    # If we don't know the exact class, read what remains until we are blocked or hit next record boundary
                    pass
            except Exception as e:
                print(f"Exception parsing fields for act_id {act_id} of type {class_name}: {e}")

            # Store all parsed activities (including inactive ones for CFYOW data)
            extracted_details[act_id] = row_details

    # Write output to public/data/activity_details.json
    out_path = "public/data/activity_details.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(extracted_details, f, indent=2, ensure_ascii=False)

    print(f"\nCompleted! Datamined details for {len(extracted_details)} activities (all classes).")
    print(f"Saved database to: {out_path}")

if __name__ == "__main__":
    main()
