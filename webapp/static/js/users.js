import { markdownToHtml } from './renderHelpers.js';

export function initializeUserSideTab() {
    // Select the user button using the correct ID from HTML
    const userBtn = document.getElementById('users-btn');
    
    // Select or create the side tab element
    let sideTab = document.getElementById('user-side-tab') || createSideTab();
    
    // Add event listeners
    setupEventListeners(userBtn, sideTab);
}

function createSideTab() {
    const sideTab = document.createElement('div');
    sideTab.id = 'user-side-tab';
    sideTab.className = 'side-tab';
    document.body.appendChild(sideTab);
    
    // Create a tabbed interface for the side tab
    sideTab.innerHTML = `
        <div class="side-tab-header">
            <button class="close-btn">&times;</button>
            <span>Memory Data</span>
        </div>
        <div class="side-tab-navigation">
            <ul class="nav nav-tabs" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link active" id="users-tab" data-bs-toggle="tab" 
                        data-bs-target="#users-content" type="button" role="tab">
                        Users <span class="badge bg-secondary">0</span>
                    </button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="expressions-tab" data-bs-toggle="tab" 
                        data-bs-target="#expressions-content" type="button" role="tab">
                        Expressions <span class="badge bg-secondary">0</span>
                    </button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="agents-tab" data-bs-toggle="tab" 
                        data-bs-target="#agents-content" type="button" role="tab">
                        Agents <span class="badge bg-secondary">0</span>
                    </button>
                </li>
            </ul>
        </div>
        <div class="tab-content side-tab-content">
            <div class="tab-pane fade show active" id="users-content" role="tabpanel">
                <div id="users-container">
                    <p>Loading user information...</p>
                </div>
            </div>
            <div class="tab-pane fade" id="expressions-content" role="tabpanel">
                <div id="expressions-container">
                    <p>Loading expressions...</p>
                </div>
            </div>
            <div class="tab-pane fade" id="agents-content" role="tabpanel">
                <div id="functions-container">
                    <p>Loading agents...</p>
                </div>
            </div>
        </div>
    `;
    
    return sideTab;
}

function toggleSideTab(sideTab) {
    // Toggle the active class instead of directly manipulating style.right
    if (sideTab.classList.contains('active')) {
        sideTab.classList.remove('active');
    } else {
        sideTab.classList.add('active');
        // Load user data when the side tab is shown
        fetch(`/api/memory/${userId}`)
            .then(response => response.json())
            .then(data => {
                updateMemoryUI(data['memory_data']);
            })
            .catch(error => {
                console.error('Error fetching memory data:', error);
                document.getElementById('users-container').innerHTML = 
                    '<p class="text-danger">Error loading data. Please try again.</p>';
            });
    }
}

function setupEventListeners(userBtn, sideTab) {
    // Add click event to user button
    if (userBtn) {
        userBtn.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            console.log('User button clicked');
            toggleSideTab(sideTab);
        });
    } else {
        console.error("User button not found. Please check the ID in the HTML");
    }
    
    // Add click event to close button
    const closeBtn = sideTab.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            sideTab.classList.remove('active');
        });
    }
    
    // Close the side tab when clicking outside of it, only if it's open
    document.addEventListener('click', function(event) {
        if (!sideTab.contains(event.target) && 
            event.target !== userBtn && 
            sideTab.classList.contains('active')) {
            sideTab.classList.remove('active');
        }
    });
}

// Function to update the UI with memory data
function updateMemoryUI(data) {
    console.log("Updating memory UI with data:", data);
    
    if (!data) {
        console.error("Invalid memory data structure:", data);
        return;
    }
    
    // Update Users section
    updateUsersSection(data);
    
    // Update Expressions section
    updateExpressionsSection(data);
    
    // Update Agents section (previously Functions)
    updateAgentsSection(data);
}

function updateUsersSection(memoryData) {
    const usersContainer = document.getElementById('users-container');
    if (!usersContainer) {
        console.log("Users container not found, skipping update");
        return;
    }
    
    const registeredUsers = memoryData['Registered Users'] || {};
    const userCount = Object.keys(registeredUsers).length;
    updateTabBadge('users-tab', userCount);
    
    if (userCount === 0) {
        usersContainer.innerHTML = '<p class="text-muted">No registered users found</p>';
        return;
    }
    
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
        userHtml += `<p class="text-muted">No reminders set</p>`;
    }
    
    userHtml += `</div>`;
    return userHtml;
}

