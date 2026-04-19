from PIL import Image, ImageChops
import os

def find_common_element():
    f1 = "_public_html/Files/Bulk_1/3780.00-Lucas-Bergstrom.png"
    f2 = "_public_html/Files/Bulk_1/3455.75-Ryan-Nakamura.png"
    
    img1 = Image.open(f1).convert("RGB")
    img2 = Image.open(f2).convert("RGB")
    
    diff = ImageChops.difference(img1, img2)
    # Common pixels will be black in the diff.
    # We want things that ARE NOT different.
    # Let's find the bounding box of where pixels are IDENTICAL.
    # Actually, the user-specific text will be different.
    # The logo, border, and template will be identical.
    
    width, height = img1.size
    shared = []
    for y in range(0, 200): # Check top part
        for x in range(0, width):
            if img1.getpixel((x, y)) == img2.getpixel((x, y)):
                # If they are different from a pure background color
                # (Assuming background varies slightly or is not unique)
                # This logic is hard without seeing it.
                pass
    
    # Simple check: where is the non-background common area?
    bg1 = img1.getpixel((0,0))
    common_mask = []
    for y in range(20, 150):
        for x in range(50, 490):
            p1 = img1.getpixel((x,y))
            p2 = img2.getpixel((x,y))
            if p1 == p2 and p1 != bg1:
                common_mask.append((x,y))
    
    if common_mask:
        min_x = min(c[0] for c in common_mask)
        max_x = max(c[0] for c in common_mask)
        min_y = min(c[1] for c in common_mask)
        max_y = max(c[1] for c in common_mask)
        print(f"Common element (Logo?) bbox: {min_x}, {min_y} to {max_x}, {max_y}")

find_common_element()
