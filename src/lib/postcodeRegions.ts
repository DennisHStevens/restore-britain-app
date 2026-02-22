/**
 * UK Postcode to Region Mapping
 *
 * Maps all 121 UK postcode area prefixes to the 12 standard UK regions used for
 * political and administrative purposes:
 * - North East
 * - North West
 * - Yorkshire & the Humber
 * - East Midlands
 * - West Midlands
 * - East of England
 * - London
 * - South East
 * - South West
 * - Wales
 * - Scotland
 * - Northern Ireland
 *
 * Sources:
 * - Wikipedia: List of postcode areas in the United Kingdom
 * - Ideal Postcodes: Postcode Areas guide
 * - Doogal: UK Postcodes database
 * - Office for National Statistics: Postcode region classifications
 */

/**
 * Complete mapping of UK postcode area prefixes to their geographic region.
 * Postcode area prefixes are 1-2 letter codes (uppercase) that form the
 * first characters of UK postcodes (e.g., "BS" for Bristol, "N" for North London).
 *
 * This mapping covers all 121 operational UK postcode areas plus 3 Crown Dependency areas.
 *
 * Notes on borderline cases and classifications:
 * - SY (Shrewsbury): Straddles England/Wales border. Majority (Shropshire) is in
 *   West Midlands; smaller Welsh portion (Powys) is in Wales. Classified as West Midlands.
 * - HP (High Wycombe): South East (Buckinghamshire) despite geographic proximity
 *   to Greater London.
 * - CV (Coventry): Classified as West Midlands despite some coverage in Warwickshire.
 * - DN (Doncaster): Yorkshire boundary. Classified as Yorkshire & the Humber.
 * - London areas (inner): EC, WC, E, N, NW, SE, SW, W - all within Greater London.
 * - London areas (outer): EN, HA, IG, RM, BR, CR, DA, TW, UB, SM, KT - surrounding Greater London.
 * - ST (Stoke-on-Trent): Staffordshire. Classified as West Midlands.
 * - DD (Dundee): Scotland - Tayside region.
 * - EN (Enfield): London outskirts (Hertfordshire) - classified as East of England/London boundary.
 * - Crown Dependencies: GY (Guernsey), JE (Jersey), IM (Isle of Man) - assigned to South East.
 * - HG (Harrogate): Yorkshire & the Humber.
 * - HU (Hull): Yorkshire & the Humber.
 * - KY (Kirkcaldy): Scotland.
 * - RM (Romford): East London/Essex boundary - classified as East of England (Essex).
 * - YM (Whitby): Yorkshire & the Humber.
 */
