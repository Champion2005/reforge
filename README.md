# steelguard-ts

Zero-latency deterministic validation and native JSON repair for Agentic LLM applications.

## The Problem

LLMs are probabilistic and frequently output malformed JSON:
- Markdown wrappers around JSON
- Trailing commas
- Unquoted keys
- Truncated outputs

Network retries to providers (OpenAI, Anthropic) take 1-3 seconds and cost money.

## The Solution

A zero-dependency TypeScript library that sits between the LLM output and the application:
- Natively repairs syntactical errors in microseconds
- Strictly enforces semantic types via Zod
- Deterministic validation
- Ultra-low latency

## Installation

```bash
npm install steelguard-ts
```

## Usage

*Coming soon...*

## License

MIT
