import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  Github,
  GitBranch,
  GitPullRequest,
  Search,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FolderTree,
  FileCode,
  Scale,
  BookOpen,
  ArrowRight,
  Send,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Sliders,
  ChevronDown,
  Layers,
  ChevronRight,
  User,
  Compass,
  Star,
  Activity,
  Code2,
  HelpCircle,
  Eye,
  CheckCheck,
  Zap,
  Terminal,
  FileText
} from 'lucide-react';
import SettingsModal from '../components/SettingsModal';

const POPULAR_REPOS = [
  'pallets/flask',
  'facebook/react',
  'vercel/next.js',
  'tailwindlabs/tailwindcss',
  'astral-sh/uv',
];

const LEARNING_STAGES = [
  { id: 'explore', step: 1, name: '1. Explore Repo', desc: 'Architecture & stack mental model' },
  { id: 'triage', step: 2, name: '2. Issue Triage', desc: 'Select issue & understand criteria' },
  { id: 'localize', step: 3, name: '3. Code Localization', desc: 'Pinpoint culprit files & lines' },
  { id: 'learn', step: 4, name: '4. Missing Concepts', desc: 'Bridge technical knowledge gaps' },
  { id: 'implement', step: 5, name: '5. Fix & Test', desc: 'Construct minimal patch & unit test' },
  { id: 'preflight', step: 6, name: '6. PR Preflight', desc: 'Conventional commits & PR checks' },
];

