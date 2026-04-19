import base64
import os

def replace_svg_icon(svg_path, icon_path):
    with open(icon_path, "rb") as f:
        icon_base64 = base64.b64encode(f.read()).decode("utf-8")
    
    with open(svg_path, "r") as f:
        svg_content = f.read()
    
    # The SVG has an <image href="data:image/png;base64,..."> tag
    # We find the start and end of the base64 string
    start_tag = 'image href="data:image/png;base64,'
    end_tag = '"'
    
    start_idx = svg_content.find(start_tag)
    if start_idx == -1:
        print(f"Could not find {start_tag} in {svg_path}")
        return
    
    start_idx += len(start_tag)
    end_idx = svg_content.find(end_tag, start_idx)
    
    new_svg_content = svg_content[:start_idx] + icon_base64 + svg_content[end_idx:]
    
    # Also replace any "RIVERTON" or "Propfirm" titles in metadata
    new_svg_content = new_svg_content.replace("RIVERTON", "FUNDEDCOBRA")
    new_svg_content = new_svg_content.replace("Propfirm", "FundedCobra")
    
    with open(svg_path, "w") as f:
        f.write(new_svg_content)
    print(f"Successfully updated {svg_path}")

# Update Payouts SVG
replace_svg_icon("_public_html/Files/img/image-phase-payouts.svg", "_public_html/favicon.png")
