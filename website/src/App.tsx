import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Demo from './pages/Demo'
import Docs from './pages/Docs'
import Blog from './pages/Blog'
import EnforceJsonSchemasOpenAI from './pages/blog/enforce-json-schemas-openai-2026'
import JsonSchemaPromptsNativeRepair from './pages/blog/json-schema-prompts-native-repair'
import ZodLlmsResilientPipelines from './pages/blog/zod-llms-resilient-pipelines'

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/enforce-json-schemas-openai-2026" element={<EnforceJsonSchemasOpenAI />} />
          <Route path="/blog/json-schema-prompts-native-repair" element={<JsonSchemaPromptsNativeRepair />} />
          <Route path="/blog/zod-llms-resilient-pipelines" element={<ZodLlmsResilientPipelines />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
