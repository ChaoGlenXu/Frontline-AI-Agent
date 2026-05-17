import type { DemoScenario, Vertical } from "@/lib/types";

export const dentalPatients = [
  {
    name: "Maya Chen",
    phone: "+14155550111",
    email: "maya.chen@example.com",
    overdueMonths: 14,
    lastVisit: "2025-03-04",
    preferredClinic: "BrightSmile Dental - Market Street",
    insurance: "Delta Dental"
  }
];

export const governmentCategories = [
  "Pothole",
  "Graffiti",
  "Streetlight outage",
  "Illegal dumping",
  "Tree hazard",
  "Water billing",
  "Permit question"
];

export const complianceTransactions = [
  {
    customerName: "Northstar Import LLC",
    phone: "+14155550121",
    email: "ops@northstar.example",
    amount: 9800,
    origin: "Unknown sender",
    destination: "Cash withdrawal",
    flags: ["unknown sender", "cash withdrawal", "structuring threshold proximity"]
  }
];

export const knowledgeSeeds: Record<Vertical, { title: string; content: string }[]> = {
  dental: [
    {
      title: "Insurance FAQ",
      content: "BrightSmile accepts Delta Dental, Aetna Dental, and Cigna Dental. Patients should bring updated insurance cards."
    },
    {
      title: "Recall Policy",
      content: "Patients overdue by more than 6 months should be offered a routine cleaning and exam slot within the next 2 weeks."
    },
    {
      title: "Appointment FAQ",
      content: "Mock slots available for demos: Tuesday 2:30 PM, Thursday 10:00 AM, and Friday 3:30 PM."
    },
    {
      title: "Emergency Escalation",
      content: "Severe pain, swelling, fever, trauma, or uncontrolled bleeding should be escalated to the emergency dental line."
    }
  ],
  government: [
    {
      title: "Pothole Reporting",
      content: "Collect exact cross street, lane/direction, size estimate, photo if available, and urgency. Dangerous road hazards are high priority."
    },
    {
      title: "Trash Pickup",
      content: "Missed pickup requests need address, service day, bin type, and whether the bin was curbside by 6 AM."
    },
    {
      title: "Permit FAQ",
      content: "Permit questions should capture project type, address, permit number if known, and desired city department."
    },
    {
      title: "Water Billing FAQ",
      content: "Water billing questions need account number, service address, billing period, and a short description of the concern."
    }
  ],
  compliance: [
    {
      title: "KYC Checklist",
      content: "Collect customer identity, beneficial owner details, source of funds, business purpose, counterparty, invoice or contract support."
    },
    {
      title: "Suspicious Transaction Red Flags",
      content: "Red flags include unknown sender, rapid movement of funds, cash withdrawal, new beneficiary, invoice mismatch, sanctions exposure."
    },
    {
      title: "AML Escalation Policy",
      content: "High-risk or legally sensitive AML determinations require human compliance review before customer-facing conclusions."
    },
    {
      title: "Audit Summary Format",
      content: "Summaries should include facts, extracted evidence, red flags, risk level, recommended next step, and reviewer handoff status."
    }
  ]
};

export const demoScenarios: Record<Vertical, DemoScenario> = {
  dental: {
    vertical: "dental",
    contactName: dentalPatients[0].name,
    phone: dentalPatients[0].phone,
    email: dentalPatients[0].email,
    title: "Dental recall for overdue cleaning",
    seedExtractedFields: {
      patientName: dentalPatients[0].name,
      overdueMonths: dentalPatients[0].overdueMonths,
      lastVisit: dentalPatients[0].lastVisit,
      clinic: dentalPatients[0].preferredClinic,
      insurance: dentalPatients[0].insurance
    },
    firstMessage:
      "Hi, this is Frontline AI from BrightSmile Dental. You're due for a cleaning. Would you like help finding a time this week?"
  },
  government: {
    vertical: "government",
    contactName: "Resident SMS",
    phone: "+14155550131",
    title: "Government service request intake",
    seedExtractedFields: {
      availableCategories: governmentCategories
    },
    firstMessage: "Hi, this is the city service desk. What issue would you like to report today?"
  },
  compliance: {
    vertical: "compliance",
    contactName: complianceTransactions[0].customerName,
    phone: complianceTransactions[0].phone,
    email: complianceTransactions[0].email,
    title: "Suspicious transaction review",
    seedExtractedFields: {
      customerName: complianceTransactions[0].customerName,
      amount: complianceTransactions[0].amount,
      origin: complianceTransactions[0].origin,
      destination: complianceTransactions[0].destination,
      initialFlags: complianceTransactions[0].flags
    },
    firstMessage:
      "Compliance review: please provide the business purpose and supporting KYC context for the flagged transaction."
  }
};
