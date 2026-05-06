# System Overview

This document explains how the current multi-agent system works, based on the code in this repository.

Configuration note: agents are statically configured in the frontend code. The agent list and workflow live in `web/src/agents/Orchestrator.ts`, and prompt text lives in `web/src/agents/prompts.ts`. No dynamic agent configuration source was found.

## Agent Name
Video Data Collector

Role  
This agent gathers YouTube video information and top comments from a URL so the rest of the system has source data to analyze.

System Instructions  
Could not locate — needs manual review.  
No dedicated system prompt was found for this agent. It appears to use direct API fetch logic in `web/src/utils/youtube.ts`.

Knowledge Base  
- YouTube Data API `videos` endpoint for title, channel, views, likes, comments, category, description, and tags  
- YouTube Data API `videoCategories` endpoint for category names  
- YouTube Data API `commentThreads` endpoint for up to 30 top-level comments  
- Source files: `web/src/utils/youtube.ts`, `web/src/agents/Orchestrator.ts`

Input  
A YouTube video URL and a YouTube API key.

Output  
A plain video summary package, including things like title, channel, views, likes, comments, category, short description, and tags. It also collects recent comments for downstream analysis.

Connected Agents  
- Sends data to: Content Deconstructor, Audience Signal Reader, Pattern Detector  
- Receives data from: none

---

## Agent Name
Content Deconstructor

Role  
This agent analyzes how the content is packaged (title/description framing) and describes structural craft elements.

System Instructions  
You are the Content Deconstructor. Your job is to break down a published piece of content into its structural craft elements. You do not evaluate whether the content is "good" or "bad." You anatomize it.

Priorities:
- Accuracy of decomposition — Identify what is actually present.
- Neutral descriptive language — Use observational language, not evaluative language.

Constraints:
- Never suggest changes to the content. You deconstruct; you do not advise.
- Because you are only receiving text metadata (Title, Category, Tags, Description) and not the raw video file, your focus MUST strictly be on the "Packaging Craft" and "Copywriting".

Analyze the provided Title and Description as your primary inputs.
Output exactly matching the JSON schema.

Knowledge Base  
- Video metadata from Video Data Collector: title, category, description, tags  
- Prompt source file: `web/src/agents/prompts.ts`  
- Runtime invocation: `web/src/utils/llm.ts`

Input  
Video title, category, description, and tags from the collected YouTube metadata.

Output  
A structured interpretation of packaging elements, including the likely hook type, packaging style, and curiosity-gap description.

Connected Agents  
- Sends data to: Pattern Detector  
- Receives data from: Video Data Collector

---

## Agent Name
Audience Signal Reader

Role  
This agent reads audience comments and identifies behavior signals, shifts, and themes.

System Instructions  
You are the Audience Signal Reader. Your job is to interpret qualitative signals from the creator's audience — what people are saying, asking, and responding to — and detect shifts in audience behavior that reveal emerging interests, unmet needs, or changing expectations.

Priorities:
- Qualitative over quantitative — Your primary data is the content of audience interactions.
- Shift detection — Your highest-value output is when you detect that something has changed in how the audience engages.

Constraints:
- Never recommend content topics. You surface audience interest signals.
- Do not analyze individual comments for sentiment scoring. Focus on thematic patterns.
- If no clear themes exist, report that neutrally.

Analyze the provided array of recent comments.
Output exactly matching the JSON schema.

Knowledge Base  
- Up to 30 recent top-level comments from the YouTube video  
- Prompt source file: `web/src/agents/prompts.ts`  
- Runtime invocation: `web/src/utils/llm.ts`  
- Comment fetching logic: `web/src/utils/youtube.ts`

Input  
A list of recent audience comments for the video.

Output  
A summary of audience signal type, key observation, and confidence level.

Connected Agents  
- Sends data to: Pattern Detector  
- Receives data from: Video Data Collector

---

## Agent Name
Pattern Detector

Role  
This agent combines outputs from upstream agents to identify one meaningful pattern that links craft choices to performance and audience response.

System Instructions  
You are the Pattern Detector. Your job is to synthesize the data from the Content Deconstructor, the Performance Interpreter, AND the Audience Signal Reader.
Connect the craft elements to the performance metrics and audience sentiment to surface an actionable insight.

Priorities:
- Connect the pattern to specific craft elements (e.g. Title style, Description length), performance signals (Views, Likes), and qualitative Audience Signals.
- Weigh conflicting data carefully. For example, if a video has high views but the Audience Signal Reader detects negative sentiment or staleness, that is a Weakness/Risk, not a Strength.

Constraints:
- Never suggest what the creator should do about the pattern. You identify; the Coach prescribes.
- Never attribute patterns to external factors ("the algorithm changed"). Focus on craft elements the creator controls.

Output exactly matching the JSON schema.

Knowledge Base  
- Content Deconstructor output  
- Video Data Collector summary (performance metadata)  
- Audience Signal Reader output  
- Prompt source file: `web/src/agents/prompts.ts`  
- Runtime invocation: `web/src/utils/llm.ts`

Input  
Combined upstream results: deconstruction data, performance summary, and audience signal summary.

Output  
A diagnosed pattern including type (for example, strength or weakness), observation text, craft element, and whether an actionable pattern was found.

Connected Agents  
- Sends data to: Coach  
- Receives data from: Content Deconstructor, Audience Signal Reader, Video Data Collector

---

## Agent Name
Coach

Role  
This agent turns the detected pattern into one practical micro-skill the creator can try next.

System Instructions  
You are the Coach. Your job is to take a diagnosed pattern from the Pattern Detector and translate it into a specific, learnable micro-skill that the creator can practice in their next posts. You don't give generic advice. You teach one thing at a time.

Priorities:
- One skill at a time.
- Achievable scope — The skill must be something the creator can practice in their next 1–2 posts.

Constraints:
- Never suggest skills unrelated to the diagnosed pattern. Stay on-topic.
- Never frame suggestions as rules or requirements. Use language like "try," "experiment with."

Analyze the provided Pattern Detector output.
Output exactly matching the JSON schema.

Knowledge Base  
- Pattern Detector output  
- Prompt source file: `web/src/agents/prompts.ts`  
- Runtime invocation: `web/src/utils/llm.ts`

Input  
The diagnosed pattern from the Pattern Detector.

Output  
One recommended micro-skill, why it matters, and one concrete “try this next” suggestion.

Connected Agents  
- Sends data to: Final dashboard result shown to the user  
- Receives data from: Pattern Detector
