export interface NIS2Sector {
  sectorGroup: "ANNEX_I" | "ANNEX_II";
  sector: string;
  subsectors: string[];
}

export const NIS2_SECTORS: NIS2Sector[] = [
  {
    sectorGroup: "ANNEX_I",
    sector: "Energy",
    subsectors: [
      "Electricity",
      "District heating and cooling",
      "Oil",
      "Gas",
      "Hydrogen"
    ]
  },
  {
    sectorGroup: "ANNEX_I",
    sector: "Transport",
    subsectors: [
      "Air",
      "Rail",
      "Water",
      "Road"
    ]
  },
  {
    sectorGroup: "ANNEX_I",
    sector: "Banking",
    subsectors: []
  },
  {
    sectorGroup: "ANNEX_I",
    sector: "Financial market infrastructures",
    subsectors: []
  },
  {
    sectorGroup: "ANNEX_I",
    sector: "Health",
    subsectors: []
  },
  {
    sectorGroup: "ANNEX_I",
    sector: "Drinking water",
    subsectors: []
  },
  {
    sectorGroup: "ANNEX_I",
    sector: "Waste water",
    subsectors: []
  },
  {
    sectorGroup: "ANNEX_I",
    sector: "Digital infrastructure",
    subsectors: [
      "Internet Exchange Point providers",
      "DNS service providers",
      "TLD name registries",
      "Cloud computing service providers",
      "Data centre service providers",
      "Content delivery network providers",
      "Trust service providers",
      "Providers of public electronic communications networks",
      "Providers of publicly available electronic communications services"
    ]
  },
  {
    sectorGroup: "ANNEX_I",
    sector: "ICT service management (B2B)",
    subsectors: [
      "Managed service providers",
      "Managed security service providers"
    ]
  },
  {
    sectorGroup: "ANNEX_I",
    sector: "Public administration",
    subsectors: [
      "Central government entities",
      "Regional level entities"
    ]
  },
  {
    sectorGroup: "ANNEX_I",
    sector: "Space",
    subsectors: [
      "Operators of ground-based infrastructure"
    ]
  },
  {
    sectorGroup: "ANNEX_II",
    sector: "Postal and courier services",
    subsectors: []
  },
  {
    sectorGroup: "ANNEX_II",
    sector: "Waste management",
    subsectors: []
  },
  {
    sectorGroup: "ANNEX_II",
    sector: "Manufacture/production/distribution of chemicals",
    subsectors: []
  },
  {
    sectorGroup: "ANNEX_II",
    sector: "Production/processing/distribution of food",
    subsectors: []
  },
  {
    sectorGroup: "ANNEX_II",
    sector: "Manufacturing",
    subsectors: [
      "Medical devices",
      "Computer/electronic/optical products",
      "Electrical equipment",
      "Machinery and equipment",
      "Motor vehicles/trailers/semi-trailers",
      "Other transport equipment"
    ]
  },
  {
    sectorGroup: "ANNEX_II",
    sector: "Digital providers",
    subsectors: [
      "Online marketplaces",
      "Online search engines",
      "Social networking services platforms"
    ]
  },
  {
    sectorGroup: "ANNEX_II",
    sector: "Research",
    subsectors: [
      "Research organisations"
    ]
  }
];

export const NIS2_ENTITY_TYPES = ["essential", "important"] as const;

export interface ApplicabilityFlag {
  key: string;
  label: string;
  description: string;
  applicableSectors: string[];
}

