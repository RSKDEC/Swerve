"""Explicit editorial refresh only. Never called by build or during a game.
Fetches public Wikimedia APIs, with no credentials, then freezes a dated snapshot.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlencode, quote, unquote
import json, urllib.request, urllib.error, hashlib, time

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / 'content/factual/catalog.json'
HEADERS = {'User-Agent': 'SwervePrototype/0.3 (public daily game; editorial evidence snapshot)'}

def fetch(url):
    cache = ROOT.parent / 'swerve-factual-fetch-cache' / (hashlib.sha256(url.encode()).hexdigest() + '.json')
    if cache.exists():
        return json.loads(cache.read_text())
    for attempt in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=35) as response:
                data = json.load(response)
                cache.parent.mkdir(exist_ok=True)
                cache.write_text(json.dumps(data))
                time.sleep(1.1)
                return data
        except urllib.error.HTTPError as error:
            print('API response',error.code,url,'Retry-After:',error.headers.get('Retry-After'),flush=True)
            if error.code != 429 or attempt == 4:
                raise
            time.sleep(max(5,int(error.headers.get('Retry-After','30'))))
        except Exception:
            if attempt == 4:
                raise
            time.sleep(min(10, 2 ** (attempt + 1)))

def main():
    catalog = json.loads(CATALOG.read_text())
    titles = sorted({unquote(a['article']).replace('_', ' ') for q in catalog['questions'] for a in q['answers']})
    previous = {}
    evidence_path = ROOT / 'content/factual/evidence.json'
    if evidence_path.exists():
        prior_bytes = evidence_path.read_bytes()
        if hashlib.sha256(prior_bytes).hexdigest() != (ROOT / 'content/factual/evidence.sha256').read_text().strip():
            raise ValueError('Existing evidence checksum mismatch')
        candidate = json.loads(prior_bytes)
        if candidate['version'] == catalog['version'] and candidate['window'] == catalog['viewWindow']:
            previous = candidate
    canonical = {t: c for t, c in previous.get('canonical', {}).items() if t in titles}
    missing_titles = [t for t in titles if t not in canonical]
    for offset in range(0, len(missing_titles), 40):
        batch = missing_titles[offset:offset + 40]
        response = fetch('https://en.wikipedia.org/w/api.php?' + urlencode(dict(action='query', titles='|'.join(batch), redirects=1, prop='pageprops', ppprop='disambiguation', format='json')))
        query = response['query']
        if any('tofragment' in r for r in query.get('redirects', [])):
            raise ValueError('An answer redirects to a section of a broader article; choose a better-scoped question.')
        redirects = {r['from']: r['to'] for r in query.get('normalized', []) + query.get('redirects', [])}
        pages = {p['title']: p for p in query['pages'].values()}
        for title in batch:
            target = title
            while target in redirects:
                target = redirects[target]
            page = pages[target]
            if 'missing' in page or 'disambiguation' in page.get('pageprops', {}):
                raise ValueError(f'Missing or ambiguous article: {title} => {target}')
            canonical[title] = target
    sources = {q['id']: previous['sources'][q['id']] for q in catalog['questions'] if q['id'] in previous.get('sources', {})}
    missing_questions = [q for q in catalog['questions'] if q['id'] not in sources]
    source_titles = [q['sourceArticle'].replace('_', ' ') for q in missing_questions]
    url = 'https://en.wikipedia.org/w/api.php?' + urlencode(dict(action='query', prop='revisions', titles='|'.join(source_titles), rvprop='ids|timestamp', format='json'))
    pages = {p['title']: p for p in fetch(url)['query']['pages'].values()} if source_titles else {}
    for q, title in zip(missing_questions, source_titles):
        page = pages[title]
        if 'missing' in page:
            raise ValueError('Missing factual source: ' + title)
        revision = page['revisions'][0]
        sources[q['id']] = dict(title=page['title'], revision=revision['revid'], revisionTimestamp=revision['timestamp'], url=f'https://en.wikipedia.org/w/index.php?oldid={revision["revid"]}')
    window = catalog['viewWindow']
    def views(title):
        url = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/' + quote(title.replace(' ', '_'), safe='') + '/daily/' + window['start'] + '/' + window['end']
        response = fetch(url)
        items = response['items']
        if len(items) != window['days'] or any(i['views'] < 0 or i['agent'] != 'user' or i['project'] != 'en.wikipedia' for i in items):
            raise ValueError('Incomplete or invalid view window: ' + title)
        timestamps = [i['timestamp'] for i in items]
        if len(set(timestamps)) != window['days'] or timestamps[0] != window['start'] or timestamps[-1] != window['end']:
            raise ValueError('Invalid day sequence: ' + title)
        print('Verified views:',title,flush=True)
        return title, dict(url=url, views=sum(i['views'] for i in items), daily=[[i['timestamp'], i['views']] for i in items])
    articles = {t: a for t, a in previous.get('articles', {}).items() if t in canonical.values()}
    missing_articles = sorted(set(canonical.values()) - articles.keys())
    with ThreadPoolExecutor(max_workers=1) as pool:
        articles.update(pool.map(views, missing_articles))
    articles = dict(sorted(articles.items()))
    data = dict(version=catalog['version'], window=window, project='en.wikipedia', access='all-access', agent='user', canonical=canonical, sources=sources, articles=articles)
    path = ROOT / 'content/factual/evidence.json'
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    (ROOT / 'content/factual/evidence.sha256').write_text(hashlib.sha256(path.read_bytes()).hexdigest() + '\n')
    print(f'Frozen {len(articles)} article histories; {len(sources)} pinned factual source revisions.')

if __name__ == '__main__':
    main()
