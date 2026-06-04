export type StreamEvent =
  | { type: 'token'; content: string }
  | { type: 'tool_start'; tool: string; input: string }
  | { type: 'tool_end'; tool: string; result?: string; call_tokens?: number; call_input_tokens?: number; call_output_tokens?: number; call_cost_eur?: number }
  | { type: 'done'; input_tokens: number; output_tokens: number; cost_eur?: number; trace_id?: string }
  | { type: 'error'; message: string }

export async function* readStream(res: Response): AsyncGenerator<StreamEvent> {
  if (!res.body) return
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        yield JSON.parse(line.slice(6)) as StreamEvent
      } catch {}
    }
  }
}
