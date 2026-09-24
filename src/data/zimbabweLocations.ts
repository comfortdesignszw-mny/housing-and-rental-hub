export interface ZimbabweLocation {
  province: string;
  cities: {
    name: string;
    isCity: boolean; // city vs town/growth point
    suburbs?: string[];
  }[];
}

export const ZIMBABWE_PROVINCES = [
  'Harare',
  'Bulawayo',
  'Manicaland',
  'Mashonaland Central',
  'Mashonaland East',
  'Mashonaland West',
  'Masvingo',
  'Matabeleland North',
  'Matabeleland South',
  'Midlands',
] as const;

export type ZimbabweProvince = typeof ZIMBABWE_PROVINCES[number];

export const ZIMBABWE_LOCATION_DATA: ZimbabweLocation[] = [
  {
    province: 'Harare',
    cities: [
      {
        name: 'Harare',
        isCity: true,
        suburbs: [
          'Harare CBD',
          'Avenues',
          'Avondale',
          'Avondale West',
          'Alexandra Park',
          'Belvedere',
          'Borrowdale',
          'Borrowdale Brooke',
          'Braeside',
          'Chisipite',
          'Cranborne',
          'Eastlea',
          'Glen Lorne',
          'Glen Norah',
          'Glen View',
          'Greendale',
          'Greystone Park',
          'Hatfield',
          'Helensvale',
          'Highfield',
          'Highlands',
          'Kambuzuma',
          'Kuwadzana',
          'Mabelreign',
          'Mabvuku',
          'Mandara',
          'Marlborough',
          'Milton Park',
          'Monavale',
          'Mount Pleasant',
          'Newlands',
          'Pomona',
          'Prospect',
          'Rhodesville',
          'Rydale Ridge',
          'Strathaven',
          'Tafara',
          'Vainona',
          'Warren Park',
          'Waterfalls',
          'Westgate',
        ],
      },
      {
        name: 'Chitungwiza',
        isCity: false,
        suburbs: ['Seke', 'Zengeza', 'St Marys', 'Unit A-O', 'Rockview'],
      },
      {
        name: 'Epworth',
        isCity: false,
        suburbs: ['Overspill', 'Domboramwari', 'Chinamano', 'Muguta'],
      },
      {
        name: 'Ruwa',
        isCity: false,
        suburbs: ['Ruwa Central', 'Damofalls', 'Timire Park', 'Springvale'],
      },
      {
        name: 'Norton',
        isCity: false,
        suburbs: ['Katanga', 'Knowe', 'Maridale', 'Johannesburg', 'Twin Lakes'],
      },
    ],
  },
  {
    province: 'Bulawayo',
    cities: [
      {
        name: 'Bulawayo',
        isCity: true,
        suburbs: [
          'Bulawayo City Centre',
          'Barham Green',
          'Bellevue',
          'Bradfield',
          'Burnside',
          'Cowdray Park',
          'Donnington',
          'Entumbane',
          'Famona',
          'Greenhill',
          'Hillside',
          'Ilanda',
          'Khumalo',
          'Kumalo',
          'Lobengula',
          'Luveve',
          'Magwegwe',
          'Mahatshula',
          'Matsheumhlope',
          'Montrose',
          'Morningside',
          'Newton West',
          'Nketa',
          'Nkulumane',
          'Parklands',
          'Pumula',
          'Queens Park',
          'Riverside',
          'Sauerstown',
          'Southwold',
          'Suburbs',
          'Sunninghill',
          'Thorngrove',
          'Tshabalala',
          'Woodville',
        ],
      },
    ],
  },
  {
    province: 'Manicaland',
    cities: [
      {
        name: 'Mutare',
        isCity: true,
        suburbs: [
          'Mutare CBD',
          'Chikanga',
          'Dangamvura',
          'Florida',
          'Hobhouse',
          'Murambi',
          'Morningside',
          'Palmerstone',
          'Yeovil',
          'Tiger\'s Kloof',
          'Weavind Park',
        ],
      },
      {
        name: 'Rusape',
        isCity: false,
        suburbs: ['Vengere', 'Silverbow', 'Mabvazuva', 'Castle Kopje'],
      },
      {
        name: 'Chipinge',
        isCity: false,
        suburbs: ['Gaza', 'Medium Density', 'Low Density'],
      },
      { name: 'Nyanga', isCity: false, suburbs: ['Nyamhuka', 'Rochdale'] },
      { name: 'Chimanimani', isCity: false, suburbs: ['Ngangu', 'Village'] },
      { name: 'Penhalonga', isCity: false, suburbs: ['Redwing', 'Village'] },
      { name: 'Hauna', isCity: false, suburbs: ['Growth Point', 'Ruda'] },
      { name: 'Birchenough Bridge', isCity: false, suburbs: ['Business Centre'] },
      { name: 'Murambinda', isCity: false, suburbs: ['Murambinda Growth Point'] },
    ],
  },
  {
    province: 'Midlands',
    cities: [
      {
        name: 'Gweru',
        isCity: true,
        suburbs: [
          'Gweru CBD',
          'Ascot',
          'Clifton Park',
          'Daylesford',
          'Ivene',
          'Kopje',
          'Lundi Park',
          'Mambo',
          'Mkoba 1-20',
          'Nashville',
          'Ridgemont',
          'Riverside',
          'South Downs',
          'Southview',
          'Windsor Park',
        ],
      },
      {
        name: 'Kwekwe',
        isCity: true,
        suburbs: ['Kwekwe CBD', 'Amaveni', 'Mbizo', 'Chicago', 'Fitchlea', 'Golden Acres'],
      },
      {
        name: 'Redcliff',
        isCity: false,
        suburbs: ['Rutendo', 'Torwood', 'Redcliff Suburbs'],
      },
      {
        name: 'Zvishavane',
        isCity: false,
        suburbs: ['Mandava', 'Maglas', 'Eastlea', 'Noelvale', 'Makwasha'],
      },
      {
        name: 'Shurugwi',
        isCity: false,
        suburbs: ['Sebanga', 'Makusha', 'Peak Mine', 'Impali'],
      },
      {
        name: 'Gokwe',
        isCity: false,
        suburbs: ['Gokwe Centre', 'Nyanyadzi', 'Mapfungautsi'],
      },
      { name: 'Mvuma', isCity: false, suburbs: ['Central', 'Wheatlands'] },
      { name: 'Lalapanzi', isCity: false, suburbs: ['Centre'] },
    ],
  },
  {
    province: 'Masvingo',
    cities: [
      {
        name: 'Masvingo',
        isCity: true,
        suburbs: [
          'Masvingo CBD',
          'Mucheke',
          'Rujeko',
          'Rhodene',
          'Target Kopje',
          'Eastvale',
          'Clipsham Heights',
          'Victoria Ranch',
        ],
      },
      {
        name: 'Chiredzi',
        isCity: false,
        suburbs: ['Tshovani', 'Low Density', 'Makondo'],
      },
      { name: 'Triangle', isCity: false, suburbs: ['Township', 'Country Club'] },
      { name: 'Mashava', isCity: false, suburbs: ['King Mine', 'Gaths Mine'] },
      { name: 'Bikita', isCity: false, suburbs: ['Nyika Growth Point'] },
      { name: 'Jerera', isCity: false, suburbs: ['Jerera Growth Point'] },
      { name: 'Ngundu', isCity: false, suburbs: ['Ngundu Halt'] },
      { name: 'Rutenga', isCity: false, suburbs: ['Rutenga Centre'] },
      { name: 'Mwenezi', isCity: false, suburbs: ['Growth Point'] },
    ],
  },
  {
    province: 'Mashonaland West',
    cities: [
      {
        name: 'Chinhoyi',
        isCity: true,
        suburbs: [
          'Chinhoyi CBD',
          'Chikonohono',
          'Cold Stream',
          'Orange Grove',
          'Ruvimbo Park',
          'Bruins Heights',
          'White City',
        ],
      },
      {
        name: 'Kadoma',
        isCity: true,
        suburbs: ['Kadoma CBD', 'Rimuka', 'Waverley', 'Innsfree', 'Mornington', 'Westview'],
      },
      {
        name: 'Chegutu',
        isCity: false,
        suburbs: ['Pfupajena', 'Kaguvi', 'Hintonville', 'Chegutu CBD'],
      },
      {
        name: 'Kariba',
        isCity: false,
        suburbs: ['Nyamhunga', 'Mahombekombe', 'Heights', 'BHeights'],
      },
      { name: 'Karoi', isCity: false, suburbs: ['Chikangwe', 'Karoi CBD', 'Peter Hill'] },
      { name: 'Banket', isCity: false, suburbs: ['Kuwadzana', 'Central'] },
      { name: 'Raffingora', isCity: false, suburbs: ['Commercial Centre'] },
      { name: 'Magunje', isCity: false, suburbs: ['Growth Point'] },
    ],
  },
  {
    province: 'Mashonaland East',
    cities: [
      {
        name: 'Marondera',
        isCity: false,
        suburbs: ['Marondera CBD', 'Dombotombo', 'Cherutombo', 'Yellow City', 'Paradise Park', 'Winston Park'],
      },
      { name: 'Chivhu', isCity: false, suburbs: ['Northwood', 'Township', 'CBD'] },
      { name: 'Murehwa', isCity: false, suburbs: ['Murehwa Centre', 'Growth Point'] },
      { name: 'Mutoko', isCity: false, suburbs: ['Mutoko Centre'] },
      { name: 'Kotwa', isCity: false, suburbs: ['Kotwa Growth Point'] },
      { name: 'Beatrice', isCity: false, suburbs: ['Farms', 'Central'] },
      { name: 'Wedza', isCity: false, suburbs: ['Wedza Centre'] },
    ],
  },
  {
    province: 'Mashonaland Central',
    cities: [
      {
        name: 'Bindura',
        isCity: true,
        suburbs: ['Bindura CBD', 'Chipadze', 'Chiwaridzo', 'Aerodrome', 'Brockley'],
      },
      { name: 'Mvurwi', isCity: false, suburbs: ['Suoguru', 'Central'] },
      { name: 'Mazowe', isCity: false, suburbs: ['Citrus', 'Jumbo Mine'] },
      { name: 'Glendale', isCity: false, suburbs: ['Tsungubvi', 'Glendale CBD'] },
      { name: 'Shamva', isCity: false, suburbs: ['Wadzanai', 'Shamva Mine'] },
      { name: 'Mount Darwin', isCity: false, suburbs: ['Pfungwadzakavanda', 'Town Centre'] },
      { name: 'Guruve', isCity: false, suburbs: ['Growth Point'] },
      { name: 'Centenary', isCity: false, suburbs: ['Centre'] },
    ],
  },
  {
    province: 'Matabeleland North',
    cities: [
      {
        name: 'Victoria Falls',
        isCity: true,
        suburbs: ['Chinotimba', 'Mkhosana', 'Low Density', 'Aerodrome', 'CBD'],
      },
      {
        name: 'Hwange',
        isCity: false,
        suburbs: ['Lwendulu', 'Empumalanga', 'Baobab', 'Number 1-3 Colliery'],
      },
      { name: 'Lupane', isCity: false, suburbs: ['Lupane Centre', 'Growth Point'] },
      { name: 'Binga', isCity: false, suburbs: ['Binga Centre', 'Rest Camp'] },
      { name: 'Dete', isCity: false, suburbs: ['Dete Township', 'Industrial'] },
      { name: 'Tsholotsho', isCity: false, suburbs: ['Tsholotsho Business Centre'] },
      { name: 'Nkayi', isCity: false, suburbs: ['Nkayi Centre'] },
    ],
  },
  {
    province: 'Matabeleland South',
    cities: [
      {
        name: 'Gwanda',
        isCity: false,
        suburbs: ['Gwanda CBD', 'Jahunda', 'Phakama', 'Spitzkop', 'Geneva'],
      },
      {
        name: 'Beitbridge',
        isCity: false,
        suburbs: ['Dulivhadzimu', 'Medium Density', 'CBD', 'Border Area'],
      },
      {
        name: 'Plumtree',
        isCity: false,
        suburbs: ['George Silundika', 'Matryoshka', 'Plumtree CBD'],
      },
      { name: 'Esigodini', isCity: false, suburbs: ['Habane', 'Esigodini Centre'] },
      { name: 'Filabusi', isCity: false, suburbs: ['Filabusi Centre'] },
      { name: 'Maphisa', isCity: false, suburbs: ['Growth Point'] },
      { name: 'Colleen Bawn', isCity: false, suburbs: ['Cement Village'] },
      { name: 'West Nicholson', isCity: false, suburbs: ['Centre'] },
    ],
  },
];

// Helper functions for easy instant lookup
export function getAllCitiesAndTowns(): string[] {
  const result: string[] = [];
  for (const prov of ZIMBABWE_LOCATION_DATA) {
    for (const city of prov.cities) {
      if (!result.includes(city.name)) {
        result.push(city.name);
      }
    }
  }
  return result.sort();
}

export function getCitiesByProvince(province: string): string[] {
  const found = ZIMBABWE_LOCATION_DATA.find(
    p => p.province.toLowerCase() === province.toLowerCase()
  );
  if (!found) return [];
  return found.cities.map(c => c.name);
}

export function getSuburbsByCity(cityName: string): string[] {
  for (const prov of ZIMBABWE_LOCATION_DATA) {
    const city = prov.cities.find(
      c => c.name.toLowerCase() === cityName.toLowerCase()
    );
    if (city && city.suburbs) {
      return city.suburbs;
    }
  }
  return [];
}

export function findProvinceForCity(cityName: string): string | undefined {
  for (const prov of ZIMBABWE_LOCATION_DATA) {
    const city = prov.cities.find(
      c => c.name.toLowerCase() === cityName.toLowerCase()
    );
    if (city) {
      return prov.province;
    }
  }
  return undefined;
}
