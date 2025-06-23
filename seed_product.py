import sqlite3
import random
import datetime
import os
import glob
from typing import List, Tuple

IMAGES_BASE_DIR = "product_images"

AGRICULTURAL_PRODUCTS = {
    "Fruits": {
        "Tropical": [
            {"name": "Mangoes", "varieties": ["Carabao", "Indian", "Tommy Atkins", "Kent", "Haden"], "price_range": (50, 150)},
            {"name": "Pineapples", "varieties": ["Sweet Gold", "Queen", "Red Spanish", "Smooth Cayenne"], "price_range": (30, 80)},
            {"name": "Papayas", "varieties": ["Solo", "Red Lady", "Sunrise", "Tainung"], "price_range": (25, 60)},
            {"name": "Bananas", "varieties": ["Cavendish", "Lakatan", "Saba", "Red Banana", "Lady Finger"], "price_range": (20, 50)},
            {"name": "Coconuts", "varieties": ["Young", "Mature", "Buko", "Macapuno"], "price_range": (15, 40)},
            {"name": "Rambutan", "varieties": ["Binjai", "Lebak Bulus", "Rapiah"], "price_range": (60, 120)},
            {"name": "Lanzones", "varieties": ["Longkong", "Duku"], "price_range": (80, 150)},
            {"name": "Dragon Fruit", "varieties": ["White Flesh", "Red Flesh", "Yellow"], "price_range": (100, 200)},
            {"name": "Durian", "varieties": ["Monthong", "Chanee", "Kan Yao"], "price_range": (200, 500)},
            {"name": "Jackfruit", "varieties": ["Sweet", "Firm", "Soft"], "price_range": (40, 100)}
        ],
        "Citrus": [
            {"name": "Oranges", "varieties": ["Valencia", "Navel", "Blood Orange", "Mandarin"], "price_range": (30, 80)},
            {"name": "Lemons", "varieties": ["Eureka", "Meyer", "Lisbon"], "price_range": (40, 100)},
            {"name": "Limes", "varieties": ["Key Lime", "Persian Lime", "Kaffir Lime"], "price_range": (35, 90)},
            {"name": "Grapefruit", "varieties": ["Pink", "White", "Red"], "price_range": (45, 110)},
            {"name": "Calamansi", "varieties": ["Local", "Hybrid"], "price_range": (25, 60)}
        ],
        "Temperate": [
            {"name": "Apples", "varieties": ["Fuji", "Gala", "Granny Smith", "Red Delicious"], "price_range": (80, 180)},
            {"name": "Grapes", "varieties": ["Red Globe", "Green", "Black", "Concord"], "price_range": (100, 250)},
            {"name": "Strawberries", "varieties": ["Albion", "Sweet Charlie", "Chandler"], "price_range": (150, 300)},
            {"name": "Avocados", "varieties": ["Hass", "Fuerte", "Reed", "Pinkerton"], "price_range": (80, 200)}
        ]
    },
    "Vegetables": {
        "Leafy": [
            {"name": "Lettuce", "varieties": ["Iceberg", "Romaine", "Butterhead", "Oak Leaf"], "price_range": (25, 60)},
            {"name": "Cabbage", "varieties": ["Green", "Red", "Napa", "Savoy"], "price_range": (15, 40)},
            {"name": "Spinach", "varieties": ["Flat Leaf", "Savoy", "Semi-Savoy"], "price_range": (30, 70)},
            {"name": "Kale", "varieties": ["Curly", "Lacinato", "Red Russian"], "price_range": (40, 90)},
            {"name": "Bok Choy", "varieties": ["Baby", "Shanghai", "Regular"], "price_range": (20, 50)},
            {"name": "Kangkong", "varieties": ["Land", "Water"], "price_range": (10, 25)},
            {"name": "Pechay", "varieties": ["Native", "Baguio"], "price_range": (15, 35)}
        ],
        "Root": [
            {"name": "Potatoes", "varieties": ["Russet", "Red", "Yukon Gold", "Fingerling"], "price_range": (20, 50)},
            {"name": "Sweet Potatoes", "varieties": ["Orange", "Purple", "White", "Japanese"], "price_range": (25, 60)},
            {"name": "Carrots", "varieties": ["Nantes", "Imperator", "Chantenay", "Baby"], "price_range": (30, 70)},
            {"name": "Radishes", "varieties": ["Red", "White", "Daikon", "Black"], "price_range": (25, 55)},
            {"name": "Turnips", "varieties": ["Purple Top", "White", "Golden"], "price_range": (30, 65)},
            {"name": "Cassava", "varieties": ["Yellow", "White"], "price_range": (15, 35)},
            {"name": "Taro", "varieties": ["Dasheen", "Eddoe"], "price_range": (40, 90)}
        ],
        "Fruiting": [
            {"name": "Tomatoes", "varieties": ["Roma", "Cherry", "Beef", "Heirloom"], "price_range": (35, 80)},
            {"name": "Eggplant", "varieties": ["Globe", "Japanese", "Chinese", "Thai"], "price_range": (30, 70)},
            {"name": "Bell Peppers", "varieties": ["Red", "Yellow", "Green", "Orange"], "price_range": (50, 120)},
            {"name": "Chili Peppers", "varieties": ["Jalapeno", "Habanero", "Thai", "Cayenne"], "price_range": (40, 100)},
            {"name": "Okra", "varieties": ["Green", "Red"], "price_range": (25, 60)},
            {"name": "Cucumber", "varieties": ["Slicing", "Pickling", "English", "Armenian"], "price_range": (20, 50)},
            {"name": "Zucchini", "varieties": ["Green", "Yellow", "Pattypan"], "price_range": (30, 70)},
            {"name": "Squash", "varieties": ["Butternut", "Acorn", "Kabocha", "Delicata"], "price_range": (25, 60)}
        ],
        "Alliums": [
            {"name": "Onions", "varieties": ["Red", "White", "Yellow", "Sweet"], "price_range": (20, 50)},
            {"name": "Garlic", "varieties": ["Hardneck", "Softneck", "Elephant"], "price_range": (80, 200)},
            {"name": "Shallots", "varieties": ["French", "Asian"], "price_range": (100, 250)},
            {"name": "Leeks", "varieties": ["American Flag", "King Richard"], "price_range": (60, 140)},
            {"name": "Green Onions", "varieties": ["Bunching", "Multiplier"], "price_range": (15, 40)}
        ]
    },
    "Grains": {
        "Cereals": [
            {"name": "Rice", "varieties": ["Jasmine", "Basmati", "Brown", "Black", "Red"], "price_range": (25, 80)},
            {"name": "Corn", "varieties": ["Sweet", "Dent", "Flint", "Popcorn"], "price_range": (15, 40)},
            {"name": "Wheat", "varieties": ["Hard Red", "Soft White", "Durum"], "price_range": (20, 50)},
            {"name": "Barley", "varieties": ["Two-row", "Six-row", "Hull-less"], "price_range": (25, 60)},
            {"name": "Oats", "varieties": ["White", "Red", "Black"], "price_range": (30, 70)}
        ]
    },
    "Legumes": {
        "Beans": [
            {"name": "Mung Beans", "varieties": ["Green", "Yellow"], "price_range": (40, 100)},
            {"name": "Black Beans", "varieties": ["Turtle", "Venezuelan"], "price_range": (50, 120)},
            {"name": "Kidney Beans", "varieties": ["Red", "White", "Light Red"], "price_range": (60, 140)},
            {"name": "Lima Beans", "varieties": ["Large", "Baby", "Christmas"], "price_range": (70, 160)},
            {"name": "String Beans", "varieties": ["Green", "Yellow", "Purple"], "price_range": (30, 80)},
            {"name": "Winged Beans", "varieties": ["Green", "Purple"], "price_range": (50, 120)}
        ],
        "Peas": [
            {"name": "Green Peas", "varieties": ["Garden", "Snow", "Sugar Snap"], "price_range": (40, 100)},
            {"name": "Black-eyed Peas", "varieties": ["California", "Mississippi"], "price_range": (45, 110)}
        ],
        "Nuts": [
            {"name": "Peanuts", "varieties": ["Valencia", "Virginia", "Spanish", "Runner"], "price_range": (60, 150)},
            {"name": "Cashews", "varieties": ["Raw", "Roasted"], "price_range": (200, 500)}
        ]
    },
    "Herbs & Spices": {
        "Leafy Herbs": [
            {"name": "Basil", "varieties": ["Sweet", "Thai", "Holy", "Lemon"], "price_range": (25, 60)},
            {"name": "Cilantro", "varieties": ["Regular", "Long Standing"], "price_range": (20, 50)},
            {"name": "Parsley", "varieties": ["Flat Leaf", "Curly"], "price_range": (25, 60)},
            {"name": "Mint", "varieties": ["Peppermint", "Spearmint", "Chocolate"], "price_range": (30, 70)},
            {"name": "Rosemary", "varieties": ["Upright", "Prostrate"], "price_range": (35, 80)},
            {"name": "Thyme", "varieties": ["Common", "Lemon", "French"], "price_range": (40, 90)}
        ],
        "Spices": [
            {"name": "Ginger", "varieties": ["Common", "Baby"], "price_range": (50, 120)},
            {"name": "Turmeric", "varieties": ["Fresh", "Dried"], "price_range": (60, 140)},
            {"name": "Lemongrass", "varieties": ["East Indian", "West Indian"], "price_range": (25, 60)}
        ]
    }
}

