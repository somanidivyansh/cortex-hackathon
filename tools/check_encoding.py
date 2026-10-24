with open('d:/Work/cortex hackathon/source_page.html', 'rb') as f:
    raw = f.read(5000)

for enc in ['utf-8', 'windows-1252', 'iso-8859-1']:
    try:
        decoded = raw.decode(enc)
        print(f"Decodes with {enc}: yes")
    except Exception as e:
        print(f"Decodes with {enc}: NO ({e})")
