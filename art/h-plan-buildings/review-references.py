"""Read-only reference retrieval; outputs stay in ignored artifacts, not the asset pack."""
from pathlib import Path
import hashlib, json, urllib.request, subprocess
from pypdf import PdfReader
import re
normalize = lambda text: re.sub(r'[^a-z0-9]', '', text.lower())

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'artifacts/h-plan-buildings/references'
OUT.mkdir(parents=True, exist_ok=True)
SOURCES = [('lpc-morton', 'https://s-media.nyc.gov/agencies/lpc/lp/2366.pdf', ['10-12 Morton', 'H-shaped']),
           ('lpc-st-nicholas', 'https://s-media.nyc.gov/agencies/lpc/lp/2651.pdf', ['574 St. Nicholas', 'H-shaped'])]
records = []
for name, url, terms in SOURCES:
    target = OUT / (name + '.pdf')
    if not target.exists():
        request = urllib.request.Request(url, headers={'User-Agent': 'Nautilus art reference review'})
        with urllib.request.urlopen(request, timeout=45) as response:
            data = response.read(60_000_001)
        if len(data) > 60_000_000 or not data.startswith(b'%PDF'):
            raise ValueError('Unexpected reference document')
        target.write_bytes(data)
    document = PdfReader(target)
    matches = []
    for number, page in enumerate(document.pages):
        text = page.extract_text() or ''
        if all(normalize(term) in normalize(text) for term in terms):
            matches.append(number)
    # Inspect the overview and the individual building entry; no full-report rendering.
    selected = list(dict.fromkeys(matches[:1] + matches[-1:]))
    for number in selected:
        poppler = Path.home() / '.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdftoppm.exe'
        subprocess.run([str(poppler), '-f', str(number+1), '-l', str(number+1), '-r', '97', '-singlefile', '-png', str(target), str(OUT / f'{name}-page-{number+1}')], check=True, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
    records.append({'id': name, 'url': url, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
                    'pages': len(document.pages), 'matchedPdfPages': [n+1 for n in matches],
                    'reviewedPdfPages': [n+1 for n in selected]})
    print(name, 'review pages', [n+1 for n in selected], flush=True)
(OUT / 'review.json').write_text(json.dumps(records, indent=2))
