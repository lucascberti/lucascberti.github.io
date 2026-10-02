"""Gera o CV em PDF (PT, EN e ES) a partir do conteúdo do próprio site.

Lê cv.html, pesquisa.html e midia.html, monta uma versão para impressão de cada
idioma e pede ao Chrome sem janela que a salve em PDF, em arquivos/.

Uso:  python3 scripts/build_cv.py
      (CHROME=/caminho/do/chrome para indicar outro navegador)

Roda sozinho no GitHub a cada mudança no site: .github/workflows/cv.yml
"""
import datetime
import html
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile

from bs4 import BeautifulSoup

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / 'arquivos'
LANGS = ('pt', 'en', 'es')
PDF_NAME = 'cv-lucas-calabro-berti-{}.pdf'

# Seções do CV, na ordem: (página, id da seção, tipo de bloco)
SECTIONS = [
    ('cv.html', 'formacao', 'items'),
    ('cv.html', 'atuacao', 'items'),
    ('pesquisa.html', 'publicacoes', 'items'),
    ('pesquisa.html', 'eventos', 'items'),
    ('pesquisa.html', 'projetos', 'items'),
    ('pesquisa.html', 'outros', 'items'),
    ('midia.html', 'media', 'media'),
    ('cv.html', 'experiencia', 'items'),
    ('cv.html', 'premios', 'items'),
    ('cv.html', 'idiomas', 'kv'),
]

TEXT = {
    'pt': {'subtitle': 'Mestrando em Ciência Política · IESP-UERJ', 'media': 'Na mídia',
           'updated': 'Atualizado em', 'site': 'Versão completa em',
           'months': ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
                      'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']},
    'en': {'subtitle': 'M.A. student in Political Science · IESP-UERJ', 'media': 'Media',
           'updated': 'Updated', 'site': 'Full version at',
           'months': ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                      'August', 'September', 'October', 'November', 'December']},
    'es': {'subtitle': 'Maestrando en Ciencia Política · IESP-UERJ', 'media': 'En los medios',
           'updated': 'Actualizado en', 'site': 'Versión completa en',
           'months': ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
                      'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']},
}

CONTACT = [
    ('lucasberti@iesp.uerj.br', 'mailto:lucasberti@iesp.uerj.br'),
    ('lucasberti.com', 'https://lucasberti.com'),
    ('Lattes', 'https://lattes.cnpq.br/3201012395712916'),
    ('ORCID 0000-0002-8057-5482', 'https://orcid.org/0000-0002-8057-5482'),
    ('LinkedIn', 'https://www.linkedin.com/in/lucascberti11'),
    ('GitHub', 'https://github.com/lucascberti'),
]

CSS = """
@page { size: A4; margin: 16mm 17mm 18mm; @bottom-right { content: counter(page); font: 8pt Inter, sans-serif; color: #6B7280; } }
* { box-sizing: border-box; }
html, body { background: #fff; }
body { margin: 0; font: 9.4pt/1.45 Inter, Helvetica, Arial, sans-serif; color: #1A1A1A; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
a { color: inherit; text-decoration: none; }
header { border-bottom: 2px solid #D4A853; padding-bottom: 4mm; margin-bottom: 2mm; }
h1 { margin: 0; font: 700 24pt/1.1 'Playfair Display', Georgia, serif; color: #1C3A2E; }
.sub { margin: 1.2mm 0 2mm; font-size: 11pt; color: #5F6570; }
.contact { margin: 0; font-size: 8.4pt; color: #1C3A2E; }
.contact span + span::before { content: "  ·  "; color: #B0A890; }
h2 { margin: 6mm 0 2mm; padding-bottom: 1mm; border-bottom: 0.6pt solid #E0D9C8;
     font: 600 12.5pt/1.2 'Playfair Display', Georgia, serif; color: #1C3A2E; break-after: avoid; }
.e { display: grid; grid-template-columns: 27mm 1fr; gap: 4mm; padding: 1.3mm 0 1.6mm; break-inside: avoid; }
.d { color: #6B7280; font-size: 8.4pt; padding-top: .4mm; }
.t { font-weight: 600; }
.k { font-size: 7.6pt; letter-spacing: .05em; text-transform: uppercase; color: #8C6A1F; margin-bottom: .3mm; }
.b, .v, .x { color: #4A4F57; }
.v { font-style: italic; }
.x { font-size: 8.8pt; }
.m { display: grid; grid-template-columns: 27mm 1fr; gap: 4mm; padding: .6mm 0; break-inside: avoid; }
.m .o { color: #8C6A1F; }
.kv { display: grid; grid-template-columns: 27mm 1fr; gap: .8mm 4mm; }
.kv .d { text-transform: capitalize; }
footer { margin-top: 7mm; padding-top: 2mm; border-top: 0.6pt solid #E0D9C8; font-size: 7.8pt; color: #6B7280; }
"""


def chrome_path():
    if os.environ.get('CHROME'):
        return os.environ['CHROME']
    for c in ('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
              'google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'):
        if os.path.exists(c) or shutil.which(c):
            return c
    sys.exit('Chrome não encontrado; defina a variável CHROME.')


def localize(el, lang):
    """Remove os textos dos outros idiomas e devolve o elemento."""
    for other in el.select('[data-l]'):
        if other.get('data-l') != lang:
            other.decompose()
    return el


def text(el):
    return ' '.join(el.get_text(' ', strip=True).split()) if el else ''


