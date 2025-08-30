import { markdownToHtml } from './renderHelpers.js';

// Modal-based user settings (replaces previous side tab)
export function initializeUserSideTab() {
  const userBtn = document.getElementById('users-btn');
  const settingsItem = document.getElementById('menu-settings');
  const modal = ensureUserModal();

  function openModal() {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    activateTab(modal, '#users-content');
    fetchMemoryData();
  }

  function closeModal() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }

  function fetchMemoryData() {
    try {
      const base = (window.IDOLL_API_BASE || '/api').replace(/\/$/, '');
      fetch(`${base}/memory/${window.userId}`, { credentials: 'include' })
        .then(r => r.json())
        .then(data => updateMemoryUI(data['memory_data']))
        .catch(err => {
          console.error('Error fetching memory data:', err);
          const users = modal.querySelector('#users-container');
          if (users) users.innerHTML = '<p class="text-rose-300 text-sm">Error loading data. Please try again.</p>';
        });
    } catch (e) {}
  }

  // Triggers
  userBtn?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openModal(); });
  settingsItem?.addEventListener('click', (e) => { e.preventDefault(); openModal(); });

  // Close behaviors
  modal.querySelector('#user-modal-close')?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  // Tabs
  modal.querySelectorAll('.user-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      activateTab(modal, btn.getAttribute('data-target'));
    });
  });
}

function ensureUserModal() {
  let modal = document.getElementById('user-modal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'user-modal';
  modal.className = 'fixed inset-0 z-[70] hidden items-center justify-center bg-black/60';
  modal.innerHTML = `
    <div class="w-full max-w-3xl mx-4 rounded-2xl bg-[#121826] text-white border border-white/10 shadow-2xl overflow-hidden">
      <div class="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h3 class="text-lg font-semibold">User Settings</h3>
        <button id="user-modal-close" class="text-white/70 hover:text-white"><i class="fas fa-times"></i></button>
      </div>
      <div class="px-4 pt-3">
        <div class="flex gap-2 mb-3">
          <button class="user-tab-btn px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-sm" data-target="#users-content">Users <span class="badge bg-secondary hidden"></span></button>
          <button class="user-tab-btn px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-sm" data-target="#expressions-content">Expressions <span class="badge bg-secondary hidden"></span></button>
          <button class="user-tab-btn px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-sm" data-target="#agents-content">Agents <span class="badge bg-secondary hidden"></span></button>
        </div>
        <div class="max-h-[65vh] overflow-y-auto pr-1 pb-4">
          <div id="users-content">
            <div id="users-container" class="text-sm text-white/80">Loading user information...</div>
          </div>
          <div id="expressions-content" class="hidden">
            <div id="expressions-container" class="text-sm text-white/80">Loading expressions...</div>
          </div>
          <div id="agents-content" class="hidden">
            <div id="functions-container" class="text-sm text-white/80">Loading agents...</div>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  return modal;
}

function activateTab(root, selector) {
  const tabs = ['#users-content', '#expressions-content', '#agents-content'];
  tabs.forEach(sel => {
    const pane = root.querySelector(sel);
    const btn  = Array.from(root.querySelectorAll('.user-tab-btn')).find(b => b.getAttribute('data-target') === sel);
    if (!pane || !btn) return;
    if (sel === selector) {
      pane.classList.remove('hidden');
      btn.classList.add('bg-white');
      btn.classList.add('text-ink');
    } else {
      pane.classList.add('hidden');
      btn.classList.remove('bg-white');
      btn.classList.remove('text-ink');
    }
  });
}

// Function to update the UI with memory data
function updateMemoryUI(data) {
  if (!data) return;
  updateUsersSection(data);
  updateExpressionsSection(data);
  updateAgentsSection(data);
}

function updateUsersSection(memoryData) {
  const usersContainer = document.getElementById('users-container');
  if (!usersContainer) return;
  const registeredUsers = memoryData['Registered Users'] || {};
  const userCount = Object.keys(registeredUsers).length;
  updateTabBadge('users-tab', userCount);
  if (userCount === 0) { usersContainer.innerHTML = '<p class="text-muted">No registered users found</p>'; return; }
  let usersHtml = '<div class="users-grid">';
  for (const [userName, userInfo] of Object.entries(registeredUsers)) {
    usersHtml += generateUserCard(userName, userInfo);
  }
  usersHtml += '</div>';
  usersContainer.innerHTML = usersHtml;
}

function generateUserCard(userName, userInfo) {
  let userHtml = `
    <div class="user-card">
      <h5 class="user-name"><i class="fas fa-user-circle"></i> ${userName}</h5>
      <div class="user-info markdown-content">${markdownToHtml(userInfo.info || 'No information available')}</div>
  `;
  if (userInfo.Reminders && Array.isArray(userInfo.Reminders) && userInfo.Reminders.length > 0) {
    userHtml += generateRemindersSection(userInfo.Reminders);
  } else {
    userHtml += `<p class=\"text-muted\">No reminders set</p>`;
  }
  userHtml += `</div>`;
  return userHtml;
}

