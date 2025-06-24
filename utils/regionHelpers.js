// Provides utility functions for handling regions in the Philippines.

const regionMap = {
  'Ilocos Region': 'Region 1',
  'Cagayan Valley': 'Region 2',
  'Central Luzon': 'Region 3',
  'CALABARZON': 'Region 4A',
  'MIMAROPA Region': 'Region 4B',
  'Bicol Region': 'Region 5',
  'Western Visayas': 'Region 6',
  'Central Visayas': 'Region 7',
  'Eastern Visayas': 'Region 8',
  'Zamboanga Peninsula': 'Region 9',
  'Northern Mindanao': 'Region 10',
  'Davao Region': 'Region 11',
  'SOCCSKSARGEN': 'Region 12',
  'Caraga': 'Region 13',
  'CAR': 'Cordillera Administrative Region',
  'National Capital Region': 'NCR',
  'BARMM': 'Bangsamoro Autonomous Region in Muslim Mindanao'
};

const regionMapDetailed = {
  'Ilocos Region': 'Region 1 - Ilocos Region',
  'Cagayan Valley': 'Region 2 - Cagayan Valley',
  'Central Luzon': 'Region 3 - Central Luzon',
  'CALABARZON': 'Region 4A - CALABARZON',
  'MIMAROPA Region': 'Region 4B - MIMAROPA',
  'Bicol Region': 'Region 5 - Bicol Region',
  'Western Visayas': 'Region 6 - Western Visayas',
  'Central Visayas': 'Region 7 - Central Visayas',
  'Eastern Visayas': 'Region 8 - Eastern Visayas',
  'Zamboanga Peninsula': 'Region 9 - Zamboanga Peninsula',
  'Northern Mindanao': 'Region 10 - Northern Mindanao',
  'Davao Region': 'Region 11 - Davao Region',
  'SOCCSKSARGEN': 'Region 12 - SOCCSKSARGEN',
  'Caraga': 'Region 13 - Caraga',
  'CAR': 'CAR - Cordillera Administrative Region',
  'National Capital Region': 'NCR - National Capital Region',
  'BARMM': 'BARMM - Bangsamoro Autonomous Region in Muslim Mindanao'
};

function getSearchableRegionText(region) {
  if (!region) return '';
  
  const mappedValue = regionMap[region];
  if (mappedValue) {
    return `${region} ${mappedValue}`;
  }
  return region;
}

function getDetailedRegionName(region) {
  return regionMapDetailed[region] || region || 'Unknown Region';
}

function getRandomBgColor() {
  const colors = [
    'from-primary-light to-primary',
    'from-success to-primary',
    'from-warning to-success',
    'from-info to-primary',
    'from-primary to-info'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

module.exports = {
  regionMap,
  regionMapDetailed,
  getSearchableRegionText,
  getDetailedRegionName,
  getRandomBgColor
};