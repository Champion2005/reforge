/**
 * Demo presets with realistic AI-generated JSON outputs.
 * Each includes common LLM repair challenges and correction annotations.
 */

export interface DemoCorrection {
  description: string
  before?: string
  after?: string
}

export interface DemoPreset {
  label: string
  desc: string
  input: string
  schema: string
  corrections?: DemoCorrection[]
}

export const demoPresets: Record<string, DemoPreset> = {
  markdown: {
    label: 'Markdown Code Fence',
    desc: 'JSON wrapped in ```json fences',
    input: '```json\n{"name": "Alice", "age": 30, "email": "alice@example.com"}\n```',
    schema: `z.object({\n  name: z.string(),\n  age: z.number(),\n  email: z.string(),\n})`,
    corrections: [
      {
        description: 'Extracted JSON from markdown code fence wrapper',
        before: '```json\\n{...}\\n```',
        after: '{...}',
      },
    ],
  },

  trailingCommas: {
    label: 'Trailing Commas',
    desc: 'Object and array with trailing commas',
    input: `{\n  "colors": ["red", "green", "blue",],\n  "count": 3,\n  "primary": "red",\n}`,
    schema: `z.object({\n  colors: z.array(z.string()),\n  count: z.number(),\n  primary: z.string(),\n})`,
    corrections: [
      { description: 'Removed trailing comma in array' },
      { description: 'Removed trailing comma after last property' },
    ],
  },

  unquotedKeys: {
    label: 'Unquoted Keys',
    desc: 'Bare object keys without quotes',
    input: `{name: "John", age: 30, city: "New York"}`,
    schema: `z.object({\n  name: z.string(),\n  age: z.number(),\n  city: z.string(),\n})`,
    corrections: [
      { description: 'Quoted 3 bare keys: name, age, city' },
    ],
  },

  singleQuotes: {
    label: 'Single Quotes',
    desc: "Keys and values in single quotes",
    input: `{'language': 'TypeScript', 'version': '5.0', 'strict': true}`,
    schema: `z.object({\n  language: z.string(),\n  version: z.string(),\n  strict: z.boolean(),\n})`,
    corrections: [
      { description: 'Converted single quotes to double quotes' },
    ],
  },

  escapedQuotes: {
    label: 'Escaped Quote Anomalies',
    desc: 'Improperly escaped quote wrappers',
    input: `{\\"title\\": \\"Hello World\\", \\"published\\": true}`,
    schema: `z.object({\n  title: z.string(),\n  published: z.boolean(),\n})`,
    corrections: [
      { description: 'Removed escaped quote wrappers' },
    ],
  },

  truncated: {
    label: 'Truncated Output',
    desc: 'Hit max_tokens mid-response',
    input: '{"users": [{"name": "Alice", "age": 30}, {"name": "Bob", age: "25',
    schema: `z.object({\n  users: z.array(z.object({\n    name: z.string(),\n    age: z.number(),\n  })),\n})`,
    corrections: [
      { description: 'Quoted bare key: age' },
      { description: 'Closed 3 unclosed brackets: "}, ] }' },
      { description: 'Coerced string "25" to number 25' },
    ],
  },

  typeCoercion: {
    label: 'Type Coercion',
    desc: 'Strings where booleans and numbers expected',
    input: `{\n  "name": "Widget Pro",\n  "price": "49.99",\n  "quantity": "100",\n  "inStock": "true",\n  "discontinued": "false",\n  "weight": "null"\n}`,
    schema: `z.object({\n  name: z.string(),\n  price: z.number(),\n  quantity: z.number(),\n  inStock: z.boolean(),\n  discontinued: z.boolean(),\n  weight: z.number().nullable(),\n})`,
    corrections: [
      { description: 'Coerced "49.99" → 49.99, "100" → 100' },
      { description: 'Coerced "true" → true, "false" → false' },
      { description: 'Coerced "null" → null' },
    ],
  },

  conversational: {
    label: 'Conversational Wrapper',
    desc: 'JSON buried in conversational text',
    input: `Here's the data you requested:\n\n{"task": "summarize", "status": "complete", "confidence": 0.95, "tokens": 142}\n\nLet me know if you need anything else!`,
    schema: `z.object({\n  task: z.string(),\n  status: z.string(),\n  confidence: z.number(),\n  tokens: z.number(),\n})`,
    corrections: [
      { description: 'Extracted JSON from conversational wrapper text' },
    ],
  },

  combined: {
    label: 'Combined Issues',
    desc: 'Multiple problems in one output',
    input: "```json\n{\n  name: \"Sarah Johnson\",\n  age: \"28\",\n  \"role\": 'engineer',\n  \"skills\": [\"TypeScript\", \"React\", \"Node.js\",],\n  \"active\": \"true\",\n}\n```",
    schema: `z.object({\n  name: z.string(),\n  age: z.number(),\n  role: z.string(),\n  skills: z.array(z.string()),\n  active: z.boolean(),\n})`,
    corrections: [
      { description: 'Extracted JSON from markdown code fence' },
      { description: 'Quoted 2 bare keys: name, age' },
      { description: "Converted single quotes on 'engineer' to double quotes" },
      { description: 'Removed 2 trailing commas' },
      { description: 'Coerced "28" → 28, "true" → true' },
    ],
  },

  validationFailure: {
    label: 'Validation Failure',
    desc: 'Valid JSON that fails schema validation',
    input: `{\n  "title": "Meeting Notes",\n  "date": "2026-03-11",\n  "attendees": "Alice, Bob, Carol"\n}`,
    schema: `z.object({\n  title: z.string(),\n  date: z.string(),\n  attendees: z.array(z.string()),\n  summary: z.string(),\n})`,
    corrections: [
      { description: 'Shows the retry prompt that would be sent to the LLM' },
    ],
  },

  lineAwareFailure: {
    label: 'Line-Aware Retry Context',
    desc: 'Multi-line mismatch with targeted retry lines',
    input: `{
  "order": {
    "id": "ord_1001",
    "total": "149.99",
    "items": "headphones, charger"
  }
}`,
    schema: `z.object({
  order: z.object({
    id: z.string(),
    total: z.number(),
    items: z.array(z.string()),
  }),
})`,
    corrections: [
      { description: 'Line-aware retry prompt highlights only failing lines' },
      { description: 'Shows exact local context instead of full raw payload' },
    ],
  },

  product: {
    label: 'Product Extraction',
    desc: 'E-commerce AI analysis with enrichment',
    input: `{\n  "productId": "SKU-47291",\n  "title": "Premium Wireless Headphones",\n  "price": "299.99",\n  "rating": 4.7,\n  "reviewCount": "1240",\n  "inStock": "true",\n  "specs": {\n    "batteryLife": "30 hours",\n    connectivity: ["Bluetooth 5.2", "3.5mm Jack"],\n  },\n  "features": [\n    "Active Noise Cancellation",\n    "Comfort Fit",\n  ],\n  "competitors": "4",\n  "commonComplaint": null\n}`,
    schema: `z.object({\n  productId: z.string(),\n  title: z.string(),\n  price: z.number(),\n  rating: z.number(),\n  reviewCount: z.number(),\n  inStock: z.boolean(),\n  specs: z.object({\n    batteryLife: z.string(),\n    connectivity: z.array(z.string()),\n  }),\n  features: z.array(z.string()),\n  competitors: z.number(),\n  commonComplaint: z.string().nullable(),\n})`,
    corrections: [
      { description: 'Quoted bare key: connectivity' },
      { description: 'Removed 2 trailing commas' },
      { description: 'Coerced "299.99" → 299.99, "1240" → 1240, "true" → true, "4" → 4' },
    ],
  },
}
