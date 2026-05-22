import re
import json

with open('mendeley.html', 'r', encoding='utf-8') as f:
    html = f.read()

urls = re.findall(r'https://[^\"\'\s]+', html)
zip_urls = [u for u in urls if 'zip' in u or 'download' in u.lower()]
print('Download URLs:', zip_urls[:10])

# Also look for __NEXT_DATA__
match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html)
if match:
    data = json.loads(match.group(1))
    try:
        files = data['props']['pageProps']['initialState']['dataset']['dataset']['files']
        for f in files:
            print("File:", f['filename'], f['contentUrl'])
    except Exception as e:
        print("Error parsing NEXT_DATA:", e)
