# TERA — Product Specification for MVP Build
**Version 2.0 | March 2026**

---

## 1. Overview

Tera is a web application that connects people who have specific real-world problems with people who have relevant direct experience, matched by AI. The knowledge transfer happens through human conversation — not AI-generated answers. The AI matches, facilitates, transcribes, and summarises. It does not participate in the exchange itself.

The default is free. Reputation is the primary currency. The platform supports an optional paid consultation tier for specialists who choose to charge for their time.

---

## 2. The Problem

AI learns from what has been written down. It compresses, recombines, and pattern-matches across billions of documents. What it cannot access is the knowledge that lives only in people — the hard-fought wisdom that comes from decades of struggling, failing, succeeding, and adapting across every conceivable context. This is not information. It is judgment, forged through lived experience and shaped by consequences.

Currently there is no efficient way to connect a person who has a specific problem with a person who has actually solved it — across borders, languages, industries, cultures, and economic strata. Existing solutions fall short:

- **AI assistants** offer compressed generality but lack lived experience and tacit knowledge.
- **Q&A forums** (Stack Overflow, Quora) are public, asynchronous, and reward performance over genuine help.
- **Course marketplaces** (Udemy, Coursera) package knowledge as content, not conversation.
- **Freelancer platforms** (Upwork) are transactional and price-first.

None facilitate direct, contextual, human-to-human knowledge transfer matched intelligently to the specifics of the problem.

---

## 3. The Vision

Tera is a global platform where anyone can describe a problem and be matched — by AI — with registered humans who have relevant direct experience. The knowledge transfer happens through conversation, not content.

A farmer in Kenya talking to an agronomist in Brazil. A shop owner in Vietnam getting advice from a retired CFO in London. A teacher in Egypt learning classroom techniques from a headteacher in Finland. Conversations that transcend language, culture, geography, and wealth.

Tera is not a marketplace, a course platform, a Q&A forum, or an AI assistant. It is connective tissue between human experience and human need.

---

## 4. How It Works — Three Journeys

### 4.1 The Person Who Needs Help (Asker)

1. Opens Tera and describes their problem in plain language, in any supported language. No forms, no categories, no jargon.
2. Tera may ask one or two clarifying questions to improve match precision (urgency, prior attempts, desired outcome).
3. Receives a notification when a matched helper accepts. Sees the helper's profile: track record, contexts worked in, narrative ratings from previous interactions.
4. Chooses how to connect: asynchronous message thread or synchronous video call. Real-time translation is applied where needed.
5. After the conversation, receives an AI-generated summary within five minutes. Invited to leave a narrative rating.

### 4.2 The Person Who Helps (Helper)

1. Registers and describes their background as a set of lived contexts: industries, problems navigated, geographies, languages, decades of practice.
2. Receives notifications when requests match their profile. Decides whether to accept — no obligation, no quota.
3. Most helpers give time for free. The accumulated record of who they've helped and what was said about them is its own reward. Helpers who need to charge may activate a paid tier and set their own rate.
4. After the conversation, receives the same AI-generated summary. Invited to leave a narrative rating. Ratings are bidirectional.

### 4.3 What Happens in Between (Matching Engine)

Between request submission and match delivery, the following sequence runs:

