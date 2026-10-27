# How `openmeteo` returns the next 24 hourly temperatures

Researched against the `openmeteo` package source, the Open-Meteo FlatBuffers schema, and the forecast docs at https://open-meteo.com/en/docs. Coordinates below are literals. Geocoding is out of scope.

## Answer

Call `fetchWeatherApi` from the `openmeteo` package. Ask for `hourly=temperature_2m`, `forecast_hours=24`, and a `timezone`. The function forces `format=flatbuffers` and returns `WeatherApiResponse[]`, not the JSON object in the docs.

For one coordinate, read `responses[0]`. There is no time array on that object. Build the 24 timestamps from `hourly.time()`, `hourly.timeEnd()`, and `hourly.interval()` (3600). Read temperatures from `hourly.variables(0).valuesArray()` (`Float32Array | null`). Read the unit from `hourly.variables(0).unit()`, which is the numeric enum `Unit.celsius` (`1`) when `temperature_unit` is left at its default.

A Zod schema has to accept a plain copy of that data: a length-24 array of unix seconds, a length-24 array of numbers copied out of the `Float32Array`, and the unit integer `1`. It must not accept the docs' JSON shape (`hourly.time` as ISO strings, `hourly.temperature_2m`, `hourly_units.temperature_2m: "°C"`).

## Request

`openmeteo` (npm, repository `open-meteo/typescript`) exports one fetch function, `fetchWeatherApi`. It depends on `@openmeteo/sdk`. The published package at the time of the npm page read was 1.2.3, depending on `@openmeteo/sdk` `^1.23.0`.

```ts
import { fetchWeatherApi } from 'openmeteo';

const responses = await fetchWeatherApi(
  'https://api.open-meteo.com/v1/forecast',
  {
    latitude: [52.52],
    longitude: [13.41],
    hourly: 'temperature_2m',
    forecast_hours: 24,
    timezone: 'auto',
  },
);
```

`fetchWeatherApi(url, params)` copies `params` into `URLSearchParams` and then sets `format` to `flatbuffers`. Do not send a hand-rolled `fetch`, and do not expect the JSON body. The package author states that `fetchWeatherApi` is only for the binary FlatBuffers format, and that JSON does not need this library.

Parameter sources:

