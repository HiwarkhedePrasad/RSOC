import subprocess
import re

p = subprocess.Popen(['cloudflared', 'tunnel', '--url', 'http://localhost:8000'], stderr=subprocess.PIPE, text=True)

with open('tunnel_url.txt', 'w') as f:
    for line in p.stderr:
        match = re.search(r'(https://[a-zA-Z0-9-]+\.trycloudflare\.com)', line)
        if match:
            f.write(match.group(1))
            f.flush()
            break
