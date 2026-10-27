# Weather_data_LLM

Tech case study: a chat page where the user talks to an LLM and can ask for real, live weather data, which comes back as a chart displayed directly in the conversation.

## Run

Requires Node.js 22 or newer.

```bash
npm install
cp .env.example .env
```

Set `NUXT_ANTHROPIC_API_KEY` in `.env` to an Anthropic API key. Chat requests fail without it. Weather data comes from the public Open-Meteo API and needs no key.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The turn panel on the right is included in development and left out of the production build.

## Architecture

[Request sequence](docs/architecture/sequence.md) shows one question moving through the Conversation, the tools, and Open-Meteo. [Architecture flow](docs/architecture/flow.md) shows how the page, the chat route, Weather, and the chart fit together, and how a reply is drawn.

```bash
npm run build
npm run preview
```
