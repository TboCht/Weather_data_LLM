# What the Open-Meteo geocoding API returns for a place name

Researched against the [Geocoding API docs](https://open-meteo.com/en/docs/geocoding-api) and live JSON from `https://geocoding-api.open-meteo.com/v1/search` on 2026-10-27. The forecast call is a different endpoint. It takes the latitude and longitude from one of these results.

## Answer

`GET https://geocoding-api.open-meteo.com/v1/search?name=<place>` returns a JSON object. A hit list is `results` plus `generationtime_ms`. Each entry in `results` is one place. Empty fields are left out of that object. A search with no hits is HTTP 200 and a body that has only `generationtime_ms`.

Two places with the same `name` are separated by `country_code`, `admin1`, and, when those still match, `admin2`. `country` is the localized country name when the API includes it. The weather call needs that place's `latitude` and `longitude`. Those two numbers are WGS84 on both APIs.

`id` is the unique id for the row. It does not locate the weather grid, and it is not a label a person can use to choose between two cities. `population`, `feature_code`, `timezone`, `elevation`, and `postcodes` are extra description. They stay off the "enough" set: population and postcodes are often omitted, and the same `feature_code` or `timezone` is shared by places the admin fields already split.

| Job | Fields to keep |
| --- | --- |
| Tell two candidates apart | `name`, `country_code`, `admin1`. Add `admin2` when `name` + `country_code` + `admin1` match. Show `country` when it is present. |
| Pass coordinates to the weather call | `latitude`, `longitude` |

The docs do not define result order. In the Paris capture below, Idaho (population 506) is listed before Arkansas (population 3443), and `Saint Paris` is in the same list. Read the admin fields. Do not treat `results[0]` as the user's city, and do not treat the array as sorted by population.

## Request

Docs: [Geocoding API](https://open-meteo.com/en/docs/geocoding-api). The endpoint accepts a search term and returns matching locations.

| Parameter | Required | Default | What the docs say |
| --- | --- | --- | --- |
| `name` | Yes | | Location name or postal code. A comma and then a country or first-level administrative area narrows the results (`Paris, France`, `Los Angeles, California`, `Los Angeles, CA`). |
| `count` | No | 10 | How many results to return, up to 100. Country and administrative-area filters apply before that limit. |
| `format` | No | `json` | `json`, or `protobuf`. The protobuf message is the `.proto` in the geocoding repository. |
| `language` | No | `en` | Translated names when available, otherwise English or the native name. Lower-case. |
| `countryCode` | No | | ISO-3166-1 alpha-2 filter. |
| `apikey` | No | | Commercial access only. |

Matching, from the same page: two characters match an exact name. Three or more use normalized prefix matching. Matching is case-insensitive and diacritic-insensitive, and the characters must match the beginning of an indexed name. An empty string or a single character returns no results. A country or admin1 qualifier after the comma must match exactly (`Los Angeles, Calif` does not match `Los Angeles, California`). Country names, 2-letter ISO codes, admin1 names, and admin1 abbreviations are accepted.

A live check of the qualifier on 2026-10-27, `name=Paris, Texas`, `count=3`, `language=en`, `format=json`, returned one result: id `4717560`, name `Paris`, `country_code` `US`, `admin1` `Texas`, latitude `33.66094`, longitude `-95.55551`.

`name=Pa` (`count=5`, `language=en`) returned places whose `name` is `Pa`, which matches the two-character exact-name rule. Two of those five share a country and admin1. They are quoted under [Same admin1](#same-admin1).

## JSON object

Docs: on success the body is a JSON object. Empty fields are not returned. The page's example is Berlin, and it says `admin4` is missing when there is no fourth administrative level.

The published example also includes `"admin2": ""` and `"admin2_id": 0`, `country` `Deutschland`, and `admin1` `Berlin`. A live `language=en` request for the same id on 2026-10-27 omitted `admin2` and `admin2_id`, and returned `country` `Germany` and `admin1` `State of Berlin`. The id, coordinates, elevation, population, timezone, feature code, and postcodes match the example. The omission sentence and this capture are the shape to trust. The example's empty strings are not.

```json
{
  "results": [
    {
      "id": 2950159,
      "name": "Berlin",
      "latitude": 52.52437,
      "longitude": 13.41053,
      "elevation": 74.0,
      "feature_code": "PPLC",
      "country_code": "DE",
      "admin1_id": 2950157,
      "admin3_id": 6547383,
      "admin4_id": 6547539,
      "timezone": "Europe/Berlin",
      "population": 3426354,
      "postcodes": ["10967", "13347"],
      "country_id": 2921044,
      "country": "Germany",
      "admin1": "State of Berlin",
      "admin3": "Berlin, Stadt",
      "admin4": "Berlin"
    }
  ],
  "generationtime_ms": 0.14591217
}
```

Source of that body: `https://geocoding-api.open-meteo.com/v1/search?name=Berlin&count=1&language=en&format=json` on 2026-10-27. HTTP 200, `Content-Type: application/json`.

`generationtime_ms` is on every success body captured for this note, including a search with no hits. The docs' JSON example does not list it. The protobuf `SearchResults` message does: `repeated Geoname results = 1` and `float generationtime_ms = 2` in [`api.proto`](https://github.com/open-meteo/geocoding-api/blob/main/Sources/App/ProtoResources/api.proto). That proto also has `float ranking = 6` on `Geoname`. None of the JSON bodies captured here include `ranking`.

Field meanings, from the docs table:

| Field | Format | Docs |
| --- | --- | --- |
| `id` | Integer | Unique ID for this location. IDs can be resolved at `https://geocoding-api.open-meteo.com/v1/get?id=2950159`. |
| `name` | String | Location name, localized with `language` when possible. |
| `latitude`, `longitude` | Floating point | WGS84 coordinates of this location. |
| `elevation` | Floating point | Elevation above mean sea level. |
| `timezone` | String | Time zone from the time zone database. |
| `feature_code` | String | Type of this location, following the GeoNames `feature_code` definition. |
| `country_code` | String | ISO-3166-1 alpha-2. The docs' example is `DE` for Germany. |
| `country` | String | Country name, localized with `language` when possible. |
| `country_id` | Integer | Unique ID for this country. |
| `population` | Integer | Number of inhabitants. |
| `postcodes` | String array | Postcodes for this location. |
| `admin1` … `admin4` | String | Hierarchical administrative areas. Admin1 is the first level. Localized with `language` when possible. |
| `admin1_id` … `admin4_id` | Integer | Unique IDs for those areas. |

The docs do not mark any of those result fields as required. "Empty fields are not returned" is the rule. In the Springfield capture (`count=100`, same day), every row included `id`, `name`, `latitude`, `longitude`, `country_code`, `admin1`, `admin1_id`, `timezone`, `elevation`, and `feature_code`. Other fields were omitted on some rows: `country` on 1, `admin2` on 2, `population` on 61, `postcodes` on 65. The row without `country` is id `4796660`, `name` `Springfield`, `country_code` `VI`, `admin1` `Saint Croix Island`, `admin2` `Northwest`.

## Telling two candidates apart

### Same name, different country or admin1

`name=Paris`, `count=10`, `language=en`, `format=json` on 2026-10-27 returned 10 results and `generationtime_ms` `0.20885468`. The first two:

| id | name | country | country_code | admin1 | admin2 | latitude | longitude | population | feature_code | timezone |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2988507 | Paris | France | FR | Île-de-France Region | Paris Department | 48.85341 | 2.3488 | 2138551 | PPLC | Europe/Paris |
| 4717560 | Paris | United States | US | Texas | Lamar | 33.66094 | -95.55551 | 24782 | PPLA2 | America/Chicago |

`name` is `Paris` on both. `country` / `country_code` separates France from the United States. `admin1` separates the US rows in that list: Texas, Tennessee, Kentucky, Illinois, Maine, Missouri, Idaho, Arkansas. Texas has no `admin3` or `admin4` in this body. France's `postcodes` array has 20 strings, starting `75001`, `75020`. Texas's `postcodes` are `75460`, `75461`, `75462`.

Seven of those US rows use `feature_code` `PPLA2` (Texas, Tennessee, Kentucky, Illinois, Maine, Missouri, Idaho). The code does not tell those cities apart.

The tenth row is id `5170013`, `name` `Saint Paris`, `admin1` `Ohio`, `country_code` `US`, population `2089`. The docs describe prefix matching against an indexed name. This displayed `name` does not start with `Paris`. Compare `country_code` and `admin1` on every row. A row's `name` can differ from the query.

### Same admin1

`name=Springfield`, `count=100`, `language=en`, `format=json` on 2026-10-27 returned 100 results. Nine of them share `name` `Springfield`, `country_code` `US`, `admin1` `Georgia`, and `timezone` `America/New_York`. Their `admin2` values differ. Two of the nine:

| id | admin2 | latitude | longitude | population |
| --- | --- | --- | --- | --- |
| 4224162 | Effingham County | 32.37241 | -81.3115 | 2889 |
| 4224158 | Cherokee | 34.09454 | -84.50854 | omitted |

`timezone` does not separate that Georgia group. `population` is omitted on the Cherokee row, so it cannot be required for the comparison.

`name=Pa`, `count=5`, `language=en` returned two rows that share `name` `Pa`, `country` `Nigeria`, `country_code` `NG`, `admin1` `Kaduna State`, `timezone` `Africa/Lagos`, and `feature_code` `PPL`. Neither includes `population` or `postcodes`.

| id | admin2 | admin3 | latitude | longitude |
| --- | --- | --- | --- | --- |
| 2325156 | Igabi | Sabon Birnin | 10.85704 | 7.31412 |
| 2325157 | Chikun | Yelwa | 10.43315 | 7.42602 |

`admin2` is the first field that splits them. `admin3` also differs. Both are present on these two rows. The Springfield capture shows `admin2` itself can be omitted (Belize id `13286694`, `admin1` `Cayo District`; Barbados id `3373502`, `admin1` `Saint Joseph`). When `admin2` is absent, `id` is the unique id the docs define, and `latitude` / `longitude` are still the coordinates.

## Coordinates for the weather call

The geocoding docs call `latitude` and `longitude` the WGS84 coordinates of the location. The [forecast docs](https://open-meteo.com/en/docs) require those same two parameters on `/v1/forecast`: floating-point WGS84 coordinates. Several coordinates may be comma-separated. North and South America use negative longitudes, west of Greenwich. The Paris, Texas capture is already negative: `-95.55551`.

Pass the chosen result's `latitude` and `longitude` through as those parameters. The forecast page lists `elevation` as optional (its default is a 90 m model) and `timezone` as optional with default `GMT`. `timezone=auto` on that API resolves the zone from the coordinates. The geocoding `elevation`, `timezone`, and `id` are not required to form that request.

The forecast JSON's own `latitude` and `longitude` are the center of the weather grid cell that was used, and that point can sit a few kilometres from the coordinate that was requested. The values to send are still the geocoding result's `latitude` and `longitude`.

## No hits and errors

Docs: an empty or single-character search returns no results. A bad parameter returns HTTP 400 and `{"error": true, "reason": "..."}`. The documented `count` example reason is `Parameter count must be between 1 and 100.`

Captures on 2026-10-27:

| Request | Status | Body |
| --- | --- | --- |
| `name=X&count=1&language=en&format=json` | 200 | `{"generationtime_ms":0.06854534}` |
| `name=Zzzzqqq&count=5&language=en&format=json` | 200 | `{"generationtime_ms":0.21624565}` |
| `name=Paris&count=0&language=en&format=json` | 400 | `{"error":true,"reason":"Parameter count must be between 1 and 100."}` |

A miss has no `results` key. It is not an empty `results` array. `generationtime_ms` is still present. The 400 body matches the docs.

## Sources

- Geocoding endpoint, parameters, matching rules, JSON field table, empty-field rule, Berlin example, id lookup, and the 400 body: https://open-meteo.com/en/docs/geocoding-api
- Protobuf `results`, `generationtime_ms`, and `ranking`: https://github.com/open-meteo/geocoding-api/blob/main/Sources/App/ProtoResources/api.proto
- Forecast `latitude` / `longitude` (required WGS84), optional `elevation`, `timezone=auto`, and the grid-cell coordinate in the forecast JSON: https://open-meteo.com/en/docs
- Live JSON, 2026-10-27:
  - `https://geocoding-api.open-meteo.com/v1/search?name=Paris&count=10&language=en&format=json`
  - `https://geocoding-api.open-meteo.com/v1/search?name=Berlin&count=1&language=en&format=json`
  - `https://geocoding-api.open-meteo.com/v1/search?name=Paris,%20Texas&count=3&language=en&format=json`
  - `https://geocoding-api.open-meteo.com/v1/search?name=Springfield&count=100&language=en&format=json`
  - `https://geocoding-api.open-meteo.com/v1/search?name=Pa&count=5&language=en&format=json`
  - `https://geocoding-api.open-meteo.com/v1/search?name=X&count=1&language=en&format=json`
  - `https://geocoding-api.open-meteo.com/v1/search?name=Zzzzqqq&count=5&language=en&format=json`
  - `https://geocoding-api.open-meteo.com/v1/search?name=Paris&count=0&language=en&format=json`
