import sqlite3
import bcrypt
import random
import string
import secrets
import requests
import time
import csv
import os

number = int(input("Enter the number of users to create: "))

def get_random_words(rel_type, max_words=100):
    print(f"[INFO] Fetching {max_words} random words...")
    url = f"https://api.datamuse.com/words?rel_{rel_type}=farm&max={max_words}"
    response = requests.get(url)
    return [word_info['word'].capitalize() for word_info in response.json()]

def generate_unique_shop_names(count):
    adjectives = get_random_words('jjb')
    nouns = get_random_words('jja')
    print(f"[INFO] Generating {count} unique shop names...")

    shop_names = set()
    while len(shop_names) < count:
        print(f"[INFO] Generating shop name {len(shop_names) + 1}/{count}...")
        adj = random.choice(adjectives)
        noun = random.choice(nouns)
        shop_name = f"{adj} {noun}"
        shop_names.add(shop_name)
    return list(shop_names)

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
    print(f"[INFO] Generating {number} random locations...")
    final_locations = []

    while len(final_locations) < number:
        print(f"[INFO] Generating location {len(final_locations) + 1}/{number}...")
        final_locations.append(get_random_location())

    return final_locations

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

shop_names = generate_unique_shop_names(number)
locations = generate_n_locations(number)
response = requests.get(f"https://randomuser.me/api/?results={number}&inc=name,email")
users_data = response.json()['results']
credentials = []
skipped_count = 0

for i, user in enumerate(users_data):
    print(f"[INFO] Creating user {i + 1}/{number}...")
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
    INSERT OR IGNORE INTO users (name, email, password, contact, city, province, region, shop_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (full_name, email, hashed_password, contact, loc["city"], loc["province"], loc["region"], shop_name))

    if cur.rowcount == 1:
        credentials.append([email, raw_password])
    else:
        print(f"[WARNING] User with email {email} already exists, skipping...")
        skipped_count += 1

conn.commit()
conn.close()

file_exists = os.path.exists('credentials.csv')

with open('credentials.csv', 'a', newline='') as file:
    writer = csv.writer(file)
    if not file_exists:
        writer.writerow(['Email', 'Password'])
    writer.writerows(credentials)

credentialsNumber = len(credentials)
print(f"[INFO] Created {credentialsNumber} users")
print(f"[INFO] Skipped {skipped_count} users")