PRODUCT_SPECIFIC_DATA = {
    # Fruits - Tropical
    "Mangoes": {
        "attributes": ["sweet", "juicy", "aromatic", "fiber-rich", "golden"],
        "uses": ["eating fresh", "smoothies", "desserts", "salads", "preserves"],
        "seasons": ["summer harvest", "peak season", "tree-ripened"],
        "benefits": ["vitamin C rich", "antioxidant packed", "digestive aid"]
    },
    "Pineapples": {
        "attributes": ["tangy-sweet", "tropical", "enzyme-rich", "golden yellow"],
        "uses": ["fresh consumption", "grilling", "juicing", "cooking", "garnish"],
        "seasons": ["year-round availability", "peak ripeness"],
        "benefits": ["bromelain enzyme", "vitamin C boost", "anti-inflammatory"]
    },
    "Bananas": {
        "attributes": ["creamy", "naturally sweet", "potassium-rich", "energy-boosting"],
        "uses": ["snacking", "baking", "smoothies", "breakfast bowls"],
        "seasons": ["always in season", "perfectly ripe"],
        "benefits": ["instant energy", "heart-healthy", "muscle function support"]
    },
    
    # Vegetables - Leafy
    "Lettuce": {
        "attributes": ["crisp", "fresh", "hydrating", "crunchy", "tender"],
        "uses": ["salads", "wraps", "sandwiches", "garnish"],
        "seasons": ["cool season crop", "fresh harvest"],
        "benefits": ["low calorie", "hydrating", "vitamin K rich"]
    },
    "Spinach": {
        "attributes": ["nutrient-dense", "iron-rich", "tender", "dark green"],
        "uses": ["salads", "cooking", "smoothies", "soups"],
        "seasons": ["cool weather favorite", "fresh picked"],
        "benefits": ["iron powerhouse", "folate rich", "antioxidant loaded"]
    },
    
    # Vegetables - Root
    "Potatoes": {
        "attributes": ["versatile", "starchy", "filling", "earthy"],
        "uses": ["roasting", "mashing", "frying", "baking", "soups"],
        "seasons": ["storage crop", "fresh harvest"],
        "benefits": ["energy source", "potassium rich", "fiber content"]
    },
    "Carrots": {
        "attributes": ["sweet", "crunchy", "vibrant orange", "beta-carotene rich"],
        "uses": ["raw snacking", "cooking", "juicing", "roasting"],
        "seasons": ["cool season harvest", "crisp and fresh"],
        "benefits": ["vision support", "immune boost", "antioxidant rich"]
    },

    # Vegetables - Fruiting
    "Tomatoes": {
        "attributes": ["juicy", "vibrant", "vine-ripened", "flavorful"],
        "uses": ["salads", "cooking", "sauces", "grilling", "fresh eating"],
        "seasons": ["summer harvest", "greenhouse grown", "peak season"],
        "benefits": ["lycopene rich", "vitamin C packed", "antioxidant loaded"]
    },
    "Eggplant": {
        "attributes": ["tender", "versatile", "meaty texture", "mild flavor"],
        "uses": ["grilling", "roasting", "stir-frying", "curries", "Mediterranean dishes"],
        "seasons": ["warm season crop", "summer harvest"],
        "benefits": ["fiber rich", "antioxidant source", "heart healthy"]
    },
    
    # Grains
    "Rice": {
        "attributes": ["aromatic", "fluffy", "premium grain", "perfectly aged"],
        "uses": ["main dishes", "side dishes", "desserts", "sushi"],
        "seasons": ["harvest season", "properly stored"],
        "benefits": ["energy source", "gluten-free", "easily digestible"]
    },
    
    # Herbs & Spices
    "Basil": {
        "attributes": ["aromatic", "peppery", "fresh", "vibrant green"],
        "uses": ["pasta", "pizza", "pesto", "salads", "garnish"],
        "seasons": ["summer herb", "greenhouse grown"],
        "benefits": ["antioxidant rich", "anti-inflammatory", "flavor enhancer"]
    },
    
    # Add more specific data as needed - this is a sample
}

