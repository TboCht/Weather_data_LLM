# Weather chat

A conversation in which a person asks an LLM for Open-Meteo data and receives a Weather response shown as a chart.

## Language

**Weather**:
The part of the product that fetches Open-Meteo and maps the response.
_Avoid_: weather service

**Weather response**:
The mapped Open-Meteo payload for the arguments the LLM chose.
_Avoid_: Reading, Forecast, response

**Place match**:
One location the Geocode tool returns for a written place, including the coordinates the LLM may pass to a Weather tool.
_Avoid_: candidate, result, hit

**Geocode tool**:
The function the LLM calls with one or more written places to obtain place matches.
_Avoid_: geocoding service, location service

**Weather tool**:
A function the LLM calls with coordinates and data arguments to obtain a Weather response. Each Open-Meteo source has its own.
_Avoid_: weather service, forecast tool

**Series**:
One line named for a chart: a section, a variable, a place in a Weather response, and the color chosen for it.
_Avoid_: dataset, trace

**Chart tool**:
The function the LLM calls to pick a chart for a Weather response.
_Avoid_: chart picker, visualization

**Tool**:
A function the LLM calls. In this product that is the Geocode tool, the Weather tool, or the Chart tool.
_Avoid_: weather service, weather API

**Conversation**:
The thread a person uses to ask for weather, showing their message, the assistant's reply, Tool activity, and a Chart tool result.
_Avoid_: chat UI, frontend, frontend API

**Tool activity**:
The status in a Conversation that reads Thinking from the start of a turn until the assistant's reply is shown. It does not name each Tool, and it has no model reasoning attached.
_Avoid_: thinking thread, backend service