function generateRemindersSection(reminders) {
    let html = `
        <h6><i class="fas fa-bell"></i> Reminders <span class="reminder-badge">${reminders.length}</span></h6>
        <div class="reminders-list">
    `;
    
    reminders.forEach((reminder) => {
        html += `
            <div class="reminder-item">
                <div><strong>${markdownToHtml(reminder.info || 'No reminder details')}</strong></div>
                <div class="reminder-time small">
                    <span><i class="far fa-clock"></i> Due: ${reminder['reminder_time'] || 'Not specified'}</span>
                </div>
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
    
    if (expressionCount === 0) {
        expressionsContainer.innerHTML = '<p class="text-muted">No expressions found</p>';
        return;
    }
    
    let expressionsHtml = '<div class="expressions-grid">';
    
    for (const [expression, description] of Object.entries(expressions)) {
        const safeExpression = expression.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        expressionsHtml += `
            <div class="expression-item shadow-sm">
                <div class="expression-key"><code>${safeExpression}</code></div>
                <div class="expression-description">${markdownToHtml(description)}</div>
            </div>
        `;
    }
    
    expressionsHtml += '</div>';
    expressionsContainer.innerHTML = expressionsHtml;
}

function updateAgentsSection(memoryData) {
    const functionsContainer = document.getElementById('functions-container');
    if (!functionsContainer) return;
    
    // Handle different possible data structures for agents
    let agentItems = [];
    const agents = memoryData['Agents'] || {};
    
    if (Array.isArray(agents)) {
        agentItems = agents;
    } else if (typeof agents === 'object' && agents !== null) {
        // If it's an object, convert to array of values
        agentItems = Object.entries(agents).map(([key, value]) => key);
    }
    
    const agentCount = agentItems.length;
    updateTabBadge('agents-tab', agentCount);
    
    if (agentCount === 0) {
        functionsContainer.innerHTML = '<p class="text-muted">No agents found</p>';
        return;
    }
    
    let agentsHtml = '<div class="agents-grid">';
    
    agentItems.forEach(agent => {
        agentsHtml += generateAgentCard(agent);
    });
    
    agentsHtml += '</div>';
    functionsContainer.innerHTML = agentsHtml;
}

function generateAgentCard(agent) {
    // Extract agent name from the format: <AgentName(param1='value1', param2='value2')>
    const nameMatch = agent.match(/<([^(]+)/);
    const agentName = nameMatch && nameMatch[1] ? nameMatch[1].trim() : '';
    
    // Extract parameters
    const agentParams = {};
    const paramsMatch = agent.match(/\((.*?)\)>/);
    
    if (paramsMatch && paramsMatch[1]) {
        // Split by commas but not within quotes
        const paramStrings = paramsMatch[1].split(/,(?=(?:(?:[^']*'){2})*[^']*$)/);
        
        paramStrings.forEach(param => {
            const [key, value] = param.split('=');
            if (key && value) {
                const cleanKey = key.trim();
                const cleanValue = value.trim().replace(/^['"](.*)['"]$/, '$1');
                agentParams[cleanKey] = cleanValue;
            }
        });
    }
    
    // Determine agent type and styling
    const { icon, className } = getAgentIconAndClass(agentName);
    
    // Build HTML for parameters
    let paramsHtml = '';
    if (Object.keys(agentParams).length > 0) {
        paramsHtml += '<div class="agent-params">';
        for (const [paramName, paramValue] of Object.entries(agentParams)) {
            paramsHtml += `<div class="param-item">
                <span class="param-name">${paramName}:</span> 
                <span class="param-value">"${paramValue}"</span>
            </div>`;
        }
        paramsHtml += '</div>';
    }
    
    return `
        <div class="agent-item shadow-sm ${className}">
            <div class="agent-header">
                ${icon}
                <h6>${agentName}</h6>
            </div>
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


// Add updateTabBadge function if it doesn't exist
function updateTabBadge(tabId, count) {
    const badge = document.querySelector(`#${tabId} .badge`);
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
}



