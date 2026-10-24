import asyncio
import json
import subprocess
import time
import urllib.request
import websockets
import base64

async def capture_sections():
    edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    proc = subprocess.Popen([
        edge_path,
        "--headless=new",
        "--remote-debugging-port=9225",
        "--disable-gpu",
        "--window-size=1440,900",
        "http://localhost:3000/"
    ])

    time.sleep(2)
    try:
        with urllib.request.urlopen("http://localhost:9225/json") as r:
            targets = json.loads(r.read())
        page_target = next(t for t in targets if t.get("type") == "page")
        ws_url = page_target["webSocketDebuggerUrl"]

        async with websockets.connect(ws_url) as ws:
            await ws.send(json.dumps({"id": 1, "method": "Runtime.enable"}))
            await ws.send(json.dumps({"id": 2, "method": "Page.enable"}))

            # Scroll through sections
            scroll_positions = [
                ("services", "window.scrollTo(0, 1600)"),
                ("darkmode", "window.scrollTo(0, 3200)"),
                ("team", "window.scrollTo(0, 4800)"),
                ("portfolio", "window.scrollTo(0, 6400)"),
                ("contact", "window.scrollTo(0, 8000)")
            ]

            for name, scroll_cmd in scroll_positions:
                await ws.send(json.dumps({
                    "id": 10,
                    "method": "Runtime.evaluate",
                    "params": {"expression": scroll_cmd}
                }))
                await asyncio.sleep(1.5)
                await ws.send(json.dumps({
                    "id": 20,
                    "method": "Page.captureScreenshot",
                    "params": {"format": "png"}
                }))
                while True:
                    msg = await ws.recv()
                    data = json.loads(msg)
                    if data.get("id") == 20:
                        img_data = base64.b64decode(data["result"]["data"])
                        with open(f"d:/Work/cortex hackathon/section_{name}.png", "wb") as f:
                            f.write(img_data)
                        print(f"Captured section_{name}.png")
                        break
    finally:
        proc.terminate()

asyncio.run(capture_sections())
