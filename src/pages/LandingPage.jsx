import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Github,
  Terminal,
  GitBranch,
  GitPullRequest,
  Search,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Layers,
  Compass,
  Code2,
  BookOpen,
  ChevronRight,
  Copy,
  Check,
  ExternalLink,
  Zap,
  Play,
  Star,
  Activity,
  FileCode,
  FolderTree,
  Scale,
  Menu,
  X,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  ArrowUpRight,
  Flame,
  CheckCheck,
  HelpCircle,
  Share2
} from 'lucide-react';

// Sample repositories for quick-select
const POPULAR_REPOS = [
  { name: 'facebook/react', stars: '228k', label: 'React Core' },
  { name: 'vercel/next.js', stars: '124k', label: 'Next.js App Router' },
  { name: 'tailwindlabs/tailwindcss', stars: '82k', label: 'Tailwind CSS' },
  { name: 'shadcn/ui', stars: '71k', label: 'UI Components' },
  { name: 'astral-sh/uv', stars: '39k', label: 'Python Package Manager' },
];

// Demo issue scenarios for interactive simulation
const DEMO_SCENARIOS = [
  {
    id: 'memory-leak',
    title: 'Issue #28419: Memory leak in Fiber reconciler unmount hook',
    repo: 'facebook/react',
    file: 'packages/react-reconciler/ReactFiberWorkLoop.new.js',
    lines: 'L418-L432',
    issueSummary: 'Component unmount leaves event listeners and pending subscriptions un-collected in concurrent mode.',
    rootCause: 'commitPassiveUnmountEffects does not verify if fiber node has unmounted before invoking cleanup hook.',
    astEvidence: 'AST node: FunctionDeclaration(commitPassiveUnmountEffects) -> CallExpression(destroy)',
    snippet: `// packages/react-reconciler/ReactFiberWorkLoop.new.js#L418
function commitPassiveUnmountEffects(fiber) {
-  if (fiber.flags & PassiveUnmountMask) {
-    effect.destroy();
+  if (fiber.flags & PassiveUnmountMask && !fiber.isDetached) {
+    safelyCallDestroyHook(fiber, effect.destroy);
+    fiber.flags &= ~PassiveUnmountMask;
   }
}`,
    arenaRanking: [
      { model: 'RepoMind Consensus', score: '99.4%', status: 'Best Verified Patch', astGrounded: true },
      { model: 'Claude 3.7 Sonnet', score: '98.1%', status: 'AST Symbol Match', astGrounded: true },
      { model: 'DeepSeek-R1', score: '97.6%', status: 'Detailed Reasoning', astGrounded: true },
      { model: 'GPT-4o', score: '94.2%', status: 'Partial AST Citation', astGrounded: true },
    ]
  },
  {
    id: 'hydration-mismatch',
    title: 'Issue #62190: Hydration mismatch with dynamic browser storage',
    repo: 'vercel/next.js',
    file: 'packages/next/client/components/react-dev-overlay/client.tsx',
    lines: 'L184-L198',
    issueSummary: 'Server HTML and Client DOM divergence during initial SSR render phase throws unhandled hydration error.',
    rootCause: 'Direct window.sessionStorage access in render body before useEffect layout initialization.',
    astEvidence: 'AST node: MemberExpression(window.sessionStorage) inside Component render block',
    snippet: `// packages/next/client/components/client.tsx#L184
- const cachedState = window.sessionStorage.getItem('next_state');
+ const [cachedState, setCachedState] = useState(null);
+ useEffect(() => {
+   setCachedState(window.sessionStorage.getItem('next_state'));
+ }, []);`,
    arenaRanking: [
      { model: 'RepoMind Consensus', score: '99.8%', status: 'Zero SSR Divergence', astGrounded: true },
      { model: 'Claude 3.7 Sonnet', score: '97.9%', status: 'Verified Hook Pattern', astGrounded: true },
      { model: 'DeepSeek-R1', score: '96.8%', status: 'High Confidence Proof', astGrounded: true },
      { model: 'GPT-4o', score: '95.0%', status: 'Standard Solution', astGrounded: true },
    ]
  },
  {
    id: 'tailwind-calc',
    title: 'Issue #14022: Arbitrary calc() value bracket nesting parser crash',
    repo: 'tailwindlabs/tailwindcss',
    file: 'src/util/parseBoxShadowValue.js',
    lines: 'L82-L96',
    issueSummary: 'Nested parentheses inside arbitrary property calc(100vh - (var(--nav) * 2)) fails lexer tokenizer.',
    rootCause: 'RegExp greedy lookahead consumes inner closing parenthesis before evaluating balanced brackets.',
    astEvidence: 'AST node: RegExpLiteral(/\\((?:[^)(]+|\\((?:[^)(]+|\\([^)(]*\\))*\\))*\\)/g)',
    snippet: `// src/util/parseBoxShadowValue.js#L82
- const match = input.match(/\\(([^)]+)\\)/);
+ const match = balancedParenthesesRegex(input);
+ if (!match) return fallbackTokenize(input);`,
    arenaRanking: [
      { model: 'RepoMind Consensus', score: '99.1%', status: 'AST Regex Validated', astGrounded: true },
      { model: 'Claude 3.7 Sonnet', score: '98.4%', status: 'Balanced Tree AST', astGrounded: true },
      { model: 'DeepSeek-R1', score: '97.2%', status: 'Grammar Proof Verified', astGrounded: true },
      { model: 'GPT-4o', score: '93.5%', status: 'Greedy Regex Caution', astGrounded: false },
    ]
  }
];

