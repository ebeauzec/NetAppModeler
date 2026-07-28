import os
import re

def bundle():
    base_dir = os.path.dirname(os.path.abspath(__file__))

    # 1. Read index.html
    with open(os.path.join(base_dir, "index.html"), "r", encoding="utf-8") as f:
        html = f.read()

    # 2. Inline app.css
    with open(os.path.join(base_dir, "app.css"), "r", encoding="utf-8") as f:
        css = f.read()
    html = html.replace('<link rel="stylesheet" href="app.css">', f"<style>\n{css}\n</style>")

    # 3. ES6 module keyword stripper
    def clean_js(content):
        content = re.sub(r"import\s+[\s\S]*?\s+from\s+['\"].*?['\"];?", "", content)
        content = re.sub(r"\bexport\s+(const|let|var|function|class)\b", r"\1", content)
        return content

    # 4. JS files: (path, wrap_in_block_scope)
    # Block-wrapping gives each dependency file its own scope so cross-file
    # const/let declarations can never collide in the single-script bundle.
    # ui.js is NOT wrapped because it is the entry point and registers DOM listeners
    # that must be accessible from HTML event attributes.
    js_files = [
        ("js/jszip.min.js",     False),
        ("js/demoData.js",      True),
        ("js/parser.js",        True),
        ("js/compatibility.js", True),
        ("js/bestPractices.js", True),
        ("js/ui.js",            False),
    ]

    # --- Pre-build collision detector (top-level names in unwrapped files only) ---
    # Only ui.js is unwrapped, so only names declared in ui.js can collide with globals.
    # We only need to check that ui.js does not re-declare names from jszip.
    # All other inter-file collisions are impossible because they are block-scoped.
    # This detector remains useful if wrap=False is ever added to more files.
    seen = {}
    for rel_path, wrap in js_files:
        if wrap:
            continue  # block-scoped files cannot collide with each other
        path = os.path.join(base_dir, rel_path)
        with open(path, "r", encoding="utf-8") as f:
            src = f.read()
        cleaned = clean_js(src)
        for line in cleaned.splitlines():
            m = re.match(r'^(const|let|var|function)\s+([A-Za-z_][A-Za-z0-9_$]*)', line)
            if m:
                name = m.group(2)
                if name in seen and seen[name] != rel_path:
                    raise SystemExit(
                        f"\nBUILD ERROR: Top-level collision '{name}' in '{seen[name]}' AND '{rel_path}'.\n"
                        f"Rename one of them before rebuilding.\n"
                    )
                seen[name] = rel_path

    # 5. Build bundled JS
    parts = []
    for rel_path, wrap in js_files:
        with open(os.path.join(base_dir, rel_path), "r", encoding="utf-8") as f:
            content = f.read()
        if not rel_path.endswith("jszip.min.js"):
            content = clean_js(content)
        if wrap:
            content = f"// --- START {rel_path} ---\n{{\n{content}\n}}\n// --- END {rel_path} ---"
        else:
            content = f"// --- START {rel_path} ---\n{content}\n// --- END {rel_path} ---"
        parts.append(content)

    js_code = "\n\n".join(parts)

    # 6. Inject and write
    html = html.replace('<script src="js/jszip.min.js"></script>', '')
    html = html.replace('<script type="module" src="js/ui.js"></script>', '')
    html = html.replace('</body>', f"<script>\n{js_code}\n</script>\n</body>")

    out = os.path.join(base_dir, "standalone_netapp_modeler.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Bundled successfully! Standalone file written to:\n- {out}")

    scratch = r"C:\Users\eugen\.gemini\antigravity\scratch\standalone_netapp_modeler.html"
    try:
        if os.path.exists(os.path.dirname(scratch)):
            with open(scratch, "w", encoding="utf-8") as f:
                f.write(html)
            print(f"- {scratch}")
    except Exception:
        pass

if __name__ == "__main__":
    bundle()