function generateRemindersSection(reminders) {
  let html = `
    <h6><i class=\"fas fa-bell\"></i> Reminders <span class=\"reminder-badge\">${reminders.length}</span></h6>
    <div class=\"reminders-list\">
  `;
  reminders.forEach((reminder) => {
    html += `
      <div class=\"reminder-item\">
        <div><strong>${markdownToHtml(reminder.info || 'No reminder details')}</strong></div>
        <div class=\"reminder-time small\"><span><i class=\"far fa-clock\"></i> Due: ${reminder['reminder_time'] || 'Not specified'}</span></div>
      </div>
    `;
  });
  html += `</div>`;
  return html;
}

function updateExpressionsSection(memoryData) {
  const expressionsContainer = document.getElementById('expressions-container');
  if (!expressionsContainer) return;
  const expressions = memoryData['Expressions'] || {};
  const expressionCount = Object.keys(expressions).length;
  updateTabBadge('expressions-tab', expressionCount);
  if (expressionCount === 0) { expressionsContainer.innerHTML = '<p class="text-muted">No expressions found</p>'; return; }
  let expressionsHtml = '<div class="expressions-grid">';
  for (const [expression, description] of Object.entries(expressions)) {
    const safeExpression = expression.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    expressionsHtml += `
      <div class=\"expression-item shadow-sm\">
        <div class=\"expression-key\"><code>${safeExpression}</code></div>
        <div class=\"expression-description\">${markdownToHtml(description)}</div>
      </div>
    `;
  }
  expressionsHtml += '</div>';
  expressionsContainer.innerHTML = expressionsHtml;
}

function updateAgentsSection(memoryData) {
  const functionsContainer = document.getElementById('functions-container');
  if (!functionsContainer) return;
  let agentItems = [];
  const agents = memoryData['Agents'] || {};
  if (Array.isArray(agents)) {
    agentItems = agents;
  } else if (typeof agents === 'object' && agents !== null) {
    agentItems = Object.entries(agents).map(([key]) => key);
  }
  const agentCount = agentItems.length;
  updateTabBadge('agents-tab', agentCount);
  if (agentCount === 0) { functionsContainer.innerHTML = '<p class="text-muted">No agents found</p>'; return; }
  let agentsHtml = '<div class="agents-grid">';
  agentItems.forEach(agent => { agentsHtml += generateAgentCard(agent); });
  agentsHtml += '</div>';
  functionsContainer.innerHTML = agentsHtml;
}

function generateAgentCard(agent) {
  const nameMatch = agent.match(/<([^(]+)/);
  const agentName = nameMatch && nameMatch[1] ? nameMatch[1].trim() : '';
  const agentParams = {};
  const paramsMatch = agent.match(/\((.*?)\)>/);
  if (paramsMatch && paramsMatch[1]) {
    const paramStrings = paramsMatch[1].split(/,(?=(?:(?:[^']*'){2})*[^']*$)/);
    paramStrings.forEach(param => {
      const [key, value] = param.split('=');
      if (key && value) {
        const cleanKey = key.trim();
        const cleanValue = value.trim().replace(/^['\"](.*)['\"]$/, '$1');
        agentParams[cleanKey] = cleanValue;
      }
    });
  }
  const { icon, className } = getAgentIconAndClass(agentName);
  let paramsHtml = '';
  if (Object.keys(agentParams).length > 0) {
    paramsHtml += '<div class="agent-params">';
    for (const [paramName, paramValue] of Object.entries(agentParams)) {
      paramsHtml += `<div class=\"param-item\"><span class=\"param-name\">${paramName}:</span> <span class=\"param-value\">\"${paramValue}\"</span></div>`;
    }
    paramsHtml += '</div>';
  }
  return `
    <div class=\"agent-item shadow-sm ${className}\">
      <div class=\"agent-header\">${icon}<h6>${agentName}</h6></div>
      ${paramsHtml}
    </div>
  `;
}

function getAgentIconAndClass(agentName) {
  if (agentName.includes('WebSearch')) {
    return { icon: '<i class="fas fa-search"></i>', className: 'websearch-agent-card' };
  } else if (agentName.includes('Memory')) {
    return { icon: '<i class="fas fa-brain"></i>', className: 'memory-agent-card' };
  } else if (agentName.includes('Reminder')) {
    return { icon: '<i class="fas fa-bell"></i>', className: 'reminder-agent-card' };
  } else {
    return { icon: '<i class="fas fa-robot"></i>', className: 'generic-agent-card' };
  }
}

function updateTabBadge(tabId, count) {
  const map = { 'users-tab': '#users-content', 'expressions-tab': '#expressions-content', 'agents-tab': '#agents-content' };
  const selector = map[tabId];
  const btn = selector ? Array.from(document.querySelectorAll('.user-tab-btn')).find(b => b.getAttribute('data-target') === selector) : null;
  const badge = btn ? btn.querySelector('.badge') : null;
  if (badge) {
    badge.textContent = count;
    badge.classList.toggle('hidden', !(count > 0));
  }
}

