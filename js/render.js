// ============================================================
// render.js — All DOM Rendering Functions
// Pure output: reads state, writes HTML. No mutations here.
// ============================================================

window.UI = (function () {

  // ── Toast Notifications ───────────────────────────────────

  function toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const id = 'toast-' + Date.now();
    const icons = {
      success: '<path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/>',
      error:   '<path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>',
      info:    '<path d="M13 16h-1v-4h-1m1-4h.01" stroke-linecap="round" stroke-linejoin="round"/>',
      warning: '<path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke-linecap="round" stroke-linejoin="round"/>',
    };
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.id = id;
    el.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="toast-icon">
        ${icons[type] || icons.info}
      </svg>
      <span>${message}</span>
      <button class="toast-dismiss" onclick="document.getElementById('${id}').remove()">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 5L5 15M5 5l10 10"/></svg>
      </button>`;
    container.appendChild(el);
    setTimeout(() => el.classList.add('toast-show'), 10);
    setTimeout(() => { el.classList.remove('toast-show'); setTimeout(() => el.remove(), 300); }, 4500);
  }

  // ── Sidebar ───────────────────────────────────────────────

  function renderSidebar() {
    const u = Auth.currentUser;
    if (!u) return;

    const roleLabel = { admin: 'Administrator', tenant: 'Tenant', landlord: 'Landlord', adjudicator: 'Adjudicator' }[u.role] || u.role;
    const roleColor = { admin: 'gold', tenant: 'green', landlord: 'blue', adjudicator: 'purple' }[u.role] || 'gold';

    document.getElementById('sidebar-user').innerHTML = `
      <div class="user-avatar user-avatar-${roleColor}">${u.initials}</div>
      <div class="user-info">
        <strong>${u.name}</strong>
        <span class="user-role role-${roleColor}">${roleLabel}</span>
      </div>`;

    const notifCount = DB.notifications.filter(n => n.userId === u.id && !n.read).length;
    const badge = count => count > 0 ? `<span class="nav-badge">${count}</span>` : '';

    const visible   = Disputes.getVisible();
    const activeCount = visible.filter(d => !['ruled', 'appealed'].includes(d.stage)).length;

    const navItems = [];

    if (u.role === 'admin') {
      navItems.push(
        { view: 'analytics',  label: 'Analytics',        icon: analyticsIcon() },
        { view: 'disputes',   label: 'All Disputes',      icon: briefcaseIcon(), count: activeCount },
        { view: 'notifications', label: 'Notifications',  icon: bellIcon(),      count: notifCount },
      );
    } else if (u.role === 'adjudicator') {
      navItems.push(
        { view: 'disputes',   label: 'My Cases',          icon: briefcaseIcon(), count: activeCount },
        { view: 'notifications', label: 'Notifications',  icon: bellIcon(),      count: notifCount },
      );
    } else {
      navItems.push(
        { view: 'disputes',   label: 'My Cases',          icon: briefcaseIcon(), count: activeCount },
        { view: 'notifications', label: 'Notifications',  icon: bellIcon(),      count: notifCount },
      );
    }

    document.getElementById('sidebar-nav').innerHTML = navItems.map(item => `
      <button class="nav-item ${App.currentView === item.view ? 'nav-item-active' : ''}"
              onclick="App.showView('${item.view}')">
        ${item.icon}
        <span>${item.label}</span>
        ${badge(item.count)}
      </button>`).join('');

    // Topbar notification badge
    const badgeEl = document.getElementById('notif-badge');
    if (notifCount > 0) { badgeEl.textContent = notifCount; badgeEl.hidden = false; }
    else { badgeEl.hidden = true; }

    // Breadcrumb
    const labels = { analytics: 'Analytics', disputes: u.role === 'admin' ? 'All Disputes' : 'My Cases', notifications: 'Notifications' };
    document.getElementById('topbar-breadcrumb').innerHTML = `
      <span class="breadcrumb-root">ResolveAI</span>
      <span class="breadcrumb-sep">/</span>
      <span class="breadcrumb-page">${labels[App.currentView] || App.currentView}</span>`;

    // Search bar visibility
    document.getElementById('topbar-search').hidden = App.currentView !== 'disputes';
  }

  // ── Analytics View (Admin Only) ───────────────────────────

  function renderAnalytics() {
    const s = Disputes.getStats();
    const stageLabels = { testimony: 'Testimony', questions: 'Questions', answering: 'Answering', aiReview: 'AI Review', ruled: 'Ruled', appealed: 'Appealed' };
    const stageColors = { testimony: 'purple', questions: 'blue', answering: 'cyan', aiReview: 'amber', ruled: 'green', appealed: 'red' };

    const maxStage = Math.max(...Object.values(s.byStage), 1);
    const maxType  = Math.max(...Object.values(s.byType),  1);

    const stageBar = (key) => {
      const pct = Math.round((s.byStage[key] / maxStage) * 100);
      return `<div class="chart-row">
        <span class="chart-label">${stageLabels[key]}</span>
        <div class="chart-bar-track"><div class="chart-bar chart-bar-${stageColors[key]}" style="width:${pct}%"></div></div>
        <span class="chart-value">${s.byStage[key]}</span>
      </div>`;
    };

    const typeBar = (key, label) => {
      if (!s.byType[key]) return '';
      const pct = Math.round((s.byType[key] / maxType) * 100);
      return `<div class="chart-row">
        <span class="chart-label">${label}</span>
        <div class="chart-bar-track"><div class="chart-bar chart-bar-gold" style="width:${pct}%"></div></div>
        <span class="chart-value">${s.byType[key]}</span>
      </div>`;
    };

    const recentRows = s.recentActivity.map(entry => `
      <tr>
        <td><a class="table-link" href="#" onclick="App.openDispute('${entry.disputeId}');return false;">${entry.disputeId}</a></td>
        <td>${entry.text}</td>
        <td class="text-muted">${fmtDateShort(entry.date)}</td>
      </tr>`).join('');

    document.getElementById('page-content').innerHTML = `
      <div class="page-header">
        <h2 class="page-title">Platform Analytics</h2>
        <span class="page-subtitle">All disputes across Ontario LTB · Updated ${fmtDateShort(new Date().toISOString())}</span>
      </div>

      <div class="stats-grid">
        ${statCard('Total Disputes',     s.total,    'All time', 'gold')}
        ${statCard('Active Cases',       s.active,   'In progress', 'blue')}
        ${statCard('Resolved',           s.resolved, 'Rulings issued', 'green')}
        ${statCard('Under Appeal',       s.appealed, 'Escalated', 'red')}
      </div>

      <div class="charts-grid">
        <div class="card">
          <div class="card-header"><h3 class="card-title">Cases by Stage</h3></div>
          <div class="card-body chart-container">
            ${Object.keys(stageLabels).map(stageBar).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3 class="card-title">Cases by Dispute Type</h3></div>
          <div class="card-body chart-container">
            ${typeBar('AGI', 'Above Guideline Increase')}
            ${typeBar('T2',  'Landlord Harassment')}
            ${typeBar('L1',  'Non-Payment Eviction')}
            ${typeBar('T6',  'Failure to Maintain')}
            ${typeBar('N12', "Landlord's Own Use")}
            ${typeBar('L2',  'Repeated Late Payment')}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Recent Platform Activity</h3>
          <span class="card-subtitle">Last 12 actions across all disputes</span>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>Case ID</th><th>Activity</th><th>Date</th></tr></thead>
            <tbody>${recentRows}</tbody>
          </table>
        </div>
      </div>`;
  }

  function statCard(label, value, sub, color) {
    return `<div class="stat-card stat-card-${color}">
      <div class="stat-value">${value}</div>
      <div class="stat-label">${label}</div>
      <div class="stat-sub">${sub}</div>
    </div>`;
  }

  // ── Disputes List View ────────────────────────────────────

  function renderDisputesList() {
    const u = Auth.currentUser;
    const visible = Disputes.getVisible();
    const filtered = Disputes.filter(visible, {
      search: App.searchQuery,
      stage:  App.filterStage,
      type:   App.filterType,
    });

    const isAdmin = u.role === 'admin';

    const filterBar = `
      <div class="filter-bar">
        <select class="filter-select" onchange="App.setFilter('stage', this.value)">
          <option value="all" ${App.filterStage === 'all' ? 'selected' : ''}>All Stages</option>
          <option value="testimony"  ${App.filterStage === 'testimony'  ? 'selected' : ''}>Testimony</option>
          <option value="questions"  ${App.filterStage === 'questions'  ? 'selected' : ''}>Questions</option>
          <option value="answering"  ${App.filterStage === 'answering'  ? 'selected' : ''}>Answering</option>
          <option value="aiReview"   ${App.filterStage === 'aiReview'   ? 'selected' : ''}>AI Review</option>
          <option value="ruled"      ${App.filterStage === 'ruled'      ? 'selected' : ''}>Ruled</option>
          <option value="appealed"   ${App.filterStage === 'appealed'   ? 'selected' : ''}>Appealed</option>
        </select>
        <select class="filter-select" onchange="App.setFilter('type', this.value)">
          <option value="all" ${App.filterType === 'all' ? 'selected' : ''}>All Types</option>
          <option value="AGI" ${App.filterType === 'AGI' ? 'selected' : ''}>AGI — Above Guideline</option>
          <option value="T2"  ${App.filterType === 'T2'  ? 'selected' : ''}>T2 — Harassment</option>
          <option value="L1"  ${App.filterType === 'L1'  ? 'selected' : ''}>L1 — Non-Payment</option>
          <option value="T6"  ${App.filterType === 'T6'  ? 'selected' : ''}>T6 — Maintenance</option>
          <option value="N12" ${App.filterType === 'N12' ? 'selected' : ''}>N12 — Landlord Use</option>
          <option value="L2"  ${App.filterType === 'L2'  ? 'selected' : ''}>L2 — Late Payment</option>
        </select>
        ${isAdmin ? `<button class="btn btn-primary btn-sm" onclick="UI.openCreateDisputeModal()">+ New Dispute</button>` : ''}
        ${(App.filterStage !== 'all' || App.filterType !== 'all' || App.searchQuery) ? `<button class="btn btn-ghost btn-sm" onclick="App.clearFilters()">Clear Filters</button>` : ''}
      </div>`;

    const rows = filtered.length === 0
      ? `<tr><td colspan="6" class="table-empty">No disputes match your current filters.</td></tr>`
      : filtered.map(d => {
          const t  = DB.users[d.tenantId];
          const ll = DB.users[d.landlordId];
          const adj = DB.users[d.adjudicatorId];
          const urgent = Auth.can('submitTestimony', d) || Auth.can('submitQuestion', d) || Auth.can('submitAnswer', d) || Auth.can('submitRuling', d);
          return `<tr class="table-row ${urgent ? 'table-row-urgent' : ''}" onclick="App.openDispute('${d.id}')">
            <td><span class="case-id">${d.id}</span>${urgent ? '<span class="urgent-dot" title="Action required"></span>' : ''}</td>
            <td><span class="type-badge type-${d.typeCode}">${d.typeCode}</span><span class="type-name">${d.type}</span></td>
            <td class="text-muted text-sm">${d.address.split(',').slice(0,2).join(',')}</td>
            <td>
              <div class="party-cell">
                <span class="party-name party-tenant">${t ? t.name : '—'}</span>
                <span class="party-vs">vs.</span>
                <span class="party-name party-landlord">${ll ? ll.name : '—'}</span>
              </div>
            </td>
            <td>${stageBadge(d.stage)}</td>
            <td class="text-muted text-sm">${fmtDateShort(d.filedDate)}</td>
          </tr>`;
        }).join('');

    const title = isAdmin ? 'All Disputes' : (u.role === 'adjudicator' ? 'Assigned Cases' : 'My Cases');

    document.getElementById('page-content').innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title">${title}</h2>
          <span class="page-subtitle">${filtered.length} of ${visible.length} ${visible.length === 1 ? 'dispute' : 'disputes'} shown</span>
        </div>
      </div>
      ${filterBar}
      <div class="card card-no-pad">
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Type</th>
                <th>Address</th>
                <th>Parties</th>
                <th>Stage</th>
                <th>Filed</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
  }

  // ── Notifications View ────────────────────────────────────

  function renderNotifications() {
    const u = Auth.currentUser;
    const notifs = DB.notifications.filter(n => n.userId === u.id || u.role === 'admin');
    notifs.sort((a, b) => new Date(b.date) - new Date(a.date));

    const rows = notifs.length === 0
      ? `<div class="empty-state"><p>No notifications.</p></div>`
      : notifs.map(n => `
        <div class="notif-item ${n.read ? '' : 'notif-unread'}" onclick="this.classList.remove('notif-unread')">
          <div class="notif-dot ${n.read ? 'notif-dot-read' : ''}"></div>
          <div class="notif-content">
            <strong>${n.title}</strong>
            <p>${n.message}</p>
            <span class="notif-date">${fmtDateShort(n.date)}</span>
          </div>
        </div>`).join('');

    const unread = notifs.filter(n => !n.read).length;

    document.getElementById('page-content').innerHTML = `
      <div class="page-header">
        <h2 class="page-title">Notifications</h2>
        ${unread > 0 ? `<span class="page-subtitle">${unread} unread</span>` : ''}
      </div>
      <div class="card card-no-pad notif-list">${rows}</div>`;
  }

  // ── Dispute Panel ─────────────────────────────────────────

  function openDispute(disputeId) {
    const d = Disputes.getById(disputeId);
    if (!d) return;

    const u  = DB.users[d.tenantId];
    const ll = DB.users[d.landlordId];
    const adj = DB.users[d.adjudicatorId];

    document.getElementById('panel-header-info').innerHTML = `
      <div class="panel-case-id">${d.id}</div>
      <div class="panel-case-type">${d.type}</div>
      <div class="panel-case-meta">
        <span>${stageBadge(d.stage)}</span>
        <span class="text-muted">${d.address}</span>
      </div>`;

    document.getElementById('panel-body').innerHTML = buildPanelBody(d);

    document.getElementById('panel-overlay').hidden = false;
    document.getElementById('dispute-panel').hidden = false;
    document.body.classList.add('panel-open');

    App.openDisputeId = disputeId;
  }

  function buildPanelBody(d) {
    const sections = [];

    // Timeline
    sections.push(buildTimeline(d));

    // Parties
    sections.push(buildPartiesSection(d));

    // Evidence
    sections.push(buildEvidenceSection(d));

    // Testimony
    sections.push(buildTestimonySection(d));

    // Questions & Answers
    if (['questions', 'answering', 'aiReview', 'ruled', 'appealed'].includes(d.stage) || d.questions.length > 0) {
      sections.push(buildQASection(d));
    }

    // AI Brief
    if (d.aiBrief) sections.push(buildAIBriefSection(d));

    // Ruling
    if (d.ruling) sections.push(buildRulingSection(d));

    // Appeal
    if (d.appeal) sections.push(buildAppealSection(d));

    // Action Panel
    const actionHtml = buildActionPanel(d);
    if (actionHtml) sections.push(`<div class="panel-section panel-actions">${actionHtml}</div>`);

    // Audit Log
    sections.push(buildAuditLog(d));

    return sections.join('');
  }

  function buildTimeline(d) {
    const stages = ['testimony', 'questions', 'answering', 'aiReview', 'ruled'];
    const currentIdx = stages.indexOf(d.stage);
    const isAppealed = d.stage === 'appealed';

    const steps = stages.map((s, i) => {
      const done    = i < currentIdx || (isAppealed && s !== 'appealed');
      const current = i === currentIdx && !isAppealed;
      const labels  = { testimony: 'Testimony', questions: 'Questions', answering: 'Answering', aiReview: 'AI Review', ruled: 'Ruling' };
      return `<div class="tl-step ${done ? 'tl-done' : ''} ${current ? 'tl-current' : ''}">
        <div class="tl-dot">${done ? '✓' : i + 1}</div>
        <span>${labels[s]}</span>
      </div>`;
    });

    if (isAppealed) {
      steps.push(`<div class="tl-step tl-current tl-appealed"><div class="tl-dot">!</div><span>Appealed</span></div>`);
    }

    return `<div class="panel-section"><div class="timeline">${steps.join('')}</div></div>`;
  }

  function buildPartiesSection(d) {
    const t   = DB.users[d.tenantId]      || {};
    const ll  = DB.users[d.landlordId]    || {};
    const adj = DB.users[d.adjudicatorId] || {};

    const partyCard = (user, role, color) => `
      <div class="party-card party-card-${color}">
        <div class="party-avatar party-avatar-${color}">${user.initials || '?'}</div>
        <div>
          <div class="party-card-name">${user.name || 'Unknown'}</div>
          <div class="party-card-role">${role}</div>
          <div class="party-card-email">${user.email || ''}</div>
        </div>
      </div>`;

    return `<div class="panel-section">
      <h4 class="section-title">Parties</h4>
      <div class="parties-grid">
        ${partyCard(t,   'Tenant',      'green')}
        ${partyCard(ll,  'Landlord',    'blue')}
        ${partyCard(adj, 'Adjudicator', 'purple')}
      </div>
    </div>`;
  }

  function buildEvidenceSection(d) {
    const canUpload = Auth.can('uploadDocument', d);

    const encBadge = (encId) => {
      if (!encId) return '';
      const meta = PrivacyEngine.getOrGenerateSyncMeta(encId);
      return `<div class="encryption-badge" title="Key fingerprint: ${meta.fingerprint} · ${meta.keyOrigin}">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" class="enc-lock-icon">
          <rect x="3" y="7" width="10" height="8" rx="1.5"/>
          <path d="M5 7V5a3 3 0 016 0v2" stroke-linecap="round"/>
          <circle cx="8" cy="11" r="1" fill="currentColor" stroke="none"/>
        </svg>
        <span>${meta.algorithm}</span>
        <span class="enc-fp">${meta.fingerprint}</span>
      </div>`;
    };

    const req = d.evidence.required.map(doc => `
      <div class="evidence-item ${doc.uploaded ? 'evidence-uploaded' : 'evidence-pending'}">
        <div class="evidence-icon">${doc.uploaded ? '📄' : '📋'}</div>
        <div class="evidence-info">
          <span class="evidence-name">${doc.name}</span>
          ${doc.uploaded
            ? `<span class="evidence-meta">${doc.filename} · ${doc.size}</span>
               ${encBadge(doc.encryptionId || doc.name)}`
            : `<span class="evidence-meta evidence-missing">Required — not yet uploaded</span>`}
        </div>
        ${(!doc.uploaded && canUpload)
          ? `<button class="btn btn-sm btn-outline" onclick="Disputes.uploadDocument('${d.id}','${doc.name}',true)">Upload</button>`
          : doc.uploaded ? '<span class="evidence-check">✓</span>' : ''}
      </div>`).join('');

    const addl = d.evidence.additional.map(doc => `
      <div class="evidence-item evidence-uploaded">
        <div class="evidence-icon">📎</div>
        <div class="evidence-info">
          <span class="evidence-name">${doc.name}</span>
          <span class="evidence-meta">${doc.filename} · ${doc.size} · ${doc.uploadedByName}</span>
          ${encBadge(doc.encryptionId || doc.id)}
        </div>
        ${canUpload ? `<button class="btn btn-sm btn-ghost btn-danger" onclick="Disputes.removeAdditional('${d.id}','${doc.id}')">Remove</button>` : ''}
      </div>`).join('');

    const addDocForm = canUpload ? `
      <div class="add-doc-row">
        <input type="text" class="form-control form-control-sm" id="add-doc-name-${d.id}" placeholder="Document name…">
        <button class="btn btn-sm btn-outline" onclick="
          const v=document.getElementById('add-doc-name-${d.id}').value.trim();
          if(v){Disputes.uploadDocument('${d.id}',v,false);}
          else{UI.toast('Please enter a document name.','warning');}
        ">Add</button>
      </div>` : '';

    return `<div class="panel-section">
      <h4 class="section-title">Evidence & Documents</h4>
      <div class="evidence-list">${req}${addl}</div>
      ${addDocForm}
    </div>`;
  }

  function buildTestimonySection(d) {
    const canSubmit = Auth.can('submitTestimony', d);
    const u = Auth.currentUser;

    const testimonyCard = (label, testimony, color) => {
      if (!testimony) {
        return `<div class="testimony-card testimony-pending">
          <div class="testimony-header testimony-header-${color}"><strong>${label}</strong><span class="badge badge-pending">Pending</span></div>
          <p class="testimony-empty">No testimony submitted yet.</p>
        </div>`;
      }
      return `<div class="testimony-card">
        <div class="testimony-header testimony-header-${color}">
          <strong>${label}</strong>
          <span class="badge badge-done">Submitted ${fmtDateShort(testimony.date)}</span>
        </div>
        <p class="testimony-text">"${testimony.text}"</p>
      </div>`;
    };

    const submitForm = canSubmit ? `
      <div class="action-form">
        <h5>Submit Your Sworn Testimony</h5>
        <div class="privacy-input-notice">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M8 2L2 5v4c0 3 2.5 5.5 6 6.5C14 14.5 14 9 14 9V5L8 2z" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span><strong>Do not include:</strong> Social Insurance Numbers, bank account numbers, credit card numbers, or passwords. Your testimony is scanned for sensitive identifiers before submission.</span>
        </div>
        <textarea class="form-control" id="testimony-input-${d.id}" rows="5" maxlength="2000"
          placeholder="Provide your sworn statement of facts regarding this dispute. Be factual and concise. Maximum 2,000 characters."
          oninput="
            document.getElementById('tc-${d.id}').textContent=this.value.length+'/2000';
            const findings=PrivacyEngine.scanForPII(this.value);
            const warn=document.getElementById('pii-warn-${d.id}');
            if(findings.length>0){
              warn.hidden=false;
              warn.querySelector('.pii-warn-list').innerHTML=findings.map(f=>'<li class=\'pii-sev-'+f.severity+'\'>'+f.label+': '+f.note+'</li>').join('');
            }else{warn.hidden=true;}
          "></textarea>
        <div class="pii-warning" id="pii-warn-${d.id}" hidden>
          <strong>⚠ Sensitive data detected</strong>
          <ul class="pii-warn-list"></ul>
        </div>
        <div class="form-footer">
          <span class="char-count" id="tc-${d.id}">0/2000</span>
          <button class="btn btn-primary" onclick="
            const v=document.getElementById('testimony-input-${d.id}').value.trim();
            if(v.length<50){UI.toast('Testimony must be at least 50 characters.','warning');return;}
            Disputes.submitTestimony('${d.id}',v);">
            Submit Testimony
          </button>
        </div>
      </div>` : '';

    return `<div class="panel-section">
      <h4 class="section-title">Sworn Testimony</h4>
      <div class="testimony-grid">
        ${testimonyCard('Tenant Statement',   d.testimony.tenant,   'green')}
        ${testimonyCard('Landlord Statement', d.testimony.landlord, 'blue')}
      </div>
      ${submitForm}
    </div>`;
  }

  function buildQASection(d) {
    const u = Auth.currentUser;
    const canAsk    = Auth.can('submitQuestion', d);
    const canAnswer = Auth.can('submitAnswer', d);
    const myQCount  = d.questions.filter(q => q.fromId === u.id).length;

    const qaItems = d.questions.map(q => {
      const canAnswerThis = canAnswer && q.fromId !== u.id && !q.answer;
      return `<div class="qa-item">
        <div class="qa-question">
          <div class="qa-meta">
            <span class="qa-role role-${q.fromRole}">${q.fromName}</span>
            <span class="qa-date">${fmtDateShort(q.date)}</span>
          </div>
          <p class="qa-text">${q.text}</p>
        </div>
        ${q.answer
          ? `<div class="qa-answer">
              <div class="qa-meta"><span class="qa-answer-label">Answer from ${q.answer.byName}</span><span class="qa-date">${fmtDateShort(q.answer.date)}</span></div>
              <p class="qa-text">${q.answer.text}</p>
            </div>`
          : canAnswerThis
            ? `<div class="qa-answer-form">
                <textarea class="form-control" id="ans-${q.id}" rows="3" placeholder="Type your answer…"></textarea>
                <button class="btn btn-sm btn-primary mt-2" onclick="
                  const v=document.getElementById('ans-${q.id}').value.trim();
                  if(!v){UI.toast('Answer cannot be empty.','warning');return;}
                  Disputes.submitAnswer('${d.id}','${q.id}',v);">Submit Answer</button>
              </div>`
            : `<div class="qa-pending"><span class="text-muted">Awaiting response…</span></div>`}
      </div>`;
    }).join('');

    const askForm = canAsk ? `
      <div class="action-form">
        <h5>Submit a Question <span class="text-muted">(${myQCount}/3 used)</span></h5>
        <textarea class="form-control" id="q-input-${d.id}" rows="3" maxlength="500"
          placeholder="Ask a specific, factual question for the opposing party to answer in writing."
          oninput="document.getElementById('qc-${d.id}').textContent=this.value.length+'/500'"></textarea>
        <div class="form-footer">
          <span class="char-count" id="qc-${d.id}">0/500</span>
          <button class="btn btn-primary" onclick="
            const v=document.getElementById('q-input-${d.id}').value.trim();
            if(!v){UI.toast('Question cannot be empty.','warning');return;}
            Disputes.submitQuestion('${d.id}',v);">Submit Question</button>
        </div>
      </div>` : '';

    return `<div class="panel-section">
      <h4 class="section-title">Questions & Answers</h4>
      ${qaItems || '<p class="text-muted text-sm">No questions submitted yet.</p>'}
      ${askForm}
    </div>`;
  }

  function buildAIBriefSection(d) {
    const b = d.aiBrief;
    const consistenciesHtml = b.consistencies.map(c => `<li class="brief-item brief-agree">✓ ${c}</li>`).join('');
    const conflictsHtml     = b.conflicts.map(c => `<li class="brief-item brief-conflict">⚠ ${c}</li>`).join('');
    const gapsHtml          = b.evidenceGaps.map(g => `<li class="brief-item brief-gap">◆ ${g}</li>`).join('');
    const lawHtml           = b.applicableLaw.map(l => `<li class="brief-item brief-law">§ ${l}</li>`).join('');

    // Privacy manifest — show what was redacted before AI saw the data
    const priv = b.privacy || {};
    const redactionItems = (priv.redactionLog || [])
      .map(r => `<span class="redaction-tag">${r.label} → <em>${r.replacement}</em></span>`)
      .join('');
    const privacyShield = `
      <div class="privacy-shield">
        <div class="privacy-shield-icon">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75">
            <path d="M10 2L3 6v5c0 4.5 3 8 7 9 4-1 7-4.5 7-9V6L10 2z" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M7 10l2 2 4-4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="privacy-shield-body">
          <strong>Privacy Protected — PII Stripped Before AI Processing</strong>
          <p>${priv.note || 'Identifying information was masked before this brief was generated.'}</p>
          ${redactionItems ? `<div class="redaction-tags">${redactionItems}</div>` : ''}
        </div>
      </div>`;

    return `<div class="panel-section">
      <div class="ai-brief-header">
        <div class="ai-badge">AI</div>
        <div>
          <h4 class="section-title" style="margin:0">AI Case Brief</h4>
          <span class="text-muted text-sm">Generated ${fmtDateShort(b.generatedDate)} · ResolveAI Analysis Engine</span>
        </div>
      </div>
      ${privacyShield}
      <div class="ai-brief-body">
        <div class="brief-summary">${b.summary}</div>
        <div class="brief-grid">
          <div class="brief-col">
            <h5 class="brief-col-title">Points of Agreement</h5>
            <ul>${consistenciesHtml}</ul>
          </div>
          <div class="brief-col">
            <h5 class="brief-col-title">Points in Dispute</h5>
            <ul>${conflictsHtml}</ul>
          </div>
          <div class="brief-col">
            <h5 class="brief-col-title">Evidence Gaps</h5>
            <ul>${gapsHtml}</ul>
          </div>
          <div class="brief-col">
            <h5 class="brief-col-title">Applicable Law</h5>
            <ul>${lawHtml}</ul>
          </div>
        </div>
        <div class="ai-outcome">
          <strong>AI Suggested Outcome</strong>
          <p>${b.suggestedOutcome}</p>
        </div>
      </div>
    </div>`;
  }

  function buildRulingSection(d) {
    const r = d.ruling;
    const decisionLabels = { 'tenant-favor': 'Decided in Favour of Tenant', 'landlord-favor': 'Decided in Favour of Landlord', dismissed: 'Application Dismissed', partial: 'Partial Order Granted' };
    const decisionColors = { 'tenant-favor': 'green', 'landlord-favor': 'blue', dismissed: 'red', partial: 'amber' };
    const color = decisionColors[r.decision] || 'gold';

    return `<div class="panel-section">
      <h4 class="section-title">Official Ruling</h4>
      <div class="ruling-card ruling-${color}">
        <div class="ruling-header">
          <strong>${decisionLabels[r.decision] || r.decision}</strong>
          ${r.awardAmount > 0 ? `<span class="ruling-award">Award: $${r.awardAmount.toLocaleString('en-CA', {minimumFractionDigits:2})}</span>` : ''}
        </div>
        <p class="ruling-text">${r.text}</p>
        <div class="ruling-meta">Issued by ${r.adjudicatorName} · ${fmtDateShort(r.date)}</div>
      </div>
    </div>`;
  }

  function buildAppealSection(d) {
    const a = d.appeal;
    return `<div class="panel-section">
      <h4 class="section-title">Appeal Filed</h4>
      <div class="appeal-card">
        <div class="appeal-header">
          <strong>Appeal by ${a.byName}</strong>
          <span class="badge badge-appealed">Status: ${a.status}</span>
        </div>
        <p class="ruling-text"><strong>Grounds:</strong> ${a.grounds}</p>
        <div class="ruling-meta">Filed ${fmtDateShort(a.date)}</div>
      </div>
    </div>`;
  }

  function buildActionPanel(d) {
    const u = Auth.currentUser;
    const parts = [];

    if (Auth.can('genBrief', d) && d.stage === 'answering') {
      parts.push(`<div class="action-form">
        <div class="alert alert-info">All parties have had an opportunity to respond. You may now generate the AI Brief and advance to AI Review.</div>
        <button class="btn btn-primary" onclick="if(confirm('Generate AI Brief and advance this case to AI Review?')){Disputes.generateBrief('${d.id}');}">
          Generate AI Brief &amp; Advance
        </button>
      </div>`);
    }

    if (Auth.can('advStage', d) && d.stage === 'questions') {
      parts.push(`<div class="action-form">
        <div class="alert alert-warning">Questions phase is open. You can close it early and move to Answering.</div>
        <button class="btn btn-outline" onclick="if(confirm('Close the questions phase and advance to Answering?')){Disputes.advanceToAnswering('${d.id}');}">
          Close Questions &amp; Advance
        </button>
      </div>`);
    }

    if (Auth.can('submitRuling', d)) {
      parts.push(`<div class="action-form">
        <h5>Issue Ruling</h5>
        <select class="form-control mb-2" id="ruling-decision-${d.id}">
          <option value="">— Select Decision —</option>
          <option value="tenant-favor">Decided in Favour of Tenant</option>
          <option value="landlord-favor">Decided in Favour of Landlord</option>
          <option value="partial">Partial Order</option>
          <option value="dismissed">Application Dismissed</option>
        </select>
        <input type="number" class="form-control mb-2" id="ruling-award-${d.id}" placeholder="Award amount (CAD) — enter 0 if none" min="0" step="0.01">
        <textarea class="form-control mb-2" id="ruling-text-${d.id}" rows="5"
          placeholder="Issue your written ruling, citing relevant RTA provisions and addressing each party's key arguments."></textarea>
        <button class="btn btn-primary" onclick="
          const dec=document.getElementById('ruling-decision-${d.id}').value;
          const txt=document.getElementById('ruling-text-${d.id}').value.trim();
          const amt=document.getElementById('ruling-award-${d.id}').value;
          if(!dec){UI.toast('Please select a decision.','warning');return;}
          if(txt.length<80){UI.toast('Ruling text must be at least 80 characters.','warning');return;}
          Disputes.submitRuling('${d.id}',dec,txt,amt);">Issue Ruling</button>
      </div>`);
    }

    if (Auth.can('appeal', d)) {
      parts.push(`<div class="action-form">
        <h5>File an Appeal</h5>
        <div class="alert alert-warning">Appeals are reviewed by the Divisional Court under s.210 RTA. Ensure you have legal grounds before proceeding.</div>
        <textarea class="form-control mb-2" id="appeal-grounds-${d.id}" rows="4"
          placeholder="State your grounds for appeal, citing specific errors of law or fact in the ruling."></textarea>
        <button class="btn btn-danger" onclick="
          const g=document.getElementById('appeal-grounds-${d.id}').value.trim();
          if(g.length<50){UI.toast('Please provide detailed grounds for appeal (min. 50 characters).','warning');return;}
          if(confirm('Are you sure you want to file an appeal? This action cannot be undone.')){Disputes.appealRuling('${d.id}',g);}">
          File Appeal
        </button>
      </div>`);
    }

    return parts.join('');
  }

  function buildAuditLog(d) {
    const entries = (d.auditLog || []).slice().reverse().map(e => `
      <div class="audit-entry">
        <span class="audit-date">${fmtDateShort(e.date)}</span>
        <span class="audit-text">${e.text}</span>
      </div>`).join('');

    return `<div class="panel-section panel-section-audit">
      <h4 class="section-title">Audit Log</h4>
      <div class="audit-list">${entries || '<p class="text-muted text-sm">No activity recorded.</p>'}</div>
    </div>`;
  }

  function closePanel() {
    document.getElementById('panel-overlay').hidden = true;
    document.getElementById('dispute-panel').hidden = true;
    document.body.classList.remove('panel-open');
    App.openDisputeId = null;
  }

  // ── Modal ─────────────────────────────────────────────────

  function openCreateDisputeModal() {
    const tenants = Object.values(DB.users).filter(u => u.role === 'tenant');
    const landlords = Object.values(DB.users).filter(u => u.role === 'landlord');
    const adjs = Object.values(DB.users).filter(u => u.role === 'adjudicator');

    const opts = (arr) => arr.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
    const typeOpts = Object.values(DB.disputeTypes).map(t => `<option value="${t.code}">${t.code} — ${t.name}</option>`).join('');

    document.getElementById('modal-title').textContent = 'File New Dispute';
    document.getElementById('modal-body').innerHTML = `
      <div class="form-group">
        <label>Dispute Type</label>
        <select class="form-control" id="nd-type"><option value="">— Select —</option>${typeOpts}</select>
      </div>
      <div class="form-group">
        <label>Property Address</label>
        <input type="text" class="form-control" id="nd-address" placeholder="123 Main St, Unit 4, Toronto, ON M5V 3G5">
      </div>
      <div class="form-group">
        <label>Tenant</label>
        <select class="form-control" id="nd-tenant"><option value="">— Select —</option>${opts(tenants)}</select>
      </div>
      <div class="form-group">
        <label>Landlord</label>
        <select class="form-control" id="nd-landlord"><option value="">— Select —</option>${opts(landlords)}</select>
      </div>
      <div class="form-group">
        <label>Adjudicator</label>
        <select class="form-control" id="nd-adj"><option value="">— Select —</option>${opts(adjs)}</select>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="UI.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="
          const data={
            typeCode:      document.getElementById('nd-type').value,
            address:       document.getElementById('nd-address').value.trim(),
            tenantId:      document.getElementById('nd-tenant').value,
            landlordId:    document.getElementById('nd-landlord').value,
            adjudicatorId: document.getElementById('nd-adj').value,
          };
          if(!data.typeCode||!data.address||!data.tenantId||!data.landlordId||!data.adjudicatorId){
            UI.toast('Please complete all fields.','warning');return;
          }
          Disputes.createDispute(data);">Create Dispute</button>
      </div>`;

    document.getElementById('modal-overlay').hidden = false;
    document.getElementById('modal').hidden = false;
  }

  function closeModal() {
    document.getElementById('modal-overlay').hidden = true;
    document.getElementById('modal').hidden = true;
  }

  // ── Sidebar mobile toggle ─────────────────────────────────
  function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('sidebar-open');
  }

  // ── Shared helpers ────────────────────────────────────────

  function stageBadge(stage) {
    const cfg = {
      testimony: ['Testimony', 'purple'],
      questions: ['Questions', 'blue'],
      answering: ['Answering', 'cyan'],
      aiReview:  ['AI Review', 'amber'],
      ruled:     ['Ruled',     'green'],
      appealed:  ['Appealed',  'red'],
    };
    const [label, color] = cfg[stage] || [stage, 'grey'];
    return `<span class="badge badge-${color}">${label}</span>`;
  }

  function fmtDateShort(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // ── SVG Icon helpers ──────────────────────────────────────
  function briefcaseIcon() {
    return `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" class="nav-icon">
      <rect x="2" y="7" width="16" height="11" rx="2"/>
      <path d="M7 7V5a3 3 0 016 0v2"/>
    </svg>`;
  }
  function analyticsIcon() {
    return `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" class="nav-icon">
      <path d="M2 17h16M4 17V9m4 8V5m4 12v-6m4 6v-3"/>
    </svg>`;
  }
  function bellIcon() {
    return `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" class="nav-icon">
      <path d="M10 2a6 6 0 00-6 6v3l-1.5 2H17.5L16 11V8a6 6 0 00-6-6zM8.5 16.5a1.5 1.5 0 003 0"/>
    </svg>`;
  }

  return {
    toast,
    renderSidebar,
    renderAnalytics,
    renderDisputesList,
    renderNotifications,
    openDispute,
    closePanel,
    openCreateDisputeModal,
    closeModal,
    toggleSidebar,
    stageBadge,
    fmtDateShort,
  };
})();
