from PIL import Image
import os

def check_new_image():
    img_path = "_public_html/Files/img/image-challenge-journey.webp"
    img = Image.open(img_path).convert("RGB")
    r, g, b = img.getpixel((165, 40))
    print(f"Color at icon position (165, 40): {r},{g},{b}")
    # Brand purple is roughly 165, 61, 213 or 189, 77, 214
    if r > 150 and b > 150 and g < 100:
        print("Icon is already purple")
    else:
        print("Icon is NOT purple, overlaying brand favicon...")
        # Re-run the overlay logic
        import base64
        import io
        
        logo_path = "_public_html/logo.png"
        logo = Image.open(logo_path).convert("RGBA")
        head = logo.crop((0, 0, 150, 150)).resize((30, 30), Image.Resampling.LANCZOS)
        
        target = Image.open(img_path).convert("RGBA")
        target.paste(head, (164, 38), head)
        target.save(img_path, "WEBP")
        print("Overlay complete")

check_new_image()
