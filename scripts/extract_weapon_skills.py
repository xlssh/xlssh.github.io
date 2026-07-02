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
    
    decompressed_data = None
    target_res_id = 16777295 # RESOURCEID_WeaponSkillConfig

    for _ in range(bin_count):
        bin_len = struct.unpack_from("<I", package_data, offset)[0]
        offset += 4
        bin_bytes = package_data[offset:offset+bin_len]
        offset += bin_len

        decompressed = zlib.decompress(bin_bytes)
        res_id = struct.unpack_from("<I", decompressed, 0)[0]
        if res_id == target_res_id:
            decompressed_data = decompressed
            break

    if not decompressed_data:
        print(f"Error: Resource ID {target_res_id} not found inside package.")
        return

    output_dir = "game-database-tool/public/data"
    if not os.path.exists(output_dir):
        output_dir = "public/data"
    os.makedirs(output_dir, exist_ok=True)

    print("Parsing WeaponSkillConfig...")
    reader = BinReader(decompressed_data)
    reader.read_uint() # skip res_id
    count = reader.read_uint()
    rows = []
    
    for _ in range(count):
        row_id = reader.read_uint()
        name = reader.read_utf()
        desc = reader.read_utf()
        skill_quality = reader.read_uint()

        rows.append({
            "id": row_id,
            "name": name,
            "desc": desc,
            "skill_quality": skill_quality
        })

    out_path = os.path.join(output_dir, "weapon_skills.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"table": "weapon_skills", "rowCount": len(rows), "generatedAt": "2026-07-02", "rows": rows}, f, indent=2, ensure_ascii=False)
    print(f"Extracted weapon_skills: {len(rows)} rows to {out_path}.")

if __name__ == "__main__":
    main()