export const NIS2_APPLICABILITY_FLAGS: ApplicabilityFlag[] = [
  {
    key: "isDNSProvider",
    label: "DNS Service Provider",
    description: "Operates DNS resolution services",
    applicableSectors: ["Digital infrastructure"]
  },
  {
    key: "isTLDRegistry",
    label: "TLD Registry",
    description: "Manages top-level domain name registries",
    applicableSectors: ["Digital infrastructure"]
  },
  {
    key: "isTrustServiceProvider",
    label: "Trust Service Provider",
    description: "Provides electronic trust services",
    applicableSectors: ["Digital infrastructure"]
  },
  {
    key: "isCloudProvider",
    label: "Cloud Computing Provider",
    description: "Provides cloud computing services",
    applicableSectors: ["Digital infrastructure"]
  },
  {
    key: "isDataCenterProvider",
    label: "Data Centre Provider",
    description: "Operates data centre facilities",
    applicableSectors: ["Digital infrastructure"]
  },
  {
    key: "isCDNProvider",
    label: "CDN Provider",
    description: "Provides content delivery network services",
    applicableSectors: ["Digital infrastructure"]
  },
  {
    key: "isManagedServiceProvider",
    label: "Managed Service Provider",
    description: "Provides managed IT services",
    applicableSectors: ["ICT service management (B2B)"]
  },
  {
    key: "isManagedSecurityServiceProvider",
    label: "Managed Security Service Provider",
    description: "Provides managed security services",
    applicableSectors: ["ICT service management (B2B)"]
  },
  {
    key: "isPublicEComNetwork",
    label: "Public Electronic Communications Network",
    description: "Operates public electronic communications networks",
    applicableSectors: ["Digital infrastructure"]
  },
  {
    key: "isPubliclyAvailableEComService",
    label: "Publicly Available Electronic Communications Service",
    description: "Provides publicly available electronic communications services",
    applicableSectors: ["Digital infrastructure"]
  },
  {
    key: "isDigitalProvider",
    label: "Digital Provider",
    description: "Operates online marketplace, search engine, or social platform",
    applicableSectors: ["Digital providers"]
  },
  {
    key: "isResearchOrg",
    label: "Research Organisation",
    description: "Academic or research institution",
    applicableSectors: ["Research"]
  }
];

export const EU_COUNTRIES = [
  "Austria",
  "Belgium",
  "Bulgaria",
  "Croatia",
  "Cyprus",
  "Czech Republic",
  "Denmark",
  "Estonia",
  "Finland",
  "France",
  "Germany",
  "Greece",
  "Hungary",
  "Ireland",
  "Italy",
  "Latvia",
  "Lithuania",
  "Luxembourg",
  "Malta",
  "Netherlands",
  "Poland",
  "Portugal",
  "Romania",
  "Slovakia",
  "Slovenia",
  "Spain",
  "Sweden"
] as const;

export const OTHER_COUNTRIES = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Andorra",
  "Angola",
  "Antigua and Barbuda",
  "Argentina",
  "Armenia",
  "Australia",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belize",
  "Benin",
  "Bhutan",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Brazil",
  "Brunei",
  "Burkina Faso",
  "Burundi",
  "Cabo Verde",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Comoros",
  "Congo (DRC)",
  "Congo (Republic)",
  "Costa Rica",
  "Cote d'Ivoire",
  "Cuba",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Eswatini",
  "Ethiopia",
  "Fiji",
  "Gabon",
  "Gambia",
  "Georgia",
  "Ghana",
  "Grenada",
  "Guatemala",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Honduras",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Israel",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kiribati",
  "Kosovo",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Marshall Islands",
  "Mauritania",
  "Mauritius",
  "Mexico",
  "Micronesia",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Myanmar",
  "Namibia",
  "Nauru",
  "Nepal",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "North Korea",
  "North Macedonia",
  "Norway",
  "Oman",
  "Pakistan",
  "Palau",
  "Palestine",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Qatar",
  "Russia",
  "Rwanda",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Vincent and the Grenadines",
  "Samoa",
  "San Marino",
  "Sao Tome and Principe",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Solomon Islands",
  "Somalia",
  "South Africa",
  "South Korea",
  "South Sudan",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Switzerland",
  "Syria",
  "Taiwan",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Timor-Leste",
  "Togo",
  "Tonga",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Tuvalu",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Uruguay",
  "Uzbekistan",
  "Vanuatu",
  "Vatican City",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe"
] as const;

export const NIS2_DOMAINS = [
  "Governance",
  "Identify",
  "Protect",
  "Detect",
  "Respond",
  "Recover",
  "Supply Chain",
  "Reporting"
] as const;
