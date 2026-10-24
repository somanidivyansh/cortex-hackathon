import subprocess
import json
import time
import urllib.request

# Start Edge with remote debugging port
edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
proc = subprocess.Popen([
    edge_path,
    "--headless=new",
    "--remote-debugging-port=9222",
    "--disable-gpu",
    "http://localhost:3000/"
])

time.sleep(2)

try:
    # Query DevTools targets
    with urllib.request.urlopen("http://localhost:9222/json") as r:
        targets = json.loads(r.read())
        print("Edge targets:", [t.get('title') for t in targets])
except Exception as e:
    print("DevTools connection error:", e)
finally:
    proc.terminate()
