# Real-Time AI Call Objection Handling Assistant

A production-ready full-stack application that enables sales representatives to make phone calls directly through a browser and receive real-time, AI-powered objection-handling suggestions as words are spoken.

---

## 1. System Architecture & Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor Rep as Sales Representative (Browser)
    participant Front as Frontend (React + Vite)
    participant Back as Backend (Fastify + WS)
    participant LK as LiveKit (WebRTC Room)
    participant Twilio as Twilio Telephony (SIP Trunk)
    participant Phone as Customer (Cellular Phone)
    participant AI as OpenAI (Whisper + GPT-4o)
    participant DB as PostgreSQL (Prisma)

    Rep->>Front: Enters customer phone number & clicks "Start Live Call"
    Front->>Back: POST /api/calls/initiate
    Back->>LK: Creates room & generates JWT tokens
    Back->>Twilio: Outbound call with SIP TwiML URL
    Back->>DB: Stores Call entity (status: INITIATED)
    Back-->>Front: Returns callId, LiveKit tokens & room URL
    Front->>LK: Connects sales rep WebRTC audio & enables microphone
    Twilio->>Phone: Dials customer's phone
    Phone-->>Twilio: Customer answers
    Twilio->>Back: POST /api/webhooks/twilio/voice
    Back-->>Twilio: TwiML <Dial><Sip>sip:voiceai@sip.livekit.cloud</Sip></Dial>
    Twilio->>LK: Bridges customer audio into LiveKit room as SIP participant
    Note over LK: LiveKit delivers 2-way real-time audio between Rep and Customer

    par Real-Time Speech Processing
        LK->>Back: Live audio stream chunks (Agent & Customer)
        Back->>AI: OpenAI Whisper STT API
        AI-->>Back: Transcribed speech
        Back->>DB: Stores Transcript record
        Back-->>Front: WS "transcript.partial" & "transcript.final"
    end

    opt Customer Voices Objection
        Back->>AI: Evaluates statement against 8 objection categories
        AI-->>Back: Validated JSON (Category, Intent, Confidence, Sentiment)
        Back->>DB: Stores Objection record
        Back-->>Front: WS "objection.detected" & "sentiment.updated"
        Back->>AI: Generates contextual primary & alternative responses
        AI-->>Back: Validated suggestions (Primary, Alt 1, Alt 2, Rationale)
        Back->>DB: Stores AISuggestion record
        Back-->>Front: WS "suggestion.generated"
    end

    Rep->>Front: Views suggestion, clicks Accept / Reject / Custom Edit
    Front->>Back: POST /api/suggestions/:id/feedback
    Back->>DB: Stores AgentFeedback
    Back-->>Front: WS "suggestion.feedback"

    Rep->>Front: Clicks "End Call"
    Front->>Back: POST /api/calls/:id/end
    Back->>Twilio: Terminates call
    Back->>LK: Cleans up room
    Back->>DB: Calculates duration, aggregates Objection, Performance & AI Accuracy reports
    Back-->>Front: Returns Post-Call Summary Report
