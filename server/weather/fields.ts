export type FieldKind = 'number' | 'string' | 'boolean' | 'stringArray'

export interface WeatherField {
  name: string
  kind: FieldKind
  description: string
}

export const elevationField: WeatherField = {
  name: 'elevation',
  kind: 'number',
  description: 'Optional elevation. elevation=nan disables downscaling.',
}

export const forecastTimeFields: WeatherField[] = [
  { name: 'past_days', kind: 'number', description: 'Number of past days to include.' },
  { name: 'forecast_days', kind: 'number', description: 'Number of forecast days to include.' },
  { name: 'forecast_hours', kind: 'number', description: 'Limit the forecast to this many hours.' },
  { name: 'past_hours', kind: 'number', description: 'Number of past hours to include.' },
  { name: 'start_date', kind: 'string', description: 'Range start, yyyy-mm-dd.' },
  { name: 'end_date', kind: 'string', description: 'Range end, yyyy-mm-dd.' },
  { name: 'start_hour', kind: 'string', description: 'Hour range start, yyyy-mm-ddThh:mm.' },
  { name: 'end_hour', kind: 'string', description: 'Hour range end, yyyy-mm-ddThh:mm.' },
  { name: 'timezone', kind: 'string', description: 'Time zone. Required when daily is set.' },
]

export const forecastUnitFields: WeatherField[] = [
  { name: 'temperature_unit', kind: 'string', description: 'celsius or fahrenheit.' },
  { name: 'wind_speed_unit', kind: 'string', description: 'kmh, ms, mph, or kn.' },
  { name: 'precipitation_unit', kind: 'string', description: 'mm or inch.' },
]

export const modelsField: WeatherField = {
  name: 'models',
  kind: 'stringArray',
  description: 'Model names. A named forecast model such as GFS is selected here.',
}

export const cellSelectionField: WeatherField = {
  name: 'cell_selection',
  kind: 'string',
  description: 'land, sea, or nearest.',
}

export const forecastOptionalFields: WeatherField[] = [
  elevationField,
  ...forecastTimeFields,
  ...forecastUnitFields,
  modelsField,
  cellSelectionField,
]
