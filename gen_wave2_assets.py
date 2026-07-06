"""
Визуальная волна 2 для сайта МирСказок.
Киллер-фичи: До/После, героическая панорама, мокапы книг, шоукейс стилей.
"""
import asyncio
import os
import sys
import aiohttp
from PIL import Image
import io
import json

# Kie API
KIE_KEY = "037468795ca0dc239aa810b331e3b109"
BASE = "https://api.kie.ai/api/v1"
CREATE_URL = f"{BASE}/jobs/createTask"
RECORD_URL = f"{BASE}/jobs/recordInfo"
BALANCE_URL = f"{BASE}/chat/credit"

# Upload
LITTERBOX_URL = "https://litterbox.catbox.moe/resources/internals/api.php"

ASSETS_DIR = r"C:\Users\user\OneDrive\Рабочий стол\Проекты\МирСказок\site\assets"


def headers():
    return {"Authorization": f"Bearer {KIE_KEY}", "Content-Type": "application/json"}


async def check_balance(session: aiohttp.ClientSession) -> float:
    """Проверка баланса API."""
    async with session.get(BALANCE_URL, headers=headers()) as r:
        data = await r.json()
        return data.get("data", 0.0)


async def upload_public(data: bytes, filename: str = "photo.jpg") -> str:
    """Загрузка на litterbox для мультирефа."""
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


async def generate_kie(session: aiohttp.ClientSession, prompt: str,
                       image_urls: list = None, aspect_ratio: str = "1:1",
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

    # Submit
    async with session.post(CREATE_URL, json=payload, headers=headers(),
                            timeout=aiohttp.ClientTimeout(total=60)) as r:
        data = await r.json()
        if r.status >= 400:
            raise Exception(f"createTask error: {data}")
        task_id = (data.get("data") or {}).get("taskId")
        if not task_id:
            raise Exception(f"No taskId: {data}")
        print(f"    Task ID: {task_id}")

    # Poll
    for attempt in range(120):
        await asyncio.sleep(5)
        async with session.get(RECORD_URL, params={"taskId": task_id}, headers=headers()) as r:
            data = (await r.json()).get("data", {})
        state = (data.get("state") or data.get("status") or "").lower()
        if state in ("success", "completed"):
            raw = data.get("resultJson") or data.get("output")
            out = json.loads(raw) if isinstance(raw, str) else (raw or {})
            url = (out.get("resultUrls") or out.get("image_urls") or [None])[0] \
                  or out.get("resultUrl") or out.get("image_url")
            if not url:
                raise Exception(f"No URL in result: {out}")
            print(f"    Result URL: {url}")
            # Download
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=300)) as r:
                return await r.read()
        if state in ("fail", "failed", "error"):
            raise Exception(f"Task failed: {data.get('failMsg') or data}")
    raise Exception("Timeout after 600s")


def compress_for_web(data: bytes, max_width: int = 1400, quality: int = 82) -> bytes:
    """Сжатие для веба."""
    img = Image.open(io.BytesIO(data))
    if img.width > max_width:
        ratio = max_width / img.width
        img = img.resize((max_width, int(img.height * ratio)), Image.LANCZOS)
    buf = io.BytesIO()
    img.convert("RGB").save(buf, "JPEG", quality=quality, optimize=True)
    return buf.getvalue()