```

---

## 2. Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, LiveKit Client SDK
- **Backend**: Node.js 22, TypeScript, Fastify 5, `@fastify/websocket`, `@fastify/formbody`, `@fastify/cors`
- **Telephony & Real-Time Media**:
  - Twilio Voice API (SIP Trunking, TwiML `<Dial><Sip>`, Call Status Webhooks, Signature Verification)
  - LiveKit Server & Client SDK (WebRTC Rooms, AccessToken JWT, SIP Participant bridging)
  - WebSocket (`/ws` channel for typed real-time event streaming)
- **Artificial Intelligence**:
  - OpenAI Whisper (`whisper-1`) for speech-to-text
  - OpenAI GPT-4o for structured objection detection and response generation
- **Database & Persistence**:
  - PostgreSQL 16
  - Prisma ORM 6 (with automatic fallback to in-memory store in sandbox/test mode)

---

## 3. Core Application Features

### A. Sales Representative Dashboard
- Enter any customer phone number and choose an objection scenario.
- Initiate call with single-click browser telephony.
- Real-time call status indicators (`INITIATED`, `RINGING`, `IN_PROGRESS`, `COMPLETED`).
- View recent call history with duration, dates, and direct links to reports.

### B. Live Call Screen
- **Real-Time Telephony Bar**: Shows customer number, live ticking duration timer, LiveKit WebRTC audio connection indicator, microphone mute/unmute control, and prominent End Call button.
- **Live Conversation Transcript**:
  - Distinguishes between Sales Representative and Customer with visual badges.
  - Streaming partial transcription feedback.
  - Automatic auto-scroll to the latest utterance.
  - Built-in simulator input bar to test customer objection statements on the fly.
- **Detected Objection Card**:
  - Categorizes across the 8 required objection classes:
    1. *Pricing or budget concerns*
    2. *Already using another provider*
    3. *Lack of interest*
    4. *Lack of trust*
    5. *Product limitations*
    6. *Timing concerns*
    7. *Competitor comparison*
    8. *Other objections*
  - Displays customer statement, underlying intent, confidence percentage, and sentiment badge.
- **AI Suggested Responses**:
  - Primary recommended response.
  - Alternative response 1 and Alternative response 2.
  - Customer sentiment analysis and recommended approach rationale.
  - 1-click **Copy Response** to clipboard.
  - **Accept** / **Reject** buttons to log rep feedback.
  - **Custom Edit** mode allowing reps to tailor wording and submit edited feedback.

### C. Post-Call Summary & Reports
- **Objection Report**: Total objections detected, category breakdown distribution, customer quotes, and accepted vs rejected counts.
- **Agent Performance Review**: Total objections handled with AI, acceptance rate percentage, outcome summary, and rep notes.
- **AI Accuracy & Reliability Report**: Detection count, generation count, perceived model accuracy percentage, feedback notes, and explicit disclaimer (*acceptance does not imply guaranteed conversion*).
- **Call Selector**: Dropdown to review and compare any previous call report stored in the database.

---

## 4. Environment Configuration

Copy `.env.example` to `backend/.env`:

```bash
cp .env.example backend/.env
```

### Environment Variables:

| Variable | Description | Default / Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/voice_ai_assistant?schema=public` |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | `AC...` |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | `your_auth_token` |
| `TWILIO_PHONE_NUMBER` | Outbound Twilio Phone Number | `+15551234567` |
| `LIVEKIT_URL` | LiveKit Cloud / Server URL | `wss://your-project.livekit.cloud` |
| `LIVEKIT_API_KEY` | LiveKit API Key | `API...` |
| `LIVEKIT_API_SECRET` | LiveKit API Secret | `secret...` |
| `LIVEKIT_SIP_URI` | LiveKit Inbound SIP URI | `sip:voiceai@sip.livekit.cloud` |
| `LIVEKIT_SIP_USERNAME` | LiveKit Inbound SIP Username for authentication | `sip_username` |
| `LIVEKIT_SIP_PASSWORD` | LiveKit Inbound SIP Password for authentication | `sip_password` |
| `LIVEKIT_SIP_DOMAIN` | LiveKit Inbound SIP Domain (optional, extracted from URI if unset) | `sip.livekit.cloud` |
| `OPENAI_API_KEY` | OpenAI API Key | `sk-...` |
| `OPENAI_MODEL` | OpenAI Model | `gpt-4o` |
| `BACKEND_URL` | Fastify backend public URL | `http://localhost:5000` |
| `FRONTEND_URL` | Vite frontend URL | `http://localhost:3000` |
| `MOCK_EXTERNAL_SERVICES` | Set to `false` when using real Twilio/LiveKit/OpenAI | `true` |

---

## 5. Running the Application

### Option A: Local Development (Node.js)

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Generate Prisma Client**:
   ```bash
   npm run prisma:generate --workspace=backend
   ```

