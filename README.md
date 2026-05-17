# Frontline AI Agent

Hackathon MVP for an AI phone/SMS/chat agent that handles three workflows:

- Dental recall: overdue patient outreach, basic questions, appointment booking intent.
- Government service request: resident issue intake, location/category/urgency extraction, ticket-ready summary.
- Compliance review: suspicious transaction/KYC intake, risk classification, audit-ready summary.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Environment

The app works without sponsor keys by using deterministic fallback logic. Add keys to use live sponsor calls:

```bash
AGENTPHONE_API_KEY=
AGENTMAIL_API_KEY=
MOSS_PROJECT_ID=
MOSS_PROJECT_KEY=
SUPERMEMORY_API_KEY=
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

## API Routes

- `POST /api/start-demo` with `{ "vertical": "dental" | "government" | "compliance" }`
- `POST /api/agentphone/webhook` for AgentPhone SMS or voice transcript events
- `POST /api/chat` with `{ "caseId": "...", "message": "..." }`
- `POST /api/agentphone/inbound` with `{ "caseId": "...", "from": "+1...", "body": "..." }`
- `POST /api/agentphone/send` with `{ "caseId": "...", "to": "+1...", "body": "..." }`
- `POST /api/ai/respond` with `{ "caseId": "...", "message": "..." }`
- `POST /api/send-summary-email` with `{ "caseId": "...", "recipientEmail": "..." }`
- `POST /api/cases/:id/handoff` with `{ "action": "escalate" | "mark_booked" | "mark_ticket_created" | "mark_compliance_completed" }`
- `POST /api/memory/save`
- `POST /api/memory/search`
- `POST /api/search/moss`
- `GET /api/cases`
- `GET /api/cases/:id`

Local case state is stored in `data/cases.json`, which is ignored by git.
# Frontline-AI-Agent
