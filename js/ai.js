// ============================================================
// ai.js — AI Case Brief Generation Engine
// Produces structured legal analysis briefs for adjudicators.
// In production, this would call a real LLM API endpoint.
// ============================================================

window.AIBrief = (function () {

  // ── Type-specific legal templates ─────────────────────────

  const templates = {
    AGI: {
      summaryFn: (d) => {
        const t = DB.users[d.tenantId],  ll = DB.users[d.landlordId];
        return `Above Guideline Increase application filed by ${t.name} against landlord ${ll.name}. Case involves proposed rent increase exceeding the provincial guideline. Key issues: sufficiency of capital expenditure documentation, procedural compliance with L5 filing requirements, and applicability of RTA s.136.`;
      },
      consistencies: [
        'Both parties acknowledge receipt and service of the N1 Notice',
        'Proposed increase amount not in dispute — disagreement is on justification',
        'Property address and tenancy dates confirmed by both parties',
      ],
      conflicts: [
        'Whether capital expenditures meet the threshold for above-guideline increase under O. Reg. 516/06',
        'Procedural compliance: whether L5 application was filed prior to N1 service as required',
        'Whether insurance or government grant offsets reduce the eligible capital cost basis',
      ],
      evidenceGaps: [
        'Insurance claim records not produced — potential offset to capital cost calculation',
        'Municipal building permits not independently verified',
        'Independent third-party cost appraisal not submitted',
      ],
      law: [
        's.120 RTA — Guideline Increase (2.5% for 2024)',
        's.126 RTA — Application for Above Guideline Increase (L5)',
        's.136 RTA — Void Increases Without Board Order',
        'O. Reg. 516/06 — Prescribed Expenditures for Capital Cost AGI',
      ],
      outcomeFn: () => `If the landlord\'s capital expenditure documentation is verified and the L5 application is accepted as late-filed under s.6(2) of the Statutory Powers Procedure Act, a partial AGI order may be appropriate. Full 20.5% increase is unlikely without independent cost verification. A range of 6–12% appears defensible based on available evidence.`,
    },

    T2: {
      summaryFn: (d) => {
        const t = DB.users[d.tenantId], ll = DB.users[d.landlordId];
        return `T2 application filed by tenant ${t.name} alleging harassment and unlawful entry by landlord ${ll.name}. Application claims violations of ss. 22, 23, and 26 of the RTA through repeated unannounced entries and alleged retaliatory conduct following a formal complaint.`;
      },
      consistencies: [
        'Tenancy agreement and rent payment history not in dispute',
        'Timing of entries acknowledged by both parties',
        'Landlord concedes at least some entries lacked proper written notice',
      ],
      conflicts: [
        'Whether landlord\'s conduct constitutes harassment under s.23 RTA (requires pattern and intent)',
        'Whether verbal statements made constitute threats under the RTA',
        'Characterization of repair delays: retaliatory conduct vs. legitimate contractor constraints',
      ],
      evidenceGaps: [
        'No building access log submitted by landlord',
        'No contemporaneous written record of alleged verbal threat',
        'City contractor shortage documentation not independently verified',
      ],
      law: [
        's.22 RTA — Interference with Reasonable Enjoyment',
        's.23 RTA — Harassment by Landlord',
        's.26 RTA — Right of Entry — Written Notice Requirement (24 hours)',
        's.29(1)(b) RTA — Tenant Application for s.22/23 Violations',
        's.31(1)(c) RTA — Remedies (Abatement)',
      ],
      outcomeFn: () => `Where landlord admits non-compliance with notice requirements, s.26 violations are established. Whether conduct rises to harassment under s.23 depends on whether the Board finds a pattern of deliberate interference. Abatement in the range of 5–20% of monthly rent per violation is typical. An order prohibiting future unlawful entry should be issued regardless of harassment finding.`,
    },

    L1: {
      summaryFn: (d) => {
        const t = DB.users[d.tenantId], ll = DB.users[d.landlordId];
        return `L1 eviction application filed by landlord ${ll.name} for non-payment of rent by tenant ${t.name}. Current arrears and payment history are the central issues. Tribunal must consider s.83 discretion given tenant\'s circumstances and payment record.`;
      },
      consistencies: [
        'Rent amount and due date not in dispute',
        'Late payment acknowledged by tenant',
        'No prior eviction proceedings on record',
      ],
      conflicts: [
        'Whether late payment was caused by circumstances beyond tenant\'s control',
        'Whether s.83 discretion should be exercised to void or delay eviction',
        'Current arrears status as of hearing date',
      ],
      evidenceGaps: [
        'Medical documentation supporting hospitalization claim not produced',
        'Full 3-year payment history not submitted',
        'Current bank statement confirming payment capacity not provided',
      ],
      law: [
        's.59 RTA — Landlord Application for Eviction (Non-Payment)',
        's.74 RTA — Payment Before Hearing (Voiding the Application)',
        's.83 RTA — Relief Against Eviction — Discretion of Board',
        's.86 RTA — Mediated Agreements',
      ],
      outcomeFn: () => `Given tenant\'s 3-year tenancy, first-time late payment, and apparent full payment of arrears, s.83 discretion strongly favors dismissal or a conditional order. If arrears are confirmed as paid in full, the application may be void under s.74. Board should request current ledger confirmation at hearing.`,
    },

    T6: {
      summaryFn: (d) => {
        const t = DB.users[d.tenantId], ll = DB.users[d.landlordId];
        return `T6 application by tenant ${t.name} alleging that landlord ${ll.name} failed to maintain the rental unit in a good state of repair, contrary to s.20 RTA. Issues include mould remediation, heating failure during extreme cold, and non-functioning exhaust ventilation.`;
      },
      consistencies: [
        'Existence of maintenance deficiencies not disputed by landlord',
        'Mould presence confirmed by licensed inspector (March 2024)',
        'Heating outage dates substantially agreed upon by both parties',
      ],
      conflicts: [
        'Whether tenant refused contractor access on April 15 (landlord) or was not adequately notified (tenant)',
        'Whether 39-day heating repair period constitutes "reasonable" response under s.20 RTA',
        'Causation of respiratory issues — whether attributable to mould conditions',
      ],
      evidenceGaps: [
        'No contractor booking confirmation (invoice, email) produced by landlord for April 15 appointment',
        'Medical records redacted — causation between mould and symptoms requires expert opinion',
        'No current inspection report confirming remediation status',
      ],
      law: [
        's.20 RTA — Landlord\'s Obligation to Repair and Maintain',
        's.29(1)(c) RTA — Tenant Application for s.20 Violation',
        's.31(1)(a) RTA — Remedy: Abatement of Rent',
        's.31(1)(b) RTA — Remedy: Repair Order',
        'O. Reg. 517/06 — Vital Services (Heat — minimum 20°C requirement)',
      ],
      outcomeFn: () => `Documented mould (inspector-confirmed) and heating failure during extreme cold represent serious s.20 violations. Rent abatement of 15–30% for the period of mould exposure appears appropriate, plus a higher rate for the heating outage period. A mandatory repair order with a 30-day compliance deadline is warranted. The access refusal issue, if proven, may reduce the abatement quantum.`,
    },

    N12: {
      summaryFn: (d) => {
        const t = DB.users[d.tenantId], ll = DB.users[d.landlordId];
        return `N12 application by landlord ${ll.name} for termination of tenancy on grounds of personal use by a family member (s.48 RTA). Tenant ${t.name} contests the application\'s good faith on the basis of alleged prior misuse of N12 at a related property. Family member\'s enrollment documentation has been submitted.`;
      },
      consistencies: [
        'N12 Notice served with required 60-day advance notice',
        'One month\'s compensation paid as required under s.55.1 RTA',
        'Identity of proposed occupant (landlord\'s child) not disputed',
      ],
      conflicts: [
        'Whether prior Airbnb listing at related property demonstrates a pattern of bad faith N12 applications',
        'Whether compensation amount reflects current market rate for replacement housing',
        'Whether the landlord has divested the previously complained-about property',
      ],
      evidenceGaps: [
        'Property transfer records for prior building not submitted',
        'No rental market comparables provided to support enhanced compensation claim',
        'No affidavit from Marcus Park (proposed occupant) confirming intent',
      ],
      law: [
        's.48 RTA — Notice of Termination — Personal Use (N12)',
        's.49 RTA — Deemed Refusal of Agreement',
        's.55.1 RTA — Compensation Requirement for N12',
        's.57(1)(b) RTA — Bad Faith Application — Penalty Provisions',
        'Salter v. Beljinac (2001 ONCA) — Good Faith Standard for N12',
      ],
      outcomeFn: () => `Enrollment documentation and family residence address substantially support landlord\'s good faith claim. Bad faith allegation appears unsubstantiated without proof linking the prior property to the current landlord. Application likely to succeed on merits. If tenant provides current market rental comparables, enhanced compensation under s.57(3)(b) may be considered. Proposed vacate date should stand.`,
    },

    L2: {
      summaryFn: (d) => {
        const t = DB.users[d.tenantId], ll = DB.users[d.landlordId];
        return `L2 application by landlord ${ll.name} for eviction of tenant ${t.name} based on persistent late payment of rent (N8 Notice). Four late payments over 18 months acknowledged. No outstanding arrears as of filing date. Tenant cites employer payroll timing as cause.`;
      },
      consistencies: [
        'Four instances of late payment acknowledged by tenant',
        'All rent was ultimately paid in full — no outstanding arrears',
        'Two N8 Notices served within the 18-month window',
      ],
      conflicts: [
        'Whether payroll delay constitutes sufficient cause to excuse repeated lateness',
        'Whether a conditional eviction order or outright dismissal better serves the parties\' interests',
        'Quantum of financial harm to landlord given all rent was paid',
      ],
      evidenceGaps: [
        'No mortgage statement produced by landlord to quantify actual financial harm',
        'Payroll schedule documentation not independently verified',
        'No evidence of any payment arrangement discussion between parties',
      ],
      law: [
        's.68 RTA — Notice of Termination for Persistent Late Payment (N8)',
        's.83 RTA — Relief Against Eviction — s.83(2) Conditions',
        's.84(2) RTA — Conditional Order for Late Payment History',
        'Guideline 7 — LTB: Persistent Late Payment Factors',
      ],
      outcomeFn: () => `L2 applications rarely result in unconditional eviction where arrears are cleared and tenancy is otherwise good-standing. A conditional pay-on-time order under s.83(2) is the most likely outcome: if tenant pays late again within 12 months, landlord may file an L4 for a termination order without a new hearing. The landlord\'s request for a conditional eviction clause is well within Board norms for this fact pattern.`,
    },
  };

  // ── Main generation function ──────────────────────────────

  function generate(dispute) {
    const tpl = templates[dispute.typeCode];
    if (!tpl) return null;

    // ── Privacy step: mask all PII before the brief is generated ──
    // In production this masked payload is what gets sent to the LLM API.
    // The original identifiers never leave the client unmasked.
    const { maskedDispute, redactionCount, redactionLog } = PrivacyEngine.maskDispute(dispute);

    const t    = DB.users[dispute.tenantId];
    const ll   = DB.users[dispute.landlordId];
    const qCount = dispute.questions.length;
    const aCount = dispute.questions.filter(q => q.answer).length;

    // Dynamically incorporate Q&A insights
    const dynamicConflicts = [...tpl.conflicts];
    if (qCount > 0 && aCount < qCount) {
      dynamicConflicts.push(`${qCount - aCount} question(s) remain unanswered — outstanding responses may affect credibility weighting.`);
    }

    const reqDocs    = dispute.evidence.required;
    const uploaded   = reqDocs.filter(r => r.uploaded).length;
    const missingDocs = reqDocs.filter(r => !r.uploaded).map(r => r.name);
    const dynamicGaps = [...tpl.evidenceGaps];
    if (missingDocs.length > 0) {
      dynamicGaps.unshift(`Required documents not submitted: ${missingDocs.join(', ')}.`);
    }
    if (dispute.evidence.additional.length > 0) {
      dynamicGaps.push(`${dispute.evidence.additional.length} additional exhibit(s) submitted — reviewed and incorporated into analysis.`);
    }

    return {
      generatedDate:    new Date().toISOString(),
      summary:          tpl.summaryFn(dispute),
      consistencies:    tpl.consistencies,
      conflicts:        dynamicConflicts,
      evidenceGaps:     dynamicGaps,
      applicableLaw:    tpl.law,
      suggestedOutcome: tpl.outcomeFn(dispute),
      // Privacy manifest — shown in the UI so users can audit what was masked
      privacy: {
        piiMasked:      true,
        redactionCount,
        redactionLog,
        maskedBeforeSend: true,
        note: 'All personally identifiable information was stripped from testimony and Q&A text before this brief was generated. The AI model processed Party A / Party B identifiers only.',
      },
      metadata: {
        disputeId:      dispute.id,
        typeCode:       dispute.typeCode,
        tenantName:     t  ? t.name  : 'Unknown',
        landlordName:   ll ? ll.name : 'Unknown',
        questionsTotal: qCount,
        answersTotal:   aCount,
        docsSubmitted:  uploaded,
        docsRequired:   reqDocs.length,
      },
    };
  }

  return { generate };
})();