export default function LandingPage({ onLaunchWorkspace }) {
  // Hero URL Input & Analysis State
  const [repoUrl, setRepoUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStep, setAnalysisStep] = useState('');
  const [analysisCompleted, setAnalysisCompleted] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);

  // Active scenario for interactive visual
  const [activeScenario, setActiveScenario] = useState(DEMO_SCENARIOS[0]);
  const [activeVisualTab, setActiveVisualTab] = useState('evidence'); // 'ast', 'reasoning', 'evidence'
  const [selectedArenaModel, setSelectedArenaModel] = useState('RepoMind Consensus');

  // How it works active step
  const [activeWorkflowStep, setActiveWorkflowStep] = useState(0);

  // Mentor checklist interactive state
  const [mentorTasks, setMentorTasks] = useState([
    { id: 1, text: 'Fork repository and configure sparse git clone', done: true },
    { id: 2, text: 'Isolate failing test case in Jest/Vitest runner', done: true },
    { id: 3, text: 'Apply verified AST patch to FiberWorkLoop', done: true },
    { id: 4, text: 'Execute PR Preflight Check & format commit', done: false },
  ]);

  // Preflight checker state
  const [preflightStatus, setPreflightStatus] = useState('ready'); // 'ready', 'scanning', 'passed'

  // Mobile menu open/close
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState(null);

  // Simulated analysis execution
  const handleAnalyzeRepo = (urlToAnalyze) => {
    const targetUrl = urlToAnalyze || repoUrl || 'facebook/react';
    if (!repoUrl && !urlToAnalyze) {
      setRepoUrl(targetUrl);
    }
    setIsAnalyzing(true);
    setAnalysisCompleted(false);
    setAnalysisProgress(10);
    setAnalysisStep('Connecting to GitHub repository API...');

    setTimeout(() => {
      setAnalysisProgress(35);
      setAnalysisStep('Ingesting repository AST & mapping 1,420 source files...');
    }, 600);

    setTimeout(() => {
      setAnalysisProgress(65);
      setAnalysisStep('Cross-referencing git blame & symbol call hierarchy...');
    }, 1200);

    setTimeout(() => {
      setAnalysisProgress(90);
      setAnalysisStep('Running AI Arena consensus and Trust Meter audit...');
    }, 1800);

    setTimeout(() => {
      setAnalysisProgress(100);
      setAnalysisStep('Analysis Complete! AST Knowledge Graph ready.');
      setIsAnalyzing(false);
      setAnalysisCompleted(true);
      // Scroll smoothly down to the interactive visual
      const targetElement = document.getElementById('engine-visual');
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 2400);
  };

  const handleTryDemo = () => {
    setRepoUrl('facebook/react');
    handleAnalyzeRepo('facebook/react');
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'snippet') {
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    } else if (type === 'cli') {
      setCopiedCli(true);
      setTimeout(() => setCopiedCli(false), 2000);
    }
  };

  const toggleTask = (taskId) => {
    setMentorTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t))
    );
  };

  const runPreflightAudit = () => {
    setPreflightStatus('scanning');
    setTimeout(() => {
      setPreflightStatus('passed');
    }, 1600);
  };

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden relative">
      {/* Ambient Cyber Grid Background & Radial Glow Orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #38BDF8 1px, transparent 0)`,
            backgroundSize: '36px 36px',
          }}
        />
        {/* Glow Orb 1 - Cyan Top Left */}
        <div className="absolute top-[-10%] left-[-10%] w-[650px] h-[650px] rounded-full bg-cyan-600/15 blur-[140px]" />
        {/* Glow Orb 2 - Violet Right Center */}
        <div className="absolute top-[20%] right-[-10%] w-[750px] h-[750px] rounded-full bg-violet-600/15 blur-[160px]" />
        {/* Glow Orb 3 - Deep Indigo Bottom Center */}
        <div className="absolute bottom-[5%] left-[20%] w-[700px] h-[700px] rounded-full bg-indigo-600/10 blur-[150px]" />
      </div>

      {/* =========================================================================
          1. RESPONSIVE NAVIGATION BAR
         ========================================================================= */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0B0F19]/85 border-b border-cyan-500/15 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & Brand */}
          <a href="#" className="flex items-center gap-3 group">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 via-violet-600/30 to-slate-900 border border-cyan-400/30 shadow-lg shadow-cyan-500/10 group-hover:border-cyan-400/60 transition-all duration-300">
              <Cpu className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-violet-500 rounded-full border-2 border-[#0B0F19]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                  Repo<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">Mind</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 rounded-full">
                  v2.0
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono tracking-tight">
                AI Contribution Engine
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-cyan-400 transition-colors">
              Features
            </a>
            <a href="#engine-visual" className="hover:text-cyan-400 transition-colors">
              Diagnostic Engine
            </a>
            <a href="#how-it-works" className="hover:text-cyan-400 transition-colors">
              How It Works
            </a>
            <a href="#model-arena" className="hover:text-cyan-400 transition-colors">
              Model Arena
            </a>
            <a href="#trust-meter" className="hover:text-cyan-400 transition-colors">
              Trust Meter
            </a>
            <a href="#faq" className="hover:text-cyan-400 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Nav Right Actions */}
          <div className="hidden lg:flex items-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/60 hover:border-slate-600 rounded-lg transition-all"
            >
              <Github className="w-4 h-4 text-slate-200" />
              <span>Star on GitHub</span>
              <span className="px-1.5 py-0.5 text-[10px] bg-slate-800 text-cyan-300 font-mono rounded">
                4.9k
              </span>
            </a>

            <button
              onClick={() => onLaunchWorkspace ? onLaunchWorkspace('facebook/react') : handleAnalyzeRepo('facebook/react')}
              className="relative inline-flex items-center justify-center p-0.5 overflow-hidden text-xs font-semibold rounded-lg group bg-gradient-to-br from-cyan-500 via-violet-600 to-cyan-400 group-hover:from-cyan-400 group-hover:to-violet-500 hover:shadow-lg hover:shadow-cyan-500/25 active:scale-95 transition-all"
            >
              <span className="relative px-4 py-2 transition-all ease-in duration-150 bg-[#0B0F19] rounded-[7px] group-hover:bg-opacity-0 text-white flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                Launch Workspace
              </span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-900 text-slate-300 hover:text-white border border-slate-800 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-b border-cyan-500/20 bg-[#0B0F19]/95 backdrop-blur-2xl px-6 py-6 space-y-4"
            >
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-slate-200 hover:text-cyan-400 text-base font-medium py-1"
              >
                Features
              </a>
              <a
                href="#engine-visual"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-slate-200 hover:text-cyan-400 text-base font-medium py-1"
              >
                Diagnostic Engine
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-slate-200 hover:text-cyan-400 text-base font-medium py-1"
              >
                How It Works
              </a>
              <a
                href="#model-arena"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-slate-200 hover:text-cyan-400 text-base font-medium py-1"
              >
                Model Arena
              </a>
              <a
                href="#trust-meter"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-slate-200 hover:text-cyan-400 text-base font-medium py-1"
              >
                Trust Meter
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-slate-200 hover:text-cyan-400 text-base font-medium py-1"
              >
                FAQ
              </a>
              <div className="pt-4 border-t border-slate-800 flex flex-col gap-3">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleAnalyzeRepo('facebook/react');
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
                >
                  <Sparkles className="w-4 h-4" />
                  Analyze Sample Repository
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="relative z-10">
        {/* =========================================================================
            2. HERO SECTION
           ========================================================================= */}
        <section className="relative pt-16 pb-20 md:pt-24 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
          {/* Top Pill / Badge */}
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/30 text-xs text-slate-300 mb-8 shadow-xl shadow-cyan-950/40 backdrop-blur-md"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
            </span>
            <span className="font-semibold text-cyan-400">RepoMind 2.0</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300">Multi-LLM AST Consensus Engine</span>
            <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
          </motion.div>

          {/* Exact Hero Tagline as Specified */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-4 max-w-4xl mx-auto"
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] text-white">
              Understand the Code.{' '}
              <span className="block mt-1 sm:mt-2 text-slate-200">
                Trust the Answer.
              </span>
              <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 drop-shadow-sm">
                Make Your First Contribution.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-base sm:text-lg md:text-xl text-slate-400 max-w-3xl mx-auto font-normal leading-relaxed">
              The AI-powered open-source assistant that eliminates codebase anxiety.
              Map AST call graphs, cross-examine frontier models in the AI Arena,
              verify zero-hallucination source evidence with the Trust Meter, and ship PRs with maintainer-ready confidence.
            </p>
          </motion.div>

          {/* GitHub Repository URL Input Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-10 max-w-3xl mx-auto"
          >
            <div className="relative p-2 rounded-2xl bg-gradient-to-r from-cyan-500/25 via-violet-500/25 to-cyan-500/25 border border-cyan-500/30 shadow-2xl shadow-cyan-950/60 backdrop-blur-xl">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAnalyzeRepo();
                }}
                className="flex flex-col sm:flex-row items-center gap-2.5 bg-[#0F172A] rounded-xl p-2"
              >
                {/* Input with GitHub Icon */}
                <div className="relative flex-1 w-full flex items-center">
                  <div className="absolute left-3.5 pointer-events-none text-slate-400">
                    <Github className="w-5 h-5 text-cyan-400" />
                  </div>
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/facebook/react or owner/repo..."
                    className="w-full pl-11 pr-4 py-3 bg-transparent text-sm md:text-base text-white placeholder-slate-500 focus:outline-none focus:ring-0 rounded-lg"
                    aria-label="GitHub repository URL"
                  />
                  {repoUrl && (
                    <button
                      type="button"
                      onClick={() => setRepoUrl('')}
                      className="p-1 text-slate-400 hover:text-white mr-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* CTAs */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* Primary CTA: Analyze Repository */}
                  <button
                    type="submit"
                    disabled={isAnalyzing}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-semibold text-sm transition-all shadow-lg shadow-cyan-500/30 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-cyan-200" />
                        <span>Analyzing AST...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-cyan-200" />
                        <span>Analyze Repository</span>
                      </>
                    )}
                  </button>

                  {/* Secondary CTA: Try Demo */}
                  <button
                    type="button"
                    onClick={handleTryDemo}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 font-medium text-sm transition-all active:scale-95 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/20" />
                    <span>Try Demo</span>
                  </button>
                </div>
              </form>

              {/* Quick Select Repo Chips */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 px-2 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
                <span className="flex items-center gap-1.5 font-medium text-slate-400">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  Quick Try:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {POPULAR_REPOS.map((repo) => (
                    <button
                      key={repo.name}
                      type="button"
                      onClick={() => {
                        setRepoUrl(repo.name);
                        handleAnalyzeRepo(repo.name);
                      }}
                      className="px-2.5 py-1 rounded-md bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/30 transition-all font-mono text-[11px]"
                    >
                      {repo.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Scanning Simulation Bar */}
            <AnimatePresence>
              {isAnalyzing && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 p-4 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-left shadow-xl"
                >
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="flex items-center gap-2 text-cyan-300 font-mono">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                      {analysisStep}
                    </span>
                    <span className="font-mono text-slate-400">{analysisProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${analysisProgress}%` }}
                      transition={{ ease: 'easeInOut' }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {analysisCompleted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-4 p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-xs text-cyan-200 flex items-center justify-between font-mono"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  <span>
                    Indexed <strong>{repoUrl || 'facebook/react'}</strong>: 1,420 files, 4,890 AST symbols, 0 hallucinations detected.
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {onLaunchWorkspace && (
                    <button
                      onClick={() => onLaunchWorkspace(repoUrl || 'facebook/react')}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-[#0B0F19] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Open Copilot
                    </button>
                  )}
                  <a
                    href="#engine-visual"
                    className="text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    View Engine <ChevronDown className="w-3 h-3" />
                  </a>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Social Proof & Trust Metrics Bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mt-14 pt-8 border-t border-slate-800/80 max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center"
          >
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-200 font-mono">
                14,800+
              </div>
              <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">
                Repos Mapped
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-300 font-mono">
                99.8%
              </div>
              <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">
                AST Ground Truth
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400 font-mono">
                &lt; 2.4s
              </div>
              <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">
                AST Ingestion Speed
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-300 font-mono">
                42,000+
              </div>
              <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">
                PRs Merged
              </div>
            </div>
          </motion.div>
        </section>

        {/* =========================================================================
            3. ATTRACTIVE ANIMATED VISUAL: REPO ANALYSIS, AI REASONING & SOURCE EVIDENCE
           ========================================================================= */}
        <section
          id="engine-visual"
          className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative scroll-mt-24"
        >
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-950/60 border border-violet-500/30 text-xs font-semibold text-violet-300 mb-3">
              <Zap className="w-3.5 h-3.5 text-violet-400" />
              Live Diagnostic Engine
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              From Raw GitHub Issue to{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">
                Verified Source Proof
              </span>
            </h2>
            <p className="mt-3 text-slate-400 text-sm sm:text-base">
              Experience the 3-stage intelligence loop: AST graph parsing, multi-model consensus debate, and the zero-hallucination source citation.
            </p>

            {/* Interactive Issue Scenario Picker */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs text-slate-500 font-mono mr-1">Switch Scenario:</span>
              {DEMO_SCENARIOS.map((scenario) => (
                <button
                  key={scenario.id}
                  onClick={() => setActiveScenario(scenario)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeScenario.id === scenario.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-md shadow-cyan-500/10'
                      : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {scenario.title.split(':')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Cockpit Container */}
          <div className="rounded-2xl border border-cyan-500/30 bg-[#0F172A]/90 backdrop-blur-xl shadow-2xl shadow-cyan-950/50 overflow-hidden">
            {/* Cockpit Window Top Bar */}
            <div className="flex flex-wrap items-center justify-between px-5 py-3.5 bg-slate-950/80 border-b border-slate-800 gap-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="ml-3 font-mono text-xs text-slate-400 flex items-center gap-1.5">
                  <Github className="w-3.5 h-3.5 text-cyan-400" />
                  {activeScenario.repo} — {activeScenario.title.split(':')[0]}
                </span>
              </div>

              {/* View Tabs */}
              <div className="flex items-center bg-slate-900 rounded-lg p-1 border border-slate-800 text-xs">
                <button
                  onClick={() => setActiveVisualTab('ast')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all ${
                    activeVisualTab === 'ast'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FolderTree className="w-3.5 h-3.5" />
                  1. AST Analysis
                </button>
                <button
                  onClick={() => setActiveVisualTab('reasoning')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all ${
                    activeVisualTab === 'reasoning'
                      ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  2. AI Reasoning Arena
                </button>
                <button
                  onClick={() => setActiveVisualTab('evidence')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all ${
                    activeVisualTab === 'evidence'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  3. Source Evidence & Diff
                </button>
              </div>
            </div>

            {/* Cockpit Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
              {/* Left Column: Repository & AST Context (4 Cols) */}
              <div className="lg:col-span-4 p-5 border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-950/40 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Issue Badge */}
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Reported Issue
                    </span>
                    <h3 className="text-sm font-semibold text-white mt-1.5 leading-snug">
                      {activeScenario.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {activeScenario.issueSummary}
                    </p>
                  </div>

                  {/* AST Dependency Graph Ingestion Widget */}
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium flex items-center gap-1.5">
                        <FolderTree className="w-3.5 h-3.5 text-cyan-400" />
                        AST Graph Ingestion
                      </span>
                      <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/40">
                        1,420 nodes
                      </span>
                    </div>

                    <div className="space-y-1.5 font-mono text-[11px]">
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        <span>packages/react-reconciler/</span>
                      </div>
                      <div className="pl-4 flex items-center gap-2 text-cyan-300">
                        <FileCode className="w-3 h-3 text-cyan-400" />
                        <span className="truncate">{activeScenario.file.split('/').pop()}</span>
                        <span className="text-[10px] text-slate-500 ml-auto">{activeScenario.lines}</span>
                      </div>
                      <div className="pl-7 text-[10px] text-violet-300/90 truncate">
                        ↳ commitPassiveUnmountEffects()
                      </div>
                    </div>
                  </div>

                  {/* Ground Truth Trust Score */}
                  <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        Trust Meter Status
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                        99.8% Grounded
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      AST symbol verified against git commit <span className="font-mono text-cyan-300">#4f9e8a</span>. Zero hallucinations detected.
                    </p>
                  </div>
                </div>

                {/* Footer Action Inside Left Pane */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono text-[10px]">Compiler: TypeScript 5.4</span>
                  <span className="text-cyan-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> AST Validated
                  </span>
                </div>
              </div>

              {/* Center / Right Column: Active Visual Tab Content (8 Cols) */}
              <div className="lg:col-span-8 p-5 flex flex-col justify-between">
                {/* 1. AST Analysis View */}
                {activeVisualTab === 'ast' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-400" />
                        <span className="text-xs font-mono text-cyan-300 uppercase tracking-wider font-semibold">
                          Abstract Syntax Tree (AST) Call Graph Inspector
                        </span>
                      </div>
                      <span className="text-xs font-mono text-slate-400">Depth: 4 Levels</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-3 overflow-x-auto">
                      <div className="text-slate-400">
                        <span className="text-violet-400">AST Root:</span> Program
                      </div>
                      <div className="pl-3 border-l-2 border-cyan-500/30 space-y-2 text-slate-300">
                        <div>
                          ↳ <span className="text-cyan-400">ExportNamedDeclaration</span>: commitPassiveMountEffects
                        </div>
                        <div className="pl-3 border-l-2 border-violet-500/30 text-slate-200">
                          ↳ <span className="text-fuchsia-400">FunctionDeclaration</span>: commitPassiveUnmountEffects
                          <span className="ml-2 text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                            CULPRIT NODE
                          </span>
                          <div className="mt-1 pl-3 text-slate-400 text-[11px] space-y-1">
                            <div>• Params: [fiber: FiberNode]</div>
                            <div>• Flag check: `fiber.flags & PassiveUnmountMask`</div>
                            <div className="text-rose-400">• Missing guard: `!fiber.isDetached` check missing</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AST Call Edge Visualizer */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                          Inbound Callers
                        </div>
                        <div className="text-xs font-mono text-cyan-300 mt-1 truncate">
                          flushPassiveEffects()
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Line 389 • Frequency: High</div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                          Culprit Symbol
                        </div>
                        <div className="text-xs font-mono text-violet-300 mt-1 truncate">
                          safelyCallDestroyHook()
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Line 424 • FiberReconciler</div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                          Side Effect Scope
                        </div>
                        <div className="text-xs font-mono text-emerald-300 mt-1 truncate">
                          PassiveUnmountMask
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Isolated • Safe to Patch</div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 2. AI Reasoning Arena View */}
                {activeVisualTab === 'reasoning' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-violet-400" />
                        <span className="text-xs font-mono text-violet-300 uppercase tracking-wider font-semibold">
                          AI Model Arena — Multi-LLM Consensus Debate
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">4 Frontier Models Queried</span>
                    </div>

                    {/* Model Selector Pills */}
                    <div className="flex flex-wrap gap-2">
                      {activeScenario.arenaRanking.map((arena) => (
                        <button
                          key={arena.model}
                          onClick={() => setSelectedArenaModel(arena.model)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 transition-all ${
                            selectedArenaModel === arena.model
                              ? 'bg-violet-600/30 text-violet-200 border border-violet-500 shadow-md'
                              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                          }`}
                        >
                          <span>{arena.model}</span>
                          <span className="text-[10px] text-cyan-400 font-bold">{arena.score}</span>
                        </button>
                      ))}
                    </div>

                    {/* Active Model Reasoning Terminal */}
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-2 text-slate-300 leading-relaxed">
                      <div className="text-slate-500 text-[11px] pb-2 border-b border-slate-900 flex justify-between">
                        <span>MODEL: {selectedArenaModel}</span>
                        <span className="text-emerald-400">Status: Verified against AST</span>
                      </div>
                      <p className="text-slate-300">
                        <span className="text-cyan-400">[Trace 01]</span> Inspected stack trace for unmount event listeners in concurrent React test harness.
                      </p>
                      <p className="text-slate-300">
                        <span className="text-violet-400">[Trace 02]</span> Traversed AST graph for <code className="text-cyan-300">commitPassiveUnmountEffects</code>.
                        Fiber flags bitwise mask retains stale memory reference when component subtree is unmounted asynchronously.
                      </p>
                      <p className="text-slate-300">
                        <span className="text-fuchsia-400">[Consensus]</span> Safe patch requires checking <code className="text-emerald-300">!fiber.isDetached</code> and clearing the <code className="text-emerald-300">PassiveUnmountMask</code> flag before invoking cleanup.
                      </p>
                      <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-2">
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                        Cross-model agreement: 98.6% • Unit test regression risk: Low (0.02%)
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 3. Source Evidence & Diff View */}
                {activeVisualTab === 'evidence' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-xs font-mono text-emerald-300 uppercase tracking-wider font-semibold">
                          Source Evidence Citation (AST Verified)
                        </span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(activeScenario.snippet, 'snippet')}
                        className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-300 transition-colors font-mono"
                      >
                        {copiedSnippet ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy Diff
                          </>
                        )}
                      </button>
                    </div>

                    {/* Code Snippet Box */}
                    <div className="relative rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs overflow-x-auto text-slate-200">
                      <div className="text-slate-500 pb-2 border-b border-slate-900 text-[11px] flex justify-between">
                        <span>{activeScenario.file}</span>
                        <span className="text-cyan-400 font-semibold">{activeScenario.lines}</span>
                      </div>
                      <pre className="mt-3 leading-relaxed whitespace-pre font-mono">
                        {activeScenario.snippet.split('\n').map((line, idx) => {
                          const isRemoved = line.startsWith('-');
                          const isAdded = line.startsWith('+');
                          return (
                            <div
                              key={idx}
                              className={`py-0.5 px-2 rounded -mx-2 ${
                                isRemoved
                                  ? 'bg-rose-950/40 text-rose-300 border-l-2 border-rose-500'
                                  : isAdded
                                  ? 'bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500'
                                  : 'text-slate-300'
                              }`}
                            >
                              {line}
                            </div>
                          );
                        })}
                      </pre>
                    </div>

                    {/* AST Grounding Signature */}
                    <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-2 font-mono text-slate-400 text-[11px]">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>AST Fingerprint: <span className="text-cyan-300">sha256:88fe41..c9</span></span>
                      </div>
                      <span className="text-[11px] text-emerald-300 font-semibold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/40">
                        100% Grounded in Codebase
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* Bottom Interactive Bar */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>Ready to test patch in your local environment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setActiveVisualTab('evidence');
                        copyToClipboard(`git apply << 'EOF'\n${activeScenario.snippet}\nEOF`, 'snippet');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/30 font-medium transition-all text-xs"
                    >
                      Export Git Patch
                    </button>
                    <a
                      href="#mentor"
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-medium transition-all text-xs flex items-center gap-1"
                    >
                      Step-by-Step Mentor <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            4. FIVE CORE FEATURE CARDS
           ========================================================================= */}
        <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-24">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-xs font-semibold text-cyan-300 mb-3">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              Engineered for Real Open-Source Impact
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Five Superpowers to Land Your{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400">
                First Pull Request
              </span>
            </h2>
            <p className="mt-3 text-slate-400 text-sm sm:text-base">
              Say goodbye to imposter syndrome, undocumented mono-repos, and rejected contributions.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. Issue-to-Code Navigator */}
            <motion.div
              whileHover={{ y: -5 }}
              transition={{ duration: 0.2 }}
              className="relative p-6 rounded-2xl bg-gradient-to-b from-slate-900/90 to-[#0F172A]/90 border border-slate-800 hover:border-cyan-500/50 shadow-xl hover:shadow-cyan-500/10 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 group-hover:bg-cyan-500/20 transition-all">
                    <Compass className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider bg-cyan-950/80 text-cyan-300 rounded-full border border-cyan-500/30">
                    AST Pinpointer
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                  Issue-to-Code Navigator
                </h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Connect GitHub issue descriptions or bug reports straight to the exact files, classes, and lines of code responsible. No more wandering across 500k-line codebases blindly.
                </p>
              </div>

              {/* Card Mini Graphic */}
              <div className="mt-6 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 font-mono text-[11px] space-y-1.5">
                <div className="text-slate-400 flex items-center justify-between">
                  <span>Query: "Race condition in router"</span>
                  <span className="text-cyan-400">12ms</span>
                </div>
                <div className="text-cyan-300 flex items-center gap-1">
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                  <span>next/client/router.ts#L342</span>
                </div>
              </div>
            </motion.div>

            {/* 2. AI Model Arena */}
            <motion.div
              id="model-arena"
              whileHover={{ y: -5 }}
              transition={{ duration: 0.2 }}
              className="relative p-6 rounded-2xl bg-gradient-to-b from-slate-900/90 to-[#0F172A]/90 border border-slate-800 hover:border-violet-500/50 shadow-xl hover:shadow-violet-500/10 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 group-hover:scale-110 group-hover:bg-violet-500/20 transition-all">
                    <Scale className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider bg-violet-950/80 text-violet-300 rounded-full border border-violet-500/30">
                    Multi-LLM Consensus
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white group-hover:text-violet-300 transition-colors">
                  AI Model Arena
                </h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Pit Claude 3.7 Sonnet, GPT-4o, and DeepSeek-R1 head-to-head. RepoMind scores model proposals against repository AST semantics and synthesizes the winning patch.
                </p>
              </div>

              {/* Card Mini Graphic */}
              <div className="mt-6 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 font-mono text-[11px] space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Claude 3.7 Sonnet</span>
                  <span className="text-emerald-400 font-bold">98.1% AST Precision</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>DeepSeek-R1</span>
                  <span className="text-cyan-400 font-bold">97.6% Reasoning Depth</span>
                </div>
              </div>
            </motion.div>

            {/* 3. Trust Meter */}
            <motion.div
              id="trust-meter"
              whileHover={{ y: -5 }}
              transition={{ duration: 0.2 }}
              className="relative p-6 rounded-2xl bg-gradient-to-b from-slate-900/90 to-[#0F172A]/90 border border-slate-800 hover:border-emerald-500/50 shadow-xl hover:shadow-emerald-500/10 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider bg-emerald-950/80 text-emerald-300 rounded-full border border-emerald-500/30">
                    Zero Hallucination
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Trust Meter
                </h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Never be duped by plausible-sounding hallucinations. Every explanation is bound to verified AST source lines, git blame, and compiler symbol tables with cryptographic proofs.
                </p>
              </div>

              {/* Card Mini Graphic */}
              <div className="mt-6 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 font-mono text-[11px] space-y-1">
                <div className="flex items-center justify-between text-emerald-300">
                  <span>AST Proof Verification</span>
                  <span className="font-bold">99.8% Grounded</span>
                </div>
                <div className="text-slate-500 text-[10px]">
                  ✓ Symbol exists in main • ✓ Test coverage confirmed
                </div>
              </div>
            </motion.div>

            {/* 4. First-Contribution Mentor */}
            <motion.div
              id="mentor"
              whileHover={{ y: -5 }}
              transition={{ duration: 0.2 }}
              className="relative p-6 rounded-2xl bg-gradient-to-b from-slate-900/90 to-[#0F172A]/90 border border-slate-800 hover:border-cyan-500/50 shadow-xl hover:shadow-cyan-500/10 transition-all flex flex-col justify-between group md:col-span-1 lg:col-span-2"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 group-hover:bg-cyan-500/20 transition-all">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider bg-cyan-950/80 text-cyan-300 rounded-full border border-cyan-500/30">
                    Beginner to Hero
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                  First-Contribution Mentor
                </h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Tailored onboarding paths for unfamiliar repositories. Translates dense <code className="text-cyan-300 font-mono text-xs">CONTRIBUTING.md</code> files into actionable copy-paste CLI commands, isolated test runners, and a step-by-step reproduction path.
                </p>
              </div>

              {/* Interactive Checklist Inside Mentor Card */}
              <div className="mt-6 p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
                <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Interactive Mentor Roadmap:</span>
                  <span className="text-[11px] font-mono text-cyan-400">
                    {mentorTasks.filter((t) => t.done).length} / {mentorTasks.length} Completed
                  </span>
                </div>
                <div className="space-y-1.5">
                  {mentorTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => toggleTask(task.id)}
                      className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer hover:text-white transition-colors p-1 rounded hover:bg-slate-900"
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                          task.done
                            ? 'bg-cyan-500 border-cyan-400 text-[#0B0F19]'
                            : 'border-slate-600 bg-transparent'
                        }`}
                      >
                        {task.done && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className={task.done ? 'line-through text-slate-500' : ''}>
                        {task.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* 5. PR Preflight Checker */}
            <motion.div
              whileHover={{ y: -5 }}
              transition={{ duration: 0.2 }}
              className="relative p-6 rounded-2xl bg-gradient-to-b from-slate-900/90 to-[#0F172A]/90 border border-slate-800 hover:border-violet-500/50 shadow-xl hover:shadow-violet-500/10 transition-all flex flex-col justify-between group md:col-span-1 lg:col-span-1"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 group-hover:scale-110 group-hover:bg-violet-500/20 transition-all">
                    <GitPullRequest className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider bg-violet-950/80 text-violet-300 rounded-full border border-violet-500/30">
                    CI Green Pass
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white group-hover:text-violet-300 transition-colors">
                  PR Preflight Checker
                </h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Simulates maintainer CI rules before you open the PR. Audits commit message formatting, lint rules, test coverage deltas, and auto-drafts clean PR descriptions.
                </p>
              </div>

              {/* Preflight Interactive Runner */}
              <div className="mt-6 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 font-mono text-[11px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">CI Preflight Audit</span>
                  <button
                    onClick={runPreflightAudit}
                    className="text-[10px] text-cyan-300 hover:text-cyan-200 underline cursor-pointer"
                  >
                    Run Checks
                  </button>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-emerald-400">
                    <span>• Linter & Types:</span>
                    <span>{preflightStatus === 'scanning' ? 'Auditing...' : 'PASSED'}</span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-400">
                    <span>• Commit Convention:</span>
                    <span>{preflightStatus === 'scanning' ? 'Auditing...' : 'feat(fiber)'}</span>
                  </div>
                  <div className="flex items-center justify-between text-cyan-400">
                    <span>• Test Suite Delta:</span>
                    <span>{preflightStatus === 'scanning' ? 'Running...' : '+2 Tests Added'}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* =========================================================================
            5. HOW IT WORKS SECTION (WORKFLOW)
           ========================================================================= */}
        <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-24">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-950/60 border border-violet-500/30 text-xs font-semibold text-violet-300 mb-3">
              <Activity className="w-3.5 h-3.5 text-violet-400" />
              Seamless 4-Step Contribution Flow
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              How RepoMind Works
            </h2>
            <p className="mt-3 text-slate-400 text-sm sm:text-base">
              From pasting a repository link to seeing your pull request merged into main.
            </p>
          </div>

          {/* Stepped Workflow Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Steps Navigation (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              {[
                {
                  step: '01',
                  title: 'Connect & Ingest AST',
                  description:
                    'Paste any GitHub URL or select a popular repository. RepoMind parses AST code trees, extracts functions, builds symbol dependency graphs, and indexes commit metadata in under 3 seconds.',
                  icon: GitBranch,
                },
                {
                  step: '02',
                  title: 'Isolate Issue & Call Graph',
                  description:
                    'Select a reported issue or enter your bug description. The Issue-to-Code Navigator queries AST nodes to identify exact culprit files and upstream/downstream callers.',
                  icon: Compass,
                },
                {
                  step: '03',
                  title: 'Consensus & Trust Meter Audit',
                  description:
                    'Frontier models debate fixes in the AI Model Arena. The Trust Meter validates every line of code against AST symbols and test files, blocking any invented APIs or hallucinations.',
                  icon: ShieldCheck,
                },
                {
                  step: '04',
                  title: 'Preflight & Ship Pull Request',
                  description:
                    'Run automated CI preflight checks, generate a maintainer-ready PR description with reproduction steps, and submit your contribution with total peace of mind.',
                  icon: GitPullRequest,
                },
              ].map((item, index) => {
                const IconComponent = item.icon;
                const isActive = activeWorkflowStep === index;
                return (
                  <div
                    key={item.step}
                    onClick={() => setActiveWorkflowStep(index)}
                    className={`p-5 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-slate-900 to-[#131B2E] border-cyan-500/50 shadow-xl shadow-cyan-950/30'
                        : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0 transition-colors ${
                          isActive
                            ? 'bg-cyan-500 text-[#0B0F19]'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.step}
                      </div>
                      <div>
                        <h4
                          className={`text-base font-bold flex items-center gap-2 ${
                            isActive ? 'text-white' : 'text-slate-300'
                          }`}
                        >
                          <IconComponent
                            className={`w-4 h-4 ${
                              isActive ? 'text-cyan-400' : 'text-slate-500'
                            }`}
                          />
                          {item.title}
                        </h4>
                        <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stepped Interactive Preview Screen (7 cols) */}
            <div className="lg:col-span-7">
              <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-[#0F172A] border border-cyan-500/30 shadow-2xl shadow-cyan-950/60 min-h-[380px] flex flex-col justify-between">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="font-mono text-slate-300">
                      Step 0{activeWorkflowStep + 1} Interactive Simulation
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-cyan-400">
                    Status: Active Pipeline
                  </span>
                </div>

                <div className="py-6">
                  {activeWorkflowStep === 0 && (
                    <div className="space-y-4 font-mono text-xs">
                      <div className="text-cyan-300">$ repomind clone --ast https://github.com/facebook/react</div>
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-slate-300">
                        <div className="text-emerald-400">✓ Ingested 1,420 source files in 1.84s</div>
                        <div className="text-violet-300">✓ Parsed 4,890 AST nodes into symbol knowledge graph</div>
                        <div className="text-cyan-400">✓ Indexed git commit history & blame metadata</div>
                        <div className="text-slate-400">✓ Ready for natural language or issue search</div>
                      </div>
                    </div>
                  )}

                  {activeWorkflowStep === 1 && (
                    <div className="space-y-4 font-mono text-xs">
                      <div className="text-violet-300">
                        $ repomind locate --issue "Memory leak in fiber reconciler unmount hook"
                      </div>
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-slate-300">
                        <div className="text-rose-400">
                          ↳ Culprit detected: packages/react-reconciler/ReactFiberWorkLoop.new.js#L418
                        </div>
                        <div className="text-slate-400">
                          ↳ Call chain: flushPassiveEffects() → commitPassiveUnmountEffects()
                        </div>
                        <div className="text-cyan-400">
                          ↳ Affected test suites: ReactFiberWorkLoop-test.internal.js
                        </div>
                      </div>
                    </div>
                  )}

                  {activeWorkflowStep === 2 && (
                    <div className="space-y-4 font-mono text-xs">
                      <div className="text-emerald-300">
                        $ repomind arena --consensus --audit-trust
                      </div>
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-slate-300">
                        <div className="flex justify-between text-slate-300">
                          <span>• Claude 3.7 Sonnet:</span>
                          <span className="text-emerald-400">98.1% Grounded</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>• DeepSeek-R1:</span>
                          <span className="text-cyan-400">97.6% Grounded</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>• GPT-4o:</span>
                          <span className="text-violet-400">94.2% Grounded</span>
                        </div>
                        <div className="pt-2 border-t border-slate-800 text-emerald-300 font-bold">
                          ✓ Consensus Winner: RepoMind AST-Verified Patch (99.4%)
                        </div>
                      </div>
                    </div>
                  )}

                  {activeWorkflowStep === 3 && (
                    <div className="space-y-4 font-mono text-xs">
                      <div className="text-cyan-300">$ repomind preflight --create-pr</div>
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-slate-300">
                        <div className="text-emerald-400">✓ Conventional commit: fix(fiber): prevent unmount listener leak</div>
                        <div className="text-emerald-400">✓ Unit tests passed: 418 passed, 0 failed</div>
                        <div className="text-emerald-400">✓ Formatted maintainer description with reproduction script</div>
                        <div className="text-cyan-300 font-bold">🚀 Pull Request Ready for Review!</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>Interactive Pipeline Demo</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveWorkflowStep((prev) => (prev > 0 ? prev - 1 : 3))}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setActiveWorkflowStep((prev) => (prev < 3 ? prev + 1 : 0))}
                      className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
                    >
                      Next Step
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            6. CLI SPEED RUN BANNER
           ========================================================================= */}
        <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <div className="relative p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-slate-950 via-[#0E1526] to-slate-950 border border-cyan-500/30 shadow-2xl shadow-cyan-950/40 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 text-[11px] font-mono">
                <Terminal className="w-3.5 h-3.5" />
                Developer CLI
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                Prefer the Terminal?
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md">
                Run the RepoMind AST scanner and AI Arena directly in your terminal with zero global installation.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2 w-full md:w-auto">
              <span className="text-cyan-400 font-mono text-xs sm:text-sm pl-2">
                $ npx repomind@latest analyze
              </span>
              <button
                onClick={() => copyToClipboard('npx repomind@latest analyze', 'cli')}
                className="ml-auto px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {copiedCli ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* =========================================================================
            7. DEVELOPER TESTIMONIALS / COMMUNITY ENDORSEMENTS
           ========================================================================= */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-xs font-semibold text-cyan-300 mb-3">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
              Loved by Open-Source Builders
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              From Hesitant Contributor to Merged Maintainer
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote:
                  'RepoMind helped me land my first merged PR to Next.js in under 45 minutes. The Trust Meter saved me from three hallucinated API calls that ChatGPT suggested.',
                name: 'Elena Rostova',
                role: 'Frontend Engineer @ Monolith',
                repo: 'Contributed to next.js',
                avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80',
              },
              {
                quote:
                  'As a maintainer of a 15k-star repo, PRs created with RepoMind are night and day. Preflight checks mean CI passes on the first run, and the commit messages are clean.',
                name: 'Marcus Chen',
                role: 'Open-Source Maintainer',
                repo: 'Maintainer of Tailwind plugin ecosystem',
                avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80',
              },
              {
                quote:
                  'The AI Model Arena is phenomenal. Watching Claude and DeepSeek debate the fix before producing a verified AST patch gave me total confidence in my code review.',
                name: 'Devin Thorne',
                role: 'Systems Developer',
                repo: 'Contributed to astral-sh/uv',
                avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80',
              },
            ].map((t, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-gradient-to-b from-slate-900/80 to-[#0F172A]/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed italic">
                    "{t.quote}"
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center gap-3">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="w-10 h-10 rounded-full object-cover border border-cyan-500/40"
                  />
                  <div>
                    <div className="text-sm font-bold text-white">{t.name}</div>
                    <div className="text-xs text-slate-400">{t.role}</div>
                    <div className="text-[10px] text-cyan-400 font-mono">{t.repo}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================================
            8. FREQUENTLY ASKED QUESTIONS (ACCORDION)
           ========================================================================= */}
        <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto scroll-mt-24">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-950/60 border border-violet-500/30 text-xs font-semibold text-violet-300 mb-3">
              <HelpCircle className="w-3.5 h-3.5 text-violet-400" />
              Got Questions?
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: 'How does RepoMind guarantee zero hallucinations in source citations?',
                a: 'Unlike generic AI chat tools, RepoMind constructs an Abstract Syntax Tree (AST) and symbol call graph of the target repository. Every file path, class definition, function call, and line citation is cross-examined against compiler symbol tables and git commit hashes. If a symbol does not exist in the AST, the assertion is blocked.',
              },
              {
                q: 'Do I need to clone the repository onto my local machine to use RepoMind?',
                a: 'No! You can analyze any public GitHub repository instantly via the web interface. If you decide to apply the fix, RepoMind generates a copyable git patch and a minimal sparse-checkout command so you only download the relevant sub-folder.',
              },
              {
                q: 'What makes the AI Model Arena better than using a single model?',
                a: 'Different models excel at different coding tasks: Claude 3.7 Sonnet is world-class at AST syntax precision, DeepSeek-R1 excels at algorithmic reasoning, and GPT-4o is rapid at idiomatic idioms. The Arena runs them in parallel, compares proposals against repo test suites, and synthesizes an optimal patch.',
              },
              {
                q: 'Can RepoMind be used on private enterprise GitHub repositories?',
                a: 'Yes. With RepoMind Enterprise, you can connect your private GitHub organizations via our secure OAuth application. All code indexing runs locally or within your VPC, with SOC2 compliance and zero data retention for model training.',
              },
              {
                q: 'Which programming languages and frameworks are currently supported?',
                a: 'RepoMind currently provides full AST deep-indexing for TypeScript, JavaScript, Python, Go, Rust, Java, C++, and PHP. Additional language grammars are released bi-weekly.',
              },
            ].map((faq, index) => (
              <div
                key={index}
                className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between text-sm sm:text-base font-semibold text-slate-200 hover:text-white transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-cyan-400 transition-transform duration-200 ${
                      openFaq === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {openFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="px-5 pb-4 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================================
            9. CALL TO ACTION (CTA) HERO BANNER
           ========================================================================= */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-[#10172A] to-[#151D36] border border-cyan-500/40 p-8 sm:p-14 text-center shadow-2xl shadow-cyan-950/80">
            {/* Glowing Accent Orbs */}
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-cyan-500/15 blur-[90px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-violet-600/15 blur-[90px] pointer-events-none" />

            <div className="relative z-10 max-w-3xl mx-auto space-y-6">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/60 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                Zero Setup • 100% Free for Open Source
              </span>

              <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Ready to Land Your First{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400">
                  Merged Open-Source PR?
                </span>
              </h2>

              <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
                Join over 42,000 developers contributing with zero guesswork. Paste any repository link and get verified AST guidance in seconds.
              </p>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-bold text-sm shadow-xl shadow-cyan-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  Analyze a Repository Now
                </button>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-semibold text-sm transition-all flex items-center justify-center gap-2"
                >
                  <Github className="w-4 h-4" />
                  Star on GitHub
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* =========================================================================
          10. RESPONSIVE FOOTER
         ========================================================================= */}
      <footer className="border-t border-slate-800 bg-slate-950/80 backdrop-blur-xl relative z-10 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            {/* Col 1 & 2: Brand & Mission */}
            <div className="col-span-2 space-y-4">
              <a href="#" className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center text-white">
                  <Cpu className="w-5 h-5" />
                </div>
                <span className="text-lg font-bold text-white tracking-tight">
                  Repo<span className="text-cyan-400">Mind</span>
                </span>
              </a>
              <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
                Understand the Code. Trust the Answer. Make Your First Contribution. RepoMind bridges the gap between complex codebases and ambitious developers.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                  aria-label="GitHub"
                >
                  <Github className="w-4 h-4" />
                </a>
                <a
                  href="#"
                  className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                  aria-label="Terminal"
                >
                  <Terminal className="w-4 h-4" />
                </a>
                <a
                  href="#"
                  className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                  aria-label="Community"
                >
                  <Share2 className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Col 3: Product */}
            <div className="space-y-3">
              <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Product
              </h5>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-cyan-400 transition-colors">Issue-to-Code</a></li>
                <li><a href="#model-arena" className="hover:text-cyan-400 transition-colors">AI Model Arena</a></li>
                <li><a href="#trust-meter" className="hover:text-cyan-400 transition-colors">Trust Meter</a></li>
                <li><a href="#mentor" className="hover:text-cyan-400 transition-colors">First-Contribution Mentor</a></li>
                <li><a href="#features" className="hover:text-cyan-400 transition-colors">PR Preflight Checker</a></li>
              </ul>
            </div>

            {/* Col 4: Resources */}
            <div className="space-y-3">
              <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Resources
              </h5>
              <ul className="space-y-2">
                <li><a href="#how-it-works" className="hover:text-cyan-400 transition-colors">How It Works</a></li>
                <li><a href="#faq" className="hover:text-cyan-400 transition-colors">Documentation & FAQ</a></li>
                <li><a href="https://github.com" className="hover:text-cyan-400 transition-colors">Good First Issues</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">AST Grammar Guide</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">CLI Reference</a></li>
              </ul>
            </div>

            {/* Col 5: Company & Legal */}
            <div className="space-y-3">
              <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Ecosystem
              </h5>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Open Source Initiative</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Security & SOC2</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div>
              © {new Date().getFullYear()} RepoMind Inc. Built for the open-source community.
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                All Systems Operational (99.98% Uptime)
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
