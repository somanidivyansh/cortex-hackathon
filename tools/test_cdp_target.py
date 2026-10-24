import subprocess
import json
import time
import urllib.request

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
proc = subprocess.Popen([
    edge_path,
    "--headless=new",
    "--remote-debugging-port=9223",
    "--disable-gpu",
    "http://localhost:3000/"
])

time.sleep(2)

try:
    with urllib.request.urlopen("http://localhost:9223/json") as r:
        targets = json.loads(r.read())
    page_target = None
    for t in targets:
        if "Onlines" in t.get("title", "") or "3000" in t.get("url", ""):
            page_target = t
            break
    print("Found page target:", page_target["title"], page_target["webSocketDebuggerUrl"])
except Exception as e:
    print("Error:", e)
finally:
    proc.terminate()
