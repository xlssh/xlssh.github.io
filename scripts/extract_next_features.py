import struct
import zlib
import json
import os

class BinReader:
    def __init__(self, data):
        self.data = data
        self.pos = 0

    def read_uint(self):
        val = struct.unpack_from("<I", self.data, self.pos)[0]
        self.pos += 4
        return val

    def read_int(self):
        val = struct.unpack_from("<i", self.data, self.pos)[0]
        self.pos += 4
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

def scan_package(path, bins, target_ids):
    if not os.path.exists(path):
        return
    print(f"Scanning {path}...")
    with open(path, "rb") as f:
        package_data = f.read()

    package_id, bin_count = struct.unpack_from("<IH", package_data, 0)
    offset = 6
    
    for _ in range(bin_count):
        if offset + 4 > len(package_data):
            break
        bin_len = struct.unpack_from("<I", package_data, offset)[0]
        offset += 4
        if offset + bin_len > len(package_data):
            break
        bin_bytes = package_data[offset:offset+bin_len]
        offset += bin_len

        decompressed = zlib.decompress(bin_bytes)
        res_id = struct.unpack_from("<I", decompressed, 0)[0]
        if res_id in target_ids:
            bins[res_id] = decompressed

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
    bins = {}
    target_ids = {
        16777376: "beautiful_clothes",
        16777375: "beauty",
        16777247: "hero_talents",
        16777400: "hd_big_turntables",
        16777398: "hd_jigsaws",
        16777413: "bleach_jigsaws",
        16777225: "buff_effects"
    }

    scan_package("0F000000.binPackage", bins, target_ids)
    scan_package("../0F000000.binPackage", bins, target_ids)
    scan_package("0F000001.binPackage", bins, target_ids)
    scan_package("../0F000001.binPackage", bins, target_ids)

    output_dir = "public/data"
    os.makedirs(output_dir, exist_ok=True)

    # 1. beautiful_clothes (16777376)
    if 16777376 in bins:
        reader = BinReader(bins[16777376])
        reader.read_uint()
        count = reader.read_uint()
        rows = []
        for _ in range(count):
            row_id = reader.read_uint()
            factor = reader.read_uint()
            scores_str = reader.read_utf()
            question = reader.read_utf()
            answers_str = reader.read_utf()

            rows.append({
                "id": row_id,
                "factor": factor,
                "scores": try_parse_json(scores_str),
                "question": question,
                "answers": try_parse_json(answers_str) if answers_str != "0" else []
            })
        
        with open(os.path.join(output_dir, "beautiful_clothes.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "beautiful_clothes", "rowCount": len(rows), "rows": rows}, f, indent=2, ensure_ascii=False)
        print(f"Extracted beautiful_clothes: {len(rows)} rows.")

    # 2. beauty (16777375)
    if 16777375 in bins:
        reader = BinReader(bins[16777375])
        reader.read_uint()
        count = reader.read_uint()
        rows = []
        for _ in range(count):
            row_id = reader.read_uint()
            name = reader.read_utf()
            rewards_str = reader.read_utf()
            clothes_id_str = reader.read_utf()
            success_text_str = reader.read_utf()
            fail_text = reader.read_utf()
            day = reader.read_uint()

            rows.append({
                "id": row_id,
                "name": name,
                "rewards": try_parse_json(rewards_str),
                "clothes_id": try_parse_json(clothes_id_str),
                "success_text": try_parse_json(success_text_str),
                "fail_text": fail_text,
                "day": day
            })
            
        with open(os.path.join(output_dir, "beauty.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "beauty", "rowCount": len(rows), "rows": rows}, f, indent=2, ensure_ascii=False)
        print(f"Extracted beauty: {len(rows)} rows.")

    # 3. hero_talents (16777247)
    if 16777247 in bins:
        reader = BinReader(bins[16777247])
        reader.read_uint()
        count = reader.read_uint()
        rows = []
        for _ in range(count):
            row_id = reader.read_uint()
            talent_name = reader.read_utf()
            talent_desc = reader.read_utf()

            rows.append({
                "id": row_id,
                "talent_name": talent_name,
                "talent_desc": talent_desc
            })
            
        with open(os.path.join(output_dir, "hero_talents.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "hero_talents", "rowCount": len(rows), "rows": rows}, f, indent=2, ensure_ascii=False)
        print(f"Extracted hero_talents: {len(rows)} rows.")

    # 4. hd_big_turntables (16777400)
    if 16777400 in bins:
        reader = BinReader(bins[16777400])
        reader.read_uint()
        count = reader.read_uint()
        rows = []
        for _ in range(count):
            row_id = reader.read_uint()
            name = reader.read_utf()
            tname = reader.read_utf()
            desc = reader.read_utf()
            tip = reader.read_utf()
            price = reader.read_uint()
            image_id = reader.read_uint()
            record_quality_limit = reader.read_int()
            
            lucky_point = reader.read_utf()
            lucky_lottery_outter = reader.read_utf()
            lucky_lottery_inner = reader.read_utf()
            gold_point = reader.read_utf()
            gold_lottery_outter = reader.read_utf()
            gold_lottery_inner = reader.read_utf()
            mall = reader.read_utf()
            score_point = reader.read_utf()
            lucky_lottery_outter_award = reader.read_utf()
            lucky_lottery_inner_award = reader.read_utf()
            gold_lottery_outter_award = reader.read_utf()
            gold_lottery_inner_award = reader.read_utf()
            buy_hero = reader.read_utf()

            rows.append({
                "id": row_id,
                "name": name,
                "tname": tname,
                "desc": desc,
                "tip": tip,
                "price": price,
                "image_id": image_id,
                "record_quality_limit": record_quality_limit,
                "lucky_point": try_parse_json(lucky_point),
                "lucky_lottery_outter": try_parse_json(lucky_lottery_outter),
                "lucky_lottery_inner": try_parse_json(lucky_lottery_inner),
                "gold_point": try_parse_json(gold_point),
                "gold_lottery_outter": try_parse_json(gold_lottery_outter),
                "gold_lottery_inner": try_parse_json(gold_lottery_inner),
                "mall": try_parse_json(mall),
                "score_point": try_parse_json(score_point),
                "lucky_lottery_outter_award": try_parse_json(lucky_lottery_outter_award),
                "lucky_lottery_inner_award": try_parse_json(lucky_lottery_inner_award),
                "gold_lottery_outter_award": try_parse_json(gold_lottery_outter_award),
                "gold_lottery_inner_award": try_parse_json(gold_lottery_inner_award),
                "buy_hero": try_parse_json(buy_hero)
            })

        with open(os.path.join(output_dir, "hd_big_turntables.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "hd_big_turntables", "rowCount": len(rows), "rows": rows}, f, indent=2, ensure_ascii=False)
        print(f"Extracted hd_big_turntables: {len(rows)} rows.")

    # 5. hd_jigsaws (16777398)
    if 16777398 in bins:
        reader = BinReader(bins[16777398])
        reader.read_uint()
        count = reader.read_uint()
        rows = []
        for _ in range(count):
            row_id = reader.read_uint()
            name = reader.read_utf()
            tname = reader.read_utf()
            desc = reader.read_utf()
            tip = reader.read_utf()
            price = reader.read_uint()
            image_id = reader.read_uint()
            score = reader.read_utf()
            buys = reader.read_utf()
            awards = reader.read_utf()
            title_id = reader.read_uint()

            rows.append({
                "id": row_id,
                "name": name,
                "tname": tname,
                "desc": desc,
                "tip": tip,
                "price": price,
                "image_id": image_id,
                "score": try_parse_json(score),
                "buys": try_parse_json(buys),
                "awards": try_parse_json(awards),
                "title_id": title_id
            })

        with open(os.path.join(output_dir, "hd_jigsaws.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "hd_jigsaws", "rowCount": len(rows), "rows": rows}, f, indent=2, ensure_ascii=False)
        print(f"Extracted hd_jigsaws: {len(rows)} rows.")

    # 6. bleach_jigsaws (16777413)
    if 16777413 in bins:
        reader = BinReader(bins[16777413])
        reader.read_uint()
        count = reader.read_uint()
        rows = []
        for _ in range(count):
            row_id = reader.read_uint()
            name = reader.read_utf()
            tname = reader.read_utf()
            desc = reader.read_utf()
            tip = reader.read_utf()
            price = reader.read_uint()
            image_id = reader.read_uint()
            items = reader.read_utf()
            needs = reader.read_utf()
            btn1 = reader.read_utf()
            btn2 = reader.read_utf()
            btn3 = reader.read_utf()
            final_award = reader.read_utf()
            unk = reader.read_int()

            rows.append({
                "id": row_id,
                "name": name,
                "tname": tname,
                "desc": desc,
                "tip": tip,
                "price": price,
                "image_id": image_id,
                "items": try_parse_json(items),
                "needs": try_parse_json(needs),
                "btn1": try_parse_json(btn1),
                "btn2": try_parse_json(btn2),
                "btn3": try_parse_json(btn3),
                "final_award": try_parse_json(final_award),
                "unk": unk
            })

        with open(os.path.join(output_dir, "bleach_jigsaws.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "bleach_jigsaws", "rowCount": len(rows), "rows": rows}, f, indent=2, ensure_ascii=False)
        print(f"Extracted bleach_jigsaws: {len(rows)} rows.")

    # 7. buff_effects (16777225)
    if 16777225 in bins:
        reader = BinReader(bins[16777225])
        reader.read_uint()
        count = reader.read_uint()
        rows = []
        for _ in range(count):
            row_id = reader.read_uint()
            buff_type = reader.read_uint()
            alter = reader.read_utf()
            buff_key = reader.read_uint()
            weight = reader.read_uint()
            continued = reader.read_uint()
            name = reader.read_utf()
            description = reader.read_utf()
            icon_url = reader.read_uint()

            rows.append({
                "id": row_id,
                "buff_type": buff_type,
                "alter": try_parse_json(alter),
                "buff_key": buff_key,
                "weight": weight,
                "continued": continued,
                "name": name,
                "description": description,
                "icon_url": icon_url
            })

        with open(os.path.join(output_dir, "buff_effects.json"), "w", encoding="utf-8") as f:
            json.dump({"table": "buff_effects", "rowCount": len(rows), "rows": rows}, f, indent=2, ensure_ascii=False)
        print(f"Extracted buff_effects: {len(rows)} rows.")

if __name__ == "__main__":
    main()