async def main():
    print("=" * 60)
    print("ВИЗУАЛЬНАЯ ВОЛНА 2 — МирСказок")
    print("=" * 60)

    async with aiohttp.ClientSession() as session:
        # Проверка баланса
        balance = await check_balance(session)
        print(f"\n[BALANCE] Kie API: {balance:.1f} credits")
        if balance < 300:
            print("[STOP] Insufficient balance (<300)")
            return

        print(f"[START] Generation wave (~400-450 credits budget)\n")

        stats = {"generated": 0, "failed": 0, "start_balance": balance}

        # ==== 1. KILLER FEATURE "BEFORE -> AFTER" ====
        print("\n" + "=" * 60)
        print("1. KILLER FEATURE: BEFORE -> AFTER")
        print("=" * 60)

        # 1.1. Child portrait (refless)
        print("\n[1.1] Photorealistic child portrait...")
        portrait_prompt = """Photorealistic close-up portrait of a happy cheerful 8-year-old Russian girl
with long light brown hair, bright blue eyes, warm genuine smile showing slight dimples.
She is wearing a cozy cream-colored knitted sweater. Soft natural window light from the side,
creating gentle shadows. Warm beige neutral background, slightly blurred. Shallow depth of field,
professional children portrait photography style. Canon 85mm f/1.8 aesthetic.
The child is fully and modestly dressed. High detail on face, eyes catching light beautifully.
No text, no letters, no words in the image."""

        try:
            data = await generate_kie(session, portrait_prompt, aspect_ratio="1:1", resolution="2K")
            path = os.path.join(ASSETS_DIR, "wave2", "before_portrait.jpg")
            os.makedirs(os.path.dirname(path), exist_ok=True)
            compressed = compress_for_web(data, max_width=1200)
            with open(path, "wb") as f:
                f.write(compressed)
            print(f"    [OK] Сохранено: {path}")

            # Upload для мультирефа
            portrait_url = await upload_public(data, "girl_portrait.jpg")
            print(f"    [URL] URL для мультирефа: {portrait_url}")
            stats["generated"] += 1

            # 1.2-1.4. ТА ЖЕ девочка в 3 сказочных образах
            after_scenes = [
                ("after_knight", "16:9", """The SAME girl from the reference photo as a brave young knight
in shining silver armor with golden details, standing heroically in front of a majestic fairy-tale castle
with tall spires and colorful flags. Dramatic golden sunset sky with pink and orange clouds, magical atmosphere.
Epic cinematic composition. Pixar 3D animation movie style, vibrant saturated colors, soft volumetric lighting,
rim lighting on armor. The girl's face is clearly visible and recognizable, turned slightly toward camera with
a confident heroic expression. She is ALWAYS fully and modestly dressed in complete knight armor.
Beautiful landscape with rolling green hills and wildflowers. No text, no letters, no words in the image."""),

                ("after_astronaut", "16:9", """The SAME girl from the reference photo as a young astronaut
in a white NASA-style spacesuit with patches and details, floating weightlessly inside a futuristic
spaceship cockpit. Large panoramic window showing a breathtaking view of Earth from space with stars,
nebula clouds, and distant planets. Warm interior lighting mixed with cosmic blue glow from outside.
Pixar 3D animation style, vibrant colors, soft cinematic lighting. Control panels with colorful buttons
and screens around her. The girl's face is clearly visible through the helmet visor, recognizable,
with an expression of wonder and excitement. She is ALWAYS fully dressed in a complete space suit.
No text, no letters, no words in the image."""),

                ("after_forest_magic", "16:9", """The SAME girl from the reference photo in a magical enchanted
forest, wearing a beautiful flowing dress in soft pastel colors (lavender and mint green) with delicate
floral embroidery. She is surrounded by glowing golden fireflies, friendly woodland animals (cute rabbits,
a gentle deer, colorful birds), luminous mushrooms with soft glow, and sparkling magical particles in the air.
Ancient trees with twisted roots and hanging vines. Golden hour sunlight filtering through leaves creating
god rays. Pixar 3D animation style, warm magical atmosphere, soft dreamy lighting. The girl's face is clearly
visible and recognizable, with a sweet joyful smile, slightly turned toward camera. She is ALWAYS fully and
modestly dressed in a complete beautiful dress. Fairy-tale fantasy illustration style.
No text, no letters, no words in the image."""),
            ]

            for name, aspect, prompt in after_scenes:
                print(f"\n[GEN] {name.replace('_', ' ').title()}...")
                try:
                    data = await generate_kie(session, prompt, image_urls=[portrait_url],
                                              aspect_ratio=aspect, resolution="2K")
                    path = os.path.join(ASSETS_DIR, "wave2", f"{name}.jpg")
                    compressed = compress_for_web(data, max_width=1400)
                    with open(path, "wb") as f:
                        f.write(compressed)
                    print(f"    [OK] Сохранено: {path}")
                    stats["generated"] += 1
                except Exception as e:
                    print(f"    [ERR] ОШИБКА: {e}")
                    stats["failed"] += 1
                await asyncio.sleep(2)

        except Exception as e:
            print(f"    [ERR] ОШИБКА портрета: {e}")
            stats["failed"] += 1

        # ==== 2. ГЕРОЙ-ПАНОРАМА ДЛЯ HERO ====
        print("\n" + "=" * 60)
        print("2. ГЕРОИЧЕСКАЯ ПАНОРАМА (21:9)")
        print("=" * 60)

        hero_prompts = [
            ("hero_panorama_castle", """Epic wide cinematic panoramic illustration of a magical fairy-tale landscape.
A brave young child hero (seen from behind, small silhouette) walks along a glowing golden path through
an enchanted forest toward a magnificent castle with tall spires in the distance. The castle glows with
warm magical light against a dramatic twilight sky with pink and purple clouds. Ancient trees with twisted
branches frame the scene on both sides, their leaves glowing softly. Fireflies and magical particles float
in the air. Volumetric light rays pierce through the forest canopy. Rolling hills, mystical atmosphere.
Cinematic composition with strong depth, atmospheric perspective. Pixar animation movie style meets fantasy
book cover art. Vibrant but harmonious color palette: golden yellows, deep purples, emerald greens,
warm pinks. 21:9 ultra-wide aspect ratio for parallax layers. The child is fully clothed in adventure clothes.
No text, no letters, no words in the image."""),

            ("hero_panorama_library", """Epic wide cinematic panoramic illustration of a magical library interior.
A young child (seen from behind, small figure) stands in the center of a vast ancient library with
towering bookshelves reaching up toward a starry cosmic ceiling. The books glow with soft magical light
in various colors. Floating books and glowing pages swirl through the air around the child. Grand arched
windows show a twilight sky with stars. Warm candlelight and magical orbs illuminate the scene.
Ancient wooden ladders, ornate railings, mystical atmosphere. Cinematic composition with strong vertical
depth and symmetry. Pixar animation style meets fantasy illustration art. Rich color palette: deep blues,
warm golds, purple glows, emerald accents. 21:9 ultra-wide aspect ratio for parallax layers.
The child is fully dressed in cozy comfortable clothes. No text, no letters, no words in the image."""),
        ]

        for name, prompt in hero_prompts:
            print(f"\n[HERO] {name.replace('_', ' ').title()}...")
            try:
                data = await generate_kie(session, prompt, aspect_ratio="21:9", resolution="2K")
                path = os.path.join(ASSETS_DIR, "wave2", f"{name}.jpg")
                compressed = compress_for_web(data, max_width=2000, quality=82)
                with open(path, "wb") as f:
                    f.write(compressed)
                print(f"    [OK] Сохранено: {path}")
                stats["generated"] += 1
            except Exception as e:
                print(f"    [ERR] ОШИБКА: {e}")
                stats["failed"] += 1
            await asyncio.sleep(2)

        # ==== 3. МОКАПЫ ПЕЧАТНОЙ КНИГИ ====
        print("\n" + "=" * 60)
        print("3. МОКАПЫ ПЕЧАТНОЙ КНИГИ")
        print("=" * 60)

        mockup_prompts = [
            ("mockup_desk", "4:3", """Photorealistic product photograph of a beautiful hardcover children's book
lying on a cozy child's wooden desk by a sunny window. The book has a colorful illustrated cover
(generic fairy-tale scene with castle and magical forest). Warm natural afternoon sunlight creating
soft shadows. A cute teddy bear and colorful pencils nearby. Soft cream and wood tones.
Shallow depth of field, professional product photography style. The book is slightly opened showing
illustrated pages inside. Cozy homey atmosphere. Canon 50mm f/1.8 aesthetic.
No text visible on the book. High quality, detailed textures."""),

            ("mockup_stack", "1:1", """Photorealistic product photograph of a stack of 3 beautiful hardcover
children's books with colorful illustrated covers (fantasy fairy-tale themes with castles, forests, animals).
The books are stacked artistically on a soft cream fabric background with subtle texture.
Warm soft diffused studio lighting from the side. Each book has a different vibrant color scheme
(purple/pink, green/blue, yellow/orange). Professional product photography style with clean composition.
Shallow depth of field focusing on the top book. High quality, detailed textures of book covers.
No text visible on the books."""),

            ("mockup_gift_box", "4:3", """Photorealistic product photograph of a beautiful hardcover children's book
inside an opened luxury gift box. The box is cream-colored with soft tissue paper. A beautiful silk ribbon
in soft pink or lavender color is tied around the book and box. The book has a colorful illustrated cover
(fairy-tale scene). Warm soft studio lighting creating gentle shadows. The scene is on a light wooden surface
with subtle texture. Professional product photography style. Gift-giving occasion atmosphere, elegant and warm.
Shallow depth of field, Canon 85mm aesthetic. No text visible. High quality detailed textures."""),

            ("mockup_hands_child", "4:3", """Photorealistic photograph of small child's hands holding a beautiful
hardcover illustrated children's book. The book has a vibrant colorful cover with a fairy-tale scene (castle,
magical forest). Shot from above at a slight angle. The child is sitting on a soft cream-colored blanket or carpet.
Warm natural window light. Cozy homey atmosphere. The child's hands are gentle and careful with the book,
expressing excitement. Professional lifestyle photography style. Shallow depth of field focusing on the book.
Only hands and book visible, face not shown. The child is wearing a cozy knitted sweater sleeves visible.
No text visible. Canon 50mm aesthetic."""),
        ]

        for name, aspect, prompt in mockup_prompts:
            print(f"\n[MOCK] {name.replace('_', ' ').title()}...")
            try:
                data = await generate_kie(session, prompt, aspect_ratio=aspect, resolution="2K")
                path = os.path.join(ASSETS_DIR, "wave2", f"{name}.jpg")
                compressed = compress_for_web(data, max_width=1200)
                with open(path, "wb") as f:
                    f.write(compressed)
                print(f"    [OK] Сохранено: {path}")
                stats["generated"] += 1
            except Exception as e:
                print(f"    [ERR] ОШИБКА: {e}")
                stats["failed"] += 1
            await asyncio.sleep(2)

        # ==== 4. СЦЕНА-ШОУКЕЙС СТИЛЕЙ ====
        print("\n" + "=" * 60)
        print("4. ШОУКЕЙС СТИЛЕЙ (один сюжет × 4 стиля)")
        print("=" * 60)

        base_scene = "A young child (7 years old) and a cute small friendly baby dragon standing together on a grassy hill under a magical starry night sky with a large crescent moon. The dragon is small, friendly, with big eyes and colorful scales (turquoise and purple). The child is wearing cozy adventure clothes."

        style_prompts = [
            ("showcase_pixar", "1:1", f"""{base_scene} PIXAR 3D ANIMATION STYLE:
High quality 3D rendering, soft volumetric lighting, subsurface scattering on skin,
physically based materials, vibrant saturated colors, cinematic composition,
character design like Pixar movies (Coco, Luca). Big expressive eyes, smooth rounded shapes,
warm color palette, soft rim lighting, magical atmosphere with glowing particles.
The child is fully and modestly dressed. No text in image."""),

            ("showcase_watercolor", "1:1", f"""{base_scene} WATERCOLOR ILLUSTRATION STYLE:
Traditional watercolor painting on textured paper, visible brush strokes and paper grain,
soft bleeding edges where colors meet, gentle color gradients, pastel color palette with
soft blues, purples, pinks, and greens. Artistic loose painting style, dreamy ethereal atmosphere,
subtle white highlights, children's book illustration aesthetic like Beatrix Potter meets modern watercolor.
The child is fully and modestly dressed. No text in image."""),

            ("showcase_storybook", "1:1", f"""{base_scene} CLASSIC STORYBOOK ILLUSTRATION STYLE:
Traditional children's book illustration art, detailed line work with colored ink and gentle shading,
vintage fairy-tale book aesthetic (1950s-1970s style), warm earth tones with touches of magical blues
and purples, slightly textured painterly look, cozy nostalgic feeling. Similar to classic illustrated
fairy tale books (Golden Books, classic Disney storybooks). Charming character designs with personality.
The child is fully and modestly dressed. No text in image."""),

            ("showcase_anime_soft", "1:1", f"""{base_scene} SOFT ANIME/GHIBLI STYLE:
Studio Ghibli inspired illustration style (Miyazaki aesthetic), soft hand-painted look with
gentle cel-shading, beautiful painted background, magical realism atmosphere, soft lighting with
warm glows, pastel color palette with natural tones, detailed background with grass and flowers,
expressive character design with large gentle eyes. Dreamy peaceful mood, painterly anime style.
Similar to My Neighbor Totoro, Kiki's Delivery Service. The child is fully and modestly dressed.
No text in image."""),
        ]

        for name, aspect, prompt in style_prompts:
            print(f"\n[GEN] {name.replace('_', ' ').title()}...")
            try:
                data = await generate_kie(session, prompt, aspect_ratio=aspect, resolution="2K")
                path = os.path.join(ASSETS_DIR, "wave2", f"{name}.jpg")
                compressed = compress_for_web(data, max_width=1000)
                with open(path, "wb") as f:
                    f.write(compressed)
                print(f"    [OK] Сохранено: {path}")
                stats["generated"] += 1
            except Exception as e:
                print(f"    [ERR] ОШИБКА: {e}")
                stats["failed"] += 1
            await asyncio.sleep(2)

        # ==== 5. ЛОЯЛЬНОСТЬ-ФОТО ====
        print("\n" + "=" * 60)
        print("5. ЛОЯЛЬНОСТЬ И ЭМОЦИИ")
        print("=" * 60)

        emotion_prompts = [
            ("emotion_dad_son", "4:3", """Photorealistic heartwarming photograph of a father and his young son
(around 6 years old) sitting together in a cozy armchair, reading a large colorful illustrated children's book together.
The father has his arm around the boy, both smiling warmly while looking at the book. Warm natural window light
from the side creating soft shadows. Cozy home interior with warm tones, soft blankets visible.
Intimate father-son bonding moment. Both are fully dressed in comfortable home clothes (father in casual shirt,
boy in cozy sweater). Shallow depth of field, professional lifestyle photography style. Canon 85mm f/1.8 aesthetic.
Genuine emotion and connection. No text visible in the image."""),

            ("emotion_grandma_girl", "4:3", """Photorealistic touching photograph of a grandmother and her granddaughter
(around 7 years old) sitting together on a comfortable couch, looking at a beautiful illustrated children's book together.
The grandmother wears glasses and has a gentle loving smile, the little girl looks at the book with wonder and joy.
Warm afternoon natural light through window. Cozy living room interior with warm soft colors. Intimate family moment
capturing the special bond between generations. Both are fully and modestly dressed in comfortable home clothes.
Professional lifestyle photography style. Shallow depth of field, soft warm color grading. Genuine emotion.
No text visible in the image."""),

            ("emotion_sleeping_hug", "4:3", """Photorealistic tender photograph of a young child (around 5 years old)
peacefully sleeping in bed while hugging a large colorful illustrated children's book to their chest.
Soft warm night light or bedside lamp creating gentle golden glow. Cozy bedroom with soft pillows and blankets
in cream and pastel colors. The child has a peaceful happy expression, completely relaxed.
Professional lifestyle photography capturing a precious bedtime moment. The child is fully dressed in cozy pajamas.
Shallow depth of field, warm color palette, soft dreamy aesthetic. Canon 50mm f/1.4 look.
No text visible in the image."""),
        ]

        for name, aspect, prompt in emotion_prompts:
            print(f"\n[EMO] {name.replace('_', ' ').title()}...")
            try:
                data = await generate_kie(session, prompt, aspect_ratio=aspect, resolution="2K")
                path = os.path.join(ASSETS_DIR, "wave2", f"{name}.jpg")
                compressed = compress_for_web(data, max_width=1200)
                with open(path, "wb") as f:
                    f.write(compressed)
                print(f"    [OK] Сохранено: {path}")
                stats["generated"] += 1
            except Exception as e:
                print(f"    [ERR] ОШИБКА: {e}")
                stats["failed"] += 1
            await asyncio.sleep(2)

        # ==== ФИНАЛЬНАЯ СТАТИСТИКА ====
        final_balance = await check_balance(session)
        spent = stats["start_balance"] - final_balance

        print("\n" + "=" * 60)
        print("ИТОГИ ВОЛНЫ 2")
        print("=" * 60)
        print(f"[OK] Сгенерировано: {stats['generated']}")
        print(f"[ERR] Ошибок: {stats['failed']}")
        print(f"[BAL] Начальный баланс: {stats['start_balance']:.1f}")
        print(f"[BAL] Конечный баланс: {final_balance:.1f}")
        print(f"[SPENT] Потрачено: {spent:.1f} кредитов")
        print(f"\n[SAVE] Все ассеты сохранены в:\n   {os.path.join(ASSETS_DIR, 'wave2')}")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
