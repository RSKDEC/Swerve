"""Build a guarded, size-limited one-file GitHub Actions update for restricted write access.
Run from the project root after all checks, with an up-to-date remote base.
"""
from pathlib import Path
import argparse, base64, hashlib, io, json, lzma, subprocess, textwrap, zipfile

ROOT = Path(__file__).resolve().parents[1]
def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)

def package(base, output):
    paths = set(git('diff', '--name-only', base, '-z').decode().split('\0')) | set(git('ls-files', '--others', '--exclude-standard', '-z').decode().split('\0'))
    paths.discard('')
    paths = {p for p in paths if not p.startswith('.github/')}
    files = []
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_STORED) as archive:
        for relative in sorted(paths):
            path = ROOT / relative
            if not path.is_file():
                raise ValueError('Deletion requires separate review: ' + relative)
            if path.name.startswith('.env') and path.name != '.env.example':
                raise ValueError('Refusing environment file: ' + relative)
            content = path.read_bytes()
            prior = subprocess.run(['git', 'show', base + ':' + relative], cwd=ROOT, capture_output=True)
            files.append(dict(path=relative, before=hashlib.sha256(prior.stdout).hexdigest() if prior.returncode == 0 else None, after=hashlib.sha256(content).hexdigest()))
            archive.writestr(relative, content)
        archive.writestr('SWERVE_UPDATE_MANIFEST.json', json.dumps(dict(files=files), separators=(',', ':')))
    payload = lzma.compress(buffer.getvalue(), preset=9)
    checksum = hashlib.sha256(payload).hexdigest()
    encoded = base64.b64encode(payload).decode()
    installer = f'''from pathlib import Path
import os, base64, hashlib, io, json, lzma, zipfile
payload = base64.b64decode(''.join(os.environ[k] for k in sorted(os.environ) if k.startswith('SWERVE_UPDATE_')), validate=True)
if hashlib.sha256(payload).hexdigest() != '{checksum}':
    raise SystemExit('Incomplete update. No files changed.')
archive = zipfile.ZipFile(io.BytesIO(lzma.decompress(payload)))
manifest = json.loads(archive.read('SWERVE_UPDATE_MANIFEST.json'))
ready = []
for item in manifest['files']:
    path = Path(item['path'])
    if path.is_absolute() or '..' in path.parts or path.parts[0] == '.github':
        raise SystemExit('Unexpected path. No files changed.')
    current = hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None
    if current == item['after']:
        continue
    if current != item['before']:
        raise SystemExit(f'STOP: {{path}} changed after this update was prepared. No files changed.')
    content = archive.read(item['path'])
    if hashlib.sha256(content).hexdigest() != item['after']:
        raise SystemExit('File checksum mismatch. No files changed.')
    ready.append((path, content))
for path, content in ready:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    print('Installed', path)
print(f'Installed {{len(ready)}} files. Open-answer pilot: 15 questions, 3 unique days; attention-v1 scoring.')
'''
    env = '\n'.join(f'          SWERVE_UPDATE_{i//12000:03d}: {encoded[i:i+12000]}' for i in range(0, len(encoded), 12000))
    workflow = '''name: Install Swerve open-answer pilot
on:
  workflow_dispatch:
  push:
    branches: [main]
    paths: [.github/workflows/open-answer-update.yml]
permissions:
  contents: write
concurrency:
  group: swerve-content-install
  cancel-in-progress: false
jobs:
  install:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
        with:
          ref: main
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Install frozen factual content and scoring
        env:
''' + env + '''
        run: |
          python - <<'PY'
''' + textwrap.indent(installer, '          ') + '''          PY
      - run: npm ci
      - run: npm run check
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - name: Commit tested open-answer update
        run: |
          git add --all
          if git diff --cached --quiet; then exit 0; fi
          git -c user.name='github-actions[bot]' -c user.email='41898282+github-actions[bot]@users.noreply.github.com' commit -m 'Switch Swerve to factual open answers and transparent attention scoring'
          git push origin HEAD:main
'''
    if len(workflow.encode()) >= 490000:
        raise ValueError('Workflow must stay below GitHub\'s 500 KB limit, with a safety margin.')
    output.mkdir(parents=True, exist_ok=True)
    (output / 'open-answer-update.yml').write_text(workflow)
    (output / 'swerve-open-answer-installer.py').write_text(installer)
    tracked = set(git('ls-files', '-z').decode().split('\0')) | paths
    with zipfile.ZipFile(output / 'swerve-open-answer-pilot.zip', 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for relative in sorted(tracked - {''}):
            path = ROOT / relative
            if path.is_file():
                archive.write(path, 'swerve/' + relative)
    print(f'{len(files)} files; workflow {len(workflow.encode()):,} bytes (<500 KB); full source ZIP included.')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', default='origin/main')
    parser.add_argument('--output', type=Path, default=ROOT.parent)
    args = parser.parse_args()
    package(args.base, args.output.resolve())
