// ============================================================
// auth.js — Authentication & Role-Based Access Control
// ============================================================

window.Auth = (function () {

  let currentUser = null;

  // ── Public API ────────────────────────────────────────────

  function login() {
    const username = document.getElementById('inp-user').value.trim();
    const password = document.getElementById('inp-pass').value;
    const errEl    = document.getElementById('login-error');

    const user = DB.users[username];

    if (!user || user.password !== password) {
      errEl.hidden = false;
      document.getElementById('inp-pass').value = '';
      document.getElementById('inp-pass').focus();
      return;
    }

    errEl.hidden = true;
    currentUser = user;
    sessionStorage.setItem('resolveai_uid', user.id);

    document.getElementById('login-screen').hidden = true;
    document.getElementById('app-screen').hidden   = false;

    App.init();
  }

  function logout() {
    currentUser = null;
    sessionStorage.removeItem('resolveai_uid');

    document.getElementById('app-screen').hidden   = true;
    document.getElementById('login-screen').hidden = false;
    document.getElementById('inp-user').value = '';
    document.getElementById('inp-pass').value = '';
    document.getElementById('login-error').hidden = true;
  }

  // Pre-fill demo credentials and immediately log in
  function fillDemo(username, password) {
    document.getElementById('inp-user').value = username;
    document.getElementById('inp-pass').value = password;
    login();
  }

  // Attempt to restore session from sessionStorage on page load
  function restoreSession() {
    const uid = sessionStorage.getItem('resolveai_uid');
    if (uid && DB.users[uid]) {
      currentUser = DB.users[uid];
      document.getElementById('login-screen').hidden = true;
      document.getElementById('app-screen').hidden   = false;
      App.init();
      return true;
    }
    return false;
  }

  // Role-based permission check
  function can(action, dispute) {
    if (!currentUser) return false;

    const u = currentUser;
    if (u.role === 'admin') return true;

    if (!dispute) {
      // Actions that only need role, not a specific dispute
      return false;
    }

    const isTenant     = dispute.tenantId      === u.id;
    const isLandlord   = dispute.landlordId    === u.id;
    const isParty      = isTenant || isLandlord;
    const isAdj        = dispute.adjudicatorId === u.id;

    switch (action) {
      case 'view':
        return isParty || isAdj;

      case 'submitTestimony':
        if (dispute.stage !== 'testimony') return false;
        if (isTenant   && !dispute.testimony.tenant)   return true;
        if (isLandlord && !dispute.testimony.landlord) return true;
        return false;

      case 'submitQuestion': {
        if (!isParty || dispute.stage !== 'questions') return false;
        const myQs = dispute.questions.filter(q => q.fromId === u.id);
        return myQs.length < 3;
      }

      case 'submitAnswer': {
        if (!isParty || dispute.stage !== 'answering') return false;
        // Can answer questions addressed to the other party (i.e., asked by the opponent)
        const unanswered = dispute.questions.filter(q => q.fromId !== u.id && !q.answer);
        return unanswered.length > 0;
      }

      case 'uploadDocument':
        return isParty && ['testimony', 'questions', 'answering'].includes(dispute.stage);

      case 'submitRuling':
        return isAdj && dispute.stage === 'aiReview';

      case 'appeal':
        return isParty && dispute.stage === 'ruled';

      case 'genBrief':
      case 'advStage':
      case 'createDispute':
        return u.role === 'admin';

      default:
        return false;
    }
  }

  // Expose currentUser as a getter so it stays in sync
  return {
    get currentUser() { return currentUser; },
    login,
    logout,
    fillDemo,
    restoreSession,
    can,
  };
})();
