// ============================================================
// disputes.js — Business Logic for Dispute Lifecycle
// All mutations go through this module; render.js is read-only.
// ============================================================

window.Disputes = (function () {

  // ── Queries ──────────────────────────────────────────────

  function getVisible() {
    const u = Auth.currentUser;
    if (!u) return [];
    if (u.role === 'admin') return DB.disputes;
    if (u.role === 'adjudicator') return DB.disputes.filter(d => d.adjudicatorId === u.id);
    return DB.disputes.filter(d => d.tenantId === u.id || d.landlordId === u.id);
  }

  function getById(id) {
    return DB.disputes.find(d => d.id === id) || null;
  }

  function filter(disputes, { search = '', stage = 'all', type = 'all' } = {}) {
    return disputes.filter(d => {
      if (stage !== 'all' && d.stage !== stage) return false;
      if (type  !== 'all' && d.typeCode !== type)  return false;
      if (search) {
        const q  = search.toLowerCase();
        const t  = DB.users[d.tenantId];
        const ll = DB.users[d.landlordId];
        const haystack = [
          d.id, d.type, d.address,
          t  ? t.name  : '',
          ll ? ll.name : '',
        ].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }

  function getStats() {
    const all = DB.disputes;
    const byStage = {};
    const byType  = {};
    const stages  = ['testimony', 'questions', 'answering', 'aiReview', 'ruled', 'appealed'];
    const types   = Object.keys(DB.disputeTypes);

    stages.forEach(s => { byStage[s] = all.filter(d => d.stage === s).length; });
    types.forEach(t  => { byType[t]  = all.filter(d => d.typeCode === t).length; });

    // Collect recent audit entries across all disputes
    const recentActivity = [];
    all.forEach(d => {
      (d.auditLog || []).forEach(entry => {
        recentActivity.push({ ...entry, disputeId: d.id });
      });
    });
    recentActivity.sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      total:    all.length,
      active:   all.filter(d => !['ruled', 'appealed'].includes(d.stage)).length,
      resolved: all.filter(d => d.stage === 'ruled').length,
      appealed: all.filter(d => d.stage === 'appealed').length,
      byStage,
      byType,
      recentActivity: recentActivity.slice(0, 12),
    };
  }

  // ── Mutations ─────────────────────────────────────────────

  function submitTestimony(disputeId, text) {
    const d = getById(disputeId);
    if (!d || !text.trim()) return;
    const u = Auth.currentUser;

    // PII scan — warn but do not block (user confirms their submission)
    const findings = PrivacyEngine.scanForPII(text);
    const critical  = findings.filter(f => f.severity === 'critical');
    if (critical.length > 0) {
      const labels = critical.map(f => f.label).join(', ');
      if (!confirm(`⚠ Privacy Warning\n\nYour testimony may contain sensitive identifiers:\n• ${labels}\n\nPlease remove these before submitting — they should never appear in legal documents.\n\nClick OK to submit anyway, or Cancel to revise.`)) {
        return;
      }
    }

    const entry = { text: text.trim(), date: now(), userId: u.id };
    if (u.role === 'tenant')   d.testimony.tenant   = entry;
    if (u.role === 'landlord') d.testimony.landlord  = entry;

    audit(d, `${u.name} submitted sworn testimony.`);

    if (d.testimony.tenant && d.testimony.landlord) {
      d.stage = 'questions';
      audit(d, 'Stage advanced to Questions — both testimonies received.');
    }

    persist();
    UI.toast('Testimony submitted successfully.', 'success');
    App.openDispute(disputeId);
  }

  function submitQuestion(disputeId, text) {
    const d = getById(disputeId);
    if (!d || !text.trim()) return;
    const u = Auth.currentUser;

    // Light PII scan on questions too
    const findings = PrivacyEngine.scanForPII(text);
    if (findings.some(f => f.severity === 'critical')) {
      UI.toast('Warning: your question may contain sensitive identifiers (SIN, card number). Please review before submitting.', 'warning');
    }

    const myQs = d.questions.filter(q => q.fromId === u.id);
    if (myQs.length >= 3) {
      UI.toast('Maximum of 3 questions per party.', 'error');
      return;
    }

    d.questions.push({
      id:       'Q' + Date.now(),
      fromId:   u.id,
      fromName: u.name,
      fromRole: u.role,
      text:     text.trim(),
      date:     now(),
      answer:   null,
    });

    audit(d, `${u.name} submitted question #${d.questions.length}.`);
    persist();
    UI.toast('Question submitted.', 'success');
    App.openDispute(disputeId);
  }

  function submitAnswer(disputeId, questionId, text) {
    const d = getById(disputeId);
    if (!d || !text.trim()) return;
    const u = Auth.currentUser;

    const q = d.questions.find(x => x.id === questionId);
    if (!q) return;

    q.answer = { text: text.trim(), date: now(), byId: u.id, byName: u.name };
    audit(d, `${u.name} answered question from ${q.fromName}.`);
    persist();
    UI.toast('Answer submitted.', 'success');
    App.openDispute(disputeId);
  }

  function advanceToAnswering(disputeId) {
    const d = getById(disputeId);
    if (!d || d.stage !== 'questions') return;
    d.stage = 'answering';
    audit(d, 'Stage advanced to Answering — questions period closed by admin.');
    persist();
    UI.toast('Dispute advanced to Answering stage.', 'success');
    App.openDispute(disputeId);
  }

  function generateBrief(disputeId) {
    const d = getById(disputeId);
    if (!d) return;
    d.aiBrief = AIBrief.generate(d);
    d.stage   = 'aiReview';
    audit(d, 'AI Case Brief generated. Dispute advanced to AI Review stage.');
    persist();
    UI.toast('AI Brief generated — case ready for adjudicator review.', 'success');
    App.openDispute(disputeId);
  }

  function submitRuling(disputeId, decision, text, awardAmount) {
    const d = getById(disputeId);
    if (!d || !text.trim()) return;
    const u = Auth.currentUser;

    d.ruling = {
      decision,
      text:             text.trim(),
      awardAmount:      parseFloat(awardAmount) || 0,
      date:             now(),
      adjudicatorId:    u.id,
      adjudicatorName:  u.name,
    };
    d.stage = 'ruled';
    audit(d, `Ruling issued by ${u.name}: ${decision}. Award: $${d.ruling.awardAmount.toFixed(2)}.`);
    persist();
    UI.toast('Ruling issued and recorded.', 'success');
    App.openDispute(disputeId);
  }

  function appealRuling(disputeId, grounds) {
    const d = getById(disputeId);
    if (!d || !grounds.trim()) return;
    const u = Auth.currentUser;

    d.appeal = {
      byId:    u.id,
      byName:  u.name,
      grounds: grounds.trim(),
      date:    now(),
      status:  'pending',
    };
    d.stage = 'appealed';
    audit(d, `Appeal filed by ${u.name}.`);
    persist();
    UI.toast('Appeal filed. Case escalated for review.', 'info');
    App.openDispute(disputeId);
  }

  function uploadDocument(disputeId, docName, isRequired) {
    const d = getById(disputeId);
    if (!d) return;
    const u = Auth.currentUser;
    const filename = docName.toLowerCase().replace(/[\s/()]+/g, '_') + '.pdf';
    const size     = Math.floor(Math.random() * 1800 + 150) + ' KB';
    const docId    = 'DOC' + Date.now();

    // Generate encryption metadata via Web Crypto API (async — updates UI when done)
    PrivacyEngine.encryptDocument(docId, docName, u.name).then(() => {
      // Re-render panel once crypto metadata is ready so the lock badge appears
      if (App.openDisputeId === disputeId) App.openDispute(disputeId);
    });

    if (isRequired) {
      const doc = d.evidence.required.find(e => e.name === docName);
      if (doc) {
        // Use docName as stable cache key for required docs
        Object.assign(doc, { uploaded: true, filename, size, uploadedBy: u.id, uploadDate: now(), encryptionId: docName });
      }
    } else {
      d.evidence.additional.push({
        id:             docId,
        name:           docName,
        filename,
        size,
        uploadedBy:     u.id,
        uploadedByName: u.name,
        uploadDate:     now(),
        encryptionId:   docId,
      });
    }

    audit(d, `${u.name} uploaded: ${docName}`);
    persist();
    UI.toast(`Document uploaded and encrypted: ${docName}`, 'success');
    App.openDispute(disputeId);
  }

  function removeAdditional(disputeId, docId) {
    const d = getById(disputeId);
    if (!d) return;
    const u = Auth.currentUser;
    const idx = d.evidence.additional.findIndex(x => x.id === docId);
    if (idx === -1) return;
    const name = d.evidence.additional[idx].name;
    d.evidence.additional.splice(idx, 1);
    audit(d, `${u.name} removed document: ${name}`);
    persist();
    UI.toast('Document removed.', 'info');
    App.openDispute(disputeId);
  }

  function createDispute(data) {
    const yr    = new Date().getFullYear();
    const newId = `LTB-ON-${yr}-${String(DB.disputes.length + 300).padStart(4, '0')}`;
    const tc    = DB.disputeTypes[data.typeCode];

    DB.disputes.unshift({
      id:            newId,
      typeCode:      data.typeCode,
      type:          tc.name,
      address:       data.address,
      tenantId:      data.tenantId,
      landlordId:    data.landlordId,
      adjudicatorId: data.adjudicatorId,
      stage:         'testimony',
      filedDate:     now(),
      deadline:      new Date(Date.now() + 45 * 86400000).toISOString(),
      testimony:     { tenant: null, landlord: null },
      questions:     [],
      evidence: {
        required:    tc.requiredDocs.map(name => ({ name, uploaded: false, filename: null, size: null, uploadedBy: null, uploadDate: null })),
        additional:  [],
      },
      aiBrief:  null,
      ruling:   null,
      appeal:   null,
      auditLog: [{ text: `Dispute filed and assigned. Case number: ${newId}`, date: now() }],
    });

    persist();
    UI.closeModal();
    UI.toast(`Dispute ${newId} created successfully.`, 'success');
    App.showView('disputes');
  }

  // ── Internal helpers ──────────────────────────────────────

  function audit(dispute, text) {
    dispute.auditLog = dispute.auditLog || [];
    dispute.auditLog.push({ text, date: now() });
  }

  function persist() {
    try {
      localStorage.setItem('resolveai_v3_disputes', JSON.stringify(DB.disputes));
    } catch (e) { /* quota exceeded or private mode */ }
  }

  function now() { return new Date().toISOString(); }

  // ── Reset (dev utility) ───────────────────────────────────
  function resetToDefaults() {
    localStorage.removeItem('resolveai_v3_disputes');
    location.reload();
  }

  return {
    getVisible,
    getById,
    filter,
    getStats,
    submitTestimony,
    submitQuestion,
    submitAnswer,
    advanceToAnswering,
    generateBrief,
    submitRuling,
    appealRuling,
    uploadDocument,
    removeAdditional,
    createDispute,
    resetToDefaults,
  };
})();