# Function to find product images based on category, and subcategory
def find_product_image(product_name: str, variety: str, category: str, subcategory: str) -> str:
    fallback_image = "https://cdn.britannica.com/17/196817-050-6A15DAC3/vegetables.jpg"
    category_path = os.path.join(IMAGES_BASE_DIR, category, subcategory)
    
    if not os.path.exists(category_path):
        print(f"[WARNING] Category path does not exist: {category_path}")
        return fallback_image
    
    image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    all_images = []
    
    for ext in image_extensions:
        all_images.extend(glob.glob(os.path.join(category_path, f"*{ext}")))
        all_images.extend(glob.glob(os.path.join(category_path, f"*{ext.upper()}")))
    
    if all_images:
        random_image = random.choice(all_images)
        
        relative_path = os.path.relpath(random_image, IMAGES_BASE_DIR)
        server_path = f"/images/{relative_path}"
        
        print(f"[INFO] Using image: {server_path} for {variety} {product_name}")
        return server_path
    
    print(f"[WARNING] No images found in {category_path}")
    return fallback_image


def get_product_context(product_name: str, variety: str, category: str, subcategory: str) -> dict:
    base_data = PRODUCT_SPECIFIC_DATA.get(product_name, {})
    
    default_attributes = {
        "Fruits": ["fresh", "flavorful", "nutritious", "seasonal"],
        "Vegetables": ["farm-fresh", "healthy", "versatile", "crisp"],
        "Grains": ["wholesome", "nutritious", "filling", "quality"],
        "Legumes": ["protein-rich", "hearty", "nutritious", "wholesome"],
        "Herbs & Spices": ["aromatic", "flavorful", "fresh", "potent"]
    }
    
    return {
        "attributes": base_data.get("attributes", default_attributes.get(category, ["fresh", "quality"])),
        "uses": base_data.get("uses", ["cooking", "eating fresh"]),
        "seasons": base_data.get("seasons", ["fresh harvest", "seasonal"]),
        "benefits": base_data.get("benefits", ["nutritious", "healthy choice"])
    }

