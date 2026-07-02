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
        length = self.read_ushort()
        val = self.data[self.pos:self.pos+length].decode("utf-8", errors="ignore")
        self.pos += length
        return val

def try_parse_json(text):
    if not text:
        return None
    try:
        return json.loads(text)
    except Exception:
        return text

def main():
    package_path = "0F000000.binPackage"
    if not os.path.exists(package_path):
        package_path = "../0F000000.binPackage"
    if not os.path.exists(package_path):
        print("Error: 0F000000.binPackage not found.")
        return

    print(f"Reading {package_path}...")
    with open(package_path, "rb") as f:
        package_data = f.read()

    package_id, bin_count = struct.unpack_from("<IH", package_data, 0)
    offset = 6
    
    bins = {}
    target_ids = {
        16777440: "org_point_info",
        16777464: "org_point_award"
    }

    for _ in range(bin_count):
        bin_len = struct.unpack_from("<I", package_data, offset)[0]
        offset += 4
        bin_bytes = package_data[offset:offset+bin_len]
        offset += bin_len

        decompressed = zlib.decompress(bin_bytes)
        res_id = struct.unpack_from("<I", decompressed, 0)[0]
        if res_id in target_ids:
            bins[res_id] = decompressed

    output_dir = "game-database-tool/public/data"
    if not os.path.exists(output_dir):
        output_dir = "public/data"
    os.makedirs(output_dir, exist_ok=True)

    # 1. OrgPointInfo (16777440)
    if 16777440 in bins:
        print("Parsing OrgPointInfo...")
        reader = BinReader(bins[16777440])
        reader.read_uint() # skip res_id
        count = reader.read_uint()
        rows = []
        for _ in range(count):
            row_id = reader.read_uint()
            name = reader.read_utf()
            action_eexertion = reader.read_uint()
            remaining_number = reader.read_uint()
            army = reader.read_utf()
            role_model = reader.read_uint()
            show_rate_award = reader.read_uint()
            guild_rate_award = reader.read_uint()
            next_point = reader.read_uint()
            coordinate = reader.read_utf()
            battle_scene = reader.read_uint()
            to_target = reader.read_utf()

            rows.append({
                "id": row_id,
                "name": name,
                "action_eexertion": action_eexertion,
                "remaining_number": remaining_number,
                "army": try_parse_json(army),
                "role_model": role_model,
                "show_rate_award": show_rate_award,
                "guild_rate_award": guild_rate_award,
                "next_point": next_point,
                "coordinate": try_parse_json(coordinate),
                "battle_scene": battle_scene,
                "to_target": try_parse_json(to_target)
            })

        out_path = os.path.join(output_dir, "org_point_infos.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump({"table": "org_point_infos", "rowCount": len(rows), "generatedAt": "2026-07-02", "rows": rows}, f, indent=2, ensure_ascii=False)
        print(f"Extracted org_point_infos: {len(rows)} rows.")

    # 2. OrgPointAward (16777464)
    if 16777464 in bins:
        print("Parsing OrgPointAward...")
        reader = BinReader(bins[16777464])
        reader.read_uint() # skip res_id
        count = reader.read_uint()
        rows = []
        for _ in range(count):
            row_id = reader.read_uint()
            arr = reader.read_utf()

            rows.append({
                "id": row_id,
                "arr": try_parse_json(arr)
            })

        out_path = os.path.join(output_dir, "org_point_awards.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump({"table": "org_point_awards", "rowCount": len(rows), "generatedAt": "2026-07-02", "rows": rows}, f, indent=2, ensure_ascii=False)
        print(f"Extracted org_point_awards: {len(rows)} rows.")

if __name__ == "__main__":
    main()
