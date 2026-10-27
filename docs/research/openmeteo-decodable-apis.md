# Which Open-Meteo data APIs the installed client can decode

Allow-list for a later Weather tool schema. Geocoding is a separate API and is out of this note. Variable names (the strings you may pass to `hourly`, `daily`, and so on) stay on each docs page; this note records the parameter names those pages document.

Checked against:

- installed `openmeteo` 1.2.3 and `@openmeteo/sdk` 1.29.0 (`package-lock.json`)
- SDK README at the commit that published `@openmeteo/sdk` 1.29.0 (`7a3c6097fe803f55670b1da1411f6095a9ac0ee0`)
- Open-Meteo server `main` at `03d62919c419f1eccad8dcbbcf7f92a2dd7069b4` (2026-10-26)
- the docs pages on https://open-meteo.com/en/docs as fetched on 2026-10-27
- one live call per endpoint through the installed `fetchWeatherApi`, same day

## What the client can decode

`fetchWeatherApi(url, params)` does not hard-code a host. It appends `format=flatbuffers` (overwriting any `format` in `params`), reads the body, and walks size-prefixed `WeatherApiResponse` messages.

Source: `node_modules/openmeteo/lib/index.js` (`urlParams.set('format', 'flatbuffers')`, then `WeatherApiResponse.getSizePrefixedRootAsWeatherApiResponse`). Package version: `node_modules/openmeteo/package.json` (`1.2.3`). The function returns `Promise<WeatherApiResponse[]>` (`node_modules/openmeteo/lib/index.d.ts`).

`@openmeteo/sdk` 1.29.0 (`node_modules/@openmeteo/sdk/package.json`) defines that message. Each message is one location and one model. Sections are `current`, `hourly`, `daily`, `minutely15`, `weekly` (`VariablesWithTime`) and `monthly` (`VariablesWithMonth`). Source: `node_modules/@openmeteo/sdk/weather-api-response.d.ts`, and the same layout in the SDK README at https://github.com/open-meteo/sdk/blob/7a3c6097fe803f55670b1da1411f6095a9ac0ee0/README.md.

That README is the schema owner's list of which APIs use `flatbuffers/weather_api.fbs`:

> Weather, Marine, Ensemble, Flood and Climate API: Used for forecast and historical data
>
> Elevation API: Not yet available
>
> Geocoding API: Not yet available

It also says the default HTTP response is JSON, and `&format=flatbuffers` is what returns FlatBuffers. Multiple locations are multiple size-prefixed messages.