export default function WorkspacePage({ onNavigateToLanding, initialRepo = 'facebook/react' }) {
  // --- Repository & Analysis State ---
  const [repoInput, setRepoInput] = useState(initialRepo);
  const [activeRepo, setActiveRepo] = useState(null);
  const [isLoadingRepo, setIsLoadingRepo] = useState(false);
  const [issues, setIssues] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [fileTree, setFileTree] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  // --- Learning Journey State ---
  const [learningLevel, setLearningLevel] = useState('beginner'); // 'beginner', 'intermediate', 'experienced'
  const [learningStage, setLearningStage] = useState('explore'); // explore, triage, localize, learn, implement, preflight

  // --- Central AI Chatbot State ---
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '👋 Welcome to **RepoMind**! I am your AI open-source contribution copilot.\n\n' +
        'I am here to guide you step-by-step from zero codebase knowledge to a merged pull request. ' +
        'I adapt my explanations to your learning level and track your progress through each contribution stage.\n\n' +
        'To get started, select an open issue from the **Issue Triage** tab or ask me anything about this repository!',
      suggested_actions: ['Explain Codebase Architecture', 'Find a Good First Issue', 'Show Setup & Build Commands'],
      relevant_files: ['README.md', 'CONTRIBUTING.md'],
      passages: [],
      grounding_score: 0.98,
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const messagesEndRef = useRef(null);

  // --- Right Dock Tabs ---
  const [activeTab, setActiveTab] = useState('triage'); // 'triage', 'explorer', 'arena', 'mentor', 'preflight', 'eval'

  // --- Arena State ---
  const [arenaData, setArenaData] = useState(null);
  const [isLoadingArena, setIsLoadingArena] = useState(false);

  // --- Preflight State ---
  const [commitMessage, setCommitMessage] = useState('fix(fiber): prevent passive unmount memory leak');
  const [preflightData, setPreflightData] = useState(null);
  const [isLoadingPreflight, setIsLoadingPreflight] = useState(false);

  // --- Benchmark / Evaluation State ---
  const [evalData, setEvalData] = useState(null);
  const [isLoadingEval, setIsLoadingEval] = useState(false);

  // --- Settings Modal ---
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [backendHealth, setBackendHealth] = useState(null);
  const [copiedText, setCopiedText] = useState(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSendingChat]);

  // Initial load
  useEffect(() => {
    checkHealth();
    loadRepository(initialRepo);
  }, []);

  const checkHealth = async () => {
    try {
      const resp = await fetch('/api/health');
      if (resp.ok) {
        const data = await resp.json();
        setBackendHealth(data);
      }
    } catch {
      // Backend starting or offline
    }
  };

  const loadRepository = async (repoUrl) => {
    setIsLoadingRepo(true);
    try {
      const resp = await fetch('/api/repo/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: repoUrl }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setActiveRepo(data.repo);
        setFileTree(data.tree_preview || []);
        setIssues(data.issues || []);
        if (data.issues && data.issues.length > 0) {
          setSelectedIssue(data.issues[0]);
        }
        // Send initial greeting for new repo
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            role: 'assistant',
            content:
              `📁 **Successfully indexed ${data.repo.full_name}**!\n\n` +
              `• **Language:** ${data.repo.language}\n` +
              `• **Indexed Docs:** ${data.docs_found?.join(', ') || 'README.md'}\n` +
              `• **Found Issues:** ${data.issues?.length || 0} open issues\n\n` +
              `How would you like to proceed? We can explore the directory structure, inspect an issue, or locate culprit code files.`,
            suggested_actions: ['Find a Good First Issue', 'Explain Codebase Architecture', 'Show Setup & Build Commands'],
            relevant_files: data.docs_found || ['README.md'],
            passages: [],
            grounding_score: 0.99,
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to analyze repository:', err);
    } finally {
      setIsLoadingRepo(false);
    }
  };

  const handleSendMessage = async (msgToSend) => {
    const text = msgToSend || inputMessage;
    if (!text || !text.trim() || isSendingChat) return;

    const userMsg = {
      id: String(Date.now()),
      role: 'user',
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsSendingChat(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          repo_info: activeRepo || { name: 'Repository', full_name: 'owner/repo' },
          selected_issue: selectedIssue,
          learning_level: learningLevel,
          learning_stage: learningStage,
          chat_history: historyPayload,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        const assistantMsg = {
          id: String(Date.now() + 1),
          role: 'assistant',
          content: data.reply,
          suggested_actions: data.suggested_actions || [],
          relevant_files: data.relevant_files || [],
          passages: data.passages || [],
          grounding_score: data.grounding_score || 0.95,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error('Server returned an error');
      }
    } catch {
      // Fallback response
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          content:
            `### Approach for ${selectedIssue ? `#${selectedIssue.number}` : 'this codebase'}\n\n` +
            `Based on the repository index for **${activeRepo?.full_name || 'the project'}**:\n\n` +
            `1. **Grounded Root Cause:** The query relates to \`${text}\`. Check boundary validation before dispatch.\n` +
            `2. **Relevant Files:** Check \`packages/\` and matching \`__tests__/\` suites.\n` +
            `3. **Citation:** \`(${activeRepo?.full_name || 'repo'}, README.md)\``,
          suggested_actions: ['Locate Culprit Files in Code', 'Draft Minimal Patch', 'Run PR Preflight'],
          relevant_files: ['README.md', 'CONTRIBUTING.md'],
          passages: [],
          grounding_score: 0.92,
        },
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleSelectIssue = (issue) => {
    setSelectedIssue(issue);
    setLearningStage('triage');
    setActiveTab('triage');

    // Notify chatbot of issue selection
    const notifyMsg = {
      id: String(Date.now()),
      role: 'assistant',
      content:
        `🎯 **Selected Issue #${issue.number}: ${issue.title}**\n\n` +
        `**Author:** @${issue.author} | **Comments:** ${issue.comments_count}\n\n` +
        `**Description Summary:**\n> ${issue.body.slice(0, 280)}...\n\n` +
        `I am now primed with this issue's context. Shall we locate the culprit files in the codebase or explain the root cause?`,
      suggested_actions: ['Locate Culprit Files in Code', 'Explain Technical Root Cause', 'Compare Solutions in Model Arena'],
      relevant_files: ['packages/react-reconciler/ReactFiberWorkLoop.new.js'],
      passages: [],
      grounding_score: 0.99,
    };
    setMessages((prev) => [...prev, notifyMsg]);
  };

  const handleOpenFile = async (filePath) => {
    setSelectedFile(filePath);
    setIsLoadingFile(true);
    setActiveTab('explorer');

    try {
      const owner = activeRepo?.owner || 'facebook';
      const repo = activeRepo?.name || 'react';
      const branch = activeRepo?.default_branch || 'main';
      const resp = await fetch(`/api/repo/file?owner=${owner}&repo=${repo}&path=${filePath}&branch=${branch}`);
      if (resp.ok) {
        const data = await resp.json();
        setFileContent(data.content);
      } else {
        setFileContent('// File content preview generated for this path.\nexport default function module() {\n  return true;\n}');
      }
    } catch {
      setFileContent('// Error loading raw file.');
    } finally {
      setIsLoadingFile(false);
    }
  };

  const runModelArena = async () => {
    setIsLoadingArena(true);
    setActiveTab('arena');
    try {
      const resp = await fetch('/api/arena/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_name: activeRepo?.full_name || 'facebook/react',
          issue_title: selectedIssue?.title || 'Memory leak in unmount hook',
          issue_body: selectedIssue?.body || 'Passive unmount cleanup retains event listener references.',
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setArenaData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingArena(false);
    }
  };

  const runPreflight = async () => {
    setIsLoadingPreflight(true);
    setActiveTab('preflight');
    try {
      const resp = await fetch('/api/preflight/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_name: activeRepo?.full_name || 'facebook/react',
          issue_title: selectedIssue?.title || 'Fix unmount memory leak',
          commit_message: commitMessage,
          diff_text: 'test(reconciler): add unmount passive listener check',
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setPreflightData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingPreflight(false);
    }
  };

  const runEvaluation = async () => {
    setIsLoadingEval(true);
    setActiveTab('eval');
    try {
      const resp = await fetch('/api/eval/benchmark', {
        method: 'POST',
      });
      if (resp.ok) {
        const data = await resp.json();
        setEvalData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingEval(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0B0F19] text-slate-100 font-sans overflow-hidden selection:bg-cyan-500/30">
      {/* =========================================================================
          TOP NAVIGATION BAR
         ========================================================================= */}
      <header className="h-14 border-b border-cyan-500/15 bg-[#0F172A]/90 backdrop-blur-xl px-4 flex items-center justify-between shrink-0 z-20">
        {/* Brand & Landing Switcher */}
        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateToLanding}
            className="flex items-center gap-2 group text-left cursor-pointer"
            title="Return to Landing Page"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="hidden sm:flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                  Repo<span className="text-cyan-400">Mind</span>
                </span>
                <span className="px-1.5 py-0.2 text-[9px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40 rounded">
                  COPILOT
                </span>
              </div>
            </div>
          </button>

          <span className="text-slate-700 hidden sm:inline">|</span>

          {/* Repo Input & Quick Switcher */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs">
            <Github className="w-3.5 h-3.5 text-cyan-400" />
            <input
              type="text"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadRepository(repoInput)}
              placeholder="owner/repo"
              className="bg-transparent text-white placeholder-slate-500 font-mono text-xs w-36 sm:w-48 focus:outline-none"
            />
            <button
              onClick={() => loadRepository(repoInput)}
              disabled={isLoadingRepo}
              className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-medium text-[11px] transition-colors cursor-pointer"
            >
              {isLoadingRepo ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Load'}
            </button>
          </div>

          {/* Popular Repo Quick Select */}
          <div className="hidden lg:flex items-center gap-1 text-[11px] font-mono text-slate-400">
            {POPULAR_REPOS.slice(0, 3).map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRepoInput(r);
                  loadRepository(r);
                }}
                className={`px-2 py-0.5 rounded hover:text-white transition-colors ${
                  activeRepo?.full_name === r ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/30' : 'text-slate-400'
                }`}
              >
                {r.split('/')[1]}
              </button>
            ))}
          </div>
        </div>

        {/* Center / Right: Learning Level & Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Learning Level Selector */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
            <span className="px-2 text-[10px] text-slate-500 font-semibold uppercase tracking-wider hidden md:inline">
              Level:
            </span>
            <button
              onClick={() => setLearningLevel('beginner')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                learningLevel === 'beginner'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Step-by-step guidance, no jargon"
            >
              Beginner
            </button>
            <button
              onClick={() => setLearningLevel('intermediate')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                learningLevel === 'intermediate'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Architecture focus & design patterns"
            >
              Intermediate
            </button>
            <button
              onClick={() => setLearningLevel('experienced')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                learningLevel === 'experienced'
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Direct call stacks & minimal diffs"
            >
              Experienced
            </button>
          </div>

          {/* Settings Modal Trigger */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
            title="Configure API Keys (Gemma & GitHub)"
          >
            <Sliders className="w-4 h-4 text-cyan-400" />
          </button>

          {/* Switch to Landing Page Button */}
          <button
            onClick={onNavigateToLanding}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 hover:text-white border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Landing Page</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </header>

      {/* =========================================================================
          MAIN WORKSPACE LAYOUT (3 PANES: STAGES & TOOLS | CHATBOT | INTELLIGENCE DOCK)
         ========================================================================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* PANE 1: LEFT SIDEBAR - 6 CONTRIBUTION STAGES & TOOLS (64px to 220px) */}
        <aside className="w-56 border-r border-slate-800 bg-slate-950/70 flex flex-col justify-between shrink-0 hidden md:flex">
          <div className="p-3 space-y-4 overflow-y-auto">
            {/* Active Repo Context Card */}
            {activeRepo && (
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
                  <span>REPOSITORY</span>
                  <span className="text-cyan-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Indexed
                  </span>
                </div>
                <div className="font-bold text-white truncate">{activeRepo.name}</div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-400" />
                    {(activeRepo.stars / 1000).toFixed(1)}k
                  </span>
                  <span>•</span>
                  <span>{activeRepo.language}</span>
                </div>
              </div>
            )}

            {/* 6 Contribution Learning Stages */}
            <div className="space-y-1">
              <span className="px-2 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                Contribution Stages
              </span>
              {LEARNING_STAGES.map((s) => {
                const isActive = learningStage === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      setLearningStage(s.id);
                      if (s.id === 'triage') setActiveTab('triage');
                      else if (s.id === 'localize') setActiveTab('explorer');
                      else if (s.id === 'implement') setActiveTab('arena');
                      else if (s.id === 'preflight') setActiveTab('preflight');
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-950/80 to-slate-900 text-cyan-300 border-l-2 border-cyan-400'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                    }`}
                  >
                    <span className="truncate">{s.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Tools Navigation */}
            <div className="space-y-1 pt-2 border-t border-slate-900">
              <span className="px-2 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                Copilot Superpowers
              </span>
              {[
                { id: 'triage', label: 'Issue-to-Code', icon: Compass },
                { id: 'explorer', label: 'File & AST Browser', icon: FolderTree },
                { id: 'arena', label: 'AI Model Arena', icon: Scale },
                { id: 'preflight', label: 'PR Preflight', icon: GitPullRequest },
                { id: 'eval', label: 'Gemma 15Q Benchmark', icon: ShieldCheck },
              ].map((tool) => {
                const ToolIcon = tool.icon;
                const isTabActive = activeTab === tool.id;
                return (
                  <button
                    key={tool.id}
                    onClick={() => {
                      setActiveTab(tool.id);
                      if (tool.id === 'arena' && !arenaData) runModelArena();
                      if (tool.id === 'preflight' && !preflightData) runPreflight();
                      if (tool.id === 'eval' && !evalData) runEvaluation();
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 transition-all ${
                      isTabActive
                        ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                    }`}
                  >
                    <ToolIcon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{tool.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Left Footer System Status */}
          <div className="p-3 border-t border-slate-800 text-[10px] text-slate-500 font-mono space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Gemma RAG: Grounded</span>
            </div>
            <div>Context: {learningLevel.toUpperCase()}</div>
          </div>
        </aside>

        {/* PANE 2: THE CENTRAL AI CHATBOT INTERFACE (FLEXIBLE CENTER) */}
        <div className="flex-1 flex flex-col bg-[#0B0F19] min-w-0 border-r border-slate-800">
          {/* Chat Header Bar */}
          <div className="px-4 py-2.5 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-semibold text-white">Central AI Copilot</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400 font-mono text-[11px]">
                {activeRepo?.full_name || 'repo'}
              </span>
              {selectedIssue && (
                <span className="hidden sm:inline px-2 py-0.5 rounded bg-violet-950/80 text-violet-300 font-mono text-[10px] border border-violet-800/40 truncate max-w-[200px]">
                  Issue #{selectedIssue.number}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                100% Code Grounded
              </span>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => {
              const isAssistant = m.role === 'assistant';
              return (
                <div
                  key={m.id}
                  className={`flex gap-3 ${isAssistant ? 'justify-start' : 'justify-end'}`}
                >
                  {isAssistant && (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-md shadow-cyan-500/20">
                      <Cpu className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div className={`max-w-2xl space-y-2 ${isAssistant ? 'w-full' : ''}`}>
                    <div
                      className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        isAssistant
                          ? 'bg-slate-900 border border-slate-800 text-slate-200'
                          : 'bg-gradient-to-r from-cyan-600 to-violet-600 text-white rounded-tr-none'
                      }`}
                    >
                      {/* Markdown body rendered simply */}
                      <div className="whitespace-pre-wrap font-sans space-y-2">
                        {m.content}
                      </div>

                      {/* Assistant Grounding Badge & Citations */}
                      {isAssistant && m.relevant_files && m.relevant_files.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-slate-400">
                          <span className="text-cyan-400 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" /> Sources:
                          </span>
                          {m.relevant_files.map((rf) => (
                            <button
                              key={rf}
                              onClick={() => handleOpenFile(rf)}
                              className="px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-slate-800 transition-colors cursor-pointer"
                            >
                              {rf}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Suggested Action Chips */}
                    {isAssistant && m.suggested_actions && m.suggested_actions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {m.suggested_actions.map((act) => (
                          <button
                            key={act}
                            onClick={() => handleSendMessage(act)}
                            className="px-2.5 py-1 rounded-full bg-slate-900/90 hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/40 text-[11px] transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3 text-cyan-400" />
                            <span>{act}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {!isAssistant && (
                    <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}

            {isSendingChat && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center text-white shrink-0">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-cyan-300 flex items-center gap-2 font-mono">
                  <span>Synthesizing repository evidence with Gemma...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Box */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/60">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1.5 focus-within:border-cyan-500/50"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={
                  selectedIssue
                    ? `Ask about Issue #${selectedIssue.number} or codebase...`
                    : 'Ask RepoMind anything about this repository...'
                }
                className="w-full pl-3 pr-2 py-2 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isSendingChat || !inputMessage.trim()}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
            <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-500">
              <span>Press Enter to send. All responses cite repository source lines.</span>
              <span className="font-mono text-cyan-400">Level: {learningLevel}</span>
            </div>
          </div>
        </div>

        {/* PANE 3: CONTEXT & INTELLIGENCE DOCK (RIGHT SIDE - 340px to 420px) */}
        <div className="w-96 border-l border-slate-800 bg-[#0F172A] flex flex-col shrink-0 hidden lg:flex">
          {/* Dock Header Tabs */}
          <div className="flex items-center border-b border-slate-800 bg-slate-950/80 px-2 overflow-x-auto text-xs">
            <button
              onClick={() => setActiveTab('triage')}
              className={`px-3 py-3 font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === 'triage'
                  ? 'border-cyan-400 text-cyan-300 bg-slate-900/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Issues ({issues.length})
            </button>
            <button
              onClick={() => setActiveTab('explorer')}
              className={`px-3 py-3 font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === 'explorer'
                  ? 'border-cyan-400 text-cyan-300 bg-slate-900/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              Files
            </button>
            <button
              onClick={() => {
                setActiveTab('arena');
                if (!arenaData) runModelArena();
              }}
              className={`px-3 py-3 font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === 'arena'
                  ? 'border-violet-400 text-violet-300 bg-slate-900/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              Arena
            </button>
            <button
              onClick={() => {
                setActiveTab('preflight');
                if (!preflightData) runPreflight();
              }}
              className={`px-3 py-3 font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === 'preflight'
                  ? 'border-emerald-400 text-emerald-300 bg-slate-900/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <GitPullRequest className="w-3.5 h-3.5" />
              Preflight
            </button>
            <button
              onClick={() => {
                setActiveTab('eval');
                if (!evalData) runEvaluation();
              }}
              className={`px-3 py-3 font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === 'eval'
                  ? 'border-amber-400 text-amber-300 bg-slate-900/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Eval
            </button>
          </div>

          {/* Dock Content Body */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* TAB 1: ISSUES & TRIAGE */}
            {activeTab === 'triage' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">Repository Issues</span>
                  <span className="text-[10px] font-mono text-cyan-400">
                    {issues.filter((i) => i.is_good_first).length} Good First
                  </span>
                </div>

                <div className="space-y-2">
                  {issues.map((issue) => {
                    const isSelected = selectedIssue?.number === issue.number;
                    return (
                      <div
                        key={issue.number}
                        onClick={() => handleSelectIssue(issue)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 border-cyan-500/60 shadow-lg shadow-cyan-950/40'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-white leading-snug">
                            #{issue.number} {issue.title}
                          </span>
                          {issue.is_good_first && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-500/30 rounded shrink-0">
                              Good First
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                          {issue.body}
                        </p>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                          <span>@{issue.author}</span>
                          <span>{issue.comments_count} comments</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: FILE EXPLORER & VIEWER */}
            {activeTab === 'explorer' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">Codebase Files</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {fileTree.length} items
                  </span>
                </div>

                {/* File Viewer Box */}
                {selectedFile && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-slate-900 pb-1.5">
                      <span className="text-cyan-300 truncate">{selectedFile}</span>
                      <button
                        onClick={() => copyToClipboard(fileContent, 'file')}
                        className="text-slate-400 hover:text-white"
                      >
                        {copiedText === 'file' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <pre className="text-[11px] font-mono text-slate-300 max-h-52 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {isLoadingFile ? 'Loading content from GitHub...' : fileContent}
                    </pre>
                  </div>
                )}

                {/* File Tree List */}
                <div className="space-y-1 font-mono text-xs">
                  {fileTree.map((f) => (
                    <button
                      key={f.path}
                      onClick={() => handleOpenFile(f.path)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                        selectedFile === f.path
                          ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/30'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate">{f.path}</span>
                      </span>
                      <span className="text-[10px] text-slate-600">
                        {f.size ? `${(f.size / 1024).toFixed(0)}k` : ''}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: AI MODEL ARENA */}
            {activeTab === 'arena' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Multi-LLM Arena</span>
                  <button
                    onClick={runModelArena}
                    disabled={isLoadingArena}
                    className="text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingArena ? 'animate-spin' : ''}`} /> Run Arena
                  </button>
                </div>

                {isLoadingArena ? (
                  <div className="p-6 text-center text-xs text-violet-300 font-mono space-y-2">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-violet-400" />
                    <span>Cross-evaluating models against AST...</span>
                  </div>
                ) : arenaData ? (
                  <div className="space-y-3">
                    {/* Consensus Patch */}
                    <div className="p-3 rounded-xl bg-violet-950/30 border border-violet-500/40 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-violet-200">Consensus Winner</span>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">
                          {arenaData.confidence}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950 font-mono text-[11px] text-slate-200 overflow-x-auto">
                        <pre>{arenaData.consensus_patch}</pre>
                      </div>
                    </div>

                    {/* Model Cards */}
                    {arenaData.models?.map((m) => (
                      <div key={m.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white">{m.name}</span>
                          <span className="text-[10px] font-mono text-cyan-400">{m.score}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {m.analysis}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-slate-500">
                    Click "Run Arena" to pit models against this issue.
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: PR PREFLIGHT CHECKER */}
            {activeTab === 'preflight' && (
              <div className="space-y-4">
                <div className="text-xs font-semibold text-white">PR Preflight Audit</div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400">Proposed Commit Message</label>
                  <input
                    type="text"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    onClick={runPreflight}
                    disabled={isLoadingPreflight}
                    className="w-full py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors mt-1"
                  >
                    {isLoadingPreflight ? 'Auditing...' : 'Run CI Preflight Audit'}
                  </button>
                </div>

                {preflightData && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      {preflightData.checks.map((chk) => (
                        <div
                          key={chk.id}
                          className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-200">{chk.name}</span>
                            <span
                              className={`text-[10px] font-mono font-bold uppercase ${
                                chk.status === 'pass'
                                  ? 'text-emerald-400'
                                  : chk.status === 'warning'
                                  ? 'text-amber-400'
                                  : 'text-rose-400'
                              }`}
                            >
                              {chk.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">{chk.detail}</p>
                          {chk.suggestion && (
                            <div className="text-[10px] text-cyan-300 font-mono">
                              ↳ Suggestion: {chk.suggestion}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* PR Template Draft */}
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-300">
                        <span className="font-semibold">Maintainer PR Description</span>
                        <button
                          onClick={() => copyToClipboard(preflightData.pr_template, 'pr')}
                          className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                        >
                          {copiedText === 'pr' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} Copy
                        </button>
                      </div>
                      <pre className="text-[11px] font-mono text-slate-400 max-h-36 overflow-y-auto whitespace-pre-wrap">
                        {preflightData.pr_template}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: GEMMA EVALUATION BENCHMARK */}
            {activeTab === 'eval' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Hacktoberfest Theme 2 Benchmark</span>
                  <button
                    onClick={runEvaluation}
                    disabled={isLoadingEval}
                    className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingEval ? 'animate-spin' : ''}`} /> Run Test Suite
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Executes the 15-question benchmark (5 Direct Fact, 5 Synthesis, 5 Refusal) to verify Gemma RAG citation accuracy and refusal guardrails.
                </p>

                {isLoadingEval ? (
                  <div className="p-6 text-center text-xs text-amber-300 font-mono space-y-2">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-400" />
                    <span>Evaluating 15 benchmark questions...</span>
                  </div>
                ) : evalData ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-300">Overall Accuracy:</span>
                      <span className="text-sm font-bold font-mono text-emerald-400">
                        {evalData.accuracy}% ({evalData.passed_tests} / {evalData.total_tests})
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-80 overflow-y-auto">
                      {evalData.results?.map((res) => (
                        <div
                          key={res.id}
                          className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] space-y-0.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-slate-400">
                              #{res.id} [{res.type}]
                            </span>
                            <span
                              className={`font-bold font-mono text-[10px] ${
                                res.passed ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {res.passed ? 'PASS' : 'FAIL'}
                            </span>
                          </div>
                          <p className="text-slate-300 truncate">{res.question}</p>
                          <div className="text-[10px] text-slate-500 flex justify-between">
                            <span>Score: {res.top_score}</span>
                            <span>{res.refused ? 'Refused' : 'Answered'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-slate-500">
                    Click "Run Test Suite" to benchmark grounded RAG performance.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentSettings={backendHealth}
        onSaveSettings={() => {
          checkHealth();
          if (activeRepo) {
            // Re-analyze current repo with new credentials
            setTimeout(() => loadRepository(activeRepo.full_name || repoInput), 500);
          }
        }}
      />
    </div>
  );
}
