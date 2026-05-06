// ============================================================
// app.js — Application Coordinator
// Manages routing, global state, and event wiring.
// ============================================================

window.App = (function () {

  // ── Application State ─────────────────────────────────────
  let currentView    = 'disputes';
  let searchQuery    = '';
  let filterStage    = 'all';
  let filterType     = 'all';
  let openDisputeId  = null;

  // ── Initialization ────────────────────────────────────────

  function init() {
    const u = Auth.currentUser;
    if (!u) return;

    // Default view per role
    currentView = u.role === 'admin' ? 'analytics' : 'disputes';
    searchQuery = '';
    filterStage = 'all';
    filterType  = 'all';

    render();
  }

  function render() {
    UI.renderSidebar();

    switch (currentView) {
      case 'analytics':     UI.renderAnalytics();      break;
      case 'disputes':      UI.renderDisputesList();   break;
      case 'notifications': UI.renderNotifications();  break;
      default:              UI.renderDisputesList();
    }
  }

  // ── Navigation ────────────────────────────────────────────

  function showView(view) {
    currentView = view;
    UI.closePanel();
    render();
  }

  function openDispute(id) {
    UI.openDispute(id);
  }

  // ── Search & Filters ──────────────────────────────────────

  function handleSearch(query) {
    searchQuery = query;
    UI.renderDisputesList();
  }

  function setFilter(key, value) {
    if (key === 'stage') filterStage = value;
    if (key === 'type')  filterType  = value;
    UI.renderDisputesList();
  }

  function clearFilters() {
    searchQuery = '';
    filterStage = 'all';
    filterType  = 'all';
    document.getElementById('search-input').value = '';
    UI.renderDisputesList();
  }

  // ── Global Keyboard Shortcuts ─────────────────────────────

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!document.getElementById('modal').hidden)          { UI.closeModal();  return; }
      if (!document.getElementById('dispute-panel').hidden)  { UI.closePanel();  return; }
    }

    // Ctrl/Cmd + K — focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const input = document.getElementById('search-input');
      if (input && !document.getElementById('topbar-search').hidden) {
        input.focus();
      } else {
        showView('disputes');
        setTimeout(() => document.getElementById('search-input')?.focus(), 100);
      }
    }
  });

  // ── Login form — Enter key ─────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !document.getElementById('login-screen').hidden) {
      Auth.login();
    }
  });

  // ── Page load ────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', () => {
    // Try to restore an existing session (survives page refresh)
    Auth.restoreSession();
  });

  // ── Public API ────────────────────────────────────────────

  return {
    get currentView()   { return currentView; },
    get searchQuery()   { return searchQuery; },
    get filterStage()   { return filterStage; },
    get filterType()    { return filterType;  },
    get openDisputeId() { return openDisputeId; },
    set openDisputeId(v){ openDisputeId = v; },
    init,
    showView,
    openDispute,
    handleSearch,
    setFilter,
    clearFilters,
    render,
  };
})();
