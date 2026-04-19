from PIL import Image
import os

def analyze_payout():
    path = "_public_html/Files/Bulk_1/3780.00-Lucas-Bergstrom.png"
    img = Image.open(path).convert("RGB")
    width, height = img.size
    
    # Check for green (#34dc8e) or other Riverton colors
    # Legacy Riverton color was green.
    green_count = 0
    green_pos = []
    
    for y in range(0, height, 10):
        for x in range(0, width, 10):
            r, g, b = img.getpixel((x, y))
            # Green detection
            if g > 150 and r < 150 and b < 150:
                green_count += 1
                green_pos.append((x, y))
                
    if green_pos:
        print(f"Green found at {green_pos[0]} ... total hits {green_count}")
    else:
        print("No green found, checking top corners for any non-white/black elements...")
        # Check top left 150x150
        # Check top right 150x150
        # Check center top
        pass

analyze_payout()
