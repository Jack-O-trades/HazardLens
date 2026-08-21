import requests

url = "https://data.mendeley.com/public-api/zip/t395bwcvbw/download/1"
output_path = "C:/Users/Lenovo/Downloads/Roadway_Flooding.zip"

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
}

print(f"Downloading from {url}...")
try:
    response = requests.get(url, headers=headers, stream=True)
    print("Response Status Code:", response.status_code)
    if response.status_code == 200:
        total_size = int(response.headers.get('content-length', 0))
        print(f"Total Size: {total_size} bytes")
        
        with open(output_path, "wb") as f:
            chunk_size = 1024 * 1024  # 1 MB
            downloaded = 0
            for chunk in response.iter_content(chunk_size=chunk_size):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        percent = (downloaded / total_size) * 100
                        print(f"Progress: {percent:.1f}% ({downloaded}/{total_size} bytes)")
                    else:
                        print(f"Downloaded {downloaded} bytes")
                        
        print(f"[OK] Download completed successfully. Saved to {output_path}")
    else:
        print(f"Failed to download dataset. Status: {response.status_code}")
except Exception as e:
    print("Error downloading dataset:", e)
