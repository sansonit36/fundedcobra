from PIL import Image
import base64
import io
import os
import glob

def create_purple_icon():
    logo_path = "_public_html/logo.png"
    if not os.path.exists(logo_path):
        print("Logo not found")
        return None
    
    img = Image.open(logo_path).convert("RGBA")
    # Take a square from the left (Cobra Head)
    # The logo is 250x150.
    head = img.crop((0, 0, 150, 150))
    
    buf = io.BytesIO()
    head.save(buf, format="PNG")
    return buf.getvalue()

def update_colors_and_icons():
    # 1. Replace Green with Purple in all SVGs
    green_hex = "#34dc8e"
    purple_hex = "#bd4dd6"
    
    svg_files = glob.glob("_public_html/Files/img/*.svg")
    for svg_path in svg_files:
        with open(svg_path, "r") as f:
            content = f.read()
        if green_hex in content:
            new_content = content.replace(green_hex, purple_hex)
            # Higher chance of variation in casing
            new_content = new_content.replace(green_hex.upper(), purple_hex)
            with open(svg_path, "w") as f:
                f.write(new_content)
            print(f"Colorized {svg_path}")

    # 2. Update Mockup Icons
    icon_bytes = create_purple_icon()
    if not icon_bytes: return
    icon_base64 = base64.b64encode(icon_bytes).decode("utf-8")
    
    # SVG Case
    svg_path = "_public_html/Files/img/image-phase-payouts.svg"
    with open(svg_path, "r") as f:
        svg_content = f.read()
    
    start_tag = 'image href="data:image/png;base64,'
    end_tag = '"'
    start_idx = svg_content.find(start_tag)
    if start_idx != -1:
        start_idx += len(start_tag)
        end_idx = svg_content.find(end_tag, start_idx)
        new_svg = svg_content[:start_idx] + icon_base64 + svg_content[end_idx:]
        with open(svg_path, "w") as f:
            f.write(new_svg)
        print(f"Updated mockup icon in {svg_path}")

    # WebP Case
    webp_path = "_public_html/Files/img/image-challenge-journey.webp"
    original_webp = "_public_html/Files/img/image-challenge-journey-original.webp"
    img = Image.open(original_webp).convert("RGBA")
    purple_icon = Image.open(io.BytesIO(icon_bytes)).convert("RGBA")
    purple_icon = purple_icon.resize((30, 30), Image.Resampling.LANCZOS)
    img.paste(purple_icon, (164, 38), purple_icon) # Slightly adjusted y to 38
    img.save(webp_path, "WEBP")
    print(f"Updated mockup icon in {webp_path}")

update_colors_and_icons()