def generate_realistic_description(product_name: str, variety: str, category: str, subcategory: str = "") -> str:
    
    context = get_product_context(product_name, variety, category, subcategory)
    
    quality_terms = [
        "Premium grade", "Farm-fresh", "Hand-selected", "Top quality", 
        "Carefully chosen", "Finest selection", "Grade A", "Superior quality",
        "Artisan grown", "Sustainably farmed"
    ]
    
    freshness_terms = [
        "just harvested", "picked at peak ripeness", "fresh from the field",
        "recently picked", "garden fresh", "harvest fresh", "straight from the farm",
        "vine-ripened", "naturally ripened", "sun-ripened"
    ]
    
    origin_stories = [
        "from trusted local growers", "cultivated in fertile soil", 
        "grown with sustainable practices", "from family-owned farms",
        "sourced from premium orchards", "hand-tended by experienced farmers",
        "from organic-certified fields", "grown in optimal conditions"
    ]
    
    quality = random.choice(quality_terms)
    freshness = random.choice(freshness_terms)
    origin = random.choice(origin_stories)
    attribute = random.choice(context["attributes"])
    use_case = random.choice(context["uses"])
    benefit = random.choice(context["benefits"])
    season = random.choice(context["seasons"])
    
    templates = [
        # Template 1: Quality focus
        f"{quality} {variety} {product_name.lower()} that are {attribute} and {freshness}. Perfect for {use_case}, these {benefit} gems are {origin}. Experience the difference of {season} produce.",
        
        # Template 2: Benefit focus
        f"Discover the exceptional taste of {variety} {product_name.lower()}! These {attribute} fruits/vegetables are {benefit} and {freshness}. {quality} selection {origin}, ideal for {use_case}.",
        
        # Template 3: Story-driven
        f"Our {variety} {product_name.lower()} represent the perfect blend of tradition and quality. {freshness.capitalize()} {origin}, each piece is {attribute} and {benefit}. {season.capitalize()} availability ensures peak flavor for your {use_case}.",
        
        # Template 4: Practical focus
        f"{attribute.capitalize()} {variety} {product_name.lower()} {freshness} for optimal taste and nutrition. {quality} produce {origin} that's perfect for {use_case}. These {benefit} selections represent {season} at its finest.",
        
        # Template 5: Sensory appeal
        f"Indulge in the {attribute} goodness of {variety} {product_name.lower()}! {freshness.capitalize()} and {benefit}, these premium selections are {origin}. Whether for {use_case} or creative cooking, they deliver exceptional {season} quality.",
        
        # Template 6: Simple and direct
        f"{variety} {product_name.lower()} - {attribute}, {benefit}, and {freshness}. {quality} produce {origin} for discerning customers. Perfect for {use_case} and backed by {season} freshness guarantee."
    ]
    
    description = random.choice(templates)
    description = description.replace("fruits/vegetables", 
                                    "fruits" if category == "Fruits" else "vegetables")
    description = description.replace("these premium selections", "this premium selection" 
                                    if product_name.endswith('s') and not product_name.endswith('oes') 
                                    else "these premium selections")
    
    if random.random() < 0.3:
        seasonal_note = random.choice([
            " Limited seasonal availability - get them while they're at their peak!",
            " Harvested at the perfect moment for maximum flavor.",
            " This week's featured farm-fresh selection.",
            ""
        ])
        description += seasonal_note
    
    return description

