import os
import shutil

root = 'd:/Work/cortex hackathon'
tools_dir = os.path.join(root, 'tools')
os.makedirs(tools_dir, exist_ok=True)

for item in os.listdir(root):
    if item.endswith('.py') and item != 'server.py':
        shutil.move(os.path.join(root, item), os.path.join(tools_dir, item))

if os.path.exists(os.path.join(root, 'downloaded_assets')):
    shutil.rmtree(os.path.join(root, 'downloaded_assets'))

if os.path.exists(os.path.join(root, 'source_page.html')):
    shutil.move(os.path.join(root, 'source_page.html'), os.path.join(tools_dir, 'source_page.html'))

print("Cleaned up root directory and archived tools.")
