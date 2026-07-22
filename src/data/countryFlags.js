/**
 * Every rider, team-nationality and circuit-country field in the game's
 * data already carries a flag emoji (e.g. "🇪🇸") as its de-facto unique
 * country identifier — there's no need to add a second parallel field
 * across every data file. This table is the single place that maps that
 * existing identifier to the stable, English-lowercase slug used for the
 * actual image files in `public/assets/country/<slug>.png`.
 *
 * To add a country that isn't listed here yet, just add a line — no
 * other file needs to change.
 */
export const EMOJI_TO_COUNTRY_ID = {
  "🇦🇷": "argentina",
  "🇦🇹": "austria",
  "🇦🇺": "australia",
  "🇧🇪": "belgium",
  "🇧🇷": "brazil",
  "🇨🇴": "colombia",
  "🇨🇿": "czechia",
  "🇨🇭": "switzerland",
  "🇩🇪": "germany",
  "🇩🇰": "denmark",
  "🇪🇪": "estonia",
  "🇪🇸": "spain",
  "🇫🇮": "finland",
  "🇫🇷": "france",
  "🇬🇧": "united_kingdom",
  "🇭🇺": "hungary",
  "🇮🇩": "indonesia",
  "🇮🇹": "italy",
  "🇯🇵": "japan",
  "🇲🇾": "malaysia",
  "🇳🇱": "netherlands",
  "🇳🇿": "new_zealand",
  "🇵🇹": "portugal",
  "🇵🇱": "poland",
  "🇶🇦": "qatar",
  "🇸🇲": "san_marino",
  "🇹🇭": "thailand",
  "🇹🇷": "turkey",
  "🇺🇸": "united_states",
  "🇿🇦": "south_africa",
};

export function countryIdFromEmoji(emoji) {
  return EMOJI_TO_COUNTRY_ID[emoji] || null;
}
