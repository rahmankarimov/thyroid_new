from PIL import Image, ImageDraw, ImageFont
import os

dirs = [
    r'C:\Users\Rahman\IdeaProjects\Thyroai_Project_new\placeholder_images',
    r'C:\Users\Rahman\IdeaProjects\Thyroai_Project_new\doctor-panel\public\placeholders',
    r'C:\Users\Rahman\IdeaProjects\thyroai_project\placeholder_images',
    r'C:\Users\Rahman\IdeaProjects\thyroai_project\thyroai-platform\frontends\doctor-panel\public\placeholders'
]
for d in dirs:
    os.makedirs(d, exist_ok=True)

try:
    font_big = ImageFont.truetype('arialbd.ttf', 88)
    font_sub = ImageFont.truetype('arialbd.ttf', 28)
    font_tag = ImageFont.truetype('arial.ttf', 22)
except Exception:
    font_big = ImageFont.load_default()
    font_sub = ImageFont.load_default()
    font_tag = ImageFont.load_default()

for i in range(1, 51):
    if i <= 10:
        pool_label = 'Common Initial Pool (I0)'
        batch_num = 0
        border_color = (59, 130, 246)
    elif i <= 20:
        pool_label = 'Main Pool - Batch B1 (#11-#20)'
        batch_num = 1
        border_color = (16, 185, 129)
    elif i <= 30:
        pool_label = 'Main Pool - Batch B2 (#21-#30)'
        batch_num = 2
        border_color = (245, 158, 11)
    elif i <= 40:
        pool_label = 'Main Pool - Batch B3 (#31-#40)'
        batch_num = 3
        border_color = (139, 92, 246)
    else:
        pool_label = 'Main Pool - Batch B4 (#41-#50)'
        batch_num = 4
        border_color = (236, 72, 153)

    pos_in_batch = ((i - 1) % 10) + 1
    cls = 'Benign' if pos_in_batch <= 4 else 'Malignant'
    target_lbl = 'All Clinicians' if batch_num == 0 else 'Exactly 3'

    img = Image.new('RGB', (800, 600), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.rectangle([(12, 12), (788, 588)], outline=border_color, width=6)
    draw.text((400, 250), f'Image #{i}', fill=(15, 23, 42), font=font_big, anchor='mm')
    draw.text((400, 360), f'{pool_label}', fill=border_color, font=font_sub, anchor='mm')
    draw.text((400, 415), f'Stratified Class: {cls}  |  Target Annotations: {target_lbl}', fill=(100, 116, 139), font=font_tag, anchor='mm')

    for d in dirs:
        img.save(os.path.join(d, f'image_{i}.png'))

print('Generated all 50 placeholder images across all directories.')