1. **Parsing.** The AI reads the request, generates a structured problem summary, assigns expertise domain tags, and infers geographic and cultural context. The parsed summary is shown to the Asker for confirmation before entering the matching queue. See [Section 8: Matching Engine](#8-matching-engine) for detail.
2. **Scoring.** Available helpers are scored against the confirmed request using a weighted semantic model. See [Section 8](#8-matching-engine) for weights and method.
3. **Notification cascade.** A ranked shortlist is generated and helpers are notified in order. Timeout intervals are urgency-dependent. See [Section 8.3](#83-notification-cascade-and-timeouts).
4. **Format recommendation.** Based on problem type and urgency, the AI recommends synchronous or asynchronous format.
5. **During the conversation.** The AI handles real-time translation where needed. It does not participate, suggest, or intervene. On completion, it generates a structured summary delivered to both parties.
6. **Learning.** Completed conversations feed back into the matching model. Successful matches — measured by narrative ratings, follow-up requests, and resolution signals — improve future match precision.

---

## 5. Reputation and Incentives

Every interaction builds a visible track record on the helper's profile. The incentive for senior figures is not payment but visible generosity — a public record of expertise and impact that no CV or biography can replicate.

For specialists whose time is their livelihood, an optional paid tier allows them to charge for conversations. Tera retains 15%. The paid tier exists to retain specialists, not to define the platform.

The bidirectional rating system ensures quality on both sides. Helpers are protected from time-wasters. Askers are protected from poor advice.

### 5.1 Reputation Score Calculation

The reputation score is a composite numeric value used internally for matching. It is never displayed publicly. It is derived from:

| Signal | Weight | Method |
|---|---|---|
| Resolved rate | 40% | Percentage of conversations marked "resolved" by the Asker |
| Rating sentiment | 30% | Sentiment analysis (via Claude API) of narrative ratings received, scored 0.0–1.0 |
| Response reliability | 15% | Percentage of accepted matches where the helper actually completed the conversation |
| Volume | 10% | Logarithmic scale of total completed conversations (diminishing returns past ~50) |
| Recency | 5% | Time-decay multiplier — recent activity weighted more than old |

New helpers with no history receive a neutral score of 0.5 (on a 0.0–1.0 scale). The score recalculates after every completed conversation.

---

## 6. Revenue Model

Tera's business model is designed to be invisible to the core experience. Revenue flows from the institutional and infrastructure layer, not from conversations.

| Stream | Description | MVP inclusion |
|---|---|---|
| **Institutional subscriptions** | Universities, NGOs, development banks, and corporations pay for a managed, verified presence — their experts visible, impact measurable, brand associated with demonstrable good. | No — Phase Two |
| **Data layer** | Anonymised, aggregated signal about global knowledge gaps (most-asked problems, lowest match rates, by region and domain). Sold to governments, foundations, research institutions. | No — Phase Two |
| **Infrastructure / white-label** | API or white-label access for organisations running Tera's matching engine inside their own networks. | No — Phase Two |
| **Verification layer** | Optional verified badge for experts in sensitive domains (medical, legal, financial). Modest per-verification fee. | No — Phase Two |
| **Paid consultations** | Helpers set their own rate. Tera retains 15% via Stripe Connect. Free helpers always prioritised over paid helpers of equivalent match score. | Yes |

**MVP revenue: paid consultations only.** All other streams are Phase Two.

---

## 7. The Knowledge Commons

Every completed conversation where both parties consent produces an anonymised summary published to a publicly searchable repository.

### 7.1 Consent Flow

1. On receiving the conversation summary, each party is asked independently: "Would you be willing for an anonymised version of this summary to be added to Tera's open knowledge commons? Your identity will not be disclosed."
2. Both must consent. If either declines, the record remains private.
3. Consent may be withdrawn at any time via account settings. On withdrawal, the corresponding knowledge commons entry is unpublished within 24 hours. The entry is soft-deleted (removed from public access but retained in anonymised form in the database for audit purposes, in compliance with GDPR Article 17(3)(d) — archiving in the public interest).

### 7.2 What Is Published

- The AI-generated summary only — never the full transcript.
- All identifying information stripped.
- Tagged with: expertise domain, geographic context, Tera-verified marker.
- The Tera-verified marker means the summary emerged from a real conversation between a real person with a problem and a real person with relevant experience, with both parties having rated the interaction.

---

## 8. Matching Engine

### 8.1 Request Parsing

On submission, the Claude API processes the raw request text with the following prompt structure:

1. **Problem extraction:** Identify the core problem. If the stated problem appears to mask a deeper or adjacent issue, surface both — the stated problem and the inferred underlying problem — and present both to the Asker for confirmation.
2. **Expertise tagging:** Generate 3–8 expertise domain tags. Tags are drawn from a controlled vocabulary maintained in the database (seeded at launch, expanded by admin review). Where no controlled tag fits, the AI may propose a new tag which enters an admin review queue.
3. **Context inference:** Infer geographic context (country, region), cultural context, economic context, and sector.
4. **Urgency assessment:** Classify as low, medium, or high based on language signals (explicit statements of urgency, time-sensitive indicators, risk of harm).

**Failure mode:** If the AI cannot parse the request into a structured summary with at least one expertise tag, the Asker is prompted to provide more detail. After two failed parse attempts, the request is routed to a human moderator for manual tagging.

### 8.2 Scoring Model

Available helpers are scored using **semantic similarity** (not exact tag matching) between the request's expertise profile and each helper's expertise profile. Similarity is computed via embeddings generated by the Claude API.

| Factor | Weight | Method |
|---|---|---|
| Expertise relevance | 40% | Cosine similarity between request embedding and helper profile embedding |
| Geographic and cultural proximity | 20% | Weighted match on country, region, and cultural context flags |
| Language match | 20% | Shared declared language scores 1.0; translation-bridgeable pair scores 0.5; unsupported pair scores 0.0 |
| Reputation score | 15% | Helper's current reputation score (see [Section 5.1](#51-reputation-score-calculation)) |
| Availability | 5% | Available = 1.0, Limited = 0.5, Unavailable = 0.0 |

A ranked shortlist of up to five helpers is generated. Helpers with an availability status of "unavailable" are excluded entirely.

**Paid helper ranking:** Free helpers are ranked above paid helpers of equivalent score unless the Asker has explicitly filtered for paid specialists. When a paid helper is in the shortlist, the Asker sees the rate before confirming the match.

### 8.3 Notification Cascade and Timeouts

Timeout intervals are urgency-dependent:

| Urgency | Timeout per helper | Max cascade time (5 helpers) |
|---|---|---|
| High | 30 minutes | 2.5 hours |
| Medium | 2 hours | 10 hours |
| Low | 6 hours | 30 hours |

1. The top-ranked helper receives a notification with the AI-parsed problem summary and is invited to accept or decline.
2. If no response within the urgency-appropriate timeout, the notification cascades to the next ranked helper.
3. If no helper from the initial shortlist accepts, the request enters a queue. The Asker is notified: "We haven't found a match yet. We'll notify you as soon as someone with relevant experience becomes available."
4. The engine re-runs automatically when new helpers register, existing helpers update their availability, or every 24 hours for queued requests.

**Failure mode:** If a request remains unmatched for 7 days, the Asker is notified and offered the option to revise their request or close it.

### 8.4 Format Recommendation

Based on the parsed request, the AI recommends a conversation format:

- **Asynchronous** (default): for non-urgent problems, situations requiring research or reflection, or where timezone differences exceed 6 hours.
- **Synchronous**: for urgent problems, complex or nuanced issues where back-and-forth is essential, or where both parties are in compatible timezones and both available.

The recommendation is a suggestion. Either party may override it.

---

## 9. Notification System

### 9.1 Channels

All notifications are delivered via two channels:

1. **In-app** (always on, not dismissable as a channel — individual notifications are dismissable).
2. **Email** (on by default, can be turned off per notification type in settings).

Push notifications and SMS are excluded from MVP.

### 9.2 Notification Types

| Event | Recipient | Channel | Timing |
|---|---|---|---|
| Request parsed and confirmed | Asker | In-app | Immediate |
| Match found — helper invitation | Helper | In-app + email | Immediate |
| Helper accepted — match confirmed | Asker | In-app + email | Immediate |
| Helper declined or timed out, cascading | Asker | In-app | On cascade |
| No match found (shortlist exhausted) | Asker | In-app + email | On exhaustion |
| Request unmatched after 7 days | Asker | In-app + email | Day 7 |
| New message in async thread | Both | In-app + email | Immediate (email debounced to max 1 per 10 minutes) |
| Scheduled call reminder | Both | In-app + email | 1 hour before, 10 minutes before |
| Conversation marked complete | Both | In-app + email | Immediate |
| Summary ready | Both | In-app + email | On generation |
| Rating received (after both submitted) | Both | In-app | Immediate |
| Content flagged by moderation | Submitter | In-app + email | Immediate |
| Async thread auto-closing (inactivity) | Both | In-app + email | 3 days warning, then on close |

### 9.3 Notification Preferences

Users may configure per-type email opt-out from account settings. In-app notifications cannot be disabled but can be marked as read. There is no global "mute all" — critical notifications (match found, summary ready, moderation flags) are always delivered via both channels.

---

## 10. Trust, Safety, and Moderation

### 10.1 Content Pre-screening

All user-submitted text (requests, biographies, messages, ratings) is passed through the Claude API with a safety prompt at the point of submission. Content is checked for:

- Harmful, abusive, or threatening language.
- Personally identifying information that should not be public (phone numbers, addresses in contexts where they shouldn't appear).
- Spam, commercial solicitation, or SEO manipulation.
- Obvious misrepresentation of expertise.

**On flag:** The content is held (not published or delivered) and the submitter is notified: "Your submission is under review. You'll hear back within 24 hours." The content enters the moderation queue.

**False positive handling:** If the AI flags content that the submitter believes is legitimate, they may appeal via a one-click "Request review" action which escalates to a human moderator.

### 10.2 High-Risk Domain Handling

Requests tagged with medical, legal, or financial expertise domains carry an automatic, non-dismissible disclaimer visible to the Asker before and after the conversation:

> "The advice you receive through Tera comes from individuals sharing their personal experience. It is not a substitute for professional medical, legal, or financial advice. Always consult a qualified professional before acting on any guidance received."

This disclaimer is also appended to the AI-generated summary for high-risk domain conversations.

### 10.3 Reporting

Either party may report a conversation at any point via an in-app "Report" action. Reports require a reason (selected from a predefined list: abusive behaviour, misleading expertise, spam, inappropriate content, other) and optional free-text detail. Reports enter the moderation queue with high priority.

### 10.4 Moderation Queue and Admin Interface

The admin interface provides:

- **Queue view:** All flagged content and reports, sorted by priority (reports > AI flags > new tag proposals). Each item shows the flagged content, context, reason, and reporting party.
- **Actions available:** Approve (release held content), reject (permanently block content with notification to submitter), warn user (content released with a warning), suspend user (temporary account freeze with notification), ban user (permanent account deactivation).
- **Escalation:** Any moderator may escalate a case to a senior moderator (role-based). Escalated cases require two-moderator agreement before action.
- **Helper quality monitoring:** Helpers whose last 5 ratings have a sentiment score below 0.3 are automatically surfaced in the queue for review. Moderators may warn, suspend, or remove helper status.
- **Audit log:** All moderator actions are logged with timestamp, moderator ID, action taken, and reason.

### 10.5 Moderator Roles

At MVP, moderation is handled by the founding team. The admin interface supports two roles:

- **Moderator:** Can approve, reject, warn. Cannot suspend or ban.
- **Senior moderator:** Full action set including suspend, ban, and role management.

---

## 11. Data Model

### 11.1 Users

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| email | string | Unique |
| name | string | Required |
| country | string | ISO 3166-1 alpha-2 |
| region | string | Nullable, free text |
| languages | string[] | ISO 639-1 codes |
| is_helper | boolean | Default false |
| profile_photo_url | string | Nullable |
| created_at | timestamp | |
| updated_at | timestamp | |
| account_status | enum | active, suspended, banned, deleted |

A user may be both an asker and a helper. The `is_helper` flag indicates whether the user has completed helper onboarding and has an active helper profile. Any user may submit requests regardless of `is_helper` status.

### 11.2 Helper Profiles

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | FK → Users, unique |
| biography | text | Minimum 100 words, required |
| expertise_tags | string[] | AI-generated, reviewed by helper |
| expertise_embedding | vector | Generated from biography + tags via Claude API |
| availability_status | enum | available, limited, unavailable |
| paid_tier_active | boolean | Default false |
| session_rate_cents | integer | Nullable, in smallest currency unit |
| session_rate_currency | string | ISO 4217, default USD |
| credential_upload_url | string | Nullable |
| linkedin_url | string | Nullable |
| verified_badge | boolean | Default false |
| reputation_score | float | 0.0–1.0, default 0.5 |
| total_conversations | integer | Default 0 |
| resolved_rate | float | 0.0–1.0, calculated |
| response_reliability | float | 0.0–1.0, calculated |
| public_profile_slug | string | Unique, URL-safe |
| created_at | timestamp | |
| updated_at | timestamp | |

### 11.3 Requests

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| asker_user_id | UUID | FK → Users |
| raw_text | text | As submitted |
| parsed_summary | text | AI-generated |
| stated_problem | text | AI-extracted |
| inferred_problem | text | Nullable — populated when AI detects a deeper issue |
| expertise_tags | string[] | AI-assigned from controlled vocabulary |
| request_embedding | vector | Generated from parsed summary + tags |
| geographic_context | jsonb | { country, region, inferred_cultural_context } |
| urgency | enum | low, medium, high |
| preferred_format | enum | synchronous, asynchronous, no_preference |
| status | enum | parsing, confirmed, matching, matched, in_progress, resolved, unmatched, closed |
| parse_attempt_count | integer | Default 0, max 2 before moderator routing |
| matched_helper_id | UUID | Nullable, FK → Helper Profiles |
| created_at | timestamp | |
| updated_at | timestamp | |
| unmatched_notified_at | timestamp | Nullable, set when 7-day notification sent |

### 11.4 Match Attempts

Tracks the cascade process per request.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| request_id | UUID | FK → Requests |
| helper_profile_id | UUID | FK → Helper Profiles |
| match_score | float | Composite score at time of match |
| rank | integer | Position in shortlist (1–5) |
| notified_at | timestamp | |
| response | enum | pending, accepted, declined, timed_out |
| responded_at | timestamp | Nullable |

### 11.5 Conversations

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| request_id | UUID | FK → Requests |
| asker_user_id | UUID | FK → Users |
| helper_user_id | UUID | FK → Users |
| format | enum | synchronous, asynchronous |
| status | enum | active, completed, reported, abandoned |
| start_at | timestamp | |
| end_at | timestamp | Nullable |
| transcript_url | string | Nullable, reference to stored transcript |
| summary_id | UUID | Nullable, FK → Conversation Summaries |
| translation_applied | boolean | Default false |
| translation_language_pair | string | Nullable, e.g. "en-es" |
| auto_close_warning_sent | boolean | Default false |
| last_activity_at | timestamp | Updated on every message or call event |

### 11.6 Conversation Summaries

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| conversation_id | UUID | FK → Conversations |
| problem_as_stated | text | |
| problem_as_understood | text | |
| approach_provided | text | |
| key_actions | text | |
| follow_up_required | text | Nullable |
| high_risk_disclaimer | boolean | Default false |
| generated_at | timestamp | |
| generation_status | enum | pending, completed, failed |

### 11.7 Ratings

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| conversation_id | UUID | FK → Conversations |
| author_user_id | UUID | FK → Users |
| subject_user_id | UUID | FK → Users |
| narrative_text | text | Required, minimum 20 characters |
| resolved | boolean | Only present when author is the Asker |
| sentiment_score | float | 0.0–1.0, AI-calculated on submission |
| visible | boolean | Default false, set true when both parties have submitted |
| created_at | timestamp | |

### 11.8 Knowledge Commons Entries

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| conversation_id | UUID | FK → Conversations |
| anonymised_summary | text | |
| domain_tags | string[] | |
| geographic_context_tags | string[] | |
| tera_verified | boolean | Default true |
| asker_consent | boolean | |
| helper_consent | boolean | |
| published | boolean | Default true |
| published_at | timestamp | |
| unpublished_at | timestamp | Nullable, set on consent withdrawal |

### 11.9 Scheduled Calls

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| conversation_id | UUID | FK → Conversations |
| proposed_by_user_id | UUID | FK → Users |
| proposed_time | timestamp | |
| accepted | boolean | Nullable — null = pending, true = accepted, false = declined |
| daily_room_url | string | Generated on acceptance |
| reminder_1h_sent | boolean | Default false |
| reminder_10m_sent | boolean | Default false |
| call_started_at | timestamp | Nullable |
| call_ended_at | timestamp | Nullable |
| no_show_user_id | UUID | Nullable, FK → Users, set if one party doesn't join within 15 min |

### 11.10 Notifications

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | FK → Users |
| type | enum | See [Section 9.2](#92-notification-types) for full list |
| reference_id | UUID | Polymorphic — points to request, conversation, rating, etc. |
| reference_type | string | Table name of referenced entity |
| channel | enum | in_app, email |
| title | string | |
| body | text | |
| read | boolean | Default false (in-app only) |
| sent_at | timestamp | |
| delivered | boolean | Default false (email only, updated by email provider webhook) |

### 11.11 Notification Preferences

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | FK → Users, unique |
| email_match_found | boolean | Default true |
| email_new_message | boolean | Default true |
| email_call_reminder | boolean | Default true |
| email_summary_ready | boolean | Default true |
| email_moderation_flag | boolean | Default true (non-overridable in UI — always true) |
| email_request_status | boolean | Default true |

### 11.12 Reports

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| conversation_id | UUID | FK → Conversations |
| reporter_user_id | UUID | FK → Users |
| reason | enum | abusive_behaviour, misleading_expertise, spam, inappropriate_content, other |
| detail | text | Nullable |
| status | enum | open, under_review, resolved_action_taken, resolved_no_action |
| assigned_moderator_id | UUID | Nullable, FK → Users |
| created_at | timestamp | |
| resolved_at | timestamp | Nullable |

### 11.13 Moderation Actions

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| moderator_user_id | UUID | FK → Users |
| target_user_id | UUID | Nullable, FK → Users |
| target_content_type | string | Nullable — request, message, biography, rating |
| target_content_id | UUID | Nullable |
| report_id | UUID | Nullable, FK → Reports |
| action | enum | approve, reject, warn, suspend, ban, escalate |
| reason | text | Required |
| created_at | timestamp | |

### 11.14 Expertise Tags (Controlled Vocabulary)

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| tag | string | Unique, lowercase |
| domain | string | Top-level grouping (e.g. agriculture, finance, education) |
| status | enum | active, proposed, rejected |
| proposed_at | timestamp | |
| reviewed_at | timestamp | Nullable |

### 11.15 Payments

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| conversation_id | UUID | FK → Conversations |
| asker_user_id | UUID | FK → Users |
| helper_user_id | UUID | FK → Users |
| amount_cents | integer | Total charged |
| currency | string | ISO 4217 |
| tera_fee_cents | integer | 15% of amount |
| helper_payout_cents | integer | 85% of amount |
| stripe_payment_intent_id | string | |
| stripe_transfer_id | string | Nullable, set on payout |
| status | enum | pending, captured, failed, refunded |
| created_at | timestamp | |
| captured_at | timestamp | Nullable |
| refunded_at | timestamp | Nullable |

---

## 12. Core Features — MVP

### 12.1 Registration and Onboarding

**Asker onboarding:**
- Email registration or Google/Apple sign-in via Supabase Auth.
- Fields required: name, country, primary language.
- Completion time: under two minutes.
- No further steps required to submit a request.

**Helper onboarding:**
- Same authentication.
- Additional required fields: free-text biography (minimum 100 words), languages spoken, availability status.
- On submission, Claude API generates expertise tags from the biography. Tags are displayed to the helper for review — they may add, remove, or modify before confirming.
- Optional: credential upload, LinkedIn URL.
- Profile is immediately active on confirmation.
- An expertise embedding is generated from the biography and confirmed tags and stored on the helper profile.

**Error handling:**
- If Claude API is unavailable during tag generation, the helper is notified: "We're processing your profile — you'll receive your expertise tags within the hour." A background job retries at 5-minute intervals for up to 1 hour, then routes to manual tagging by a moderator.
- If biography is under 100 words, the form rejects with inline validation before submission.
- Duplicate email registration returns a clear message with a login link.

### 12.2 Request Submission

The Asker accesses a single-field submission interface and describes their problem in plain language. No category selection or form structure.

On submission:
1. Status set to `parsing`.
2. Claude API processes the text per [Section 8.1](#81-request-parsing).
3. The parsed summary, expertise tags, and inferred context are displayed to the Asker for confirmation.
4. Asker may edit the summary or tags before confirming.
5. On confirmation, status moves to `confirmed`, then immediately to `matching` as the engine runs.

**Error handling:**
- If the AI cannot produce a structured summary after 2 attempts, the Asker sees: "We need a bit more detail to find the right person. Could you describe the problem differently or add more context?" After two failed re-submissions, the request is routed to a human moderator.
- If Claude API is unavailable, the request is queued with status `parsing` and a message is shown: "We're finding the right match — you'll be notified shortly." A background job retries at 5-minute intervals.
- Empty or trivially short submissions (under 20 characters) are rejected with inline validation.

### 12.3 Matching

On confirmation, the matching engine runs per [Section 8](#8-matching-engine). The notification cascade follows urgency-dependent timeouts per [Section 8.3](#83-notification-cascade-and-timeouts).

**Error handling:**
- If no helpers exist in the database with a non-zero match score, the request moves immediately to `unmatched` and the Asker is notified.
- If a helper accepts but subsequently becomes unresponsive (no message or call join within 24 hours of acceptance), the match is voided, the request returns to `matching`, and the cascade continues from the next ranked helper.

### 12.4 Asynchronous Conversation

On match acceptance where format is asynchronous:
1. A private message thread opens via Stream.
2. DeepL translation is applied automatically where the two parties do not share a declared common language.
3. Messages are delivered in real time via Stream's websocket connection. Email notifications for new messages are debounced (max 1 per 10 minutes).
4. The conversation remains open until either party marks it complete or until 30 days of inactivity.

**Inactivity auto-close:**
- At 27 days of inactivity, both parties receive a notification: "This conversation will close in 3 days due to inactivity. Send a message to keep it open."
- At 30 days, the conversation status moves to `completed`.
- Either party may reopen within 7 days of auto-close by sending a new message.

**Translation limitations:**
- DeepL supports approximately 30 languages. If either party's declared language is unsupported by DeepL, translation is not applied and both parties are notified: "Automatic translation is not available for this language pair. You may still communicate directly." The conversation proceeds without translation.
- Supported language pairs are maintained as a reference table and checked at match time. Unsupported pairs reduce the language match score to 0.0, which affects ranking but does not prevent matching.

**Error handling:**
- If Stream is unavailable, a retry mechanism attempts connection 3 times over 30 seconds. If still unavailable, both parties are notified: "Messaging is temporarily unavailable. We'll notify you when it's back." The conversation remains in `active` status.
- If DeepL is unavailable, messages are delivered untranslated with a notice: "Translation is temporarily unavailable. Your message was delivered in its original language."

### 12.5 Synchronous Conversation

Where a synchronous call is preferred or recommended:
1. On match acceptance, both parties are shown a simple scheduling interface: each selects available 1-hour windows over the next 7 days.
2. The system finds overlapping availability and proposes a time. Either party confirms.
3. On confirmation, a Daily.co video room is created and a unique link is sent to both parties.
4. Deepgram transcription runs automatically during the call.
5. Reminders are sent at 1 hour and 10 minutes before the scheduled time.

**No-show handling:**
- If one party has not joined 15 minutes after the scheduled start time, the waiting party is notified: "Your conversation partner hasn't joined yet. You can wait or reschedule."
- If neither party joins within 30 minutes, the call is cancelled. Both are notified and offered the option to reschedule.
- If one party is a no-show, this is recorded on the `Scheduled Calls` record and factors into the no-show party's `response_reliability` score.

**Error handling:**
- If Daily.co room creation fails, the system retries twice. If still failing, both parties are notified: "Video call setup failed. Would you like to switch to messaging instead?" The conversation format can be changed.
- If Deepgram transcription fails mid-call, the call continues uninterrupted. A partial transcript is generated where possible. The post-conversation summary notes: "This summary is based on a partial transcript."

### 12.6 Post-Conversation Summary and Rating

On completion:
1. The full transcript (Deepgram for synchronous, Stream message history for asynchronous) is passed to the Claude API.
2. Claude generates a structured summary: problem as stated, problem as understood, approach or advice provided, key actions agreed, follow-up required.
3. For high-risk domains, the disclaimer from [Section 10.2](#102-high-risk-domain-handling) is appended.
4. The summary is delivered to both parties via in-app notification and email within 5 minutes.
5. Both parties are invited to submit a narrative rating (minimum 20 characters) and the Asker is shown a resolved/unresolved toggle.
6. Neither party sees the other's rating until both have submitted, at which point both become visible on the relevant profiles.

**Error handling:**
- If summary generation fails, the system retries 3 times at 2-minute intervals. If still failing, both parties are notified: "Your conversation summary is being processed and will arrive shortly." A background job continues retrying for up to 24 hours. If still failing, a moderator is notified.
- If only one party submits a rating after 14 days, that rating becomes visible. The non-responding party's rating slot shows "No rating submitted."

### 12.7 Helper Public Profile

Each helper has a publicly accessible profile page at `tera.app/p/{slug}` displaying:
- Name, location (country), languages, expertise tags.
- Availability status.
- Verified badge (if applicable).
- Total conversations completed and resolved rate (as percentages, not raw numbers until >10 conversations).
- All narrative ratings received, in full, newest first.

The internal reputation score is never displayed.

### 12.8 Knowledge Commons

Operates per [Section 7](#7-the-knowledge-commons).

The knowledge commons is a publicly searchable page on the Tera platform. Entries are browsable by domain tag and geographic context. Full-text search is supported. No login is required to browse the commons.

### 12.9 Optional Paid Consultations

1. Helpers activate the paid tier from profile settings and set a per-session rate and currency.
2. Stripe Connect onboarding is initiated. The helper must complete Stripe's identity verification before the paid tier is active.
3. When a paid helper appears in a match shortlist, the Asker sees the rate before confirming.
4. On match confirmation with a paid helper, a Stripe PaymentIntent is created for the session rate. The Asker's card is authorised but not charged.
5. On conversation completion, the payment is captured. Tera retains 15% and the remainder is transferred to the helper's Stripe Connect account.
6. If the conversation is reported and the report is upheld, the payment is refunded to the Asker.

**Error handling:**
- If Stripe Connect onboarding fails or is abandoned, the paid tier remains inactive. The helper is notified with a link to resume onboarding.
- If payment authorisation fails, the Asker is notified: "Payment could not be authorised. Please update your payment method or choose a free helper." The match is not confirmed until payment is authorised.
- If payment capture fails after conversation completion, the system retries 3 times. If still failing, the case is flagged for manual resolution.

---

## 13. Technology Stack

| Component | Technology | Purpose |
|---|---|---|
| Frontend | Next.js + Tailwind CSS | Web application UI |
| Backend + database | Supabase (Postgres, Auth, Storage, Realtime) | Data persistence, authentication, file storage |
| AI matching, parsing, summarisation | Claude API (Anthropic) | Request parsing, expertise tagging, embedding generation, summary generation, content moderation |
| Transcription | Deepgram | Real-time speech-to-text for synchronous calls |
| Async messaging | Stream | Private message threads with real-time delivery |
| Video/voice calls | Daily.co | Synchronous video rooms |
| Payments | Stripe + Stripe Connect | Payment processing, helper payouts |
| Translation | DeepL API | Real-time text translation (~30 languages) |
| Frontend hosting | Vercel | |
| Backend hosting | Supabase Cloud (EU region) | GDPR-compliant data residency |

---

## 14. Non-Functional Requirements

- Fully responsive on mobile browsers. No native app in MVP.
- Supports right-to-left display for Arabic and Hebrew.
- GDPR compliant. Users may request full data deletion at any time. Deletion removes personal information. Anonymised knowledge commons entries where consent was given are retained per GDPR Article 17(3)(d). If consent is withdrawn, the knowledge commons entry is unpublished.
- All data stored in EU-based Supabase infrastructure.
- Must support 10,000 concurrent users without architectural changes.
- Target page load time: under 2 seconds on a 3G connection.
- All API endpoints respond within 500ms under normal load (excluding AI processing, which is asynchronous).

---

## 15. MVP Success Criteria

The MVP is considered successful when the following can be demonstrated:

1. A new user can submit a request and receive a matched helper notification within 24 hours.
2. A complete asynchronous conversation takes place including message delivery, translation (where applicable), and AI summary delivery within 5 minutes of completion.
3. A complete synchronous conversation takes place including scheduling, video call, transcription, and AI summary delivery.
4. Both parties rate the interaction and those ratings appear on the helper's public profile.
5. At least one knowledge commons entry has been published with dual consent.
6. A paid consultation completes end-to-end: Stripe authorisation, conversation, payment capture, helper payout.
7. A moderation flag is raised, enters the queue, and is resolved by an admin.

---

## 16. Features Excluded from MVP — Phase Two

- Voice-only calls (MVP supports video only via Daily.co).
- Mobile applications (iOS and Android).
- Real-time in-call voice translation.
- Institutional subscription dashboard and management.
- Knowledge gap analytics and data layer reporting.
- API and white-label infrastructure access.
- Verified badge credentialing workflow (badge exists as a field, but the verification process is manual/admin-only in MVP).

---

## 17. Open Questions — To Be Resolved

1. **Translation coverage vs. vision.** DeepL supports ~30 languages. The vision invokes users in regions where Swahili, Amharic, Yoruba, and other languages are primary. Either the MVP launches with honest language boundaries and expands later, or alternative translation providers (Google Translate API, Meta's NLLB) are evaluated for broader coverage at potentially lower quality. Decision required before build.

2. **The empty restaurant problem.** The platform needs helper density before it can reliably match. Options: (a) seeded beta within a single vertical (e.g. agriculture, education) via institutional partnerships, (b) invitation-only launch with pre-recruited helpers, (c) open launch with honest "we're growing" messaging for unmatched requests. Decision required before launch.

3. **Expertise tag vocabulary management.** The controlled vocabulary needs a seeding strategy. Options: (a) manually curated initial set of 200–500 tags across target domains, (b) AI-generated vocabulary from a corpus of common problems, with human review. The ongoing process (AI proposes, admin reviews) is defined, but the starting point is not.

4. **Trust in high-risk domains.** The disclaimer is a minimum. For medical, legal, and financial domains, should MVP additionally require helpers to self-declare that they hold relevant qualifications? This is not verification (Phase Two) but a self-attestation that provides a minimal additional signal.
