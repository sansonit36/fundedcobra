from PIL import Image
import os

def detect_logo_area():
    img_path = "_public_html/Files/Bulk_1/3780.00-Lucas-Bergstrom.png"
    img = Image.open(img_path).convert("RGB")
    width, height = img.size
    
    bg_color = img.getpixel((0, 0))
    print(f"BG color: {bg_color}")
    
    # Check top half for any thing different from bg
    for y in range(0, 200):
        for x in range(0, width):
            p = img.getpixel((x, y))
            if p != bg_color:
                # Potential logo start
                print(f"Non-BG pixel at {x}, {y}: {p}")
                return (x, y)
    return None

detect_logo_area()
