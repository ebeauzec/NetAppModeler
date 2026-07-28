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

    # 4. JS files in dependency order (flat concatenation - all share one scope)
    # IMPORTANT: Any top-level name must be unique across ALL files.
    # Known renames to prevent collision:
    #   ONTAP_HOPS in ui.js -> UI_UPGRADE_HOPS  (compatibility.js owns ONTAP_HOPS)
    #   ONTAP_LIFECYCLE in bestPractices.js -> BP_LIFECYCLE  (compatibility.js owns ONTAP_LIFECYCLE)
    js_files = [
        "js/jszip.min.js",
        "js/demoData.js",
        "js/parser.js",
        "js/compatibility.js",
        "js/bestPractices.js",
        "js/ui.js",
    ]

    # --- Build-time collision detector ---
    # Checks for duplicate top-level declarations across source files.
    # Run before bundling so errors are caught at build time, not browser runtime.
    seen = {}
    errors = []
    for rel_path in js_files:
        if rel_path.endswith("jszip.min.js"):
            continue
        with open(os.path.join(base_dir, rel_path), "r", encoding="utf-8") as f:
            src = f.read()
        cleaned = clean_js(src)
        for line in cleaned.splitlines():
            m = re.match(r'^(const|let|var|function)\s+([A-Za-z_][A-Za-z0-9_$]*)\b', line)
            if m:
                name = m.group(2)
                if name in seen and seen[name] != rel_path:
                    errors.append(f"  COLLISION: '{name}' in '{seen[name]}' AND '{rel_path}'")
                else:
                    seen[name] = rel_path
    if errors:
        print("BUILD FAILED - Top-level name collisions detected:")
        for e in errors:
            print(e)
        print("\nRename the duplicate identifiers before rebuilding.")
        raise SystemExit(1)
    # --- End collision detector ---

    # 5. Build bundled JS (flat - all files share one global scope by design)
    parts = []
    for rel_path in js_files:
        with open(os.path.join(base_dir, rel_path), "r", encoding="utf-8") as f:
            content = f.read()
        if not rel_path.endswith("jszip.min.js"):
            content = clean_js(content)
        parts.append(f"// --- START {rel_path} ---\n{content}\n// --- END {rel_path} ---")

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