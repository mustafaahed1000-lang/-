# 🧠 Solvica AI Architecture & Development Guide (V13)

This document outlines the core logic and safety rules of the Solvica AI engine. **DO NOT MODIFY** the fundamental fallback structure without reviewing these points.

## 1. The "Indestructible" Fallback Chain 🔗
The AI system is designed to **never fail**. It uses a multi-layered approach:
1. **Layer 1: HyperRush Premium (Pollinations)** - Primary high-speed engine. Handles streaming text and vision.
2. **Layer 2: Gemini Native (REST)** - Direct connection to Google APIs. Fixed to `v1` with `systemInstruction` CamelCase support.
3. **Layer 3: OpenRouter (Emergency)** - Used when all other providers hit limits/outages.
4. **Layer 4: Groq/Native Fallbacks** - Final static recovery layer.

> [!IMPORTANT]
> **Warning**: Never remove the REST implementation in `aiClient.ts` in favor of the SDK only. The REST layer provides a critical bypass when SDK dependencies clash or fail.

## 2. Dual-Mode Intelligence (Seamless Switching) ⚖️
We implemented a per-message logic in `ChatPage.tsx` that detects:
- **Academic Mode**: Triggered by keywords (Math, programming, calculus) or folder selection. Priorities:
    - 100% adherence to provided book context.
    - Use of specific terminology (e.g., "عروة" instead of "حلقة").
    - Pure Arabic (Fusha) + LaTeX for formulas.
- **Interactive Mode**: Triggered automatically for general chat.
    - Ignores book context to provide general help/entertainment.
    - Uses OSINT/Internet search for real-time info.

## 3. Formatting & Math Rendering Rules ✨
To maintain a premium look, the system follows these rules:
- **Professional Math (KaTeX)**: The system uses `remark-math` and `rehype-katex` to render LaTeX formulas beautifully. 
    - AI must use `$$ ... $$` for block equations.
    - AI must use `$ ... $` for inline equations.
- **Syntatx Highlighting (Prism)**: Added `react-syntax-highlighter` for professional code rendering.
    - AI must use triple-backticks with language identifier (e.g., \`\`\`python).
- **No Leading Emojis**: Emojis are only allowed at the end of sentences.
- **Language Purity**: The `cleanStreamText` filter in `ChatPage` automatically nukes any hallucinated foreign characters (Chinese/Cyrillic).
- **LaTeX Priority**: All formulas must use double-dollar syntax `$$...$$`.

## 4. RAG Implementation (Memory & Vector) 📚
- **VectorStore**: Uses a high-speed local TF-IDF engine for document matching.
- **Folder Support**: Can search across entire subjects by filtering by `subjectName` prefix.
- **Memory**: Supports "Memory Corrections" where the user can fix a wrong answer, and the AI will remember the fix globally.

## 5. Development Safety Checklist ⚠️
- [ ] **API Keys**: Ensure `VITE_GEMINI_API_KEY` and others are set.
- [ ] **Schema**: Gemini REST must use `systemInstruction` (CamelCase).
- [ ] **Tuning**: If the AI starts saying "High Load", check the `aiClient.ts` fallback order; DO NOT display these errors to the user (keep them as `console.warn`).

---
*Created by Antigravity AI for Solvica Project. 🧪✅*
