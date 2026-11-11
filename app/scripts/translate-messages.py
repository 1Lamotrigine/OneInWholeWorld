"""Prepare checked-in dictionaries. The game never calls a translation service."""
import concurrent.futures
import json
import pathlib
import time
import urllib.parse
import subprocess

root = pathlib.Path(__file__).resolve().parents[1] / 'src' / 'i18n' / 'messages'
sources = json.loads((root / 'source.json').read_text())

def translate_batch(lines, language):
    query = urllib.parse.urlencode({'client': 'gtx', 'sl': 'ru', 'tl': language, 'dt': 't', 'q': '\n'.join(lines)})
    url = 'https://translate.googleapis.com/translate_a/single?' + query
    for attempt in range(3):
        try:
            response = subprocess.run(['curl', '--fail', '--silent', '--show-error', '--max-time', '30', url], check=True, capture_output=True, text=True)
            result = json.loads(response.stdout)
            text = ''.join(row[0] or '' for row in result[0])
            translated = text.split('\n')
            if len(translated) == len(lines) and all(row.strip() for row in translated):
                return dict(zip(lines, [row.strip() for row in translated]))
            if len(lines) > 1:
                middle = len(lines) // 2
                return {**translate_batch(lines[:middle], language), **translate_batch(lines[middle:], language)}
            if text.strip():
                return {lines[0]: text.strip()}
        except Exception as error:
            if attempt == 2:
                print(language, 'batch deferred', str(error), flush=True)
                return {}
            time.sleep(1.5 * (attempt + 1))
    return {}

def prepare(language):
    output = root / (language + '.json')
    messages = json.loads(output.read_text()) if output.exists() else {}
    missing = [text for text in sources if text not in messages]
    batches, batch, size = [], [], 0
    for text in missing:
        if size + len(text) > 1100 or len(batch) >= 35:
            batches.append(batch)
            batch, size = [], 0
        batch.append(text)
        size += len(text) + 1
    if batch:
        batches.append(batch)
    print(language, 'missing', len(missing), 'batches', len(batches), flush=True)
    for index, batch in enumerate(batches):
        messages.update(translate_batch(batch, language))
        temporary = output.with_suffix('.json.tmp')
        temporary.write_text(json.dumps(dict(sorted(messages.items())), ensure_ascii=False, indent=2) + '\n')
        temporary.replace(output)
        if index % 8 == 0 or index + 1 == len(batches):
            print(language, index + 1, '/', len(batches), 'stored', len(messages), flush=True)
        time.sleep(.12)
    count = sum(text in messages for text in sources)
    print(language, 'complete', count, '/', len(sources), flush=True)
    if count != len(sources):
        raise RuntimeError(language + ': incomplete dictionary')

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    list(pool.map(prepare, ['en', 'de', 'es', 'it']))
