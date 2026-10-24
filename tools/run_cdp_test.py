import asyncio
import json
import subprocess
import time
import urllib.request
import websockets
import base64

async def run_cdp():
    edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    proc = subprocess.Popen([
        edge_path,
        "--headless=new",
        "--remote-debugging-port=9224",
        "--disable-gpu",
        "--window-size=1440,900",
        "http://localhost:3000/"
    ])

    time.sleep(2)
    try:
        with urllib.request.urlopen("http://localhost:9224/json") as r:
            targets = json.loads(r.read())
        page_target = next(t for t in targets if t.get("type") == "page")
        ws_url = page_target["webSocketDebuggerUrl"]

        async with websockets.connect(ws_url) as ws:
            # Enable Console & Runtime
            await ws.send(json.dumps({"id": 1, "method": "Runtime.enable"}))
            await ws.send(json.dumps({"id": 2, "method": "Page.enable"}))

            # Trigger scroll or user interaction if needed
            eval_code = """
            (() => {
                window.dispatchEvent(new Event('scroll'));
                const hero = document.querySelector('.home-hero');
                return {
                    started: hero?.getAttribute('data-hero-started'),
                    cursorsCount: document.querySelectorAll('.home-hero__cursor').length,
                    cursorsVisible: document.querySelectorAll('.home-hero__cursor.is-visible').length,
                    seleccionSelected: document.querySelector('.home-hero__seleccion')?.classList.contains('is-selected')
                };
            })()
            """
            await asyncio.sleep(2)
            await ws.send(json.dumps({
                "id": 3,
                "method": "Runtime.evaluate",
                "params": {"expression": eval_code, "returnByValue": True}
            }))

            while True:
                msg = await ws.recv()
                data = json.loads(msg)
                if data.get("id") == 3:
                    print("DOM state after 2s:", data.get("result", {}).get("result", {}).get("value"))
                    break

            # Capture screenshot
            await asyncio.sleep(2)
            await ws.send(json.dumps({
                "id": 4,
                "method": "Page.captureScreenshot",
                "params": {"format": "png"}
            }))

            while True:
                msg = await ws.recv()
                data = json.loads(msg)
                if data.get("id") == 4:
                    img_data = base64.b64decode(data["result"]["data"])
                    with open("d:/Work/cortex hackathon/cdp_screenshot.png", "wb") as f:
                        f.write(img_data)
                    print("cdp_screenshot.png saved!")
                    break

    finally:
        proc.terminate()

asyncio.run(run_cdp())
