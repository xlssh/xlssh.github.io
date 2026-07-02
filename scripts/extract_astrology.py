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
    star_map_bin = None
    star_point_bin = None

    for _ in range(bin_count):
        bin_len = struct.unpack_from("<I", package_data, offset)[0]
        offset += 4
        bin_bytes = package_data[offset:offset+bin_len]
        offset += bin_len

        decompressed = zlib.decompress(bin_bytes)
        res_id = struct.unpack_from("<I", decompressed, 0)[0]
        if res_id == 16777280: # RESOURCEID_StarMap
            star_map_bin = decompressed
        elif res_id == 16777281: # RESOURCEID_StarPoint
            star_point_bin = decompressed

    output_dir = "game-database-tool/public/data"
    if not os.path.exists(output_dir):
        output_dir = "public/data"
    os.makedirs(output_dir, exist_ok=True)

    if star_map_bin:
        print("Parsing StarMap...")
        reader = BinReader(star_map_bin)
        res_id = reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            name = reader.read_utf()
            profession = reader.read_uint()
            quality = reader.read_uint()
            point_count = reader.read_uint()
            pic = reader.read_utf()
            desc = reader.read_utf()
            start_id = reader.read_uint()

            rows.append({
                "id": row_id,
                "name": name,
                "profession": profession,
                "quality": quality,
                "point_count": point_count,
                "pic": pic,
                "desc": desc,
                "start_id": start_id
            })

        out_path = os.path.join(output_dir, "star_maps.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump({"table": "star_maps", "rowCount": len(rows), "rows": rows}, f, indent=2, ensure_ascii=False)
        print(f"Wrote {len(rows)} rows to {out_path}")

    if star_point_bin:
        print("Parsing StarPoint...")
        reader = BinReader(star_point_bin)
        res_id = reader.read_uint()
        row_count = reader.read_uint()
        rows = []
        for _ in range(row_count):
            row_id = reader.read_uint()
            map_id = reader.read_uint()
            index = reader.read_uint()
            is_skill = reader.read_uint()
            add_type_str = reader.read_utf()
            need_fetch = reader.read_uint()
            name = reader.read_utf()
            desc = reader.read_utf()
            limit = reader.read_uint()

            # Parse add_type JSON
            try:
                add_type = json.loads(add_type_str)
            except Exception:
                add_type = {"add": []}

            rows.append({
                "id": row_id,
                "map_id": map_id,
                "index": index,
                "is_skill": is_skill,
                "add_type": add_type,
                "need_fetch": need_fetch,
                "name": name,
                "desc": desc,
                "seven_star_level_limit": limit
            })

        out_path = os.path.join(output_dir, "star_points.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump({"table": "star_points", "rowCount": len(rows), "rows": rows}, f, indent=2, ensure_ascii=False)
        print(f"Wrote {len(rows)} rows to {out_path}")

if __name__ == "__main__":
    main()
