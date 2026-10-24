# RepoMind — AI-Powered Open-Source Contribution Assistant

> **“Understand the Code. Trust the Answer. Make Your First Contribution.”**

RepoMind is a competition-ready AI developer platform designed to eliminate codebase anxiety and guide developers through their first open-source pull requests with mathematical grounding and multi-model consensus.

---

## 🌟 Core Features

### 1. Issue-to-Code Navigator
- Resolves raw GitHub issues, bug reports, and error stack traces directly to the exact file paths, symbol declarations, and line numbers (`#L142-L168`).
- Explores Abstract Syntax Tree (AST) call graphs and caller/callee hierarchies.

### 2. AI Model Arena
- Pits leading frontier models against each other:
  - **Claude 3.7 Sonnet** (AST Syntax Precision & Type Safety)
  - **DeepSeek-R1** (Algorithmic & Chain-of-Thought Reasoning)
  - **GPT-4o** (Broad Framework Idioms & Heuristics)
- Synthesizes a high-confidence **RepoMind Consensus Patch** with cross-model validation.

### 3. Trust Meter
- Guarantees zero hallucinations in source code citations.
- Every claim is cryptographically bound to AST nodes, git commit hashes (`sha256`), and verified compiler symbols.

### 4. First-Contribution Mentor
- Interactive onboarding roadmap tailored for beginners.
- Translates monolithic `CONTRIBUTING.md` into copy-paste local commands, isolated test harnesses, and step-by-step reproduction instructions.

### 5. PR Preflight Checker
- Automated maintainer CI simulation before you click "Submit Pull Request".
- Verifies conventional commit messages, linter/typecheck status, and test coverage deltas.

---

## 🎨 Design System
- **Palette**: Dark Navy (`#0B0F19`, `#0F172A`), Electric Cyan (`#06B6D4`, `#22D3EE`), and Deep Violet (`#8B5CF6`, `#A78BFA`).
- **Typography**: Plus Jakarta Sans (Headings & UI) and JetBrains Mono (Code & Citations).
- **Interactions**: Motion for React (`motion/react`) animations, glassmorphism, glowing cyber gradients, and interactive simulators.

---

## 🚀 Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev

# 3. Build for production
npm run build
```

---

## 📁 File Structure

```text
repomind/
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── vite.config.js
└── src/
    ├── App.jsx
    ├── index.css
    ├── main.jsx
    └── pages/
        └── LandingPage.jsx   # Main Landing Page Component
```