| Parameter | Value for this question | Source |
| --- | --- | --- |
| Endpoint | `https://api.open-meteo.com/v1/forecast` | Package README and `fetchWeatherApi` docs. The forecast docs call this `/v1/forecast`. |
| `latitude`, `longitude` | One WGS84 coordinate. The package README passes each as a one-element array. The API also accepts a single floating-point value. | [Forecast API parameter table](https://open-meteo.com/en/docs). Package README. |
| `hourly` | `temperature_2m`. Comma-separate if more variables are added later. | Forecast docs: `hourly` is a string array of weather variables. `temperature_2m` is air temperature at 2 m, valid at the indicated hour (instant), unit °C (°F). |
| `forecast_hours` | `24` | Forecast docs: integer `> 0`. It sets the number of hourly timesteps, using the current hour as the reference instead of the current day. |
| `timezone` | An IANA name, or `auto` | Forecast docs: default `GMT`. `auto` resolves the zone from the coordinates. The response reports that zone's offset as `utc_offset_seconds`. |
| `temperature_unit` | Omit it | Forecast docs: default `celsius`. `fahrenheit` converts temperature values. |
| `format` | Set by the client to `flatbuffers` | `fetchWeatherApi` source. The schema repo says the API's default format is JSON, and `format=flatbuffers` selects the binary encoding. |

`forecast_days=1` is the wrong length control. The default forecast is 7 days, 168 hours, starting at 00:00 today. `forecast_days` is an integer `0–16` and still uses the current day as the reference. Hourly data uses `forecast_hours` only when that parameter is set; otherwise the server falls back to the daily range expanded to hours. The server comment says that when `forecast_hours` is set, the default start is the current hour, and `initial_hours` can pin a different hour of the day (`initial_hours` is not on the public docs table; leave it unset).

The range is built in `forecastTimeRange2`. With `initialStep` omitted it floors `(now + utcOffset)` to the hour, then takes a half-open range of `forecastSteps` hours:

```swift
start = ((currentTime.timeIntervalSince1970 + utcOffset) / dtSeconds) * dtSeconds
end = start + forecastSteps * dtSeconds
// range: start ..< end, dtSeconds 3600
```

`utcOffset` comes from the requested timezone, so an omitted `timezone` (default `GMT`) floors to the current UTC hour. The server test `timeSelection` fixes this: at `2024-02-03 12:24` with `utcOffset` 3600 and `forecastSteps` 4, the range pretty-prints as `2024-02-03T13:00 to 2024-02-03T16:00` (the local hour through four steps). `initialStep: 0` instead starts at local midnight.

A live JSON request on 2026-10-27, `timezone=auto`, coordinates `52.52, 13.41`, `forecast_hours=24`, returned 24 times and 24 temperatures. UTC now was `2026-10-27T10:41:57Z`. The resolved zone was `Europe/Berlin` (`utc_offset_seconds` 3600). The first time was `2026-10-27T11:00` and the last was `2026-10-28T10:00`. That is the current local hour plus the next 23 hours. This call omitted `format`, so it is the JSON API, not the package return. It confirms the window the same parameters select.

## Response the caller reads

`fetchWeatherApi` returns `Promise<WeatherApiResponse[]>`. One coordinate is one size-prefixed FlatBuffer, so the caller uses `responses[0]`. Each message is one location.

`WeatherApiResponse.hourly()` returns `VariablesWithTime | null`. On that object the caller reads:

| Accessor | Type | Meaning |
| --- | --- | --- |
| `time()` | `bigint` | Unix seconds of the first value, GMT |
| `timeEnd()` | `bigint` | First timestamp not included (one step past the last) |
| `interval()` | `number` | Seconds per step. Hourly data is `3600` |
| `variables(index)` | `VariableWithValues \| null` | One requested variable. Order matches the `hourly` query |
| `variables(0).valuesArray()` | `Float32Array \| null` | The temperature series |
| `variables(0).unit()` | `Unit` | Numeric unit enum |
| `variables(0).variable()` | `Variable` | `temperature` is `47`, not the string `temperature_2m` |
| `variables(0).altitude()` | `number` | `2` for `temperature_2m` |
| `utcOffsetSeconds()` | `number` | Timezone offset in seconds, on the parent response |
| `timezone()` | `string \| null` | Resolved zone name, for example `Europe/Berlin` |

There is no `hourly.time: string[]` and no `hourly_units` object. The package README builds the time array in the caller:

```ts
const response = responses[0];
const utcOffsetSeconds = response.utcOffsetSeconds();
const hourly = response.hourly()!;
const range = (start: number, stop: number, step: number) =>
  Array.from({ length: (stop - start) / step }, (_, i) => start + i * step);

const time = range(
  Number(hourly.time()),
  Number(hourly.timeEnd()),
  hourly.interval(),
).map((t) => new Date((t + utcOffsetSeconds) * 1000));

const temperature = hourly.variables(0)!.valuesArray()!;
```

`time()` and `timeEnd()` are GMT. Adding `utcOffsetSeconds` is the README's way to shift those instants toward local wall time. The schema docs say FlatBuffers timestamps are always unix seconds in GMT, regardless of the JSON `timeformat` parameter.

`temperature_2m` is encoded as `variable=temperature` and `altitude=2`. With only that variable requested, index `0` is the series, because the API preserves request order. `valuesArray()` is the time series; `value()` is the single-number field used for `current`, not for hourly.

`unit()` is an enum, not `"°C"`. In `ts/unit.ts`, `Unit.celsius = 1` and `Unit.fahrenheit = 9`. The schema docs describe `unit` as the unit used for the result, for example `celsius`. The default `temperature_unit` is `celsius`, and a `flatc` JSON dump of a temperature variable shows `"unit": "celsius"` (that dump prints enum names; the TypeScript accessor returns the integer). This research did not decode a live FlatBuffer, so the integer `1` is the enum definition for the default unit, not a captured response byte.

## Zod contract

Zod has to validate a plain object the caller copies out. It cannot parse `WeatherApiResponse`: the fields are methods, `time()` is a `bigint`, and `valuesArray()` is a `Float32Array | null`.

For the default Celsius request, the copied payload is:

```ts
z.object({
  timezone: z.string(),
  utcOffsetSeconds: z.number().int(),
  intervalSeconds: z.literal(3600),
  time: z.array(z.number().int()).length(24),
  temperature: z.array(z.number()).length(24),
  unit: z.literal(1),
})
```

- `time` is the GMT unix seconds from `range(Number(time()), Number(timeEnd()), interval())` before the README wraps them in `Date`. Length is `(timeEnd - time) / interval`, which is 24 for `forecast_hours=24`.
- `temperature` is `Array.from(valuesArray())`. The schema's number array has to be that copy. Temperatures are floats (`z.number()`, not integers). The docs' JSON example mixes values such as `13` and `12.7`.
- `unit` is `1` (`Unit.celsius`) for the default `temperature_unit`. It is not the string `"°C"`.
- `timezone` and `utcOffsetSeconds` are what the caller reads to interpret `time`. The accessor types `timezone()` as `string | null` when the FlatBuffer field is absent; a successful forecast response documents `timezone` as a string.
- If the stored `time` values are the README's `Date` objects instead of unix seconds, that field is `z.array(z.date()).length(24)`, not `z.array(z.number().int())`.

HTTP 400 is a different body. The docs return `{ "error": true, "reason": "..." }`. `fetchWeatherApi` throws `new Error(reason)` for status 400 and 429 when `reason` is present. That error is not this payload.

## JSON shape this package does not return

The forecast docs say `/v1/forecast` responds with JSON unless another format is chosen. Their success example is:

```json
{
  "latitude": 52.52,
  "longitude": 13.419,
  "elevation": 44.812,
  "generationtime_ms": 2.2119,
  "utc_offset_seconds": 0,
  "timezone": "Europe/Berlin",
  "timezone_abbreviation": "CEST",
  "hourly": {
    "time": ["2022-07-01T00:00", "2022-07-01T01:00", "2022-07-01T02:00"],
    "temperature_2m": [13, 12.7, 12.7, 12.5, 12.5, 12.8, 13, 12.9, 13.3]
  },
  "hourly_units": {
    "temperature_2m": "°C"
  }
}
```

The docs describe `hourly` as a floating-point array per variable plus an ISO-8601 `time` array, and `hourly_units` as the unit for each selected variable. The same live JSON request as above also returned `hourly_units.time` of `"iso8601"` and `hourly_units.temperature_2m` of `"°C"`. The example in the docs omits the `time` unit.

A Zod schema written for that JSON object would be `hourly.time: string[]`, `hourly.temperature_2m: number[]`, and `hourly_units.temperature_2m: "°C"`. `fetchWeatherApi` will not produce it, because it sets `format=flatbuffers` and decodes `WeatherApiResponse`.

## Sources

- Package fetch and the caller-side time/`valuesArray()` example: https://github.com/open-meteo/typescript/blob/main/README.md and https://github.com/open-meteo/typescript/blob/main/src/index.ts
- Package dependency `@openmeteo/sdk` `^1.23.0`: https://github.com/open-meteo/typescript/blob/main/package.json
- npm package page (version 1.2.3 at read time): https://www.npmjs.com/package/openmeteo
- Maintainer: `fetchWeatherApi` is FlatBuffers-only: https://github.com/open-meteo/typescript/issues/125
- Forecast parameters, `temperature_2m`, JSON example, and error object: https://open-meteo.com/en/docs
- FlatBuffers layout (`hourly`, `time` / `time_end` / `interval`, `values`, `unit`): https://github.com/open-meteo/sdk/blob/main/README.md and https://github.com/open-meteo/sdk/blob/main/flatbuffers/weather_api.fbs
- TypeScript accessors: https://github.com/open-meteo/sdk/blob/main/ts/weather-api-response.ts, https://github.com/open-meteo/sdk/blob/main/ts/variables-with-time.ts, https://github.com/open-meteo/sdk/blob/main/ts/variable-with-values.ts, https://github.com/open-meteo/sdk/blob/main/ts/unit.ts, https://github.com/open-meteo/sdk/blob/main/ts/variable.ts
- `forecast_hours` window: https://github.com/open-meteo/open-meteo/blob/main/Sources/App/Helper/ForecastapiQuery.swift (`forecastTimeRange2`, hourly fallback near the `forecast_hours` call) and https://github.com/open-meteo/open-meteo/blob/main/Tests/AppTests/ApiTests.swift (`timeSelection`)
- Live JSON window check, 2026-10-27: `https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&hourly=temperature_2m&forecast_hours=24&timezone=auto` returned 24 times (`2026-10-27T11:00` through `2026-10-28T10:00`), 24 temperatures, `timezone` `Europe/Berlin`, `utc_offset_seconds` 3600, and `hourly_units` `{ "time": "iso8601", "temperature_2m": "°C" }`. No FlatBuffer was decoded in this pass.