3. **Start Backend Server** (Port 5001):
   ```bash
   npm run dev --workspace=backend
   ```

4. **Start Frontend Client** (Port 3000):
   ```bash
   npm run dev --workspace=frontend
   ```

5. Open your browser at **`http://localhost:3000`**.

---

### Option B: Docker Compose

To launch the complete stack (PostgreSQL, Backend, and Frontend) in Docker:

```bash
docker compose up --build
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5001`
- PostgreSQL: `localhost:5432`

---

## 6. Live Telephony & SIP Configuration Guide

To connect live phone calls between Twilio and LiveKit:

1. **Twilio SIP Trunking**:
   - In the Twilio Console, create a SIP Trunk or point the voice webhook to:
     `${BACKEND_URL}/api/webhooks/twilio/voice`
   - The webhook returns TwiML dialing LiveKit's SIP URI:
     ```xml
     <Response>
       <Say>Please note that this call is recorded and assisted in real time.</Say>
       <Dial>
         <Sip>sip:voiceai@sip.livekit.cloud?room={roomName}</Sip>
       </Dial>
     </Response>
     ```

2. **LiveKit SIP Inbound Dispatch**:
   - In LiveKit Cloud or Server, configure an Inbound SIP Dispatch Rule:
     ```yaml
     sip_rules:
       - name: "sales_calls"
         trunk_ids: ["ST_xxx"]
         dispatch_rule:
           dispatch_rule_direct:
             room_name: "{room}"
             pin: ""
     ```
   - When Twilio dials the SIP URI, LiveKit automatically places the customer into the designated room as a SIP participant (`sip_customer`), streaming their audio directly into the sales rep's browser session.

3. **OpenAI Real-Time Processing**:
   - LiveKit audio tracks are forwarded to OpenAI Whisper for real-time transcription.
   - Identified speech triggers objection detection and recommendation generation through Fastify and `@fastify/websocket`.

4. **Activating Real Mode**:
   Set `MOCK_EXTERNAL_SERVICES=false` in `backend/.env` with your actual API keys. When keys contain placeholders or `MOCK_EXTERNAL_SERVICES=true`, the built-in realistic simulation engine activates automatically.

---

## 7. Testing Suite

The repository includes comprehensive unit, integration, and edge-case tests.

Run all tests across workspaces:
```bash
npm test
```

Run backend tests:
```bash
npm run test:backend
```

Run frontend tests:
```bash
npm run test:frontend
```

Run TypeScript verification and linting:
```bash
npm run lint
```

### Verified Test Coverage:
- **Backend**:
  - `calls.test.ts`: Call initiation, status progression, LiveKit token assignment.
  - `livekit.test.ts`: LiveKit JWT token generation, room creation, cleanup.
  - `objection.test.ts`: Detection of all 8 objection categories, confidence scores, sentiment analysis.
  - `suggestions.test.ts`: Primary and alternative response generation, agent feedback recording (`ACCEPTED`, `REJECTED`, `EDITED`).
  - `transcription.test.ts`: Partial vs final transcription handling, speaker attribution (`agent` vs `customer`), empty text safety.
  - `reports.test.ts`: Post-call report compilation, objection breakdown, acceptance metrics, AI accuracy disclaimers.
  - `webhooks.test.ts`: Twilio voice TwiML generation, status webhook callbacks, duplicate webhook prevention.
  - `call-workflow.test.ts`: Complete end-to-end integration lifecycle from dial to report.
  - `edge-cases.test.ts`: Customer no-answer, unexpected disconnects, empty audio, duplicate event suppression.
- **Frontend**:
  - `DashboardScreen.test.tsx`: Call initiation form, scenario selection, recent call history display.
  - `LiveCallScreen.test.tsx`: Telephony controls, live transcription streaming, objection display, accept/reject/copy interactions.
  - `CallReportsScreen.test.tsx`: KPI cards, category breakdown, agent performance review, AI accuracy metrics.
# Voice-AI-Assistant
