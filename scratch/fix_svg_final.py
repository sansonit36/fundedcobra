import base64
import os
import re

def fix_payout_svg():
    svg_path = "_public_html/Files/img/image-phase-payouts.svg"
    favicon_path = "_public_html/favicon.png"
    
    if not os.path.exists(svg_path) or not os.path.exists(favicon_path):
        print("Missing files")
        return

    # 1. Get favicon base64
    with open(favicon_path, "rb") as f:
        fav_b64 = base64.b64encode(f.read()).decode("utf-8")
        
    # 2. Read SVG
    with open(svg_path, "r") as f:
        content = f.read()

    # Remove all mix-blend-mode styles that cause color shifts
    # We want the brand colors to be true
    content = re.sub(r'style="mix-blend-mode:[^"]+"', '', content)
    
    # Remove fill-opacity or other effects that might wash out the icon
    # Actually, let's just target the image href
    start_tag = 'image href="data:image/png;base64,'
    end_tag = '"'
    
    start_idx = content.find(start_tag)
    if start_idx != -1:
        start_idx += len(start_tag)
        end_idx = content.find(end_tag, start_idx)
        content = content[:start_idx] + fav_b64 + content[end_idx:]
        
    # Also replace any remaining greens in this SVG (if any)
    content = content.replace("#34dc8e", "#bd4dd6")
    content = content.replace("#34DC8E", "#bd4dd6")

    with open(svg_path, "w") as f:
        f.write(content)
    print("Fixed SVG colors and icon")

fix_payout_svg()
