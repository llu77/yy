// frontend/lib/openai-responses-client.ts

interface CreateResponseParams {
  input: any;
  instructions?: string;
  tools?: any[];
  stream?: boolean;
}

interface Conversation {
    id: string;
    // Add other conversation properties as needed
}

interface ResponseStream extends AsyncGenerator<any> {
    // Define stream properties if any
}

interface ResponsesAPIClient {
  createResponse(params: CreateResponseParams): Promise<ResponseStream | any>
  getResponse(responseId: string): Promise<any>
  createConversation(items?: any[]): Promise<Conversation>
  addToConversation(conversationId: string, items: any[]): Promise<void>
}

class OpenAIResponsesClient implements ResponsesAPIClient {
  private apiKey: string
  private baseURL = 'https://api.openai.com/v1'
  private ws: WebSocket | null = null
  private conversationId: string | null = null
  private lastResponseId: string | null = null
  
  constructor(apiKey: string) {
    this.apiKey = apiKey
  }
  
  async createResponse(params: CreateResponseParams): Promise<ResponseStream | any> {
    const response = await fetch(`${this.baseURL}/responses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        input: params.input,
        instructions: params.instructions,
        previous_response_id: this.lastResponseId,
        conversation: this.conversationId,
        tools: params.tools || [
          { type: 'web_search' },
          { type: 'file_search' },
          { type: 'code_interpreter' }
        ],
        store: true,
        stream: params.stream ?? true,
        include: [
          'web_search_call.action.sources',
          'code_interpreter_call.outputs',
          'file_search_call.results'
        ]
      })
    })
    
    if (params.stream) {
      return this.handleStreamResponse(response)
    } else {
      const data = await response.json()
      this.lastResponseId = data.id
      return data
    }
  }
  
  private async *handleStreamResponse(response: Response): AsyncGenerator<any> {
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    
    while (reader) {
      const { done, value } = await reader.read()
      if (done) break
      
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue
          
          try {
            const event = JSON.parse(data)
            
            // Store response ID for continuity
            if (event.type === 'response.created') {
              this.lastResponseId = event.response.id
            }
            
            yield event
          } catch (e) {
            console.error('Failed to parse SSE:', e)
          }
        }
      }
    }
  }

  async getResponse(responseId: string): Promise<any> {
    // Implementation for getResponse
    const response = await fetch(`${this.baseURL}/responses/${responseId}`, {
        headers: {
            'Authorization': `Bearer ${this.apiKey}`
        }
    });
    return response.json();
  }
  
  async createConversation(items: any[] = []): Promise<Conversation> {
    const response = await fetch(`${this.baseURL}/conversations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ items })
    })
    
    const conversation = await response.json()
    this.conversationId = conversation.id
    return conversation
  }

  async addToConversation(conversationId: string, items: any[]): Promise<void> {
      // Implementation for addToConversation
       await fetch(`${this.baseURL}/conversations/${conversationId}/items`, {
           method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
           body: JSON.stringify({ items })
       });
  }
  
  connectWebSocket(clientId: string, onMessage: (event: any) => void) {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'
    this.ws = new WebSocket(`${wsUrl}/ws/${clientId}`)
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      onMessage(data)
    }
    
    this.ws.onopen = () => {
      console.log('WebSocket connected')
    }
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }
  
  sendMessage(type: string, data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type,
        ...data,
        previous_response_id: this.lastResponseId
      }))
    }
  }
}

export const responsesClient = new OpenAIResponsesClient(
  process.env.NEXT_PUBLIC_OPENAI_API_KEY!
)
