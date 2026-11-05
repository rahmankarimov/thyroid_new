---
name: antigravity-for-writers
description: "Reference guide and workflow for using Google Antigravity for long-form writing, editing, consistency checking, and direct manuscript modification."
source: https://gist.github.com/K8theGreat99/1803979599cdbdafda4c2c8fde6740b7
---

# Google Antigravity for Fiction Writers
# Reference Guide

## What is Antigravity?

Google Antigravity is an AI-powered IDE (development platform) designed for software development, but it can be powerfully repurposed for manuscript analysis, editing, and story bible management.

**Key capabilities for writers:**
- **Multi-agent parallel processing**: Run multiple editing/analysis tasks simultaneously
- **Persistent knowledge base**: Agents learn your world-building, character voices, and writing patterns over time
- **Artifact system**: Produces structured deliverables (reports, wikis, analysis documents) not just chat responses
- **Google Docs-style commenting**: Review and refine agent suggestions inline
- **Direct file editing**: Accepts changes to modify your manuscript files directly. This means: 
	1. No need copy/paste from the chat to your manuscript. 
	2. No danger of prompts or extraneous parts of the response (ie: "Here's your rewritten dialogue") being accidentally included in your manuscript.
- **Comment on proposed changes**: Unlike other IDEs which allow you to only accept/reject proposed changes, Antigravity allows you to comment on a specific proposed change and ask for further refinement


---
## Key Advantages for Authors

âœ… **Automate tedious editing tasks** 

âœ… **Build series bible automatically** - extract world-building as you write

âœ… **Maintain consistency across books** - agents reference shared knowledge

âœ… **Learns your voice** - agents improve over time with your feedback

âœ… **Parallel processing** - run multiple editing passes simultaneously

âœ… **Direct file modification** - accept changes without manual copying

âœ… **Persistent workspace** - knowledge base builds with each session

âœ… **Isolated per series** - different worlds don't interfere


---

**Supported file formats:**
- Markdown (.md) 
- Microsoft Word (.docx) 
- PDF - Read-only (for reference/analysis)

**Supported  models:**

âœ… **Gemini 3 Pro** (High & Low)  
âœ… **Gemini 3 Flash**  
âœ… **Claude Sonnet 4.5**  
âœ… **Claude Opus 4.5**  
âœ… **GPT-OSS 120B**

---
## Practical Agent Workflows for Writers

NOTE: These are just ideas. You can set up any kind of agent you can imagine.

### 1. Character Voice Consistency Agent

**Setup:**
- Train agent with examples of character's dialogue
- Define speech patterns, vocabulary, idioms
- Note formality levels in different contexts

**Agent does:**
- Scans all dialogue for specific character
- Flags out-of-character lines
- Suggests rewrites matching established voice
- Tracks voice evolution across books (intentional vs. accidental)

**You do:**
- Review suggested changes via "diff" view
- Comment: "Too abrupt - add warmth" or "Perfect - keep it"
- Agent learns your preferences over time

### 2. Personal Writing Weakness Scanner

**Setup:**
- Configure agent with YOUR specific weaknesses
- Example: overusing "just," passive voice in action, comma splices

**Agent does:**
- Categorizes usage (necessary vs. filler)
- Suggests removals/replacements
- Provides counts and locations
- Tracks improvement across drafts

**Output example:**
```
Found 347 instances of "just"
- 89 time-related (necessary): "just yesterday"
- 258 filler candidates
  â†’ 127 in dialogue (review individually)
  â†’ 131 in narration (likely deletable)
```

### 3. Continuity Checker

**Agent does:**
- Timeline consistency
- Character detail tracking (eye color, age, backstory)
- Plot thread tracking (setup without payoff, dropped subplots)
- World-building contradictions

**Cross-references with:**
- Series bible in `shared/` folder
- Previous books in the series
- Established magic/world rules

### 4. World-Building Extractor

**Agent does:**
- Reads manuscript
- Identifies world-building details (magic rules, geography, culture, politics)
- Creates structured wiki in `shared/world-building/`
- Flags contradictions with established lore

**Useful for:**
- Building series bible automatically
- Ensuring consistency across books
- Creating reference materials

### 5. Dialogue Audit

**Agent does:**
- Tracks who speaks when
- Ensures distinct character voices
- Flags dialogue tag issues
- Analyzes speech patterns per character

