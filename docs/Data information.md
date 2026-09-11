# Data information

Questions about where Ask Analysis gets its data, what Trellis stores, and how long it is kept.

---

## 1. Where does the Ask Analysis agent get the data to answer the user question?

It does **not** call YouTube again and does **not** re-run the pipeline. As planned, each question is answered from a **packet** built from the analysis you already have open:

- That video’s saved record: URL, collector metrics, deconstructor, audience, pattern, coach
- The chat so far
- Optionally a few **older analyses** (the same history used today for `buildHistoricalContext`)

If a fact isn’t in that packet, the agent should say it wasn’t captured — not invent it.

Important: raw comment text is used **during** the run to produce the Audience Signal Reader output, but it is **not** stored on the analysis row. So “what did people say?” would be answered from the **audience summary** (themes/observation), not a replay of the original comments.

---

## 2. What kind of data is the system storing in the database? Is it all agents’ output, or just the final summary analysis that is visible to the user, or something else?

For signed-in users, each run is one row in `analyses`. That row is **all five agent outputs**, not only the dashboard summary:

| Column | What it is | Shown on the home dashboard? |
|---|---|---|
| `video_url` | YouTube link | Indirectly (thumbnail/title) |
| `data_collector` | Title, channel, views, likes, comment **count**, category, truncated description, tags, thumbnail | Yes (title, thumb, views/likes/comments) |
| `deconstructor` | Hook / packaging / curiosity-gap JSON | No (Agents page / internals) |
| `audience` | Signal type, observation, confidence | No (not the raw comments) |
| `pattern` | Diagnosis (type, observation, craft element) | Yes — “AI diagnosis” |
| `coach` | Skill, why it matters, try-this | Yes — micro-skill + action plan |
| `created_at` | When it was saved | Past Analysis list |

The UI is a **subset**. The DB keeps the **full structured outputs** so later features (Ask Analysis, compare to last video) can use them.

Guests: same shape in **browser localStorage**, not Supabase.

Also stored elsewhere, not as “the analysis”: `profiles`, optional waitlist `access_requests`, `feedback`.

Chat transcripts are **not** stored yet (v1 is in-memory only).

---

## 3. How long does the system store the data?

There is **no auto-expiry**. Nothing in the schema deletes old analyses after 30/90 days.

They stay until:

- You delete that item in **Past Analysis**
- The **account is deleted** (analyses cascade with the user)
- Guest data: until localStorage is cleared or they delete that item

`created_at` is only a timestamp, not a retention policy. If you want chats or analyses to expire, that would be a new rule.
