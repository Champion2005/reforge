import BlogLayout, { Heading, SubHeading, Paragraph, InlineCode, BlogCodeBlock } from '../../components/BlogLayout'

const runnerScript = `// timing-runner.ts
const commands = [
  { label: 'guard', args: ['run', 'guard'], outputFile: 'guard-run-output.txt' },
  { label: 'forge', args: ['run', 'forge'], outputFile: 'forge-run-output.txt' },
  { label: 'provider-tests', args: ['run', 'test', '--', 'tests/providers/openai-compatible.test.ts'], outputFile: 'provider-test-output.txt' },
  { label: 'typecheck', args: ['run', 'typecheck'], outputFile: 'typecheck-output.txt' },
]

for (const command of commands) {
  // Runs real scripts, captures stdout/stderr, writes timing artifacts to disk
}`

const analysisLogic = `// analyze-timing.ts
const durations = [...guardText.matchAll(/"durationMs"\\s*:\\s*([0-9.]+)/g)]
  .map((m) => Number(m[1]))

const summary = {
  samples: durations.length,
  min: Math.min(...durations),
  max: Math.max(...durations),
  average: sum / durations.length,
  median,
  under5ms: durations.filter((v) => v < 5).length,
}`

const keyResults = `Timing Summary (2026-03-14)

Command Exit Codes
- guard: 0
- forge: 0
- provider tests: 0
- typecheck: 0

guard() Performance
- Samples: 11
- Min: 0.1553 ms
- Max: 2.3375 ms
- Average: 0.5645 ms
- Median: 0.3535 ms
- Under 5ms: 11 / 11
- Scenario summary: Passed 11/11 guard scenarios.

forge() / Provider Findings
- Live forge success block observed: yes
- Retry callback activity observed: yes
- Fallback flow success observed: yes
- Forge totalDurationMs range: 0.2180 ms to 29910.6389 ms
- Forge guard durationMs range: 0.1147 ms to 1.2038 ms`

export default function ReforgeTimingBenchmarkPost() {
  return (
    <BlogLayout
      title="How We Benchmarked Reforge End-to-End: Capture, Analysis, and Findings"
      date="March 14, 2026"
      readingTime="10 min read"
    >
      <Paragraph>
        We wanted a timing workflow that was reproducible, scriptable, and trustworthy. The key requirement was simple: the benchmark harness should write timing artifacts directly, instead of relying on manual copy steps.
      </Paragraph>

      <Paragraph>
        This post walks through the exact process we implemented for Reforge: how we captured raw outputs from real benchmark runs, how we generated a single analysis document, and what the data showed for <InlineCode>guard()</InlineCode>, <InlineCode>forge()</InlineCode>, provider tests, and typechecks.
      </Paragraph>

      <Heading>Goal and Constraints</Heading>

      <Paragraph>
        The benchmark process had four constraints:
      </Paragraph>

      <ul className="list-disc space-y-2 pl-6">
        <li>The benchmark harness must run the real commands end-to-end.</li>
        <li>Raw outputs must be written directly to files by the benchmark runner.</li>
        <li>Analysis must be generated from those files in one canonical location.</li>
        <li>The workflow should be deterministic and auditable.</li>
      </ul>

      <Heading>Step 1: Build a File-Writing Timing Runner</Heading>

      <Paragraph>
        We added a dedicated runner in the benchmark harness that executes the real scripts and writes outputs into timing artifacts. This made the run reproducible and auditable.
      </Paragraph>

      <BlogCodeBlock code={runnerScript} />

      <Paragraph>
        Each output file includes metadata headers for command, start time, end time, and exit code. That metadata is important for traceability and for validating that all stages completed successfully.
      </Paragraph>

      <Heading>Step 2: Generate One Consolidated Findings Document</Heading>

      <Paragraph>
        We then added an analysis script that parses the generated artifacts and writes a single markdown report. It computes timing statistics from <InlineCode>guard()</InlineCode> samples and extracts behavioral indicators from forge/provider runs.
      </Paragraph>

      <BlogCodeBlock code={analysisLogic} />

      <Paragraph>
        The generated report is written to the benchmark artifacts folder, and the report header includes the current run date.
      </Paragraph>

      <Heading>Step 3: Run and Inspect the Results</Heading>

      <Paragraph>
        The benchmark run produced fresh artifacts and this summary:
      </Paragraph>

      <BlogCodeBlock code={keyResults} lang="text" />

      <Heading>Findings</Heading>

      <SubHeading>1) guard() stayed within its performance target</SubHeading>
      <Paragraph>
        Across 11 exhaustive local scenarios, every sample remained under 5ms, with a measured max of 2.3375ms and average of 0.5645ms. This is consistent with the intended low-latency local repair design.
      </Paragraph>

      <SubHeading>2) Native repair is doing meaningful work</SubHeading>
      <Paragraph>
        Status distribution showed <InlineCode>repaired_natively</InlineCode> dominating success cases. That means common formatting faults are being fixed locally before any network retry is needed.
      </Paragraph>

      <SubHeading>3) forge() behavior matched expectations</SubHeading>
      <Paragraph>
        The run observed a live success path, retry callbacks, and deterministic provider fallback success. That confirms the orchestration layer is exercising both happy-path and resilience-path behaviors.
      </Paragraph>

      <SubHeading>4) Network latency dominates total forge time</SubHeading>
      <Paragraph>
        The forge report showed guard-stage durations in low milliseconds (0.1147ms to 1.2038ms), while total attempt durations reached tens of seconds in retry-heavy scenarios. The bottleneck is provider/network time, not local validation/repair.
      </Paragraph>

      <Heading>What This Changes Practically</Heading>

      <Paragraph>
        Before this workflow, timing evidence depended on ad-hoc command runs and manual capture. Now, we have a repeatable benchmark pipeline with source-generated artifacts and one report location for interpretation.
      </Paragraph>

      <Paragraph>
        This makes performance conversations easier: if a change claims to improve reliability or speed, we can compare benchmark artifacts and reason from generated evidence.
      </Paragraph>

      <Heading>Conclusion</Heading>

      <Paragraph>
        The benchmark process now produces source-generated artifacts, consolidated analysis, and a stable evidence trail for performance decisions. The measured data confirms the core technical claim: <InlineCode>guard()</InlineCode> remains low-latency in exhaustive local scenarios, while end-to-end <InlineCode>forge()</InlineCode> timing is primarily shaped by provider and network behavior rather than local repair overhead.
      </Paragraph>
    </BlogLayout>
  )
}
