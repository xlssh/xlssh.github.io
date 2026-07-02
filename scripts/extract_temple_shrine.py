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

    def read_float(self):
        val = struct.unpack_from("<f", self.data, self.pos)[0]
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
    temple_point_bin = None
    temple_value_bin = None
    temple_pvp_bin = None
    temple_plies_bin = None

    for _ in range(bin_count):
        bin_len = struct.unpack_from("<I", package_data, offset)[0]
        offset += 4
        bin_bytes = package_data[offset:offset+bin_len]
        offset += bin_len

        decompressed = zlib.decompress(bin_bytes)
        res_id = struct.unpack_from("<I", decompressed, 0)[0]
        if res_id == 16777391:
            temple_point_bin = decompressed
        elif res_id == 16777393:
            temple_value_bin = decompressed
        elif res_id == 16777392:
            temple_pvp_bin = decompressed
        elif res_id == 16777254:
            temple_plies_bin = decompressed

    output_dir = "game-database-tool/public/data"
    if not os.path.exists(output_dir):
        output_dir = "public/data"
    os.makedirs(output_dir, exist_ok=True)

    # 1. TemplePoint
    if temple_point_bin:
        print("Parsing TemplePoint...")
        reader = BinReader(temple_point_bin)
        res_id = reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            name = reader.read_utf()
            next_point_id = reader.read_uint()
            army_ids_str = reader.read_utf()
            battle_scene = reader.read_uint()
            akey_price = reader.read_uint()

            try:
                army_data = json.loads(army_ids_str)
                army_ids = army_data.get("army", [])
            except Exception:
                army_ids = []

            rows.append({
                "id": row_id,
                "name": name,
                "next_point_id": next_point_id,
                "army_ids": army_ids,
                "battle_scene": battle_scene,
                "akey_price": akey_price
            })
        out_path = os.path.join(output_dir, "temple_points.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump({"table": "temple_points", "rowCount": len(rows), "rows": rows}, f, indent=2, ensure_ascii=False)
        print(f"Wrote {len(rows)} rows to {out_path}")

    # 2. TempleValue
    if temple_value_bin:
        print("Parsing TempleValue...")
        reader = BinReader(temple_value_bin)
        res_id = reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            level_coefficient = reader.read_float()
            type_coefficient = reader.read_float()
            flush_spirit_consume = reader.read_int()
            flush_spirit_successrate = reader.read_int()
            flush_spirit_stone_str = reader.read_utf()
            protected_stone = reader.read_int()

            try:
                flush_spirit_stone = json.loads(flush_spirit_stone_str)
            except Exception:
                flush_spirit_stone = []

            rows.append({
                "id": row_id,
                "level_coefficient": level_coefficient,
                "type_coefficient": type_coefficient,
                "flush_spirit_consume": flush_spirit_consume,
                "flush_spirit_successrate": flush_spirit_successrate,
                "flush_spirit_stone": flush_spirit_stone,
                "protected_stone": protected_stone
            })
        out_path = os.path.join(output_dir, "temple_values.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump({"table": "temple_values", "rowCount": len(rows), "rows": rows}, f, indent=2, ensure_ascii=False)
        print(f"Wrote {len(rows)} rows to {out_path}")

    # 3. TemplePVP
    if temple_pvp_bin:
        print("Parsing TemplePVP...")
        reader = BinReader(temple_pvp_bin)
        res_id = reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            layer_id = reader.read_uint()
            award_id = reader.read_uint()

            rows.append({
                "id": row_id,
                "layer_id": layer_id,
                "award_id": award_id
            })
        out_path = os.path.join(output_dir, "temple_pvps.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump({"table": "temple_pvps", "rowCount": len(rows), "rows": rows}, f, indent=2, ensure_ascii=False)
        print(f"Wrote {len(rows)} rows to {out_path}")

    # 4. TemplePliesNumber
    if temple_plies_bin:
        print("Parsing TemplePliesNumber...")
        reader = BinReader(temple_plies_bin)
        res_id = reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            number_plies = reader.read_int()
            award_id = reader.read_uint()

            rows.append({
                "id": row_id,
                "number_plies": number_plies,
                "award_id": award_id
            })
        out_path = os.path.join(output_dir, "temple_plies.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump({"table": "temple_plies", "rowCount": len(rows), "rows": rows}, f, indent=2, ensure_ascii=False)
        print(f"Wrote {len(rows)} rows to {out_path}")

if __name__ == "__main__":
    main()
