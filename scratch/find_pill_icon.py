from PIL import Image
import os

def find_actual_notification_icon():
    img_path = "_public_html/Files/img/image-challenge-journey-original.webp"
    img = Image.open(img_path).convert("RGB")
    width, height = img.size
    
    # Notification pill is white.
    # Status bar is usually at the very top (y < 30).
    # Notification pill starts lower (y > 30).
    for y in range(40, 120):
        for x in range(160, 300):
            r, g, b = img.getpixel((x, y))
            # If we find white, it might be the pill
            if r > 240 and g > 240 and b > 240:
                # Check for an icon just inside the left edge of this white area
                # Look for a vertical line of non-white pixels
                pill_left = x
                for ix in range(pill_left + 4, pill_left + 15):
                    non_white_count = 0
                    for iy in range(y + 5, y + 20):
                        ir, ig, ib = img.getpixel((ix, iy))
                        if ir < 230:
                            non_white_count += 1
                    if non_white_count > 5:
                        print(f"Notification Icon cluster found around {ix}, {y+10}")
                        return (ix, y+10)
    return None

pos = find_actual_notification_icon()
if pos:
    print(f"ICON_POS: {pos[0]}, {pos[1]}")