### 6. Prose Quality Analysis

**Agent checks:**
- Sensory detail balance (are you overusing visual, underusing tactile?)
- Pacing analysis (slow sections, rushed sections, scene length)
- Foreshadowing tracker (setup/payoff verification)
- POV consistency (head-hopping detection)
- Sentence variety and rhythm

### 7. Subplot Management

**Agent tracks:**
- Active subplots
- Resolved subplots
- Abandoned threads
- Cross-book subplot continuity

---

## Workspace Structure

### Recommended: One Workspace Per Book Series

```
SeriesName-Workspace/
â”œâ”€â”€ books/
â”‚   â”œâ”€â”€ book1-title/
â”‚   â”‚   â””â”€â”€ manuscript.md
â”‚   â”œâ”€â”€ book2-title/
â”‚   â”‚   â””â”€â”€ manuscript.md
â”‚   â””â”€â”€ book3-title/
â”‚       â””â”€â”€ manuscript.md
â”œâ”€â”€ shared/
â”‚   â”œâ”€â”€ world-building/
â”‚   â”‚   â”œâ”€â”€ magic-system.md
â”‚   â”‚   â”œâ”€â”€ political-structures.md
â”‚   â”‚   â””â”€â”€ geography.md
â”‚   â”œâ”€â”€ characters/
â”‚   â”‚   â”œâ”€â”€ character-profiles.md
â”‚   â”‚   â””â”€â”€ character-relationships.md
â”‚   â””â”€â”€ series-bible/
â”‚       â”œâ”€â”€ timeline.md
â”‚       â””â”€â”€ themes.md
â”œâ”€â”€ artifacts/
â”‚   â””â”€â”€ (agent-generated analyses)
â””â”€â”€ .antigravity/
    â””â”€â”€ workspace-specific-rules
```

**Why this structure:**
- Each book is a separate "project" within the workspace
- Shared knowledge applies across all books in the series
- Different series get completely separate workspaces (no cross-contamination)
- Agents can reference series-wide consistency while working on individual books

---

## Rules: Global vs. Workspace-Specific

### Global Rules (apply to ALL your writing)
Your universal writing weaknesses and style preferences:
- "Flag overuse of 'just' as filler word"
- "Alert to passive voice in action scenes"
- "Check for comma splices"
- Personal writing patterns you want to catch

### Workspace-Specific Rules (per series)
Series-specific knowledge:
- Character voice profiles
- Magic system rules
- World-building consistency rules
- Cultural/political structures unique to that world
- Naming conventions for that universe

**How to set:**
- Global: Settings â†’ apply to all projects
- Workspace: Within specific workspace folder â†’ apply only there

---


## The Artifact System

### What Are Artifacts?

Structured deliverables the agent produces (NOT just chat responses):
- Task lists
- Implementation plans
- Analysis reports
- Screenshots/recordings
- Character wikis
- Timeline documents
- Plot hole reports

### Key Artifact Types for Writers:

**Implementation Plan**
- Agent's proposed approach before starting work
- Review BEFORE agent proceeds
- Comment to adjust direction

**Task List**
- Concrete steps agent will follow
- Example: "Scan Book 2 â†’ Extract world-building â†’ Cross-check Book 1 â†’ Update shared wiki"

**Analysis Reports**
- Structured findings
- Example: Character voice analysis, continuity issues, pacing breakdown

**Review Changes (Diffs)**
- Shows: OLD text â†’ NEW text â†’ Reasoning
- You can accept, reject, or comment for refinement

---

## Google Docs-Style Commenting

### How It Works:

1. Agent produces an artifact (analysis, suggestions, etc.)
2. **Select specific text** in the artifact
3. **Add a comment** with your feedback
4. Agent reads comments and adjusts work
5. **Asynchronous** - agent can continue working while you review

### Example Use Cases:

**Character voice suggestion:**
```
PROPOSED: "Let's try it."
```
Your comment: "Too abrupt. Elara is confident but not curt with allies. Add warmth."

**World-building flag:**
```
INCONSISTENCY: Chapter 3 says fire magic is learned
               Chapter 15 says elemental affinity is inherited
```
Your comment: "Not an inconsistency - ability is inherited, technique is learned."

