from PIL import Image
import os

def update_webp_with_favicon():
    img_path = "_public_html/Files/img/image-challenge-journey.webp"
    favicon_path = "_public_html/favicon.png"
    original_path = "_public_html/50% section image.png" # The clean one provided by user
    
    if not os.path.exists(original_path):
        print("Original 50% image not found")
        return

    # Use the clean original from user
    img = Image.open(original_path).convert("RGBA")
    fav = Image.open(favicon_path).convert("RGBA")
    
    # Scale favicon to fit notification
    fav = fav.resize((28, 28), Image.Resampling.LANCZOS)
    
    # Correct coordinates for favicon in this mockup
    # x=164 was good, y=40 was good
    img.paste(fav, (164, 38), fav)
    
    img.save(img_path, "WEBP")
    print("Updated WebP with actual favicon")

update_webp_with_favicon()