def generate_agricultural_products(user_ids: List[int], product_count: int = 200) -> List[Tuple]:
    products = []

    while len(products) < product_count:
        print(f"[INFO] Generating product {len(products) + 1} of {product_count}")
        category = random.choice(list(AGRICULTURAL_PRODUCTS.keys()))
        subcategory = random.choice(list(AGRICULTURAL_PRODUCTS[category].keys()))
        product_info = random.choice(AGRICULTURAL_PRODUCTS[category][subcategory])
        
        product_name = product_info["name"]
        variety = random.choice(product_info["varieties"])
        full_name = f"{variety} {product_name}"
        
        final_price = round(random.uniform(*product_info["price_range"]), 2)
        
        description = generate_realistic_description(product_name, variety, category, subcategory)
        
        image_url = find_product_image(product_name, variety, category, subcategory)
        
        days_ago = random.randint(0, 30)
        created_at = (datetime.datetime.now() - datetime.timedelta(days=days_ago)).isoformat()
        
        user_id = random.choice(user_ids)
        
        products.append((
            full_name,
            description,
            final_price,
            image_url,
            created_at,
            user_id,
            category,
            subcategory,
            variety
        ))
    
    return products

def seed_agricultural_database():
    product_count = int(input("Enter the number of agricultural products to seed: "))

    conn = sqlite3.connect("users.db")
    cur = conn.cursor()
    
    cur.execute('''
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        image_url TEXT,
        created_at TEXT,
        user_id INTEGER,
        category TEXT,
        subcategory TEXT,
        variety TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    ''')
    
    cur.execute("SELECT id FROM users")
    user_ids = [row[0] for row in cur.fetchall()]
    
    products = generate_agricultural_products(user_ids, product_count)
    
    success_count = 0
    for product in products:
        try:
            cur.execute('''
            INSERT INTO products (name, description, price, image_url, created_at, user_id, category, subcategory, variety)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', product)
            success_count += 1
        except sqlite3.Error as e:
            print(f"[ERROR] Failed to insert product: {e}")
    
    conn.commit()
    conn.close()
    
    print(f"[SUCCESS] Seeded {success_count} agricultural products")
    print(f"[INFO] Categories: {', '.join(AGRICULTURAL_PRODUCTS.keys())}")
    
    category_counts = {}
    for product in products:
        category = product[6]
        category_counts[category] = category_counts.get(category, 0) + 1
    
    for category, count in category_counts.items():
        print(f"[INFO] {category}: {count} products")

if __name__ == "__main__":
    seed_agricultural_database()