import re
for path in ["server/_core/vercelEntry.ts", "api/vercel-handler.js", "dist/api/vercel-handler.js"]:
    try:
        src = open(path).read()
    except FileNotFoundError:
        print(f"=== {path}: not found"); continue
    env_lines = [l for l in src.splitlines() if "process.env" in l]
    gmail_lines = [l for l in src.splitlines() if "GMAIL" in l]
    print(f"=== {path}: {len(src)} chars | process.env lines: {len(env_lines)} | GMAIL lines: {len(gmail_lines)}")
    for l in env_lines[:8]: print("   ", l.strip()[:120])
    for l in gmail_lines[:5]: print("   ", l.strip()[:120])
