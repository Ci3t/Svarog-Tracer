
import os

target_file = 'src/pages/ZoneTrackerPage.jsx'
restored_file = 'restored_block.jsx'

if not os.path.exists(target_file):
    print(f"Error: {target_file} not found")
    exit(1)
if not os.path.exists(restored_file):
    print(f"Error: {restored_file} not found")
    exit(1)

with open(target_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

with open(restored_file, 'r', encoding='utf-8') as f:
    restored = f.readlines()

# Replace lines 2403 to 2572 (1-indexed)
# 0-indexed: 2402 to 2571
new_lines = lines[:2402] + restored + lines[2572:]

with open(target_file, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Replacement successful")
