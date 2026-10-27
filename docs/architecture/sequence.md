# Request sequence

A person asks a question in a Conversation. The page sends the thread to `POST /api/chat`. The model may call the Geocode tool, one Weather tool, and then the Chart tool. The page shows the reply and the chart in the same thread.

Each request rebuilds memory from earlier messages: place matches from the Geocode tool, and the latest Weather response. The Chart tool stays inactive until that Weather response exists. A request stops after eight model steps.

```mermaid
sequenceDiagram
  actor Person
  participant Conversation
  participant Route as POST /api/chat
  participant Open as Open conversation
  participant Model
  participant Geocode as Geocode tool
  participant Weather as Weather tool
  participant Chart as Chart tool
  participant OpenMeteo as Open-Meteo

  Person->>Conversation: Ask a question
  Conversation->>Route: Thread of messages
  Route->>Open: Messages, model, and Open-Meteo client
  Open->>Open: Rebuild place matches and the latest Weather response
  Open->>Model: Briefing, thread, and tools

  Model->>Geocode: Written place names
  Geocode->>OpenMeteo: Search
  OpenMeteo-->>Geocode: Place matches
  Geocode-->>Model: Place matches
  Note over Geocode: Remember the place matches

  Model->>Weather: Coordinates and variable codes
  Weather->>OpenMeteo: Fetch
  OpenMeteo-->>Weather: Payload
  Weather-->>Model: Weather response
  Note over Weather: Remember the Weather response

  Model->>Chart: Chart type, question, and series
  Chart-->>Model: Chart built from the Weather response

  Model-->>Open: Short reply
  Open-->>Route: Stream
  Route-->>Conversation: Message parts
  Conversation-->>Person: Reply and chart
```

When the person names a place the model does not understand, the model asks which place they mean and stops. It does not call a Weather tool or the Chart tool on that step.
