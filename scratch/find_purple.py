from PIL import Image
import os

def find_purple_icon():
    img_path = "_public_html/Files/img/image-challenge-journey-original.webp"
    img = Image.open(img_path).convert("RGB")
    width, height = img.size
    
    # Scan for purple pixels
    # True purple has R and B significantly higher than G
    found_pixels = []
    for y in range(height):
        for x in range(width):
            r, g, b = img.getpixel((x, y))
            if r > g + 40 and b > g + 40 and r > 60:
                found_pixels.append((x, y))
    
    if not found_pixels:
        print("No purple pixels found")
        return

    # Find the cluster of purple pixels
    min_x = min(p[0] for p in found_pixels)
    max_x = max(p[0] for p in found_pixels)
    min_y = min(p[1] for p in found_pixels)
    max_y = max(p[1] for p in found_pixels)
    
    print(f"Purple cluster detected: {min_x}, {min_y} to {max_x}, {max_y}")
    print(f"Center: {(min_x + max_x) // 2}, {(min_y + max_y) // 2}")

find_purple_icon()
