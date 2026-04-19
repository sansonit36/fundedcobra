from PIL import Image
import os

def find_icon_position():
    img_path = "_public_html/Files/img/image-challenge-journey.webp"
    img = Image.open(img_path).convert("RGB")
    width, height = img.size
    
    # Analyze the top-right quarter
    start_x = width // 2
    end_x = width
    start_y = 0
    end_y = height // 2
    
    # Find the white notification pill
    # It should be a compact white box
    pill_found = False
    min_x, min_y, max_x, max_y = width, height, 0, 0
    
    for y in range(start_y, end_y):
        for x in range(start_x, end_x):
            r, g, b = img.getpixel((x, y))
            if r > 250 and g > 250 and b > 250: # Pure white
                if not pill_found:
                    min_x, min_y = x, y
                    pill_found = True
                max_x = max(max_x, x)
                max_y = max(max_y, y)
    
    if not pill_found:
        print("Pill not found in top-right area")
        return
    
    print(f"Pill detected: {min_x}, {min_y} to {max_x}, {max_y}")
    
    # Find the icon inside the pill (first non-white thing from the left)
    icon_x, icon_y = -1, -1
    for y in range(min_y + 5, max_y - 5):
        for x in range(min_x + 3, min_x + 40): # Look near the left edge of the pill
            r, g, b = img.getpixel((x, y))
            if r < 240:
                icon_x, icon_y = x, y
                break
        if icon_x != -1: break
    
    print(f"Icon likely start at: {icon_x}, {icon_y}")

find_icon_position()
