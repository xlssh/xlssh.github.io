import struct
import zlib
import json

def scan_package(file_path):
    with open(file_path, "rb") as f:
        data = f.read()
    package_id, bin_count = struct.unpack_from("<IH", data, 0)
    offset = 6
    for _ in range(bin_count):
        bin_len = struct.unpack_from("<I", data, offset)[0]
        offset += 4
        bin_bytes = data[offset:offset+bin_len]
        offset += bin_len
        try:
            decomp = zlib.decompress(bin_bytes)
            res_id = struct.unpack_from("<I", decomp, 0)[0]
            if res_id == 16777282:
                return decomp
        except:
            pass
    return None

data = scan_package("0F000000.binPackage")
if not data:
    data = scan_package("0F000001.binPackage")

if data:
    pos = 4
    row_count = struct.unpack_from("<I", data, pos)[0]
    pos += 4
    print(f"Row count: {row_count}")
    for _ in range(min(row_count, 120)):
        row_id = struct.unpack_from("<I", data, pos)[0]
        pos += 4
        
        # read utf
        length = struct.unpack_from("<H", data, pos)[0]
        pos += 2
        desc = data[pos:pos+length].decode("utf-8")
        pos += length
        
        view_type = struct.unpack_from("<I", data, pos)[0]
        pos += 4
        
        print(f"ID: {row_id}, Desc: {desc}, ViewType: {view_type}")
else:
    print("Not found 16777282")
