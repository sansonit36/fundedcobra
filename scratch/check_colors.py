from PIL import Image
import os

def check_color(path):
    if not os.path.exists(path):
        return
    img = Image.open(path).convert("RGB")
    width, height = img.size
    # Get center pixel
    r, g, b = img.getpixel((width // 2, height // 2))
    print(f"{path}: {r},{g},{b}")

check_color("_public_html/favicon.png")
check_color("_public_html/logo.png")
check_color("public/favicon.png")
check_color("public/logo.png")
