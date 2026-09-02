const CCAP_MEMBERS_SOURCE = 'https://www.ccap.net.ph/about-us/member-banks/';

export const BILLER_CATALOG = [
  {
    id: 'bpi-credit-cards',
    name: 'BPI Credit Cards',
    category: 'Credit card',
    logo: '/logos/billers/bpi.webp',
    aliases: ['BPI', 'Bank of the Philippine Islands', 'BPI Cards'],
    featured: true,
    source: CCAP_MEMBERS_SOURCE,
  },
  {
    id: 'bdo-credit-cards',
    name: 'BDO Credit Cards',
    category: 'Credit card',
    logo: '/logos/billers/bdo.webp',
    aliases: ['BDO', 'Banco de Oro', 'BDO Unibank'],
    featured: true,
    source: CCAP_MEMBERS_SOURCE,
  },
  {
    id: 'eastwest-credit-cards',
    name: 'EastWest Credit Cards',
    category: 'Credit card',
    logo: '/logos/billers/eastwest.webp',
    aliases: ['EastWest', 'EastWest Bank', 'East West Banking Corporation', 'EWB'],
    featured: true,
    source: CCAP_MEMBERS_SOURCE,
  },
  {
    id: 'pnb-credit-cards',
    name: 'PNB Credit Cards',
    category: 'Credit card',
    logo: '/logos/billers/pnb.webp',
    aliases: ['PNB', 'Philippine National Bank', 'PNB Cards'],
    featured: true,
    source: CCAP_MEMBERS_SOURCE,
  },
  {
    id: 'unionbank-credit-cards',
    name: 'UnionBank Credit Cards',
    category: 'Credit card',
    logo: '/logos/billers/unionbank.webp',
    aliases: ['UnionBank', 'Union Bank', 'UBP', 'Citibank', 'Citi Credit Card', 'Citi Cards'],
    featured: true,
    source: CCAP_MEMBERS_SOURCE,
  },
  {
    id: 'pagibig-mp2',
    name: 'Pag-IBIG MP2 Savings',
    category: 'Government savings',
    logo: '/logos/billers/pagibig-mp2.webp',
    aliases: ['MP2', 'Pag-IBIG MP2', 'PagIBIG MP2', 'Modified Pag-IBIG II'],
    featured: true,
    source: 'https://www.pagibigfund.gov.ph/document/pdf/dlforms/providentrelated/PFF226_ModifiedPagIBIGIIEnrollmentForm_V06.pdf',
  },
  {
    id: 'aub-credit-cards',
    name: 'AUB Credit Cards',
    category: 'Credit card',
    logo: '/logos/billers/aub.webp',
    aliases: ['AUB', 'Asia United Bank', 'AUB Cards'],
    source: CCAP_MEMBERS_SOURCE,
  },
  {
    id: 'bank-of-commerce-credit-cards',
    name: 'Bank of Commerce Credit Cards',
    category: 'Credit card',
    logo: '/logos/billers/bank-of-commerce.webp',
    aliases: ['Bank of Commerce', 'BankCom', 'BOC Credit Card'],
    source: CCAP_MEMBERS_SOURCE,
  },
  {
    id: 'chinabank-credit-cards',
    name: 'Chinabank Credit Cards',
    category: 'Credit card',
    logo: '/logos/billers/chinabank.webp',
    aliases: ['Chinabank', 'China Bank', 'China Banking Corporation', 'CBC Credit Card'],
    source: CCAP_MEMBERS_SOURCE,
  },
  {
    id: 'equicom-credit-cards',
    name: 'Equicom Credit Cards',
    category: 'Credit card',
    logo: '/logos/billers/equicom.webp',
    aliases: ['Equicom', 'Equicom Savings Bank'],
    source: CCAP_MEMBERS_SOURCE,
  },
  {
    id: 'home-credit',
    name: 'Home Credit',
    category: 'Financing',
    logo: '/logos/billers/home-credit.webp',
    aliases: ['Home Credit Philippines', 'HC Consumer Finance'],
    source: CCAP_MEMBERS_SOURCE,
  },
  {
    id: 'hsbc-credit-cards',
    name: 'HSBC Credit Cards',
    category: 'Credit card',
    logo: '/logos/billers/hsbc.webp',
    aliases: ['HSBC', 'Hongkong and Shanghai Banking Corporation'],
    source: CCAP_MEMBERS_SOURCE,
  },
  {
    id: 'landbank-credit-cards',
    name: 'LANDBANK Credit Cards',
    category: 'Credit card',
    logo: '/logos/billers/landbank.webp',
    aliases: ['LANDBANK', 'Land Bank', 'Land Bank of the Philippines'],
    source: CCAP_MEMBERS_SOURCE,
  },
  {
    id: 'maya-credit-card',
    name: 'Maya Credit Card',
    category: 'Credit card',
    logo: '/logos/billers/maya.webp',
    aliases: ['Maya', 'Maya Bank', 'Landers Credit Card', 'Landers Cashback Everywhere'],
    source: CCAP_MEMBERS_SOURCE,
  },
  {
    id: 'maybank-credit-cards',
    name: 'Maybank Credit Cards',
    category: 'Credit card',
    logo: '/logos/billers/maybank.webp',
    aliases: ['Maybank', 'Maybank Philippines'],
    source: CCAP_MEMBERS_SOURCE,
  },
  {
    id: 'metrobank-credit-cards',
    name: 'Metrobank Credit Cards',
    category: 'Credit card',
    logo: '/logos/billers/metrobank.webp',
    aliases: ['Metrobank', 'Metrobank Card', 'Metropolitan Bank and Trust Company'],
    source: CCAP_MEMBERS_SOURCE,
  },
  {
    id: 'rcbc-credit-cards',
    name: 'RCBC Credit Cards',
    category: 'Credit card',
    logo: '/logos/billers/rcbc.webp',
    aliases: ['RCBC', 'RCBC Bankard', 'Rizal Commercial Banking Corporation'],
    source: CCAP_MEMBERS_SOURCE,
  },
  {
    id: 'security-bank-credit-cards',
    name: 'Security Bank Credit Cards',
    category: 'Credit card',
    logo: '/logos/billers/security-bank.webp',
    aliases: ['Security Bank', 'SBC Credit Card'],
    source: CCAP_MEMBERS_SOURCE,
  },
  {
    id: 'zed-credit-card',
    name: 'Zed Credit Card',
    category: 'Credit card',
    logo: '/logos/billers/zed.webp',
    aliases: ['Zed', 'Zed Card', 'Zed Financial'],
    source: 'https://www.zed.co/',
  },
  {
    id: 'allianz-pnb-life',
    name: 'Allianz PNB Life',
    category: 'Insurance',
    logo: '/logos/billers/allianz-pnb-life-neutral.webp',
    aliases: ['PNB Insurance', 'PNB Life', 'Allianz PNB'],
    source: 'https://www.allianzpnblife.ph/',
    logoNote: 'Neutral monogram; official logo usage requires permission.',
  },
];

export const normalizeBillerName = (value = '') => value
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[^a-z0-9]/g, '');

export function findBiller(value = '') {
  const key = normalizeBillerName(value);
  if (!key) return null;

  return BILLER_CATALOG.find((biller) => (
    normalizeBillerName(biller.name) === key
    || biller.aliases.some((alias) => normalizeBillerName(alias) === key)
  )) || null;
}

export function searchBillers(query = '') {
  const key = normalizeBillerName(query);
  if (!key) return BILLER_CATALOG;

  return BILLER_CATALOG.filter((biller) => {
    const searchable = [biller.name, biller.category, ...biller.aliases]
      .map(normalizeBillerName);
    return searchable.some((value) => value.includes(key));
  });
}
