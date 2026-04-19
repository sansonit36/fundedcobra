from PIL import Image
import os
import glob

def find_green_images():
    images = glob.glob("_public_html/**/*.png", recursive=True)
    images += glob.glob("_public_html/**/*.webp", recursive=True)
    
    for path in images:
        try:
            img = Image.open(path).convert("RGBA")
            width, height = img.size
            green_count = 0
            for y in range(0, height, 5): # Subset for speed
                for x in range(0, width, 5):
                    r, g, b, a = img.getpixel((x, y))
                    if a > 50:
                        # Green is roughly r < 100, g > 150, b < 100
                        if g > 150 and r < 150 and b < 150:
                            green_count += 1
            if green_count > 50:
                print(f"GREEN DETECTED: {path} (hits: {green_count})")
        except:
            pass

find_green_images()
