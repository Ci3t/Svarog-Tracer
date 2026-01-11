import re

# Read the file
with open(r'd:\Coding\HSR_PatternRecord\src\utils\warpDataService.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the broken regex pattern
# From: /\\"histogram":
# To: /\\"histogram\\":
old_pattern = r'/\\"histogram":'
new_pattern = r'/\\"histogram\\":'

content_fixed = content.replace(old_pattern, new_pattern)

# Also fix the anyEscapedPattern
old_any = r'/\\"histogram":\{'
new_any = r'/\\"histogram\\":\{'
content_fixed = content_fixed.replace(old_any, new_any)

# Write back
with open(r'd:\Coding\HSR_PatternRecord\src\utils\warpDataService.js', 'w', encoding='utf-8', newline='') as f:
    f.write(content_fixed)

print("✓ Fixed regex patterns in warpDataService.js")
