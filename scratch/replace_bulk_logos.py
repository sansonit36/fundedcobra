from PIL import Image, ImageChops
import os
import glob

def replace_logos():
    new_logo_path = "Data/Images/FundedCobra_Horizontal_logo.png"
    target_dir = "_public_html/Files/Bulk_1"
    
    if not os.path.exists(new_logo_path):
        print("New logo not found")
        return

    new_logo = Image.open(new_logo_path).convert("RGBA")
    
    # Let's determine where the logo is.
    # Usually it's in the top center or top left.
    # I'll look for where most certificates HAVE a common image.
    
    files = glob.glob(os.path.join(target_dir, "*.png"))
    if not files: return
    
    # Scale new logo to a reasonable size for a 540x540 cert.
    # If the cert is 540x540, a 250x150 logo might be too big.
    # Horizontal logos are usually 180-220px wide.
    logo_w, logo_h = new_logo.size
    aspect = logo_h / logo_w
    target_w = 200
    target_h = int(target_w * aspect)
    new_logo = new_logo.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    # We'll use a fixed position if we can't detect it, or we try to overwrite
    # the top center area.
    # Many certificates have the logo centered at y=40-80.
    pos = (170, 40) # Center-ish horizontally (540/2 - 200/2)
    
    for f in files:
        img = Image.open(f).convert("RGBA")
        # To mask the old logo, we might need a background color patch.
        # Let's assume the top area has a dark background.
        # We can sample the corner.
        bg_sample = img.getpixel((10, 10))
        
        # Draw a rectangle to hide old logo (Assume it's in the same box)
        from PIL import ImageDraw
        draw = ImageDraw.Draw(img)
        # Wipe the top center area
        draw.rectangle([100, 20, 440, 120], fill=bg_sample)
        
        # Paste new logo
        img.paste(new_logo, pos, new_logo)
        img.save(f)
        print(f"Updated {f}")

replace_logos()
