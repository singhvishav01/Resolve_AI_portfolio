// ============================================================
// crypto.js — Privacy & Encryption Module
//
// Three responsibilities:
//   1. PII detection  — scan user text for SINs, card numbers, etc.
//   2. PII masking    — strip identifying info before AI processing
//   3. Document crypto — AES-256-GCM encryption via Web Crypto API
//
// In production this would integrate with a cloud KMS (e.g. AWS KMS,
// Azure Key Vault) so private keys never touch the application server.
// ============================================================

window.PrivacyEngine = (function () {

  // ── Key fingerprint cache (per session, per document) ─────
  // Maps docId → { fingerprint, algorithm, ivHex, encryptedAt }
  const _keyCache = new Map();

  // ── PII Detection Patterns ─────────────────────────────────
  const PII_PATTERNS = [
    {
      id:       'SIN',
      label:    'Social Insurance Number (SIN)',
      severity: 'critical',
      regex:    /\b\d{3}[\s\-]?\d{3}[\s\-]?\d{3}\b/,
      note:     'Never include your SIN in case documents or testimony.',
    },
    {
      id:       'CREDIT_CARD',
      label:    'Credit / Debit Card Number',
      severity: 'critical',
      regex:    /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/,
      note:     'Card numbers should not appear in legal submissions.',
    },
    {
      id:       'BANK_ACCOUNT',
      label:    'Possible Bank Account / Transit Number',
      severity: 'high',
      regex:    /\b\d{7,12}\b/,
      note:     'Do not include full account numbers. Reference statements by date only.',
    },
    {
      id:       'PHONE',
      label:    'Phone Number',
      severity: 'low',
      regex:    /\b\d{3}[\s\-.]?\d{3}[\s\-.]?\d{4}\b/,
      note:     'Phone numbers are already captured in your profile.',
    },
    {
      id:       'POSTAL_CODE',
      label:    'Postal Code',
      severity: 'info',
      regex:    /\b[A-Za-z]\d[A-Za-z][\s]?\d[A-Za-z]\d\b/,
      note:     'Address details are already on file for this dispute.',
    },
  ];

  // Scan a block of text and return any PII findings
  function scanForPII(text) {
    if (!text) return [];
    return PII_PATTERNS
      .filter(p => p.regex.test(text))
      .map(p => ({ id: p.id, label: p.label, severity: p.severity, note: p.note }));
  }

  // ── PII Masking (before AI processing) ────────────────────
  // Returns { maskedText, redactions[] } — redactions describe what was stripped.
  function maskForAI(text, { tenant, landlord, address } = {}) {
    if (!text) return { maskedText: '', redactions: [] };

    let masked = text;
    const redactions = [];

    const replace = (original, replacement, label) => {
      const r = new RegExp(escapeRegex(original), 'gi');
      if (r.test(masked)) {
        masked = masked.replace(new RegExp(escapeRegex(original), 'gi'), replacement);
        redactions.push({ label, replacement });
      }
    };

    // Party names
    if (tenant?.name)    replace(tenant.name,    'Party A (Applicant)',  'Tenant name');
    if (landlord?.name)  replace(landlord.name,  'Party B (Respondent)', 'Landlord name');
    if (landlord?.company) replace(landlord.company, '[COMPANY REDACTED]', 'Company name');

    // Contact details
    if (tenant?.email)   replace(tenant.email,   '[EMAIL REDACTED]',  'Tenant email');
    if (landlord?.email) replace(landlord.email, '[EMAIL REDACTED]',  'Landlord email');
    if (tenant?.phone)   replace(tenant.phone,   '[PHONE REDACTED]',  'Tenant phone');

    // Street-level address (keep city/province for legal jurisdiction context)
    if (address) {
      const streetMatch = address.match(/^([^,]+)/);
      if (streetMatch) {
        replace(streetMatch[1].trim(), '[ADDRESS REDACTED]', 'Street address');
      }
    }

    // Always scrub high-risk patterns regardless of known-PII list
    if (/\b\d{3}[\s\-]?\d{3}[\s\-]?\d{3}\b/.test(masked)) {
      masked = masked.replace(/\b\d{3}[\s\-]?\d{3}[\s\-]?\d{3}\b/g, '[SIN REDACTED]');
      redactions.push({ label: 'SIN pattern', replacement: '[SIN REDACTED]' });
    }
    if (/\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/.test(masked)) {
      masked = masked.replace(/\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/g, '[CARD REDACTED]');
      redactions.push({ label: 'Card number pattern', replacement: '[CARD REDACTED]' });
    }
    // Phone patterns not already caught above
    masked = masked.replace(/\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/g, (match) => {
      if (!redactions.some(r => r.replacement === '[PHONE REDACTED]')) {
        redactions.push({ label: 'Phone number pattern', replacement: '[PHONE REDACTED]' });
      }
      return '[PHONE REDACTED]';
    });

    return { maskedText: masked, redactions };
  }

  // Build a full PII mask report for an entire dispute (used by ai.js)
  function maskDispute(dispute) {
    const tenant   = DB.users[dispute.tenantId]   || null;
    const landlord = DB.users[dispute.landlordId] || null;
    const ctx      = { tenant, landlord, address: dispute.address };

    const allRedactions = new Map(); // label → replacement (deduped)

    const maskEntry = (entry) => {
      if (!entry) return null;
      const { maskedText, redactions } = maskForAI(entry.text, ctx);
      redactions.forEach(r => allRedactions.set(r.label, r.replacement));
      return { ...entry, text: maskedText };
    };

    const maskedTestimony = {
      tenant:   maskEntry(dispute.testimony?.tenant),
      landlord: maskEntry(dispute.testimony?.landlord),
    };

    const maskedQuestions = (dispute.questions || []).map(q => {
      const { maskedText: maskedQ, redactions: rQ } = maskForAI(q.text, ctx);
      rQ.forEach(r => allRedactions.set(r.label, r.replacement));
      const maskedAnswer = q.answer ? (() => {
        const { maskedText, redactions: rA } = maskForAI(q.answer.text, ctx);
        rA.forEach(r => allRedactions.set(r.label, r.replacement));
        return { ...q.answer, text: maskedText };
      })() : null;
      return { ...q, text: maskedQ, answer: maskedAnswer };
    });

    return {
      maskedDispute:  { ...dispute, testimony: maskedTestimony, questions: maskedQuestions },
      redactionCount: allRedactions.size,
      redactionLog:   Array.from(allRedactions.entries()).map(([label, replacement]) => ({ label, replacement })),
    };
  }

  // ── Document Encryption (Web Crypto API — AES-256-GCM) ────
  // Returns metadata for display. Actual encrypted bytes are discarded
  // (a real system would upload them to encrypted object storage).
  async function encryptDocument(docId, documentName, uploaderName) {
    if (_keyCache.has(docId)) return _keyCache.get(docId);

    try {
      // Generate a unique AES-256 key for this document
      const key = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,       // exportable — needed only to compute fingerprint
        ['encrypt', 'decrypt']
      );

      // 96-bit random IV (NIST SP 800-38D recommendation for GCM)
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      // Encrypt the document metadata as a stand-in for document content
      const encoder  = new TextEncoder();
      const payload  = encoder.encode(JSON.stringify({ name: documentName, uploader: uploaderName, ts: Date.now() }));
      await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, payload);

      // Export raw key bytes for fingerprinting (never stored — for display only)
      const rawKey     = await window.crypto.subtle.exportKey('raw', key);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', rawKey);
      const hashBytes  = new Uint8Array(hashBuffer);
      const fingerprint = Array.from(hashBytes).slice(0, 8)
        .map(b => b.toString(16).padStart(2, '0')).join(':');

      const meta = {
        algorithm:   'AES-256-GCM',
        fingerprint,
        ivHex:       Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
        encryptedAt: new Date().toISOString(),
        keyOrigin:   'Web Crypto API — browser-generated, ephemeral',
      };

      _keyCache.set(docId, meta);
      return meta;

    } catch (e) {
      // Web Crypto requires a secure context (HTTPS or localhost).
      // When opening via file://, fall back to a CSPRNG-based mock.
      const bytes = new Uint8Array(8);
      window.crypto.getRandomValues(bytes);
      const meta = {
        algorithm:   'AES-256-GCM',
        fingerprint: Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(':'),
        ivHex:       null,
        encryptedAt: new Date().toISOString(),
        keyOrigin:   'CSPRNG fallback (secure context required for full Web Crypto)',
      };
      _keyCache.set(docId, meta);
      return meta;
    }
  }

  // Synchronous fallback used for pre-existing documents in the mock DB
  function getOrGenerateSyncMeta(docId) {
    if (_keyCache.has(docId)) return _keyCache.get(docId);
    const bytes = new Uint8Array(8);
    window.crypto.getRandomValues(bytes);
    const meta = {
      algorithm:   'AES-256-GCM',
      fingerprint: Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(':'),
      ivHex:       null,
      encryptedAt: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
      keyOrigin:   'CSPRNG — session fingerprint',
    };
    _keyCache.set(docId, meta);
    return meta;
  }

  // ── Helpers ───────────────────────────────────────────────
  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  return {
    scanForPII,
    maskForAI,
    maskDispute,
    encryptDocument,
    getOrGenerateSyncMeta,
  };
})();
