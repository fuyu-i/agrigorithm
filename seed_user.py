import sqlite3
import bcrypt
import random
import string
import secrets
import requests
import time

number = int(input())

def get_random_words(rel_type, max_words=100):
    url = f"https://api.datamuse.com/words?rel_{rel_type}=farm&max={max_words}"
    response = requests.get(url)
    return [word_info['word'].capitalize() for word_info in response.json()]

def generate_unique_shop_names(count):
    adjectives = get_random_words('jjb')
    nouns = get_random_words('jja')

    shop_names = set()
    while len(shop_names) < count:
        adj = random.choice(adjectives)
        noun = random.choice(nouns)
        shop_name = f"{adj} {noun}"
        shop_names.add(shop_name)
    return list(shop_names)

shop_names = generate_unique_shop_names(number + 10)

def generate_random_password(length):
    characters = string.ascii_letters + string.digits
    return ''.join(secrets.choice(characters) for _ in range(length))

def get_random_location():
    # regions_response = requests.get("https://psgc.gitlab.io/api/regions/")
    # regions = regions_response.json()
    regions = [{"code":"010000000","name":"Ilocos Region","regionName":"Region I","islandGroupCode":"luzon","psgc10DigitCode":"0100000000"},{"code":"020000000","name":"Cagayan Valley","regionName":"Region II","islandGroupCode":"luzon","psgc10DigitCode":"0200000000"},{"code":"030000000","name":"Central Luzon","regionName":"Region III","islandGroupCode":"luzon","psgc10DigitCode":"0300000000"},{"code":"040000000","name":"CALABARZON","regionName":"Region IV-A","islandGroupCode":"luzon","psgc10DigitCode":"0400000000"},{"code":"170000000","name":"MIMAROPA Region","regionName":"MIMAROPA Region","islandGroupCode":"luzon","psgc10DigitCode":"1700000000"},{"code":"050000000","name":"Bicol Region","regionName":"Region V","islandGroupCode":"luzon","psgc10DigitCode":"0500000000"},{"code":"060000000","name":"Western Visayas","regionName":"Region VI","islandGroupCode":"visayas","psgc10DigitCode":"0600000000"},{"code":"070000000","name":"Central Visayas","regionName":"Region VII","islandGroupCode":"visayas","psgc10DigitCode":"0700000000"},{"code":"080000000","name":"Eastern Visayas","regionName":"Region VIII","islandGroupCode":"visayas","psgc10DigitCode":"0800000000"},{"code":"090000000","name":"Zamboanga Peninsula","regionName":"Region IX","islandGroupCode":"mindanao","psgc10DigitCode":"0900000000"},{"code":"100000000","name":"Northern Mindanao","regionName":"Region X","islandGroupCode":"mindanao","psgc10DigitCode":"1000000000"},{"code":"110000000","name":"Davao Region","regionName":"Region XI","islandGroupCode":"mindanao","psgc10DigitCode":"1100000000"},{"code":"120000000","name":"SOCCSKSARGEN","regionName":"Region XII","islandGroupCode":"mindanao","psgc10DigitCode":"1200000000"},{"code":"130000000","name":"NCR","regionName":"National Capital Region","islandGroupCode":"luzon","psgc10DigitCode":"1300000000"},{"code":"140000000","name":"CAR","regionName":"Cordillera Administrative Region","islandGroupCode":"luzon","psgc10DigitCode":"1400000000"},{"code":"160000000","name":"Caraga","regionName":"Region XIII","islandGroupCode":"mindanao","psgc10DigitCode":"1600000000"},{"code":"150000000","name":"BARMM","regionName":"Bangsamoro Autonomous Region in Muslim Mindanao","islandGroupCode":"mindanao","psgc10DigitCode":"1900000000"}]

    while True:
        selected_region = random.choice(regions)
        region_code = selected_region['code']
        region_name = selected_region['name']

        provinces_response = requests.get(f"https://psgc.gitlab.io/api/regions/{region_code}/provinces/")
        provinces = provinces_response.json()
        if not provinces:
            continue

        selected_province = random.choice(provinces)
        province_code = selected_province['code']
        province_name = selected_province['name']

        cities_response = requests.get(f"https://psgc.gitlab.io/api/provinces/{province_code}/cities/")
        cities = cities_response.json()
        if not cities:
            continue

        selected_city = random.choice(cities)
        city_name = selected_city['name']

        return {
            "region": region_name,
            "province": province_name,
            "city": city_name
        }

def generate_n_locations(number):
    unique_locations = set()
    final_locations = []

    while len(final_locations) < number:
        loc = get_random_location()
        key = (loc["region"], loc["province"], loc["city"])
        if key not in unique_locations:
            unique_locations.add(key)
            final_locations.append(loc)
        time.sleep(0.2)

    return final_locations

locations = generate_n_locations(number + 10)

conn = sqlite3.connect("users.db")
cur = conn.cursor()

cur.execute('''
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    contact TEXT,
    city TEXT,
    province TEXT,
    region TEXT,
    shop_name TEXT
)
''')

response = requests.get(f"https://randomuser.me/api/?results={number}&inc=name,email")
if response.status_code != 200:
    raise Exception("Failed to fetch random users")

users_data = response.json()['results']

for i, user in enumerate(users_data):
    first_name = user['name']['first'].capitalize()
    last_name = user['name']['last'].capitalize()
    full_name = f"{first_name} {last_name}"
    email = user['email']
    raw_password = generate_random_password(5)
    hashed_password = bcrypt.hashpw(raw_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    contact = f"09{random.randint(100000000, 999999999)}"
    loc = locations[i]
    shop_name = shop_names[i]

    cur.execute('''
    INSERT INTO users (name, email, password, contact, city, province, region, shop_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (full_name, email, hashed_password, contact, loc["city"], loc["province"], loc["region"], shop_name))

    print(f"[INFO] Created user: {email} | password: {raw_password}")

conn.commit()
conn.close()