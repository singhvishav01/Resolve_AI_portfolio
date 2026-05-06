// ============================================================
// data.js — ResolveAI Mock Database
// All application data lives here. In production this would
// be replaced by API calls to a real backend.
// ============================================================

window.DB = (function () {

  const users = {
    admin:        { id: 'admin',        name: 'System Admin',    role: 'admin',        email: 'admin@ltb-resolve.ca',         password: 'admin123', initials: 'SA' },
    tenant1:      { id: 'tenant1',      name: 'Sarah Mitchell',  role: 'tenant',       email: 'sarah.mitchell@email.com',     password: 'pass123',  initials: 'SM', phone: '416-555-0142', unit: '412 Bloor St W, Apt 7' },
    tenant2:      { id: 'tenant2',      name: 'James Osei',      role: 'tenant',       email: 'james.osei@email.com',         password: 'pass123',  initials: 'JO', phone: '647-555-0289', unit: '88 Isabella St, Unit 4A' },
    tenant3:      { id: 'tenant3',      name: 'Priya Sharma',    role: 'tenant',       email: 'priya.sharma@email.com',       password: 'pass123',  initials: 'PS', phone: '905-555-0317', unit: '221 Yonge St, Apt 12C' },
    landlord1:    { id: 'landlord1',    name: 'David Park',      role: 'landlord',     email: 'd.park@properties.ca',         password: 'pass123',  initials: 'DP', company: 'Park Properties Inc.' },
    landlord2:    { id: 'landlord2',    name: 'Helen Novak',     role: 'landlord',     email: 'helen@novakrentals.ca',        password: 'pass123',  initials: 'HN', company: 'Novak Rentals Ltd.' },
    adjudicator1: { id: 'adjudicator1', name: 'Hon. R. Kapoor',  role: 'adjudicator',  email: 'r.kapoor@ltb.gov.on.ca',       password: 'pass123',  initials: 'RK', barNumber: 'ON-ADJ-2847' },
    adjudicator2: { id: 'adjudicator2', name: 'Hon. M. Chen',    role: 'adjudicator',  email: 'm.chen@ltb.gov.on.ca',         password: 'pass123',  initials: 'MC', barNumber: 'ON-ADJ-3156' },
  };

  const disputeTypes = {
    AGI: { code: 'AGI', name: 'Above Guideline Rent Increase', short: 'AGI',  requiredDocs: ['Lease Agreement', 'Rent Payment History', 'N1 Notice'] },
    T2:  { code: 'T2',  name: 'Landlord Harassment / Unlawful Entry', short: 'T2', requiredDocs: ['Lease Agreement', 'Rent Payment History', 'Communications Log'] },
    L1:  { code: 'L1',  name: 'Application for Eviction (Non-Payment)', short: 'L1', requiredDocs: ['Lease Agreement', 'Rent Ledger', 'N4 Notice'] },
    T6:  { code: 'T6',  name: 'Failure to Maintain Property', short: 'T6',  requiredDocs: ['Lease Agreement', 'Maintenance Request Log', 'Photos of Disrepair'] },
    N12: { code: 'N12', name: 'Eviction — Landlord\'s Own Use', short: 'N12', requiredDocs: ['Lease Agreement', 'N12 Notice', 'Declaration of Good Faith'] },
    L2:  { code: 'L2',  name: 'Eviction — Repeated Late Payment', short: 'L2', requiredDocs: ['Lease Agreement', 'N8 Notice', 'Late Payment Records'] },
  };

  // Helper to build a required-doc list for a dispute
  function mkDocs(typeCode, uploaded) {
    return disputeTypes[typeCode].requiredDocs.map((name, i) => ({
      name,
      uploaded: uploaded[i] || false,
      filename: uploaded[i] ? name.toLowerCase().replace(/[\s/]+/g, '_') + '.pdf' : null,
      size:     uploaded[i] ? (Math.floor(Math.random() * 1800 + 200)) + ' KB' : null,
      uploadedBy: uploaded[i] ? (i < 2 ? 'tenant1' : 'landlord1') : null,
      uploadDate: uploaded[i] ? '2024-09-12T10:30:00Z' : null,
    }));
  }

  const disputes = [
    // ─── 1 · AGI · Answering ───────────────────────────────────
    {
      id: 'LTB-ON-2024-0047',
      typeCode: 'AGI',
      type: 'Above Guideline Rent Increase',
      address: '412 Bloor St W, Apt 7, Toronto, ON M5S 1X5',
      tenantId: 'tenant1',
      landlordId: 'landlord1',
      adjudicatorId: 'adjudicator1',
      stage: 'answering',
      filedDate: '2024-09-01T08:00:00Z',
      deadline: '2024-10-15T08:00:00Z',
      testimony: {
        tenant: {
          text: 'I have resided at 412 Bloor Street West, Apartment 7, since March 2021. My current rent is $2,100 per month. On August 14, 2024, I received a Notice of Rent Increase (N1) indicating a proposed increase of 20.5% — nearly four times the provincial guideline of 2.5% for 2024. I was not provided any documentation substantiating the extraordinary operating cost increases or capital expenditures that would justify an above-guideline increase under the Residential Tenancies Act. No L5 application was filed with the Landlord and Tenant Board prior to serving this notice, which I believe renders the notice invalid under s.136 RTA.',
          date: '2024-09-08T11:00:00Z',
          userId: 'tenant1',
        },
        landlord: {
          text: 'Park Properties Inc. respectfully submits that the proposed rent increase of 20.5% is warranted following significant capital expenditures undertaken between January and July 2024. These include: complete HVAC system replacement ($62,400), roof resurfacing across the 12-unit building ($88,000), and seismic retrofitting required under new municipal code amendments ($130,000). Total eligible capital expenditure exceeds $280,000. We acknowledge an administrative oversight in the L5 application timeline and have since submitted the L5 to the Board. We request that the Board accept the late filing and proceed with the AGI hearing.',
          date: '2024-09-10T14:30:00Z',
          userId: 'landlord1',
        },
      },
      questions: [
        { id: 'Q001', fromId: 'tenant1', fromName: 'Sarah Mitchell', fromRole: 'tenant', text: 'Please provide the original contractor invoices and municipal permits for the HVAC replacement and roof resurfacing referenced in your testimony.', date: '2024-09-15T09:00:00Z', answer: { text: 'Invoices and permits are attached to the evidence portal as Exhibits C, D, and E. The HVAC contract was awarded to Greenfield Climate Solutions Inc. on January 7, 2024.', date: '2024-09-18T11:00:00Z', byId: 'landlord1', byName: 'David Park' } },
        { id: 'Q002', fromId: 'tenant1', fromName: 'Sarah Mitchell', fromRole: 'tenant', text: 'Were any of the capital costs you cited covered by insurance claims or government grants? If so, what portion was self-funded?', date: '2024-09-15T09:10:00Z', answer: null },
        { id: 'Q003', fromId: 'landlord1', fromName: 'David Park', fromRole: 'landlord', text: 'Can you confirm that you received the N1 Notice by registered mail and that you are aware of the Guideline Increase provisions under s.120 of the Residential Tenancies Act?', date: '2024-09-16T10:00:00Z', answer: { text: 'I confirm receipt of the N1 by registered mail on August 15, 2024. I am aware of the guideline provisions; my objection is specifically to the above-guideline amount and the failure to file the L5 application prior to service.', date: '2024-09-17T08:30:00Z', byId: 'tenant1', byName: 'Sarah Mitchell' } },
      ],
      evidence: { required: mkDocs('AGI', [true, true, true]), additional: [
        { id: 'ADOC001', name: 'HVAC Contractor Invoice', filename: 'hvac_invoice_greenfield.pdf', size: '412 KB', uploadedBy: 'landlord1', uploadedByName: 'David Park', uploadDate: '2024-09-10T14:40:00Z' },
        { id: 'ADOC002', name: 'Municipal Roofing Permit', filename: 'roofing_permit_2024.pdf', size: '218 KB', uploadedBy: 'landlord1', uploadedByName: 'David Park', uploadDate: '2024-09-10T14:45:00Z' },
      ]},
      aiBrief: null,
      ruling: null,
      appeal: null,
      auditLog: [
        { text: 'Dispute filed and assigned. Case number: LTB-ON-2024-0047', date: '2024-09-01T08:00:00Z' },
        { text: 'Adjudicator Hon. R. Kapoor assigned.', date: '2024-09-01T08:05:00Z' },
        { text: 'Sarah Mitchell submitted sworn testimony.', date: '2024-09-08T11:00:00Z' },
        { text: 'David Park submitted sworn testimony.', date: '2024-09-10T14:30:00Z' },
        { text: 'Stage advanced to Questions — both testimonies received.', date: '2024-09-10T14:31:00Z' },
        { text: 'Sarah Mitchell submitted question #1.', date: '2024-09-15T09:00:00Z' },
        { text: 'Sarah Mitchell submitted question #2.', date: '2024-09-15T09:10:00Z' },
        { text: 'David Park submitted question #3.', date: '2024-09-16T10:00:00Z' },
        { text: 'Stage advanced to Answering — questions period closed.', date: '2024-09-16T10:05:00Z' },
        { text: 'David Park answered question from Sarah Mitchell.', date: '2024-09-18T11:00:00Z' },
        { text: 'Sarah Mitchell answered question from David Park.', date: '2024-09-17T08:30:00Z' },
      ],
    },

    // ─── 2 · T2 · Ruled ────────────────────────────────────────
    {
      id: 'LTB-ON-2023-0291',
      typeCode: 'T2',
      type: 'Landlord Harassment / Unlawful Entry',
      address: '88 Isabella St, Unit 4A, Toronto, ON M4Y 1N6',
      tenantId: 'tenant2',
      landlordId: 'landlord1',
      adjudicatorId: 'adjudicator2',
      stage: 'ruled',
      filedDate: '2023-11-03T08:00:00Z',
      deadline: '2023-12-20T08:00:00Z',
      testimony: {
        tenant: { text: 'Between September and October 2023, the landlord or his agents entered my unit on at least six occasions without providing the required 24-hour written notice under s.26 of the RTA. I have documented three of these entries via text messages where I was notified same-day or not at all. On October 12, 2023, the landlord verbally threatened to "make things difficult" for me when I requested repairs. I am seeking a rent abatement and an order prohibiting further unauthorized entries.', date: '2023-11-10T10:00:00Z', userId: 'tenant2' },
        landlord: { text: 'All entries were made for legitimate maintenance purposes and with what I believed to be reasonable notice. In one case, an emergency water leak required immediate access. I deny making any threatening statements. The text messages cited by the tenant are taken out of context; I was expressing frustration about delayed repair requests, not making threats.', date: '2023-11-14T14:00:00Z', userId: 'landlord1' },
      },
      questions: [
        { id: 'Q004', fromId: 'tenant2', fromName: 'James Osei', fromRole: 'tenant', text: 'Do you have any written 24-hour entry notices for the six entries in question?', date: '2023-11-20T09:00:00Z', answer: { text: 'Written notices were provided for two entries. The remaining four were either emergency situations or I relied on verbal notice, which I now understand may not satisfy the s.26 requirement.', date: '2023-11-22T10:00:00Z', byId: 'landlord1', byName: 'David Park' } },
        { id: 'Q005', fromId: 'landlord1', fromName: 'David Park', fromRole: 'landlord', text: 'Were you present or did you grant access for any of the entries you now describe as unauthorized?', date: '2023-11-21T10:00:00Z', answer: { text: 'I was present for two entries and explicitly objected. For the other four, I was not notified in advance and returned home to find evidence that someone had been in the unit.', date: '2023-11-23T09:00:00Z', byId: 'tenant2', byName: 'James Osei' } },
      ],
      evidence: { required: mkDocs('T2', [true, true, true]), additional: [
        { id: 'ADOC003', name: 'Screenshot - Text Messages Oct 2023', filename: 'texts_oct_2023.pdf', size: '310 KB', uploadedBy: 'tenant2', uploadedByName: 'James Osei', uploadDate: '2023-11-10T10:10:00Z' },
      ]},
      aiBrief: {
        generatedDate: '2023-12-01T09:00:00Z',
        summary: 'Case involves T2 application alleging six instances of unlawful entry and one verbal threat. Landlord partially concedes non-compliance with notice requirements for four of six entries. Relevant provisions: ss. 22, 23, 26, 29 RTA.',
        consistencies: ['Both parties agree that at least four entries lacked 24-hour written notice', 'Landlord concedes verbal notice may be insufficient under s.26'],
        conflicts: ['Number of entries that constituted harassment (tenant: 6, landlord: 1 emergency)', 'Whether verbal statement on Oct 12 constituted a threat under s.23 RTA'],
        evidenceGaps: ['No contemporaneous written record of the alleged threat', 'No building access log produced by landlord'],
        applicableLaw: ['s.26 RTA — Right of Entry (24-hour written notice required)', 's.22 RTA — Interference with Reasonable Enjoyment', 's.23 RTA — Harassment'],
        suggestedOutcome: 'Based on landlord\'s partial admission and documented text communications, rent abatement in the range of $800–$2,200 appears appropriate. An order prohibiting future unlawful entry should be included.',
      },
      ruling: { decision: 'tenant-favor', text: 'Having reviewed all testimony, evidence, and the AI case brief, this Tribunal finds that the respondent (Landlord) failed to comply with s.26 of the Residential Tenancies Act on four of the six alleged occasions. The verbal statement of October 12, 2023, while inappropriate, does not rise to the level of harassment under s.23 RTA on the available evidence. ORDERED: (1) Rent abatement of $1,800.00 payable to James Osei within 30 days. (2) Respondent is prohibited from entering the unit without proper 24-hour written notice except in genuine emergencies.', awardAmount: 1800, date: '2023-12-08T14:00:00Z', adjudicatorId: 'adjudicator2', adjudicatorName: 'Hon. M. Chen' },
      appeal: null,
      auditLog: [
        { text: 'Dispute filed. Case number: LTB-ON-2023-0291', date: '2023-11-03T08:00:00Z' },
        { text: 'James Osei submitted sworn testimony.', date: '2023-11-10T10:00:00Z' },
        { text: 'David Park submitted sworn testimony.', date: '2023-11-14T14:00:00Z' },
        { text: 'Stage advanced to Questions.', date: '2023-11-14T14:01:00Z' },
        { text: 'Stage advanced to Answering.', date: '2023-11-21T10:05:00Z' },
        { text: 'AI Case Brief generated.', date: '2023-12-01T09:00:00Z' },
        { text: 'Ruling issued by Hon. M. Chen: tenant-favor. Award: $1,800.00.', date: '2023-12-08T14:00:00Z' },
      ],
    },

    // ─── 3 · L1 · Testimony ────────────────────────────────────
    {
      id: 'LTB-ON-2024-0108',
      typeCode: 'L1',
      type: 'Application for Eviction (Non-Payment)',
      address: '412 Bloor St W, Apt 7, Toronto, ON M5S 1X5',
      tenantId: 'tenant1',
      landlordId: 'landlord1',
      adjudicatorId: 'adjudicator1',
      stage: 'testimony',
      filedDate: '2024-10-01T08:00:00Z',
      deadline: '2024-11-15T08:00:00Z',
      testimony: {
        tenant: { text: 'I acknowledge that rent for October 2024 was paid 14 days late. I experienced an unexpected medical emergency resulting in hospitalization from October 1–8. Upon discharge, I transferred the full rent amount plus a $150 late fee on October 15. This is the first late payment in my 3-year tenancy. I am seeking a dismissal of the L1 application on equitable grounds under s.83 RTA.', date: '2024-10-10T09:30:00Z', userId: 'tenant1' },
        landlord: null,
      },
      questions: [],
      evidence: {
        required: [
          { name: 'Lease Agreement', uploaded: true,  filename: 'lease_agreement_signed.pdf', size: '544 KB', uploadedBy: 'landlord1', uploadDate: '2024-10-01T08:10:00Z' },
          { name: 'Rent Ledger',     uploaded: true,  filename: 'rent_ledger_2024.pdf',       size: '210 KB', uploadedBy: 'landlord1', uploadDate: '2024-10-01T08:12:00Z' },
          { name: 'N4 Notice',       uploaded: false, filename: null, size: null, uploadedBy: null, uploadDate: null },
        ],
        additional: [],
      },
      aiBrief: null,
      ruling: null,
      appeal: null,
      auditLog: [
        { text: 'Dispute filed. Case number: LTB-ON-2024-0108', date: '2024-10-01T08:00:00Z' },
        { text: 'Lease Agreement uploaded by David Park.', date: '2024-10-01T08:10:00Z' },
        { text: 'Rent Ledger uploaded by David Park.', date: '2024-10-01T08:12:00Z' },
        { text: 'Sarah Mitchell submitted sworn testimony.', date: '2024-10-10T09:30:00Z' },
      ],
    },

    // ─── 4 · T6 · Questions ────────────────────────────────────
    {
      id: 'LTB-ON-2024-0162',
      typeCode: 'T6',
      type: 'Failure to Maintain Property',
      address: '221 Yonge St, Apt 12C, Toronto, ON M5B 2H1',
      tenantId: 'tenant3',
      landlordId: 'landlord2',
      adjudicatorId: 'adjudicator1',
      stage: 'questions',
      filedDate: '2024-08-15T08:00:00Z',
      deadline: '2024-09-30T08:00:00Z',
      testimony: {
        tenant: { text: 'Since February 2024, I have submitted six written maintenance requests to Helen Novak / Novak Rentals regarding: persistent mould growth in the bathroom and kitchen (confirmed by a licensed inspector in March 2024), a broken heating system (inoperable January 28 – March 10 during extreme cold), and a non-functioning kitchen exhaust fan (reported November 2023). None of these issues have been remediated despite written requests. The mould has caused me respiratory distress requiring two physician visits. I seek a rent abatement and a mandatory repair order under s.29(1)(c) RTA.', date: '2024-08-22T10:00:00Z', userId: 'tenant3' },
        landlord: { text: 'Novak Rentals acknowledges the maintenance requests and regrets the delay in remediation. The mould remediation contractor was booked for April 15 but the tenant refused access on that date. The heating system failure was caused by an unprecedented freeze event outside our control. Repairs were completed within 39 days. We dispute the characterization that we have been unresponsive and submit our full maintenance correspondence log as evidence.', date: '2024-08-27T13:00:00Z', userId: 'landlord2' },
      },
      questions: [
        { id: 'Q006', fromId: 'tenant3', fromName: 'Priya Sharma', fromRole: 'tenant', text: 'Please provide the name of the mould remediation contractor and evidence that an appointment was actually booked for April 15.', date: '2024-09-02T09:00:00Z', answer: null },
        { id: 'Q007', fromId: 'tenant3', fromName: 'Priya Sharma', fromRole: 'tenant', text: 'What is the target completion date for all outstanding repairs, and will you provide a written guarantee?', date: '2024-09-02T09:05:00Z', answer: null },
        { id: 'Q008', fromId: 'landlord2', fromName: 'Helen Novak', fromRole: 'landlord', text: 'You state that the April 15 access was refused — can you clarify why you denied the contractor entry on that date?', date: '2024-09-03T11:00:00Z', answer: null },
      ],
      evidence: { required: mkDocs('T6', [true, true, true]), additional: [
        { id: 'ADOC004', name: 'Mould Inspector Report — March 2024', filename: 'mould_inspection_report_march2024.pdf', size: '1,240 KB', uploadedBy: 'tenant3', uploadedByName: 'Priya Sharma', uploadDate: '2024-08-22T10:10:00Z' },
        { id: 'ADOC005', name: 'Medical Records — Respiratory Visits', filename: 'medical_records_redacted.pdf', size: '890 KB', uploadedBy: 'tenant3', uploadedByName: 'Priya Sharma', uploadDate: '2024-08-22T10:15:00Z' },
      ]},
      aiBrief: null,
      ruling: null,
      appeal: null,
      auditLog: [
        { text: 'Dispute filed. Case number: LTB-ON-2024-0162', date: '2024-08-15T08:00:00Z' },
        { text: 'Priya Sharma submitted sworn testimony.', date: '2024-08-22T10:00:00Z' },
        { text: 'Helen Novak submitted sworn testimony.', date: '2024-08-27T13:00:00Z' },
        { text: 'Stage advanced to Questions — both testimonies received.', date: '2024-08-27T13:01:00Z' },
        { text: 'Priya Sharma submitted question #1.', date: '2024-09-02T09:00:00Z' },
        { text: 'Priya Sharma submitted question #2.', date: '2024-09-02T09:05:00Z' },
        { text: 'Helen Novak submitted question #3.', date: '2024-09-03T11:00:00Z' },
      ],
    },

    // ─── 5 · N12 · AI Review ───────────────────────────────────
    {
      id: 'LTB-ON-2024-0203',
      typeCode: 'N12',
      type: "Eviction — Landlord's Own Use",
      address: '88 Isabella St, Unit 4A, Toronto, ON M4Y 1N6',
      tenantId: 'tenant2',
      landlordId: 'landlord1',
      adjudicatorId: 'adjudicator2',
      stage: 'aiReview',
      filedDate: '2024-07-10T08:00:00Z',
      deadline: '2024-09-01T08:00:00Z',
      testimony: {
        tenant: { text: 'I have occupied Unit 4A at 88 Isabella Street since June 2020. The landlord served an N12 notice on June 28, 2024, claiming the unit is required for his child\'s personal use. I have evidence suggesting the unit was listed on Airbnb within 60 days of my vacate date in a previous building owned by Park Properties. I am requesting that the Board investigate whether this N12 application is filed in bad faith under s.57(1)(b) RTA. Additionally, the compensation offered ($2,100 — one month\'s rent) does not reflect current market conditions.', date: '2024-07-18T10:00:00Z', userId: 'tenant2' },
        landlord: { text: 'Park Properties Inc. confirms that the N12 Notice was served in good faith. My son, Marcus Park (age 26), intends to occupy the unit beginning October 1, 2024, to pursue his postgraduate studies at the University of Toronto. We have provided a signed Declaration of Good Faith (Form N12 Schedule A). The unit at the prior building referred to by the tenant was listed by a previous owner after we divested that property in 2022. One month\'s compensation was provided as required by s.55.1 RTA.', date: '2024-07-24T14:00:00Z', userId: 'landlord1' },
      },
      questions: [
        { id: 'Q009', fromId: 'tenant2', fromName: 'James Osei', fromRole: 'tenant', text: 'Please provide proof of your son\'s university enrollment for Fall 2024 and his current residential address.', date: '2024-07-30T09:00:00Z', answer: { text: 'Attached as Exhibit F: University of Toronto acceptance letter dated May 2024 and current Ontario Driver\'s License showing residence at 447 Sheppard Ave W — the family home.', date: '2024-08-02T11:00:00Z', byId: 'landlord1', byName: 'David Park' } },
        { id: 'Q010', fromId: 'landlord1', fromName: 'David Park', fromRole: 'landlord', text: 'Are you aware that the property at the prior address was sold in its entirety, and that Park Properties has no ownership or control over listings made by the new owner?', date: '2024-07-31T10:00:00Z', answer: { text: 'I was not aware of the divestiture. I will review the property transfer records. I maintain that the pattern of N12 filings across multiple Park Properties buildings warrants scrutiny.', date: '2024-08-03T09:00:00Z', byId: 'tenant2', byName: 'James Osei' } },
      ],
      evidence: { required: mkDocs('N12', [true, true, true]), additional: [
        { id: 'ADOC006', name: 'University Enrollment Letter — Marcus Park', filename: 'uoft_enrollment_2024.pdf', size: '188 KB', uploadedBy: 'landlord1', uploadedByName: 'David Park', uploadDate: '2024-08-02T11:10:00Z' },
      ]},
      aiBrief: {
        generatedDate: '2024-08-20T09:00:00Z',
        summary: 'N12 application for landlord\'s own use (child\'s occupancy). Tenant raises bad-faith concern citing alleged prior Airbnb listing. Landlord provided enrollment documentation and good-faith declaration. Relevant provisions: ss. 48, 55.1, 57 RTA.',
        consistencies: ['Both parties agree N12 was served June 28, 2024', 'One month\'s compensation was paid as required by s.55.1 RTA', 'Child\'s enrollment at UofT confirmed by documentary evidence'],
        conflicts: ['Whether prior Airbnb listing at different property indicates bad faith pattern (tenant)', 'Adequacy of one month\'s compensation given market conditions'],
        evidenceGaps: ['No rental market comparables provided by tenant to support higher compensation claim', 'No transfer records produced confirming prior building divestiture'],
        applicableLaw: ['s.48 RTA — Landlord\'s Own Use (N12)', 's.55.1 RTA — Compensation for N12 Termination', 's.57(1)(b) RTA — Bad Faith Applications'],
        suggestedOutcome: 'Documentary evidence supports landlord\'s claim of good faith (enrollment letter, family residence address). Bad faith allegation appears unsubstantiated on current record. Application likely to succeed. Compensation may be reviewed if tenant provides current market evidence.',
      },
      ruling: null,
      appeal: null,
      auditLog: [
        { text: 'Dispute filed. Case number: LTB-ON-2024-0203', date: '2024-07-10T08:00:00Z' },
        { text: 'James Osei submitted sworn testimony.', date: '2024-07-18T10:00:00Z' },
        { text: 'David Park submitted sworn testimony.', date: '2024-07-24T14:00:00Z' },
        { text: 'Stage advanced to Questions.', date: '2024-07-24T14:01:00Z' },
        { text: 'Stage advanced to Answering.', date: '2024-07-31T10:05:00Z' },
        { text: 'AI Case Brief generated. Dispute advanced to AI Review stage.', date: '2024-08-20T09:00:00Z' },
      ],
    },

    // ─── 6 · AGI · Testimony (early stage) ────────────────────
    {
      id: 'LTB-ON-2024-0225',
      typeCode: 'AGI',
      type: 'Above Guideline Rent Increase',
      address: '221 Yonge St, Apt 12C, Toronto, ON M5B 2H1',
      tenantId: 'tenant3',
      landlordId: 'landlord2',
      adjudicatorId: 'adjudicator2',
      stage: 'testimony',
      filedDate: '2024-10-05T08:00:00Z',
      deadline: '2024-11-20T08:00:00Z',
      testimony: { tenant: null, landlord: null },
      questions: [],
      evidence: { required: mkDocs('AGI', [false, false, false]), additional: [] },
      aiBrief: null,
      ruling: null,
      appeal: null,
      auditLog: [
        { text: 'Dispute filed. Case number: LTB-ON-2024-0225', date: '2024-10-05T08:00:00Z' },
        { text: 'Adjudicator Hon. M. Chen assigned.', date: '2024-10-05T08:05:00Z' },
      ],
    },

    // ─── 7 · T2 · Appealed ─────────────────────────────────────
    {
      id: 'LTB-ON-2023-0188',
      typeCode: 'T2',
      type: 'Landlord Harassment / Unlawful Entry',
      address: '145 St George St, Apt 3, Toronto, ON M5R 2L2',
      tenantId: 'tenant1',
      landlordId: 'landlord1',
      adjudicatorId: 'adjudicator1',
      stage: 'appealed',
      filedDate: '2023-08-10T08:00:00Z',
      deadline: '2023-10-01T08:00:00Z',
      testimony: {
        tenant: { text: 'Between June and August 2023, I was subjected to repeated intimidation by the landlord including: three unannounced entries, withholding of repair services for 6 weeks following my noise complaint filing, and a written warning letter I believe was retaliatory. I am seeking rent abatement and an order of harassment.', date: '2023-08-17T10:00:00Z', userId: 'tenant1' },
        landlord: { text: 'All entries were for legitimate maintenance. The repair delay was caused by a city-wide contractor shortage following the August 4th storm event. The warning letter was issued in response to verified noise complaints from three other tenants and was not retaliatory.', date: '2023-08-22T13:00:00Z', userId: 'landlord1' },
      },
      questions: [
        { id: 'Q011', fromId: 'tenant1', fromName: 'Sarah Mitchell', fromRole: 'tenant', text: 'Please provide copies of the noise complaints from other tenants you reference in your testimony.', date: '2023-08-28T09:00:00Z', answer: { text: 'Copies attached as Exhibit B. Names redacted for privacy. Complaints received July 18, July 25, and August 1, 2023.', date: '2023-08-30T10:00:00Z', byId: 'landlord1', byName: 'David Park' } },
      ],
      evidence: { required: mkDocs('T2', [true, true, true]), additional: [] },
      aiBrief: {
        generatedDate: '2023-09-10T09:00:00Z',
        summary: 'T2 application alleging harassment and three unlawful entries. Landlord provides noise complaint documentation. Limited direct evidence of retaliatory intent. Key issue: correlation between complaint filing and subsequent repair delays.',
        consistencies: ['Both parties agree on timing of three entries', 'Both parties acknowledge the warning letter was issued after the tenant\'s noise complaint'],
        conflicts: ['Whether repair delay was caused by contractor shortage (landlord) or retaliation (tenant)', 'Whether warning letter constituted harassment under s.23 RTA'],
        evidenceGaps: ['No city contractor shortage notice produced', 'No record of repair request queue provided'],
        applicableLaw: ['s.23 RTA — Harassment', 's.26 RTA — Right of Entry', 's.83 RTA — Relief from Forfeiture'],
        suggestedOutcome: 'Evidence of retaliatory intent is circumstantial. Unlawful entry on one of three occasions appears likely (no written notice). Application may partially succeed. Small abatement possible.',
      },
      ruling: { decision: 'dismissed', text: 'Having reviewed all submitted evidence, this Tribunal finds insufficient evidence to establish that the landlord\'s conduct constituted harassment under s.23 RTA. The noise complaints from other tenants provide a legitimate non-retaliatory explanation for the warning letter. The repair delay, while unfortunate, is attributable to documented contractor shortages. Two of three entries had adequate notice. The application is DISMISSED. No costs awarded.', awardAmount: 0, date: '2023-09-20T14:00:00Z', adjudicatorId: 'adjudicator1', adjudicatorName: 'Hon. R. Kapoor' },
      appeal: { byId: 'tenant1', byName: 'Sarah Mitchell', grounds: 'The ruling failed to adequately address the temporal correlation between my formal noise complaint and the subsequent 6-week repair withholding. The Tribunal did not request the contractor shortage documentation and accepted the landlord\'s assertion without verification. I submit this constitutes a reviewable error under s.210 RTA.', date: '2023-10-04T11:00:00Z', status: 'pending' },
      auditLog: [
        { text: 'Dispute filed. Case number: LTB-ON-2023-0188', date: '2023-08-10T08:00:00Z' },
        { text: 'Sarah Mitchell submitted sworn testimony.', date: '2023-08-17T10:00:00Z' },
        { text: 'David Park submitted sworn testimony.', date: '2023-08-22T13:00:00Z' },
        { text: 'Stage advanced to Questions.', date: '2023-08-22T13:01:00Z' },
        { text: 'Stage advanced to Answering.', date: '2023-08-28T09:05:00Z' },
        { text: 'AI Case Brief generated.', date: '2023-09-10T09:00:00Z' },
        { text: 'Ruling issued by Hon. R. Kapoor: dismissed.', date: '2023-09-20T14:00:00Z' },
        { text: 'Appeal filed by Sarah Mitchell.', date: '2023-10-04T11:00:00Z' },
      ],
    },

    // ─── 8 · L2 · Questions ────────────────────────────────────
    {
      id: 'LTB-ON-2024-0241',
      typeCode: 'L2',
      type: 'Eviction — Repeated Late Payment',
      address: '55 St Clair Ave W, Unit 8B, Toronto, ON M4V 2Y4',
      tenantId: 'tenant2',
      landlordId: 'landlord2',
      adjudicatorId: 'adjudicator2',
      stage: 'questions',
      filedDate: '2024-09-20T08:00:00Z',
      deadline: '2024-11-05T08:00:00Z',
      testimony: {
        tenant: { text: 'My rent of $1,950/month has been paid late on four occasions over 18 months, each time within 10 days of the due date. Each late payment was caused by payroll processing delays at my employer. I have provided my employer\'s payroll schedule as evidence. I am requesting that the Board exercise discretion under s.83 RTA and dismiss the application, noting that no arrears are currently outstanding.', date: '2024-09-27T10:00:00Z', userId: 'tenant2' },
        landlord: { text: 'Novak Rentals has tolerated repeated late payments over 18 months. Despite serving N8 Notices in March and July 2024, James Osei continues to pay late. The financial impact on our mortgage obligations is significant. We are requesting an eviction order conditional on continued timely payment, with a clause allowing reinstatement of proceedings upon any further late payment within 12 months.', date: '2024-10-01T14:00:00Z', userId: 'landlord2' },
      },
      questions: [
        { id: 'Q012', fromId: 'tenant2', fromName: 'James Osei', fromRole: 'tenant', text: 'What is the specific financial harm you have incurred as a result of the late payments, given that all rent was eventually paid in full?', date: '2024-10-05T09:00:00Z', answer: null },
        { id: 'Q013', fromId: 'landlord2', fromName: 'Helen Novak', fromRole: 'landlord', text: 'Can you confirm that your employer\'s payroll dates are fixed and provide documentation showing when your pay is deposited each month?', date: '2024-10-06T11:00:00Z', answer: null },
      ],
      evidence: { required: mkDocs('L2', [true, true, true]), additional: [
        { id: 'ADOC007', name: 'Employer Payroll Schedule 2024', filename: 'payroll_schedule_employer_2024.pdf', size: '125 KB', uploadedBy: 'tenant2', uploadedByName: 'James Osei', uploadDate: '2024-09-27T10:10:00Z' },
      ]},
      aiBrief: null,
      ruling: null,
      appeal: null,
      auditLog: [
        { text: 'Dispute filed. Case number: LTB-ON-2024-0241', date: '2024-09-20T08:00:00Z' },
        { text: 'James Osei submitted sworn testimony.', date: '2024-09-27T10:00:00Z' },
        { text: 'Helen Novak submitted sworn testimony.', date: '2024-10-01T14:00:00Z' },
        { text: 'Stage advanced to Questions — both testimonies received.', date: '2024-10-01T14:01:00Z' },
        { text: 'James Osei submitted question #1.', date: '2024-10-05T09:00:00Z' },
        { text: 'Helen Novak submitted question #2.', date: '2024-10-06T11:00:00Z' },
      ],
    },
  ];

  const notifications = [
    { id: 'N001', userId: 'tenant1',      title: 'Action Required', message: 'Your question in LTB-ON-2024-0047 is awaiting an answer from David Park.', date: '2024-09-19T08:00:00Z', read: false },
    { id: 'N002', userId: 'landlord1',    title: 'Action Required', message: 'Please answer the outstanding question from Sarah Mitchell in LTB-ON-2024-0047.', date: '2024-09-19T08:01:00Z', read: false },
    { id: 'N003', userId: 'landlord1',    title: 'Testimony Pending', message: 'Your sworn testimony for LTB-ON-2024-0108 has not yet been submitted.', date: '2024-10-11T08:00:00Z', read: false },
    { id: 'N004', userId: 'adjudicator2', title: 'Case Ready for Ruling', message: 'LTB-ON-2024-0203 (N12 — James Osei vs David Park) is ready for your ruling decision.', date: '2024-08-20T09:05:00Z', read: false },
    { id: 'N005', userId: 'tenant2',      title: 'Questions Phase Open', message: 'LTB-ON-2024-0241 has entered the questions phase. You may submit up to 3 questions.', date: '2024-10-01T14:05:00Z', read: true },
    { id: 'N006', userId: 'tenant3',      title: 'Questions Phase Open', message: 'LTB-ON-2024-0162 has entered the questions phase. You may submit up to 3 questions.', date: '2024-08-27T13:05:00Z', read: true },
    { id: 'N007', userId: 'tenant1',      title: 'Appeal Status', message: 'Your appeal for LTB-ON-2023-0188 has been received and is under review by the Divisional Court.', date: '2023-10-04T12:00:00Z', read: true },
    { id: 'N008', userId: 'adjudicator1', title: 'New Case Assigned', message: 'LTB-ON-2024-0162 (T6 — Priya Sharma vs Helen Novak) has been assigned to you.', date: '2024-08-15T08:10:00Z', read: true },
    { id: 'N009', userId: 'admin',        title: 'System Alert', message: 'LTB-ON-2024-0225 has had no activity for 10 days. Please follow up with both parties.', date: '2024-10-15T08:00:00Z', read: false },
    { id: 'N010', userId: 'admin',        title: 'Brief Generated', message: 'AI Case Brief for LTB-ON-2024-0203 has been generated and is ready for adjudicator review.', date: '2024-08-20T09:05:00Z', read: true },
  ];

  // Attempt to load persisted dispute state from localStorage
  function loadPersisted() {
    try {
      const saved = localStorage.getItem('resolveai_v3_disputes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  const persisted = loadPersisted();
  if (persisted) {
    disputes.length = 0;
    persisted.forEach(d => disputes.push(d));
  }

  return { users, disputes, disputeTypes, notifications };
})();
