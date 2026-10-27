<script setup lang="ts">
type ProofPoint = {
  hour: string
  temperature: number
}

type ForecastOutput = {
  timezone: string
  utcOffsetSeconds: number
  intervalSeconds: number
  time: number[]
  temperature: number[]
  unit: number
}

type ProofResponse =
  | { ok: true, output: ForecastOutput }
  | { ok: false, error: string }

const message = ref('')
const pending = ref(false)
const errorMessage = ref('')
const points = ref<ProofPoint[]>([])

const categories = {
  temperature: {
    name: 'Temperature',
    color: '#2662d9',
  },
}

function hourLabel(unixSeconds: number, utcOffsetSeconds: number): string {
  const local = new Date((unixSeconds + utcOffsetSeconds) * 1000)
  const hour = local.getUTCHours().toString().padStart(2, '0')
  const minute = local.getUTCMinutes().toString().padStart(2, '0')
  return `${hour}:${minute}`
}

function pointsFromOutput(output: ForecastOutput): ProofPoint[] | null {
  if (
    output.intervalSeconds !== 3600
    || output.unit !== 1
    || output.time.length !== 24
    || output.temperature.length !== 24
  ) {
    return null
  }

  const nextPoints: ProofPoint[] = []
  for (let index = 0; index < output.time.length; index += 1) {
    const unixSeconds = output.time[index]
    const temperature = output.temperature[index]
    if (unixSeconds === undefined || temperature === undefined) {
      return null
    }
    nextPoints.push({
      hour: hourLabel(unixSeconds, output.utcOffsetSeconds),
      temperature,
    })
  }
  return nextPoints
}

async function send() {
  pending.value = true
  errorMessage.value = ''
  points.value = []

  try {
    const result = await $fetch<ProofResponse>('/api/proof', {
      method: 'POST',
      body: { message: message.value },
    })

    if (!result.ok) {
      errorMessage.value = result.error
      return
    }

    const nextPoints = pointsFromOutput(result.output)
    if (!nextPoints) {
      errorMessage.value = 'Forecast did not return 24 hourly temperatures'
      return
    }

    points.value = nextPoints
  }
  catch (error) {
    errorMessage.value = error instanceof Error && error.message
      ? error.message
      : 'Request failed'
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <main class="mx-auto flex w-full max-w-3xl flex-col gap-4 p-8">
    <form
      class="flex flex-col gap-3"
      @submit.prevent="send"
    >
      <label
        class="flex flex-col gap-2 text-sm"
        for="proof-message"
      >
        Message
        <input
          id="proof-message"
          v-model="message"
          class="rounded-md border px-3 py-2"
          type="text"
          autocomplete="off"
        >
      </label>
      <Button
        type="submit"
        :disabled="pending"
      >
        Send
      </Button>
    </form>
    <p
      v-if="pending"
    >
      Sending…
    </p>
    <p
      v-if="errorMessage"
      role="alert"
    >
      {{ errorMessage }}
    </p>
    <div
      v-else-if="points.length === 24"
      class="w-full"
    >
      <LineChart
        :data="points"
        :categories="categories"
        :height="320"
        x-axis="hour"
        y-label="°C"
      />
    </div>
  </main>
</template>