The public docs pages do not list `format` in their URL parameter tables. The client sets it. The server accepts `json`, `xlsx`, `csv`, and `flatbuffers` (`ForecastResultFormat` in https://github.com/open-meteo/open-meteo/blob/03d62919c419f1eccad8dcbbcf7f92a2dd7069b4/Sources/App/Helper/Writer/ForecastApiResult.swift). `ForecastapiResult.response` sends `.flatbuffers` to `toFlatbuffersResponse`, which writes `WeatherApiResponse`.

Every data route except elevation goes through `WeatherApiController` and returns `ForecastapiResult`. Source: `boot` and `query` in https://github.com/open-meteo/open-meteo/blob/03d62919c419f1eccad8dcbbcf7f92a2dd7069b4/Sources/App/Controllers/ForecastapiController.swift. That is wider than the SDK README's five names: air quality, seasonal, satellite, historical forecast, previous runs, and single runs use the same writer. The live calls below are what puts them on the allow-list.

## Live check with the installed client

From this repo, `fetchWeatherApi` was called once per URL (Berlin `52.52, 13.41` unless noted, `forecast_days: 1` or a 1–2 day `start_date`/`end_date`, one variable). A call is "decoded" when it returned a `WeatherApiResponse` whose latitude and model were the requested grid cell, not zeros.

| Call | Result |
| --- | --- |
| `https://api.open-meteo.com/v1/forecast` | decoded, model `best_match` |
| `https://api.open-meteo.com/v1/gfs` | decoded, model `gfs_seamless` |
| `https://api.open-meteo.com/v1/dwd-icon` | decoded, model `icon_seamless` |
| `https://api.open-meteo.com/v1/meteofrance` | decoded, model `meteofrance_seamless` |
| `https://api.open-meteo.com/v1/jma` | decoded, model `jma_seamless` |
| `https://api.open-meteo.com/v1/gem` | decoded, model `gem_seamless` |
| `https://api.open-meteo.com/v1/ecmwf` | decoded, model `ecmwf_ifs025` |
| `https://api.open-meteo.com/v1/cma` | decoded, model `cma_grapes_global` |
| `https://api.open-meteo.com/v1/bom` | decoded, model `bom_access_global` |
| `https://api.open-meteo.com/v1/metno` at Oslo `59.91, 10.75` | decoded, model `metno_nordic` |
| `https://api.open-meteo.com/v1/metno` at Berlin | HTTP error `No data is available for this location` (the docs limit this API to Scandinavia) |
| `https://archive-api.open-meteo.com/v1/archive` | decoded |
| `https://archive-api.open-meteo.com/v1/era5` | decoded (same handler as `archive`; the docs page names `archive`) |
| `https://historical-forecast-api.open-meteo.com/v1/forecast` | decoded |
| `https://previous-runs-api.open-meteo.com/v1/forecast` | decoded |
| `https://single-runs-api.open-meteo.com/v1/forecast` with `run=2026-10-26T00:00` and `models=ecmwf_ifs` | decoded, model `ecmwf_ifs` |
| `https://ensemble-api.open-meteo.com/v1/ensemble` with `models=dwd_icon_seamless_eps` | decoded, 40 hourly variables (ensemble members) |
| `https://marine-api.open-meteo.com/v1/marine` at `54.54, 10.23` | decoded |
| `https://air-quality-api.open-meteo.com/v1/air-quality` | decoded |
| `https://flood-api.open-meteo.com/v1/flood` at Oslo, `daily=river_discharge` | decoded |
| `https://climate-api.open-meteo.com/v1/climate` with `models=MRI_AGCM3_2_S` and `daily=temperature_2m_mean` | decoded, model `MRI_AGCM3_2_S` |
| `https://seasonal-api.open-meteo.com/v1/seasonal` with `daily=temperature_2m_max` | decoded, model `ecmwf_seasonal_seamless` |
| `https://satellite-api.open-meteo.com/v1/archive` with `models=satellite_radiation_seamless` | decoded, model `satellite_radiation_seamless` |
| `https://api.open-meteo.com/v1/arpae` | HTTP error `ARPAE COSMO models are not available anymore` |
| `https://api.open-meteo.com/v1/elevation?format=flatbuffers` | HTTP 200 `application/json`, body `{"elevation":[38.0]}`. The client did not throw. The object it returned had latitude 0, model `undefined`, and null sections. That is not a decoded elevation payload. |

Model names come from `node_modules/@openmeteo/sdk/model.js`.

## Allow-list

These URLs returned a `WeatherApiResponse` the installed client decoded. Parameter rows are the "All URL parameters" table on the linked docs page, grouped as location, variables, time range, and units. Anything else in that table is under "Also in that table".

`apikey` is on every table below. The docs say it is only for commercial use and that the host then needs the `customer-` prefix.

Several pages also render settings controls named `temporal_resolution`, `tilt`, and `azimuth` that are not rows in the URL parameter table. They are called out only where a page names them in prose or in the API URL it tells you to copy.

### Weather Forecast API

- Docs: https://open-meteo.com/en/docs
- URL: `https://api.open-meteo.com/v1/forecast`
- Prose endpoint: `/v1/forecast`

Location

- `latitude`, `longitude` — required. Comma-separated coordinates. Multiple locations change the JSON body to a list; in FlatBuffers that is one size-prefixed message per location and model (SDK README).
- `elevation` — optional. `elevation=nan` disables downscaling.

Variables

- `hourly`, `daily`, `current` — optional string arrays. The table says `timezone` is required when `daily` is set.
- The table does not list `minutely_15`. The DWD page does (below). The forecast page does document 15-minute time bounds.

Time range

- `past_days` — integer 0–92, default 0
- `forecast_days` — integer 0–16, default 7
- `forecast_hours`, `forecast_minutely_15`, `past_hours`, `past_minutely_15` — optional integers > 0
- `start_date`, `end_date` — `yyyy-mm-dd`
- `start_hour`, `end_hour`, `start_minutely_15`, `end_minutely_15` — `yyyy-mm-ddThh:mm`
- `timezone` — default `GMT`. `timeformat` — default `iso8601` (`unixtime` is the other documented value). `timeformat` is how timestamps are written in JSON. FlatBuffers store Unix seconds in GMT (SDK README); `utc_offset_seconds` is on the message either way.

Units

- `temperature_unit` — default `celsius`; documented alternative `fahrenheit`
- `wind_speed_unit` — default `kmh`; documented alternatives `ms`, `mph`, `kn`
- `precipitation_unit` — default `mm`; documented alternative `inch`

Also in that table: `models` (string array, default `auto`), `cell_selection` (default `land`; the description also names `sea` and `nearest`), `apikey`.

The same `/v1/forecast` URL is what these docs pages put in the API URL field, with a `models` value. They tell you to use the Weather Forecast API for parameters. They are not extra endpoints:

- BOM https://open-meteo.com/en/docs/bom-api (`models=bom_access_global`) — the page also has its own table for `/v1/bom`, below
- CHMI https://open-meteo.com/en/docs/chmi-api (`models=chmi_aladin_seamless`)
- CMA https://open-meteo.com/en/docs/cma-api (`models=cma_grapes_global`) — own table for `/v1/cma`, below
- DMI https://open-meteo.com/en/docs/dmi-api (`models=dmi_seamless`)
- DWD https://open-meteo.com/en/docs/dwd-api (`models=dwd_icon_seamless`) — own table for `/v1/dwd-icon`, below
- ECMWF https://open-meteo.com/en/docs/ecmwf-api (`models=ecmwf_ifs`) — own table for `/v1/ecmwf`, below
- GEM https://open-meteo.com/en/docs/gem-api (`models=cmc_gem_seamless`) — own table for `/v1/gem`, below
- GeoSphere Austria https://open-meteo.com/en/docs/geosphere-austria-api (`models=geosphere_seamless`)
- GFS https://open-meteo.com/en/docs/gfs-api (`models=ncep_gfs_seamless`) — own table for `/v1/gfs`, below
- ItaliaMeteo https://open-meteo.com/en/docs/italia-meteo-arpae-api (`models=italia_meteo_arpae_icon_2i`)
- JMA https://open-meteo.com/en/docs/jma-api (`models=jma_seamless`) — own table for `/v1/jma`, below
- KMA https://open-meteo.com/en/docs/kma-api (`models=kma_seamless`)
- KNMI https://open-meteo.com/en/docs/knmi-api (`models=knmi_seamless`)
- Météo-France https://open-meteo.com/en/docs/meteofrance-api (`models=meteofrance_seamless`) — own table for `/v1/meteofrance`, below
- MeteoSwiss https://open-meteo.com/en/docs/meteoswiss-api (`models=meteoswiss_icon_seamless`)
- MET Norway https://open-meteo.com/en/docs/metno-api (`models=metno_seamless`) — own table for `/v1/metno`, below
- UKMO https://open-meteo.com/en/docs/ukmo-api (`models=ukmo_seamless`)

The forecast page's GTI note says to specify tilt and azimuth. The form fields are named `tilt` and `azimuth`. They are not rows in the parameter table.

### Dedicated model paths on `api.open-meteo.com`

The server registers these next to `/v1/forecast` (`ForecastapiController.boot`). Each docs page's "API Documentation" section names the path and has its own parameter table. The API URL box on the same page currently copies `/v1/forecast` with `models=` instead. Both URLs decoded.

Shared with the forecast table unless the difference column says otherwise: required `latitude` and `longitude`; optional `elevation`; units `temperature_unit` / `wind_speed_unit` / `precipitation_unit` with the same defaults; `timeformat` default `iso8601`; `cell_selection` default `land` (the description names `sea` and `nearest`); `apikey`. None of these tables list `minutely_15` except DWD.

| Path | Docs | Variables | Time range that differs from the forecast table | Other difference |
| --- | --- | --- | --- | --- |
| `/v1/dwd-icon` | https://open-meteo.com/en/docs/dwd-api | `hourly`, `minutely_15`, `daily`, `current` | `forecast_days` 0–10, default 7. Includes the 15-minute bounds. `past_days` 0–92, default 0. `timezone` default `GMT`. | No `models` row |
| `/v1/gfs` | https://open-meteo.com/en/docs/gfs-api | `hourly`, `daily`, `current` | `forecast_days` 0–16, default 7. Includes the 15-minute bounds. `past_days` integer, default 0 (no 0–92 in the Format cell). `timezone` default `GMT`. | No `models` row |
| `/v1/ecmwf` | https://open-meteo.com/en/docs/ecmwf-api | `hourly` only | `past_days` 0–92, default 0. `start_date` / `end_date`. No `forecast_days`, no hour bounds, no `timezone`. | No `models`, `daily`, or `current` |
| `/v1/gem` | https://open-meteo.com/en/docs/gem-api | `hourly`, `daily`, `current` | `forecast_days` 0–10, default 5. Hour bounds only (`forecast_hours`, `past_hours`, `start_hour`, `end_hour`). `past_days` integer, default 0. `timezone` default `GMT`. | No `models` row |
| `/v1/jma` | https://open-meteo.com/en/docs/jma-api | `hourly`, `daily`, `current` | `forecast_days` 0–11, default 7. Hour bounds only. `past_days` integer, default 0. `timezone` default `GMT`. | No `models` row |
| `/v1/meteofrance` | https://open-meteo.com/en/docs/meteofrance-api | `hourly`, `daily`, `current` | `forecast_days` 0–4, default 4. Hour bounds only. `past_days` integer, default 0. `timezone` default `GMT`. | `models` string array, default `auto` |
| `/v1/metno` | https://open-meteo.com/en/docs/metno-api | `hourly`, `current` | `forecast_days` 0–3, default 3. Hour bounds only. `past_days` 0–92, default 0. `timezone` default `GMT`. | Docs: data only in the Scandinavian region. No `daily`, no `models` |
| `/v1/bom` | https://open-meteo.com/en/docs/bom-api | `hourly`, `daily` | `forecast_days` 0–16, default 7. Hour bounds only. `past_days` integer, default 0. `timezone` default `GMT`. | No `current`, no `models` |
| `/v1/cma` | https://open-meteo.com/en/docs/cma-api | `hourly`, `daily` | Same bounds as `/v1/bom` | No `current`, no `models` |

`daily` on these tables has the same note as the forecast table: `timezone` is required when daily variables are set.

### Historical Weather API

- Docs: https://open-meteo.com/en/docs/historical-weather-api
- URL the page publishes: `https://archive-api.open-meteo.com/v1/archive`
- Prose endpoint: `/v1/archive`
- Server also registers `/v1/era5` on the same handler (`ForecastapiController.boot`). That path decoded. The docs page does not name it.

Location: `latitude`, `longitude` required; `elevation` optional.

Variables: `hourly`, `daily`. No `current`. `timezone` is required when `daily` is set.

Time range: `start_date` and `end_date` are required (`yyyy-mm-dd`). `timeformat` default `iso8601`. `timezone` default `GMT`. No `past_days` or `forecast_days`.

Units: same three as the forecast API (`celsius` / `kmh` / `mm`).

Also in that table: `cell_selection` default `land`, `apikey`.

### Historical Forecast API

- Docs: https://open-meteo.com/en/docs/historical-forecast-api
- URL: `https://historical-forecast-api.open-meteo.com/v1/forecast`

The page does not publish its own parameter table. It says the API is identical to the Forecast API, and the only difference it names is the host `historical-forecast-api.open-meteo.com`. The API URL it displays uses `latitude`, `longitude`, `start_date`, `end_date`, and `hourly`.

### Previous Model Runs API

- Docs: https://open-meteo.com/en/docs/previous-runs-api
- URL: `https://previous-runs-api.open-meteo.com/v1/forecast`

No parameter table. The page says it supports the same models as the Weather Forecast API and points at that page for the model and variable list. Lead-time offsets are variable-name suffixes (`temperature_2m_previous_day1` through day 7), not a separate parameter. The displayed URL uses `latitude`, `longitude`, `hourly`, `past_days`, and `forecast_days`.

The page's `<form action>` is `historical-forecast-api.open-meteo.com`. The API URL field, which is the URL the page tells you to copy, is `previous-runs-api.open-meteo.com`. The live call used the latter.

### Single Runs API

- Docs: https://open-meteo.com/en/docs/single-runs-api
- URL: `https://single-runs-api.open-meteo.com/v1/forecast`

The page says this endpoint accepts the same parameters as the Weather Forecast API, plus one required parameter:

- `run` — required ISO 8601 datetime without seconds, for example `2024-06-01T00:00`. It must be a valid run cycle for the selected model.

It names `latitude`, `longitude`, `hourly`, and `daily` as accepted unchanged, and says units and output formats match the Forecast API. The displayed URL also sends `models`.

### Ensemble API

- Docs: https://open-meteo.com/en/docs/ensemble-api
- URL: `https://ensemble-api.open-meteo.com/v1/ensemble`
- Prose endpoint: `/v1/ensemble`

Location: `latitude`, `longitude` required; `elevation` optional.

Variables: `hourly` only. No `daily` or `current` in the table.

Time range: `past_days` integer, default 0. `forecast_days` integer 0–35, default 7. Same optional hour and 15-minute bounds and `start_date` / `end_date` / `start_hour` / `end_hour` / `start_minutely_15` / `end_minutely_15` as the forecast table. `timezone` default `GMT`. `timeformat` default `iso8601`.

Units: same three as the forecast API.

Also in that table: `models` is required (no default). `cell_selection` default `land`. `apikey`.

The server rejects `models=best_match` on this API (`ForecastapiController.query`: "Model 'best_match' is not supported by the Ensemble API").

Two further docs pages publish this same URL:

- Ensemble Mean https://open-meteo.com/en/docs/ensemble-mean-api — "refer to the Ensemble API" for models. Displayed URL adds a `*_spread` hourly name and `models=dwd_icon_eps_ensemble_mean_seamless`.
- Google WeatherNext https://open-meteo.com/en/docs/google-weathernext-api — "Use the endpoint `/v1/ensemble` with `models=google_weathernext2_ensemble`." It says to use the Ensemble API for URL parameters, and it documents `temporal_resolution=native` for the model's 6-hour steps. `temporal_resolution` is not a row in the Ensemble parameter table.

### Marine Weather API

- Docs: https://open-meteo.com/en/docs/marine-weather-api
- URL: `https://marine-api.open-meteo.com/v1/marine`
- Prose endpoint: `/v1/marine`

Location: `latitude`, `longitude` required. No `elevation` row.

Variables: `hourly`, `daily`, `current`. `timezone` is required when `daily` is set.

Time range: `past_days` 0–92, default 0. `forecast_days` format `Integer (0-8)`, default cell `5`; the description says "Per default, 7 days are returned. Up to 8 days of forecast are possible." Hour bounds only (`forecast_hours`, `past_hours`, `start_hour`, `end_hour`) plus `start_date` / `end_date`. `timezone` default `GMT`. `timeformat` default `iso8601`.

Units: `length_unit`, default `metric`, documented option `imperial`. No temperature, wind, or precipitation unit rows.

Also in that table: `cell_selection` default `sea`, `apikey`.

### Air Quality API

- Docs: https://open-meteo.com/en/docs/air-quality-api
- URL: `https://air-quality-api.open-meteo.com/v1/air-quality`
- Prose endpoint: `/v1/air-quality`

The SDK README does not name this API. The server still builds a `ForecastapiResult` for it (`type: .airQuality`), and the installed client decoded the response.

Location: `latitude`, `longitude` required. No `elevation` row.

Variables: `hourly`, `current`. No `daily`.

Time range: `past_days` 0–92, default 0. `forecast_days` 0–7, default 5. Hour bounds only, plus `start_date` / `end_date`. `timezone` default `GMT`. `timeformat` default `iso8601`.

Units: none in the table.

Also in that table: `domains` default `auto` (`cams_europe` or `cams_global`), `cell_selection` default `nearest`, `apikey`.

### Flood API

- Docs: https://open-meteo.com/en/docs/flood-api
- URL: `https://flood-api.open-meteo.com/v1/flood`
- Prose endpoint: `/v1/flood`

Location: `latitude`, `longitude` required. No `elevation` row.

Variables: `daily` only.

Time range: `past_days` integer, default 0. `forecast_days` 0–210, default 92. `start_date` / `end_date`; the description says data runs from 1984-01-01 until a 7 month forecast. `timezone` default `GMT`. `timeformat` default `iso8601`. No hour bounds.

Units: none in the table.

Also in that table: `ensemble` boolean ("If True all forecast ensemble members will be returned"), `cell_selection` default `nearest`, `apikey`.

### Climate API

- Docs: https://open-meteo.com/en/docs/climate-api
- URL: `https://climate-api.open-meteo.com/v1/climate`
- Prose endpoint: `/v1/climate`

Location: `latitude`, `longitude` required. No `elevation` row.

Variables: `daily` is required.

Time range: `start_date` and `end_date` are required. The description says data is available from 1950-01-01 until 2050-01-01. `timeformat` default `iso8601`. No `timezone`, `past_days`, or `forecast_days` rows.

Units: same three as the forecast API.

Also in that table: `models` is required. The description lists `CMCC_CM2_VHR4`, `FGOALS_f3_H`, `HiRAM_SIT_HR`, `MRI_AGCM3_2_S`, `EC_Earth3P_HR`, `MPI_ESM1_2_XR`, and `NICAM16_8S`. `disable_bias_correction` bool, default `false`. `cell_selection` default `land`. `apikey`.

### Seasonal Forecast API

- Docs: https://open-meteo.com/en/docs/seasonal-forecast-api
- URL the page tells you to copy: `https://seasonal-api.open-meteo.com/v1/seasonal`

No parameter table. The API Documentation section says to refer to the Weather Forecast API for the variable list. The displayed URL uses `latitude`, `longitude`, and `daily`. The page also shows 6-hourly, weekly, and monthly variable groups in the UI. It does not name query parameters `six_hourly`, `weekly`, or `monthly`.

The server registers both `/v1/seasonal` (`type: .seasonal`) and, via host detection, `/v1/forecast` on `seasonal-api.open-meteo.com` (`ApiType.detect`). The live call used `/v1/seasonal`.

### Satellite Radiation API

- Docs: https://open-meteo.com/en/docs/satellite-radiation-api
- URL the page tells you to copy: `https://satellite-api.open-meteo.com/v1/archive`

No parameter table. The displayed URL uses `latitude`, `longitude`, `hourly`, `models=satellite_radiation_seamless`, and `temporal_resolution=native`.

The server serves that host through the archive controller's `satellite-api` alias (`ForecastapiController.boot`, `ApiType.satellite`). The live call decoded it.

## Not on the allow-list

### Elevation API

- Docs: https://open-meteo.com/en/docs/elevation-api
- URL: `https://api.open-meteo.com/v1/elevation`
- Documented parameters: `latitude`, `longitude` (required together), `apikey`

`DemResponder.response` always writes `application/json` `{"elevation":[...]}` and ignores `format`. Source: https://github.com/open-meteo/open-meteo/blob/03d62919c419f1eccad8dcbbcf7f92a2dd7069b4/Sources/App/Dem/DemController.swift. The SDK README says the Elevation FlatBuffers schema is not available. A request with `format=flatbuffers` still returned that JSON. The installed client did not throw, and it did not return the elevation.

### Geocoding API

Out of this question. The SDK README says its FlatBuffers schema is not available. Docs: https://open-meteo.com/en/docs/geocoding-api (`/v1/search`, `/v1/get`).

### `/v1/arpae`

The server still registers `https://api.open-meteo.com/v1/arpae`. A live call returned `ARPAE COSMO models are not available anymore`, which `fetchWeatherApi` throws as an `Error` from the JSON body (`statusWithJsonError` includes 400 in `node_modules/openmeteo/lib/index.js`). The ItaliaMeteo docs page does not publish this path; it publishes `/v1/forecast` with `models=italia_meteo_arpae_icon_2i`.
