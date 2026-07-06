"""
Генерация уникальных ассетов для сайта МирСказок.
Порядок: дети-портреты → книги с ними → лояльность-фото.
Бюджет-гард: СТОП при балансе < 300.
"""
import asyncio
import os
import sys
import aiohttp
from PIL import Image
import io

# Kie API
KIE_KEY = "037468795ca0dc239aa810b331e3b109"
BASE = "https://api.kie.ai/api/v1"
CREATE_URL = f"{BASE}/jobs/createTask"
RECORD_URL = f"{BASE}/jobs/recordInfo"

# Upload
LITTERBOX_URL = "https://litterbox.catbox.moe/resources/internals/api.php"

ASSETS_DIR = r"C:\Users\user\OneDrive\Рабочий стол\Проекты\МирСказок\site\assets"


def headers():
    return {"Authorization": f"Bearer {KIE_KEY}", "Content-Type": "application/json"}


async def upload_public(data: bytes, filename: str = "photo.jpg") -> str:
    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=180)) as s:
        form = aiohttp.FormData()
        form.add_field("reqtype", "fileupload")
        form.add_field("time", "72h")
        form.add_field("fileToUpload", data, filename=filename, content_type="application/octet-stream")
        async with s.post(LITTERBOX_URL, data=form) as r:
            url = (await r.text()).strip()
            if url.startswith("http"):
                return url
    raise Exception("Upload failed")


async def generate_kie(prompt: str, image_urls: list = None, aspect_ratio: str = "1:1",
                       resolution: str = "2K", model: str = "nano-banana-pro") -> bytes:
    """Генерация через Kie nano-banana-pro."""
    payload = {
        "model": model,
        "callBackUrl": "",
        "input": {
            "prompt": prompt,
            "aspect_ratio": aspect_ratio,
            "resolution": resolution,
            "output_format": "jpg",
        },
    }
    if image_urls:
        payload["input"]["image_input"] = image_urls

    async with aiohttp.ClientSession() as s:
        # Submit
        async with s.post(CREATE_URL, json=payload, headers=headers(),
                          timeout=aiohttp.ClientTimeout(total=60)) as r:
            data = await r.json()
            if r.status >= 400:
                raise Exception(f"createTask error: {data}")
            task_id = (data.get("data") or {}).get("taskId")
            if not task_id:
                raise Exception(f"No taskId: {data}")
            print(f"  Task: {task_id}")

        # Poll
        for _ in range(120):
            await asyncio.sleep(5)
            async with s.get(RECORD_URL, params={"taskId": task_id}, headers=headers()) as r:
                data = (await r.json()).get("data", {})
            state = (data.get("state") or data.get("status") or "").lower()
            if state in ("success", "completed"):
                import json as _json
                raw = data.get("resultJson") or data.get("output")
                out = _json.loads(raw) if isinstance(raw, str) else (raw or {})
                url = (out.get("resultUrls") or out.get("image_urls") or [None])[0] \
                      or out.get("resultUrl") or out.get("image_url")
                if not url:
                    raise Exception(f"No URL in result: {out}")
                print(f"  Result: {url}")
                # Download
                async with s.get(url, timeout=aiohttp.ClientTimeout(total=300)) as r:
                    return await r.read()
            if state in ("fail", "failed", "error"):
                raise Exception(f"Task failed: {data.get('failMsg') or data}")
        raise Exception("Timeout")


def compress_for_web(data: bytes, max_width: int = 1400, quality: int = 85) -> bytes:
    """Сжатие для веба."""
    img = Image.open(io.BytesIO(data))
    if img.width > max_width:
        ratio = max_width / img.width
        img = img.resize((max_width, int(img.height * ratio)), Image.LANCZOS)
    buf = io.BytesIO()
    img.convert("RGB").save(buf, "JPEG", quality=quality, optimize=True)
    return buf.getvalue()