**Prose suggestion:**
```
DELETE: "She just wanted to help"
```
Your comment: "Keep this - the 'just' emphasizes her modest nature here."

### The Learning Loop:

Over time, agents learn:
- Your specific preferences for each character
- Exceptions to general rules
- When passive voice is intentional
- Your personal style choices

---

## Review Changes Workflow (Diffs)

### What You'll See:

```
CHANGE 1 - Chapter 3, Line 145
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CURRENT: "Oh, um, I suppose we could try that approach."
PROPOSED: "Let's try it."
REASON: Removes hedging; Elara is confident, not deferential
```

### Your Options:

1. **Accept All** - Apply all suggested changes
2. **Reject All** - Keep everything as-is
3. **Review Changes** - Go through individually

### Individual Review:

- Select specific words/phrases to comment
- Request refinements: "Too abrupt - need warmth"
- Approve good changes: "Perfect - keep"
- Reject with explanation: "'Quite' is intentional - formal speech with royalty"

### What Happens Next:

Accepted changes **automatically modify your manuscript file** - no copy/pasting required!

---

## Selective Knowledge Transfer Between Books

### When Starting Book 2 in a Series:

**KEEP (in shared/ folder):**
- Character development sheets
- World-building details
- Magic system rules
- Ongoing plot threads
- Series-wide themes

**DON'T BRING FORWARD:**
- Resolved subplots from Book 1
- Completed character arcs
- Book 1-specific plot details

**How:**
1. Book 1 workspace generates comprehensive artifacts
2. Manually select which artifacts matter for Book 2
3. Keep relevant ones in `shared/` folder
4. Book 2 agents use shared knowledge for consistency
5. Discard or archive Book 1-specific content


---

## Planning Mode vs. Fast Mode

### Planning Mode (Recommended for most writing tasks)
- Agent creates detailed plan before acting
- Produces Implementation Plan artifact
- You review and approve before execution
- Best for: complex analysis, multi-step tasks, editing

### Fast Mode
- Immediate execution
- No planning artifacts
- Best for: quick fixes, simple queries

**For writing work: Use Planning Mode** to maintain control and review before changes.

---

## Multiple Agents Running Simultaneously

### The Power of Parallel Processing:

Run these agents at the same time on your manuscript:
- **Agent A**: Character voice consistency
- **Agent B**: Prose quality analysis
- **Agent C**: World-building extraction
- **Agent D**: Continuity checking
- **Agent E**: Timeline verification

**Each produces its own artifact** for your review.

### Manager View vs. Editor View:

- **Manager View**: Orchestrate multiple agents, review artifacts
- **Editor View**: Traditional file editing with AI sidebar
- Switch between them as needed

---

## Installation

**Download:** antigravity.google/download

**Choose version:**
- **x64** (most common) - Intel/AMD processors
- **ARM64** (rare) - Qualcomm/ARM processors

**How to check your processor:**
1. Windows + I â†’ System â†’ About
2. Look at "System type"
3. Says "x64-based processor" â†’ Download x64
4. Says "ARM-based processor" â†’ Download ARM64

**Free during public preview** with generous rate limits.

---

## Getting Started Checklist

- [ ] Download and install Antigravity (x64 for most Windows laptops)
- [ ] Create workspace folder for your current series
- [ ] Set up folder structure: `books/`, `shared/`, `artifacts/`
- [ ] Configure **Planning Mode** (not Fast Mode)
- [ ] Set up **Global Rules** for your universal writing weaknesses
- [ ] Set up **Workspace Rules** for series-specific knowledge
- [ ] Start with one simple agent (try "Personal Writing Weakness Scanner")
- [ ] Practice reviewing artifacts and adding comments
- [ ] Experiment with the diff/accept/reject workflow
- [ ] Gradually add more complex agents as you learn the system

---

## Remember

- **One workspace per book series** (not per book)
- **Global rules for universal patterns, workspace rules for series-specific knowledge**
- **Review artifacts with comments, not just chat**
- **Accept/reject workflow saves massive amounts of time**
- **Agents learn from your feedback** - the more you use it, the better it gets
- **Markdown files work perfectly** for your writing workflow

---

*This guide covers practical applications of Google Antigravity for fiction writing and manuscript editing. The tool was designed for software development but its agent orchestration, artifact system, and learning capabilities translate powerfully to creative writing workflows.*



