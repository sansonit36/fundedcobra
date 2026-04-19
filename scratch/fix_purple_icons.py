from PIL import Image
import base64
import io
import os

def create_purple_icon():
    logo_path = "_public_html/logo.png"
    if not os.path.exists(logo_path):
        print("Logo not found")
        return None
    
    img = Image.open(logo_path).convert("RGBA")
    # Logo is 250x150. The head is usually on the left.
    # Take a square from the left
    head = img.crop((0, 0, 150, 150))
    
    # Save to bytes for base64
    buf = io.BytesIO()
    head.save(buf, format="PNG")
    return buf.getvalue()

def update_assets():
    icon_bytes = create_purple_icon()
    if not icon_bytes: return
    
    icon_base64 = base64.b64encode(icon_bytes).decode("utf-8")
    
    # 1. Update SVG
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
        print(f"Updated SVG {svg_path}")

    # 2. Update WebP
    webp_path = "_public_html/Files/img/image-challenge-journey.webp"
    original_webp = "_public_html/Files/img/image-challenge-journey-original.webp"
    
    img = Image.open(original_webp).convert("RGBA")
    purple_icon = Image.open(io.BytesIO(icon_bytes)).convert("RGBA")
    purple_icon = purple_icon.resize((30, 30), Image.Resampling.LANCZOS)
    
    # Use the coordinates found earlier: 164, 40
    img.paste(purple_icon, (164, 40), purple_icon)
    img.save(webp_path, "WEBP")
    print(f"Updated WebP {webp_path}")

update_assets()