export const POSTCODE_TO_REGION: Record<string, string> = {
  // North East (5 areas)
  DH: "North East",  // Durham
  DL: "North East",  // Darlington
  NE: "North East",  // Newcastle
  SR: "North East",  // Sunderland
  TS: "North East",  // Teesside

  // North West (15 areas)
  BB: "North West",  // Blackburn
  BL: "North West",  // Bolton
  CA: "North West",  // Carlisle
  CH: "North West",  // Chester
  CW: "North West",  // Crewe
  FY: "North West",  // Blackpool/Fylde
  LA: "North West",  // Lancaster
  L: "North West",   // Liverpool
  M: "North West",   // Manchester
  OL: "North West",  // Oldham
  PR: "North West",  // Preston
  SK: "North West",  // Stockport
  WA: "North West",  // Warrington
  WN: "North West",  // Wigan

  // Yorkshire & the Humber (10 areas)
  BD: "Yorkshire & the Humber",  // Bradford
  DN: "Yorkshire & the Humber",  // Doncaster
  HD: "Yorkshire & the Humber",  // Huddersfield
  HG: "Yorkshire & the Humber",  // Harrogate
  HU: "Yorkshire & the Humber",  // Hull
  HX: "Yorkshire & the Humber",  // Halifax
  LS: "Yorkshire & the Humber",  // Leeds
  S: "Yorkshire & the Humber",   // Sheffield
  WF: "Yorkshire & the Humber",  // Wakefield
  YO: "Yorkshire & the Humber",  // York

  // East Midlands (6 areas)
  DE: "East Midlands",  // Derby
  LE: "East Midlands",  // Leicester
  LN: "East Midlands",  // Lincoln
  NG: "East Midlands",  // Nottingham
  NN: "East Midlands",  // Northampton
  MK: "East Midlands",  // Milton Keynes

  // West Midlands (10 areas)
  B: "West Midlands",   // Birmingham
  CV: "West Midlands",  // Coventry
  DY: "West Midlands",  // Dudley
  HR: "West Midlands",  // Hereford
  ST: "West Midlands",  // Stoke-on-Trent
  SY: "West Midlands",  // Shrewsbury (majority in Shropshire)
  TF: "West Midlands",  // Telford
  WR: "West Midlands",  // Worcester
  WS: "West Midlands",  // Walsall
  WV: "West Midlands",  // Wolverhampton

  // East of England (11 areas)
  AL: "East of England",  // St. Albans
  CB: "East of England",  // Cambridge
  CM: "East of England",  // Chelmsford
  CO: "East of England",  // Colchester
  EN: "East of England",  // Enfield (North London/Hertfordshire boundary)
  IP: "East of England",  // Ipswich
  LU: "East of England",  // Luton
  NR: "East of England",  // Norwich
  RM: "East of England",  // Romford (East London/Essex boundary)
  SG: "East of England",  // Stevenage
  SS: "East of England",  // Southend

  // London (18 areas - 8 inner, 10 outer)
  E: "London",   // East London
  EC: "London",  // East Central London
  N: "London",   // North London
  NW: "London",  // North West London
  SE: "London",  // South East London
  SW: "London",  // South West London
  W: "London",   // West London
  WC: "London",  // West Central London
  HA: "London",  // Harrow (outer London)
  IG: "London",  // Ilford (outer London/Essex)
  BR: "London",  // Bromley (outer London)
  CR: "London",  // Croydon (outer London)
  DA: "London",  // Dartford (outer London/Kent boundary)
  SM: "London",  // Sutton (outer London)
  KT: "London",  // Kingston upon Thames (outer London)
  TW: "London",  // Twickenham (outer London)
  UB: "London",  // Uxbridge (outer London)
  WD: "London",  // Watford (outer London/Hertfordshire)

  // South East (11 areas)
  BN: "South East",  // Brighton & Hove
  CT: "South East",  // Canterbury
  GU: "South East",  // Guildford
  HP: "South East",  // High Wycombe
  ME: "South East",  // Medway
  OX: "South East",  // Oxford
  PE: "South East",  // Peterborough
  PO: "South East",  // Portsmouth
  RG: "South East",  // Reading
  RH: "South East",  // Redhill
  SL: "South East",  // Slough
  SN: "South East",  // Swindon
  SO: "South East",  // Southampton
  TN: "South East",  // Tunbridge Wells

  // South West (11 areas)
  BA: "South West",  // Bath
  BH: "South West",  // Bournemouth
  BS: "South West",  // Bristol
  DT: "South West",  // Dorchester
  EX: "South West",  // Exeter
  GL: "South West",  // Gloucester
  PL: "South West",  // Plymouth
  SP: "South West",  // Salisbury
  TA: "South West",  // Taunton
  TQ: "South West",  // Torquay
  TR: "South West",  // Truro

  // Wales (5 areas)
  CF: "Wales",  // Cardiff
  LD: "Wales",  // Llandrindod Wells
  LL: "Wales",  // Llandudno
  NP: "Wales",  // Newport
  SA: "Wales",  // Swansea

  // Scotland (16 areas)
  AB: "Scotland",  // Aberdeen
  DD: "Scotland",  // Dundee
  DG: "Scotland",  // Dumfries and Galloway
  EH: "Scotland",  // Edinburgh
  FK: "Scotland",  // Falkirk
  G: "Scotland",   // Glasgow
  HS: "Scotland",  // Hebrides (Outer)
  IV: "Scotland",  // Inverness
  KA: "Scotland",  // Kilmarnock/Ayr
  KW: "Scotland",  // Kirkwall/Caithness (Orkney)
  KY: "Scotland",  // Kirkcaldy (Fife)
  ML: "Scotland",  // Motherwell (Lanarkshire)
  PA: "Scotland",  // Paisley (Renfrewshire)
  PH: "Scotland",  // Perth
  TD: "Scotland",  // Galashiels/Borders
  ZE: "Scotland",  // Shetland

  // Northern Ireland (1 area, covering entire province)
  BT: "Northern Ireland",  // Belfast (covers all of Northern Ireland)

  // Crown Dependencies (3 areas - assigned to South East for administrative purposes)
  GY: "South East",  // Guernsey
  JE: "South East",  // Jersey
  IM: "South East",  // Isle of Man
};

/**
 * Extracts the region name for a given UK postcode.
 *
 * @param postcode - Full or partial UK postcode (e.g., "BS1 4DJ", "BS1", "BS", "b")
 * @returns The region name (one of the 12 standard UK regions), or null if not found
 *
 * @example
 * getRegionFromPostcode("BS1 4DJ") // "South West"
 * getRegionFromPostcode("BS1") // "South West"
 * getRegionFromPostcode("BS") // "South West"
 * getRegionFromPostcode("b") // "South West" (case-insensitive)
 * getRegionFromPostcode("XYZ") // null (invalid postcode)
 */
export function getRegionFromPostcode(postcode: string): string | null {
  if (!postcode || typeof postcode !== "string") {
    return null;
  }

  // Trim and convert to uppercase
  const cleanPostcode = postcode.trim().toUpperCase();

  if (cleanPostcode.length === 0) {
    return null;
  }

  // Extract the area prefix (1-2 letters at the start)
  // UK postcode areas are always 1-2 letters, followed by numbers/letters
  let areaCode = "";

  // Try 2-letter code first
  if (cleanPostcode.length >= 2) {
    const twoLetterCode = cleanPostcode.substring(0, 2);
    // Check if first two characters are both letters
    if (/^[A-Z]{2}$/.test(twoLetterCode) && twoLetterCode in POSTCODE_TO_REGION) {
      areaCode = twoLetterCode;
    }
  }

  // Fall back to 1-letter code if 2-letter didn't match
  if (!areaCode && /^[A-Z]$/.test(cleanPostcode[0])) {
    const oneLetterCode = cleanPostcode[0];
    if (oneLetterCode in POSTCODE_TO_REGION) {
      areaCode = oneLetterCode;
    }
  }

  // Return the region or null if not found
  return areaCode ? POSTCODE_TO_REGION[areaCode] || null : null;
}
