from PIL import Image
import os

def check_transparent_pixels(path):
    if not os.path.exists(path): return
    img = Image.open(path).convert("RGBA")
    pixels = img.load()
    width, height = img.size
    
    purple_count = 0
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a > 0: # Non-transparent
                if r > 100 and b > 100: # Could be purple
                    purple_count += 1
    
    print(f"{path}: Non-transparent size {width}x{height}, purple hits: {purple_count}")

check_transparent_pixels("_public_html/favicon.png")
check_transparent_pixels("_public_html/logo.png")
