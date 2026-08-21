import requests
import base64
from PIL import Image, ImageDraw
import io

def test_central_api():
    # 1. Create a synthetic image of "fire" matching dataset preparation style
    width, height = 640, 640
    img = Image.new("RGB", (width, height), color=(128, 128, 128))
    draw = ImageDraw.Draw(img)
    
    # Outer red flame
    draw.polygon([(320, 250), (200, 550), (440, 550)], fill=(235, 64, 52))
    # Inner yellow hot core
    draw.polygon([(320, 350), (260, 530), (380, 530)], fill=(255, 208, 0))
    
    # 2. Encode to base64
    buffered = io.BytesIO()
    img.save(buffered, format="JPEG")
    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    data_url = f"data:image/jpeg;base64,{img_str}"
    
    # 3. Send to API with claimed_hazard="fire"
    url = "http://127.0.0.1:8000/api/v1/detect-base64"
    payload = {
        "image": data_url,
        "claimed_hazard": "fire"
    }
    
    print("Sending POST request to FastAPI central AI service...")
    try:
        response = requests.post(url, json=payload, timeout=10)
        print("Status Code:", response.status_code)
        if response.status_code == 200:
            res_json = response.json()
            print("Response JSON:")
            print(res_json)
        else:
            print("Error Details:", response.text)
    except Exception as e:
        print("API Call Failed:", str(e))

if __name__ == "__main__":
    test_central_api()
