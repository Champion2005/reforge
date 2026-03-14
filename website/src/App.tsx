import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import DocsLayout from './components/DocsLayout'
import Home from './pages/Home'
import Demo from './pages/Demo'
import Blog from './pages/Blog'

// Blog posts
import EnforceJsonSchemasOpenAI from './pages/blog/enforce-json-schemas-openai-2026'
import JsonSchemaPromptsNativeRepair from './pages/blog/json-schema-prompts-native-repair'
import ZodLlmsResilientPipelines from './pages/blog/zod-llms-resilient-pipelines'
import StructuredOutputAnyLLM from './pages/blog/structured-output-any-llm-typescript'
import ReliableAIAgents from './pages/blog/reliable-ai-agents-retry-validation'
import ReforgeTimingBenchmarkPost from './pages/blog/reforge-timing-benchmark-process-findings'

// Doc pages
import DocsIntroduction from './pages/docs/introduction'
import DocsInstallation from './pages/docs/installation'
import DocsQuickStartGuard from './pages/docs/quick-start-guard'
import DocsQuickStartForge from './pages/docs/quick-start-forge'
import DocsProviderAdapters from './pages/docs/provider-adapters'
import DocsOpenAI from './pages/docs/openai'
import DocsOpenRouter from './pages/docs/openrouter'
import DocsAnthropic from './pages/docs/anthropic'
import DocsGoogle from './pages/docs/google'
import DocsCustomProvider from './pages/docs/custom-provider'
import DocsEdgeRuntime from './pages/docs/edge-runtime'
import DocsRetryStrategy from './pages/docs/retry-strategy'
import DocsApiGuard from './pages/docs/api-guard'
import DocsApiForge from './pages/docs/api-forge'
import DocsConcepts from './pages/docs/concepts'
import DocsPerformance from './pages/docs/performance'
import DocsEnvironments from './pages/docs/environments'
import DocsTroubleshooting from './pages/docs/troubleshooting'
import DocsFaq from './pages/docs/faq'
import DocsReportingIssues from './pages/docs/reporting-issues'
import DocsChangelog from './pages/docs/changelog'

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/demo" element={<Demo />} />

          {/* Docs — each page wrapped in DocsLayout */}
          <Route path="/docs" element={<Navigate to="/docs/introduction" replace />} />
          <Route path="/docs/introduction" element={<DocsLayout><DocsIntroduction /></DocsLayout>} />
          <Route path="/docs/installation" element={<DocsLayout><DocsInstallation /></DocsLayout>} />
          <Route path="/docs/quick-start-guard" element={<DocsLayout><DocsQuickStartGuard /></DocsLayout>} />
          <Route path="/docs/quick-start-forge" element={<DocsLayout><DocsQuickStartForge /></DocsLayout>} />
          <Route path="/docs/provider-adapters" element={<DocsLayout><DocsProviderAdapters /></DocsLayout>} />
          <Route path="/docs/openai" element={<DocsLayout><DocsOpenAI /></DocsLayout>} />
          <Route path="/docs/openrouter" element={<DocsLayout><DocsOpenRouter /></DocsLayout>} />
          <Route path="/docs/anthropic" element={<DocsLayout><DocsAnthropic /></DocsLayout>} />
          <Route path="/docs/google" element={<DocsLayout><DocsGoogle /></DocsLayout>} />
          <Route path="/docs/custom-provider" element={<DocsLayout><DocsCustomProvider /></DocsLayout>} />
          <Route path="/docs/edge-runtime" element={<DocsLayout><DocsEdgeRuntime /></DocsLayout>} />
          <Route path="/docs/retry-strategy" element={<DocsLayout><DocsRetryStrategy /></DocsLayout>} />
          <Route path="/docs/api-guard" element={<DocsLayout><DocsApiGuard /></DocsLayout>} />
          <Route path="/docs/api-forge" element={<DocsLayout><DocsApiForge /></DocsLayout>} />
          <Route path="/docs/concepts" element={<DocsLayout><DocsConcepts /></DocsLayout>} />
          <Route path="/docs/performance" element={<DocsLayout><DocsPerformance /></DocsLayout>} />
          <Route path="/docs/environments" element={<DocsLayout><DocsEnvironments /></DocsLayout>} />
          <Route path="/docs/troubleshooting" element={<DocsLayout><DocsTroubleshooting /></DocsLayout>} />
          <Route path="/docs/faq" element={<DocsLayout><DocsFaq /></DocsLayout>} />
          <Route path="/docs/reporting-issues" element={<DocsLayout><DocsReportingIssues /></DocsLayout>} />
          <Route path="/docs/changelog" element={<DocsLayout><DocsChangelog /></DocsLayout>} />

          {/* Blog */}
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/enforce-json-schemas-openai-2026" element={<EnforceJsonSchemasOpenAI />} />
          <Route path="/blog/json-schema-prompts-native-repair" element={<JsonSchemaPromptsNativeRepair />} />
          <Route path="/blog/zod-llms-resilient-pipelines" element={<ZodLlmsResilientPipelines />} />
          <Route path="/blog/structured-output-any-llm-typescript" element={<StructuredOutputAnyLLM />} />
          <Route path="/blog/reliable-ai-agents-retry-validation" element={<ReliableAIAgents />} />
          <Route path="/blog/reforge-timing-benchmark-process-findings" element={<ReforgeTimingBenchmarkPost />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
