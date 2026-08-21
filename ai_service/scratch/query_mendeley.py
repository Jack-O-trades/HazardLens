import requests
import re

url = "https://data.mendeley.com/datasets/t395bwcvbw/1"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
}
try:
    response = requests.get(url, headers=headers)
    print("Status Code:", response.status_code)
    if response.status_code == 200:
        html = response.text
        print("HTML Length:", len(html))
        
        # Look for download links
        links = re.findall(r'href="([^"]+?download=1)"', html)
        print(f"Found {len(links)} links matching 'download=1':")
        for link in set(links)[:10]:
            print("-", link)
            
        # Search for any references to t395bwcvbw files
        files_matches = re.findall(r'https://[^"]+?/public-files/datasets/[^"]+', html)
        print(f"Found {len(files_matches)} public-files links:")
        for m in set(files_matches)[:10]:
            print("-", m)
            
        with open("scratch/mendeley.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("Saved html to scratch/mendeley.html")
except Exception as e:
    print("Error:", e)
