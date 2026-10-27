# Architecture flow

The product is split so the Conversation, the chat route, Weather, and the chart stay apart. A domain calls another through its public function or route.

```mermaid
flowchart LR
  subgraph page [Page]
    Screen[Conversation screen]
    Rows[Conversation rows]
    ChartView[Chart view]
    Store[Conversation store]
  end

  subgraph server [Server]
    Route["POST /api/chat"]
    Stream[Open conversation]
    Weather[Weather]
  end

  ChartTool[Chart tool]

  Screen --> Store
  Store --> Route
  Route --> Stream
  Stream --> Weather
  Stream --> ChartTool
  Route --> Store
  Store --> Rows
  Rows --> ChartView
```

`app/components/chat/` owns messages and parts. `app/stores/conversation.ts` keeps each Conversation and posts it to `/api/chat`. `server/api/chat.post.ts` is the route. `server/chat/` owns the model, the briefing, and the eight-step limit. `server/weather/` fetches Open-Meteo and maps a Weather response. `app/chart/` is the Chart tool. `app/components/chart/` draws a Chart tool result.

## Tool steps

On each model step, the Chart tool is offered only after a Weather response is remembered. The Geocode tool and the Weather tools stay available. Tool results are streamed back as parts, and the model continues until it replies or reaches eight steps.

```mermaid
flowchart TD
  Start[Person sends a message] --> Post["POST /api/chat"]
  Post --> Memory[Rebuild place matches and the latest Weather response]
  Memory --> Gate{Weather response remembered?}
  Gate -->|No| Tools[Offer the Geocode tool and the Weather tools]
  Gate -->|Yes| ToolsWithChart[Offer those tools and the Chart tool]
  Tools --> Step[Model takes a step]
  ToolsWithChart --> Step
  Step --> Choice{What does the model do?}
  Choice -->|Geocode tool| Geo[Search Open-Meteo and remember place matches]
  Choice -->|Weather tool| Fetch[Fetch Open-Meteo and remember the Weather response]
  Choice -->|Chart tool| Draw[Build the chart from the remembered Weather response and the named series]
  Choice -->|Reply| Reply[Write a short answer]
  Geo --> Limit{Eight steps reached?}
  Fetch --> Limit
  Draw --> Limit
  Limit -->|No| Gate
  Limit -->|Yes| Reply
  Reply --> Stream[Stream message parts to the Conversation]
```

A Weather tool call uses one Open-Meteo source: forecast, archive, historical forecast, previous runs, single runs, ensemble, marine, air quality, flood, climate, seasonal, or satellite radiation. Several places go in that one call. The Chart tool reads the remembered Weather response and the series the model named. It does not fetch Open-Meteo.

## What the Conversation shows

The page turns message parts into rows. A running tool is Tool activity and names the Geocode tool, a Weather tool, or the Chart tool. A finished Chart tool result that has a known chart type becomes the chart under the reply. Model reasoning stays off those rows. In development, the turn panel on the right lists the tools from the latest assistant message and can show the raw tool data and reasoning. The production build leaves that panel out.

```mermaid
flowchart TD
  Messages[Thread messages] --> Role{Role}
  Role -->|Person| Person[Person row]
  Role -->|Assistant| Walk[Walk the parts in order]
  Walk --> Kind{Part}
  Kind -->|Tool still running| Activity[Tool activity row]
  Kind -->|Chart tool result| Valid{Known chart type?}
  Kind -->|Text| Reply[Reply row]
  Valid -->|Yes| Chart[Reply row with the chart]
  Valid -->|No| Reply
  Person --> Shown[Rows in the Conversation]
  Activity --> Shown
  Reply --> Shown
  Chart --> Shown
```