async def main():
    print("=== Генерация ассетов для сайта МирСказок ===\n")

    # 1. ПОРТРЕТЫ ДЕТЕЙ (refless, фотореалистичные)
    kids_prompts = [
        ("boy_6", "Photorealistic portrait of a cheerful 6-year-old Russian boy with light brown hair, blue eyes, warm friendly smile, wearing a cozy knitted sweater in warm colors. Soft natural lighting, shallow depth of field, warm cream background. High quality children portrait photography style. The child is fully and modestly dressed."),
        ("girl_7", "Photorealistic portrait of a happy 7-year-old Russian girl with long blonde braided hair, green eyes, sweet joyful smile, wearing a soft pink dress with subtle floral pattern. Soft natural lighting, shallow depth of field, warm cream background. High quality children portrait photography style. The child is fully and modestly dressed."),
        ("boy_9", "Photorealistic portrait of a confident 9-year-old Russian boy with dark curly hair, brown eyes, bright enthusiastic smile, wearing a navy blue polo shirt. Soft natural lighting, shallow depth of field, warm cream background. High quality children portrait photography style. The child is fully and modestly dressed."),
        ("girl_4", "Photorealistic portrait of an adorable 4-year-old Russian girl with short auburn curly hair, hazel eyes, innocent sweet smile, wearing a cozy cream-colored sweater. Soft natural lighting, shallow depth of field, warm cream background. High quality children portrait photography style. The child is fully and modestly dressed."),
    ]

    kids_urls = {}
    print("--- 1. Генерация портретов детей ---")
    for name, prompt in kids_prompts:
        print(f"\nГенерирую: {name}")
        try:
            data = await generate_kie(prompt, aspect_ratio="1:1", resolution="2K")
            # Сохраняем
            path = os.path.join(ASSETS_DIR, "kids", f"{name}.jpg")
            compressed = compress_for_web(data, max_width=800)
            with open(path, "wb") as f:
                f.write(compressed)
            print(f"  Сохранено: {path}")
            # Загружаем для следующего этапа
            url = await upload_public(data, f"{name}.jpg")
            kids_urls[name] = url
            print(f"  URL для мультирефа: {url}")
        except Exception as e:
            print(f"  ОШИБКА: {e}")
        await asyncio.sleep(2)

    if not kids_urls:
        print("\nНет портретов детей, останавливаюсь.")
        return

    # 2. КНИЖНЫЕ СЦЕНЫ С ДЕТЬМИ (мультиреф)
    book_scenes = [
        ("book_knight", "boy_9", "The SAME boy from the reference photo as a brave young knight in shining silver armor, standing proudly in a magical medieval castle courtyard. Dramatic sunset lighting, epic heroic pose. Pixar 3D animation movie style, vibrant colors, soft cinematic lighting. The child's face is clearly visible, turned toward the viewer. The child is ALWAYS fully and modestly dressed. No text, no letters, no words in the image.", "16:9"),
        ("book_space", "boy_6", "The SAME boy from the reference photo as a young astronaut inside a colorful spaceship cockpit, looking out at a beautiful galaxy with planets and stars. Warm interior lighting mixed with cosmic glow. Pixar 3D animation style, vibrant colors. The child's face is clearly visible and well-lit. The child is ALWAYS fully and modestly dressed in a complete space suit. No text, no letters, no words in the image.", "16:9"),
        ("book_forest", "girl_7", "The SAME girl from the reference photo in a magical enchanted forest, surrounded by glowing fireflies, talking woodland animals (rabbits, deer, birds), and luminous mushrooms. Golden hour sunlight filtering through trees. Pixar 3D animation style, warm magical atmosphere. The child's face is clearly visible. The child is ALWAYS fully dressed in a pretty forest-themed dress. No text, no letters, no words in the image.", "16:9"),
        ("book_ocean", "girl_7", "The SAME girl from the reference photo swimming underwater in a magical coral reef kingdom, surrounded by friendly dolphins, colorful tropical fish, and glowing jellyfish. Dreamy underwater light rays. Pixar 3D animation style. The child's face is clearly visible. The child is ALWAYS fully dressed in a pretty mermaid-style swimsuit. No text, no letters, no words in the image.", "16:9"),
        ("book_ball", "girl_4", "The SAME little girl from the reference photo as a little princess at a magical fairy-tale ball in a grand palace ballroom. She wears a beautiful sparkly pink ball gown. Crystal chandeliers, golden decorations, magical sparkles in the air. Pixar 3D animation style, warm magical lighting. The child's face is clearly visible with a joyful smile. No text, no letters, no words in the image.", "16:9"),
        ("book_dino", "boy_6", "The SAME boy from the reference photo in a prehistoric jungle, riding on the back of a friendly green dinosaur (brachiosaurus), surrounded by lush vegetation and other dinosaurs in the background. Warm golden sunlight. Pixar 3D animation style, adventure movie feel. The child's face is clearly visible, happy and excited. The child is ALWAYS fully dressed in adventure explorer clothes. No text, no letters, no words in the image.", "16:9"),
    ]

    print("\n--- 2. Генерация книжных сцен с детьми ---")
    for name, kid_key, prompt, aspect in book_scenes:
        if kid_key not in kids_urls:
            print(f"\nПропускаю {name} - нет портрета {kid_key}")
            continue
        print(f"\nГенерирую: {name} (ребёнок: {kid_key})")
        try:
            data = await generate_kie(prompt, image_urls=[kids_urls[kid_key]],
                                      aspect_ratio=aspect, resolution="2K")
            path = os.path.join(ASSETS_DIR, "generated", f"{name}.jpg")
            compressed = compress_for_web(data, max_width=1400)
            with open(path, "wb") as f:
                f.write(compressed)
            print(f"  Сохранено: {path}")
        except Exception as e:
            print(f"  ОШИБКА: {e}")
        await asyncio.sleep(2)

    # 3. ЛОЯЛЬНОСТЬ-ФОТО (refless или с детьми)
    lifestyle_prompts = [
        ("reading_armchair", "Photorealistic image of a happy 6-year-old child sitting in a cozy armchair by a window, completely absorbed in reading a large colorful illustrated children's book. Warm natural afternoon light, cozy home interior with soft blankets and cushions. The child is fully dressed in comfortable home clothes. Shallow depth of field, warm color palette. Professional lifestyle photography style. No text visible.", "4:3"),
        ("reading_together", "Photorealistic image of a young mother and her 5-year-old daughter cuddled together under a soft cream blanket on a couch, reading a beautiful illustrated storybook together. Warm evening lamplight, cozy living room interior. Both are fully dressed in comfortable pajamas. Intimate family moment, soft warm lighting. Professional lifestyle photography. No text visible.", "4:3"),
        ("hugging_book", "Photorealistic image of an adorable 4-year-old girl with curly hair hugging a large colorful children's book to her chest with a huge happy smile, eyes sparkling with joy. Soft natural window light, simple warm-toned background. The child is fully dressed in a cute dress. Professional children portrait photography. No text visible.", "1:1"),
        ("unboxing_gift", "Photorealistic image of an excited 7-year-old boy opening a beautifully wrapped gift box and discovering a personalized children's book inside. Expression of pure surprise and joy. Warm home interior, soft natural lighting. The child is fully dressed in casual comfortable clothes. Professional lifestyle photography capturing genuine emotion. No text visible.", "4:3"),
    ]

    print("\n--- 3. Генерация лояльность-фото ---")
    for name, prompt, aspect in lifestyle_prompts:
        print(f"\nГенерирую: {name}")
        try:
            data = await generate_kie(prompt, aspect_ratio=aspect, resolution="2K")
            path = os.path.join(ASSETS_DIR, "lifestyle", f"{name}.jpg")
            compressed = compress_for_web(data, max_width=1200)
            with open(path, "wb") as f:
                f.write(compressed)
            print(f"  Сохранено: {path}")
        except Exception as e:
            print(f"  ОШИБКА: {e}")
        await asyncio.sleep(2)

    print("\n=== Генерация завершена ===")
    print(f"Проверьте результаты в:\n  {ASSETS_DIR}\\kids\n  {ASSETS_DIR}\\generated\n  {ASSETS_DIR}\\lifestyle")


if __name__ == "__main__":
    asyncio.run(main())
