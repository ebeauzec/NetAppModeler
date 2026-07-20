import os
import re

def bundle():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 1. Read index.html
    html_path = os.path.join(base_dir, "index.html")
    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()

    # 2. Read app.css
    css_path = os.path.join(base_dir, "app.css")
    with open(css_path, "r", encoding="utf-8") as f:
        css = f.read()

    # 3. Replace app.css link with inline style block
    style_block = f"<style>\n{css}\n</style>"
    html = html.replace('<link rel="stylesheet" href="app.css">', style_block)

    # Helper to clean ES6 imports and exports from JS contents
    def clean_js(content):
        # Remove import statements (handles multi-line and single-line imports)
        content = re.sub(r"import\s+[\s\S]*?\s+from\s+['\"].*?['\"];?", "", content)
        # Replace export statements (e.g. export const -> const, export function -> function)
        content = re.sub(r"\bexport\s+(const|let|var|function|class)\b", r"\1", content)
        return content

    # 4. Read JS files in correct order of dependency
    js_files = [
        "js/jszip.min.js",
        "js/demoData.js",
        "js/parser.js",
        "js/compatibility.js",
        "js/bestPractices.js",
        "js/ui.js"
    ]

    bundled_js = []
    for rel_path in js_files:
        path = os.path.join(base_dir, rel_path)
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Clean module keywords if not the minified library
        if not rel_path.endswith("jszip.min.js"):
            content = clean_js(content)
            
        bundled_js.append(f"// --- START {rel_path} ---\n{content}\n// --- END {rel_path} ---\n")

    js_code = "\n".join(bundled_js)

    # 5. Remove original script tags
    html = html.replace('<script src="js/jszip.min.js"></script>', '')
    html = html.replace('<script type="module" src="js/ui.js"></script>', '')

    # 6. Inject bundled JS before </body>
    injected_script = f"<script>\n{js_code}\n</script>\n</body>"
    html = html.replace('</body>', injected_script)

    # 7. Write output file
    output_path = os.path.join(base_dir, "standalone_netapp_modeler.html")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html)

    print("Bundled successfully! Standalone file written to:")
    print(f"- {output_path}")

    # 8. Optionally copy to local dev scratch root if path exists
    scratch_root_path = r"C:\Users\eugen\.gemini\antigravity\scratch\standalone_netapp_modeler.html"
    try:
        if os.path.exists(os.path.dirname(scratch_root_path)):
            with open(scratch_root_path, "w", encoding="utf-8") as f:
                f.write(html)
            print(f"- {scratch_root_path}")
    except Exception:
        pass

if __name__ == "__main__":
    bundle()
