// Past beach cleanups, oldest first: ones documented on Wikimedia Commons,
// whose summaries only restate the photo's own description and whose credit,
// license and source must stay with the photo, and ones our own team joined.

const thumb = (path) => `https://upload.wikimedia.org/wikipedia/commons/thumb/${path}`;

export const HISTORY = [
  {
    kind: "milestone",
    year: 1986,
    title: "The International Coastal Cleanup begins",
    body: "Volunteers on a Texas beach start what becomes Ocean Conservancy's yearly International Coastal Cleanup, now held around the world every September.",
  },
  {
    kind: "cleanup",
    date: "2011-09-17",
    place: "Morro Bay sandspit, California",
    country: "United States",
    summary:
      "On Coastal Cleanup Day, about 15 volunteers collected a dozen buckets of trash from the sandspit, then held their banner over the haul.",
    image: thumb(
      "1/14/Morro_Bay%2C_CA_Sandspit_Coastal_Cleanup_Day_%28CCD%29%2C_Saturday%2C_September_17%2C_2011_6.jpg/1280px-Morro_Bay%2C_CA_Sandspit_Coastal_Cleanup_Day_%28CCD%29%2C_Saturday%2C_September_17%2C_2011_6.jpg",
    ),
    credit: "Mike Baird",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0",
    source:
      "https://commons.wikimedia.org/wiki/File:Morro_Bay,_CA_Sandspit_Coastal_Cleanup_Day_(CCD),_Saturday,_September_17,_2011_6.jpg",
  },
  {
    kind: "milestone",
    year: 2015,
    title: "SDG 14, Life Below Water",
    body: "The United Nations adopts the Sustainable Development Goals. Target 14.1 calls for a significant reduction in marine debris.",
  },
  {
    kind: "cleanup",
    date: "2015-09-19",
    place: "Florida Keys National Marine Sanctuary",
    country: "United States",
    summary: "An International Coastal Cleanup inside the Florida Keys National Marine Sanctuary.",
    image: thumb(
      "1/12/FKNMS_-_International_Coastal_Cleanup_%2827949243606%29.jpg/1280px-FKNMS_-_International_Coastal_Cleanup_%2827949243606%29.jpg",
    ),
    credit: "Todd Hitchins, NOAA",
    license: "Public domain",
    source: "https://commons.wikimedia.org/wiki/File:FKNMS_-_International_Coastal_Cleanup_(27949243606).jpg",
  },
  {
    kind: "cleanup",
    date: "2017-01-10",
    place: "Ha Long Bay, Quang Ninh",
    country: "Vietnam",
    summary: "Around 100 volunteers, joined by U.S. Ambassador Ted Osius, cleaned up a beach on the bay.",
    image: thumb(
      "8/8c/Beach_Clean-up_Day_in_Ha_Long_Bay_%2832094621842%29.jpg/1280px-Beach_Clean-up_Day_in_Ha_Long_Bay_%2832094621842%29.jpg",
    ),
    credit: "USAID Vietnam",
    license: "Public domain",
    source: "https://commons.wikimedia.org/wiki/File:Beach_Clean-up_Day_in_Ha_Long_Bay_(32094621842).jpg",
  },
  {
    kind: "milestone",
    year: 2018,
    title: "Taiwan's marine debris action plan",
    body: "Taiwan's environmental agency and ocean NGOs draw up a joint plan against marine debris, from cutting single-use plastic to cleaning the coast.",
  },
  {
    kind: "milestone",
    year: 2019,
    title: "Plastic straws leave Taiwan's food courts",
    body: "Single-use plastic straws are banned for dine-in customers at Taiwan's schools, government offices, department stores and fast-food chains.",
  },
  {
    kind: "cleanup",
    date: "2022-10-26",
    place: "Long Fong Fishing Port, Zhunan, Miaoli",
    country: "Taiwan",
    summary: "Volunteers cleaned the shore around Long Fong Fishing Port in Zhunan Township.",
    image: thumb(
      "6/6b/2022_Beach_Cleanup_at_the_Long_Fong_Fishing_Port.jpg/1280px-2022_Beach_Cleanup_at_the_Long_Fong_Fishing_Port.jpg",
    ),
    credit: "Taiwankengo",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:2022_Beach_Cleanup_at_the_Long_Fong_Fishing_Port.jpg",
  },
  {
    kind: "cleanup",
    date: "2023-02-26",
    place: "Kuala Belait",
    country: "Brunei",
    summary: "A beach cleanup organized by the MINDA Youth Movement.",
    image: thumb("2/28/Belait_beach_cleanup_2023_01.jpg/1280px-Belait_beach_cleanup_2023_01.jpg"),
    credit: "Pangalau",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Belait_beach_cleanup_2023_01.jpg",
  },
  {
    kind: "cleanup",
    date: "2023-04-23",
    place: "Oregon coast",
    country: "United States",
    summary: "Volunteers with Ocean Blue Project on an Oregon beach cleanup.",
    image: thumb(
      "7/76/Oregon-beach-cleanup-ocean-blue-project-volunteers.jpg/1280px-Oregon-beach-cleanup-ocean-blue-project-volunteers.jpg",
    ),
    credit: "Ocean Blue Project, Inc.",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Oregon-beach-cleanup-ocean-blue-project-volunteers.jpg",
  },
  {
    kind: "cleanup",
    date: "2024-06-28",
    place: "Pasir Ris",
    country: "Singapore",
    summary: "Residents and volunteers gathered at the Ocean Purpose Project beach hub after a cleanup.",
    image: thumb("8/84/Beach_Clean_Up_Attendees_at_OPP_Beach_Hub.jpg/1280px-Beach_Clean_Up_Attendees_at_OPP_Beach_Hub.jpg"),
    credit: "Grenardie1996",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Beach_Clean_Up_Attendees_at_OPP_Beach_Hub.jpg",
  },
  {
    kind: "cleanup",
    date: "2024-07-26",
    place: "Regional Maritime University",
    country: "Ghana",
    summary: "A beach cleanup organized by Plastic Punch at the Regional Maritime University.",
    image: thumb("f/f3/Beach_cleanup_exercise_in_Ghana_05.jpg/1280px-Beach_cleanup_exercise_in_Ghana_05.jpg"),
    credit: "Esthee2010",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Beach_cleanup_exercise_in_Ghana_05.jpg",
  },
  {
    kind: "cleanup",
    date: "2025-04-26",
    place: "Ohama, Ishigaki",
    country: "Japan",
    summary:
      "U.S. and Japan Self-Defense Forces service members cleaned the beach at Ohama, on one of Okinawa's southernmost islands.",
    image: thumb(
      "e/ed/III_MEF%2C_JSDF_Personnel_Conduct_Beach_Cleanup_on_Ishigaki_%289009085%29.jpg/1280px-III_MEF%2C_JSDF_Personnel_Conduct_Beach_Cleanup_on_Ishigaki_%289009085%29.jpg",
    ),
    credit: "Cpl. Jessi Stegall, U.S. Marine Corps",
    license: "Public domain",
    source: "https://commons.wikimedia.org/wiki/File:III_MEF,_JSDF_Personnel_Conduct_Beach_Cleanup_on_Ishigaki_(9009085).jpg",
  },
  {
    kind: "cleanup",
    date: "2026-10-31",
    place: "Shalun Beach, Tamsui, New Taipei",
    country: "Taiwan",
    summary:
      "A cleanup our team joined: volunteers swept the sand and the dune grass on a cloudy morning, then carried the full bags up to the road for the cleaning team to collect.",
    image: "/photos/shalun-cleanup.webp",
    credit: "the Ocean Guardian team",
  },
];

export const HISTORY_PHOTOS = HISTORY.filter((h) => h.kind === "cleanup");
