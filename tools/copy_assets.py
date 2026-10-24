import os
import shutil

src_root = 'd:/Work/cortex hackathon/downloaded_assets'
dst_root = 'd:/Work/cortex hackathon'

dirs_to_copy = {
    'assets': 'assets',
    'fonts': 'fonts',
    'css': 'css',
    'js': 'js'
}

for src_dir, dst_dir in dirs_to_copy.items():
    s = os.path.join(src_root, src_dir)
    d = os.path.join(dst_root, dst_dir)
    os.makedirs(d, exist_ok=True)
    if os.path.exists(s):
        for f in os.listdir(s):
            src_file = os.path.join(s, f)
            dst_file = os.path.join(d, f)
            if os.path.isfile(src_file):
                shutil.copy2(src_file, dst_file)
        print(f"Copied {len(os.listdir(d))} files to {dst_dir}/")