def inner(el):
    """HTML interno de um elemento, sem atributos de idioma, mantendo links e itálicos."""
    if el is None:
        return ''
    for tag in el.find_all(True):
        keep = {k: v for k, v in tag.attrs.items() if k == 'href'}
        tag.attrs = keep
        if tag.name not in ('a', 'em', 'i', 'strong'):
            tag.unwrap()
    return ' '.join(el.decode_contents().split())


def item_html(item):
    meta = item.find('p', class_='it-meta')
    date, kinds = '', []
    if meta:
        d = meta.find('span', class_='it-date')
        date = text(d)
        if d:
            d.decompose()
        for s in meta.find_all('span', recursive=False):
            t = text(s)
            if t and t.lower() not in ('novo', 'new', 'nuevo'):
                kinds.append(t)
    # cartões de projeto trazem a data como primeiro trecho da linha de cima
    if not date and kinds and kinds[0][:1].isdigit():
        date, _, rest = kinds.pop(0).partition(' · ')
        if rest:
            kinds.insert(0, rest)
    title = item.find('h3')
    parts = []
    if kinds:
        parts.append(f'<div class="k">{html.escape(" · ".join(kinds))}</div>')
    parts.append(f'<div class="t">{inner(title)}</div>')
    for cls, css in (('by', 'b'), ('venue', 'v'), ('desc', 'x')):
        p = item.find('p', class_=cls)
        if p and text(p):
            parts.append(f'<div class="{css}">{inner(p)}</div>')
    doi = item.find('a', href=lambda h: h and 'doi.org/' in h)
    if doi:
        url = doi['href']
        parts.append(f'<div class="x">DOI: <a href="{html.escape(url)}">{html.escape(url.split("doi.org/")[1])}</a></div>')
    return f'<div class="e"><div class="d">{html.escape(date)}</div><div>{"".join(parts)}</div></div>'


def media_html(item):
    meta = item.find('p', class_='it-meta')
    d = meta.find('span', class_='it-date')
    date = text(d)
    d.decompose()
    spans = [text(s) for s in meta.find_all('span', recursive=False)]
    outlet = spans[-1] if spans else ''
    title = item.find('h3')
    return (f'<div class="m"><div class="d">{html.escape(date)}</div>'
            f'<div><span class="o">{html.escape(outlet)}</span> — {inner(title)}</div></div>')


def build_lang(lang, pages):
    t = TEXT[lang]
    body = []
    seen = []
    for page, sec_id, kind in SECTIONS:
        soup = BeautifulSoup(pages[page], 'html.parser')
        if kind == 'media':
            box = soup.find(id=sec_id)
            heading = t['media']
            section = box
        else:
            section = soup.find('section', id=sec_id)
            heading = None
        if section is None:
            print(f'aviso: seção {sec_id} não encontrada em {page}', file=sys.stderr)
            continue
        localize(section, lang)
        if heading is None:
            heading = text(section.find('h2'))
        rows = []
        if kind == 'items':
            items = section.find_all('article', class_='item')
            if sec_id == 'projetos':
                # projetos que já aparecem em Atuação acadêmica não se repetem
                items = [i for i in items if not any(t.startswith(text(i.find('h3'))) for t in seen)]
            for i in items:
                seen.append(text(i.find('h3')))
            rows = [item_html(i) for i in items]
        elif kind == 'media':
            rows = [media_html(i) for i in section.find_all('article', class_='item')]
        elif kind == 'kv':
            dl = section.find('dl')
            for dt, dd in zip(dl.find_all('dt'), dl.find_all('dd')):
                rows.append(f'<div class="d">{html.escape(text(dt))}</div><div>{html.escape(text(dd))}</div>')
            rows = [f'<div class="kv">{"".join(rows)}</div>']
        body.append(f'<h2>{html.escape(heading)}</h2>' + ''.join(rows))

    today = datetime.date.today()
    updated = f"{t['updated']} {t['months'][today.month - 1]} {today.year}"
    contact = ''.join(f'<span><a href="{u}">{html.escape(label)}</a></span>' for label, u in CONTACT)
    return f"""<!DOCTYPE html><html lang="{lang}"><head><meta charset="utf-8">
<title>Lucas Calabró Berti — CV</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:ital,wght@0,400;0,600;1,400&display=swap">
<style>{CSS}</style></head><body>
<header><h1>Lucas Calabró Berti</h1><p class="sub">{html.escape(t['subtitle'])}</p><p class="contact">{contact}</p></header>
{''.join(body)}
<footer>{html.escape(updated)} · {html.escape(t['site'])} <a href="https://lucasberti.com">lucasberti.com</a></footer>
</body></html>"""


def main():
    pages = {p: (ROOT / p).read_text(encoding='utf-8') for p in {s[0] for s in SECTIONS}}
    OUT_DIR.mkdir(exist_ok=True)
    chrome = chrome_path()
    with tempfile.TemporaryDirectory() as tmp:
        for lang in LANGS:
            src = pathlib.Path(tmp) / f'cv-{lang}.html'
            src.write_text(build_lang(lang, pages), encoding='utf-8')
            out = OUT_DIR / PDF_NAME.format(lang)
            subprocess.run([chrome, '--headless=new', '--disable-gpu', '--no-sandbox',
                            '--no-pdf-header-footer', '--virtual-time-budget=10000',
                            f'--print-to-pdf={out}', src.as_uri()],
                           check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            print('ok', out.relative_to(ROOT))


if __name__ == '__main__':
    main()
