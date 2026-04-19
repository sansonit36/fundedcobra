from PIL import Image
import os

def update_challenge_image():
    img_path = "_public_html/Files/img/image-challenge-journey.webp"
    favicon_path = "_public_html/favicon.png"
    
    # Reload from original to be clean
    original_path = "_public_html/Files/img/image-challenge-journey-original.webp"
    if os.path.exists(original_path):
        img = Image.open(original_path).convert("RGBA")
    else:
        img = Image.open(img_path).convert("RGBA")

    favicon = Image.open(favicon_path).convert("RGBA")

    # Precise coordinates from diagnostic: 164, 50
    # Icon is roughly 24x24 or 28x28. Let's use 26.
    icon_size = (26, 26)
    favicon = favicon.resize(icon_size, Image.Resampling.LANCZOS)

    # If x=164 is where the cluster starts, we paste slightly to the right if needed,
    # but 164 seems like the start of the icon itself.
    # y=50 was middle of the icon, so top should be around 50 - 13 = 37.
    x, y = 164, 40
    
    # We should cover the old icon.
    # Old icon might be slightly larger or smaller.
    # Let's just paste.
    img.paste(favicon, (x, y), favicon)
    
    img.save(img_path, "WEBP")
    print(f"Updated {img_path} at {x}, {y}")

update_challenge_image()
