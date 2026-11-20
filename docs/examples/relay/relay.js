'use strict';

const workstation = document.body.classList.contains('workstation');
const storageKey = 'incredible-lavi.relay.' + (workstation ? 'after' : 'before') + '.v1';
const narrow = matchMedia('(max-width: 895px)');
const queue = document.querySelector('#queue');
const queueList = document.querySelector('#queue-list');
const queueFooter = document.querySelector('#queue-footer');
const views = document.querySelector('.views');
const search = document.querySelector('#search');
const priority = document.querySelector('#priority');
const detail = document.querySelector('#detail');
const incidentDialog = document.querySelector('#incident-dialog');
const confirmDialog = document.querySelector('#confirm-dialog');
const announcement = document.querySelector('#announcement');
const drafts = new Map();
const viewNames = { active: 'Active', unassigned: 'Unassigned', resolved: 'Resolved', all: 'All' };
const clock = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
const date = new Intl.DateTimeFormat('en-GB', { month: 'short', day: 'numeric', timeZone: 'UTC' });

let storageAvailable = true;
let changes = readChanges();
let view = 'active';
let selected = routeIncident();
let lastOpened = selected;
let pendingResolve = '';
let feedback = '';

if (selected && incident(selected).status === 'resolved') view = 'resolved';

function readChanges() {
  let saved;
  try {
    saved = localStorage.getItem(storageKey);
  } catch {
    storageAvailable = false;
    return {};
  }
  try {
    const parsed = JSON.parse(saved || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function routeIncident() {
  const id = location.hash.slice(1);
  return incidents.some(item => item.id === id) ? id : '';
}

function incident(id) {
  const original = incidents.find(item => item.id === id);
  if (!original) return undefined;
  const patch = changes[id] || {};
  return {
    ...original,
    owner: typeof patch.owner === 'string' && (patch.owner === '' || Object.hasOwn(responders, patch.owner)) ? patch.owner : original.owner,
    status: typeof patch.status === 'string' && Object.hasOwn(statuses, patch.status) ? patch.status : original.status,
    activity: original.activity.concat(Array.isArray(patch.activity) ? patch.activity.filter(validEvent) : [])
  };
}

function validEvent(entry) {
  return entry && ['note', 'owner', 'status'].includes(entry.type) && typeof entry.at === 'string' &&
    Number.isFinite(Date.parse(entry.at)) && ['title', 'text', 'by'].every(field => typeof entry[field] === 'string');
}

function matchesView(item, filter) {
  if (filter === 'active') return item.status !== 'resolved';
  if (filter === 'unassigned') return item.status !== 'resolved' && !item.owner;
  if (filter === 'resolved') return item.status === 'resolved';
  return true;
}

function matchesSearch(item) {
  const owner = item.owner ? responders[item.owner].name : 'Unassigned';
  const words = search.value.trim().toLowerCase().split(/\s+/);
  const text = [item.id, item.title, item.service, item.region, owner, statuses[item.status]].join(' ').toLowerCase();
  return words.every(word => text.includes(word));
}

function badgePriority(item, full = false) {
  const meaning = priorities[item.priority];
  return '<span class="severity ' + item.priority.toLowerCase() + '" title="' + meaning + '">' +
    '<i aria-hidden="true"></i><span>' + item.priority + '</span>' +
    (full ? '<span class="severity-name">' + meaning + '</span>' : '<span class="visually-hidden"> ' + meaning + '</span>') + '</span>';
}

function badgeStatus(item) {
  return '<span class="state state-' + item.status + '"><i aria-hidden="true"></i>' + statuses[item.status] + '</span>';
}

function ownerName(item) {
  const name = item.owner ? responders[item.owner].name : 'Unassigned';
  return '<span class="owner-name' + (item.owner ? '' : ' needs-owner') + '">' + name + '</span>';
}

function queueRow(item, current) {
  return '<li><button class="queue-row ' + item.priority.toLowerCase() + (current ? ' selected' : '') + '" data-open="' + item.id + '"' +
    (current ? ' aria-current="true"' : '') + '>' +
    '<span class="row-severity">' + badgePriority(item) + '</span>' +
    '<span class="row-incident"><strong>' + item.title + '</strong><span class="row-meta"><span class="case-id">' + item.id +
    '</span><span>' + item.service + '</span><span class="row-region">' + item.region + '</span></span></span>' +
    '<span class="row-state">' + badgeStatus(item) + '</span>' +
    '<span class="row-owner">' + ownerName(item) + '</span>' +
    '<span class="row-end" aria-hidden="true"></span></button></li>';
}

function renderQueue() {
  const items = incidents.map(({ id }) => incident(id));
  const visible = items.filter(item => matchesView(item, view) && (!priority.value || priority.value === item.priority) && matchesSearch(item));
  const focusedView = document.activeElement?.dataset.view;

  views.innerHTML = Object.entries(viewNames).map(([name, label]) => {
    const count = items.filter(item => matchesView(item, name)).length;
    return '<button class="view-button" data-view="' + name + '" aria-pressed="' + (view === name) + '">' +
      label + ' <span class="view-count">' + count + '</span></button>';
  }).join('');

  if (focusedView) views.querySelector('[data-view="' + focusedView + '"]')?.focus({ preventScroll: true });

  const current = selected || (workstation && !narrow.matches ? visible[0]?.id : '');
  const headings = workstation ? '' :
    '<div class="row-head" aria-hidden="true"><span>Priority</span><span>Incident</span><span>Status</span><span>Owner</span></div>';
  queueList.innerHTML = visible.length ?
    headings + '<ul class="rows">' + visible.map(item => queueRow(item, workstation && !narrow.matches && current === item.id)).join('') + '</ul>' :
    '<div class="empty"><strong>No incidents match this view.</strong><p>Clear your search and filters to see all incidents.</p><button class="button" data-reset>Show all incidents</button></div>';

  const countLabel = visible.length === 1 ? '1 incident' : visible.length + ' incidents';
  queueFooter.innerHTML = '<span>' + countLabel + '</span><span>18 Nov · 09:42 UTC snapshot</span>';
  return current;
}

function timeLabel(value) {
  const when = new Date(value);
  const day = when.toISOString().slice(0, 10) === snapshot.toISOString().slice(0, 10) ? '' : date.format(when) + ' · ';
  return day + clock.format(when) + ' UTC';
}

function historyEntry(entry) {
  return '<li class="timeline-item event-' + entry.type + '"><i aria-hidden="true"></i><div class="event-meta">' +
    '<time datetime="' + escapeHtml(entry.at) + '">' + timeLabel(entry.at) + '</time><span>' + escapeHtml(entry.by) + '</span></div>' +
    '<div class="event-title">' + escapeHtml(entry.title) + '</div>' +
    (entry.text ? '<p>' + escapeHtml(entry.text) + '</p>' : '') + '</li>';
}

function responseProgress(item) {
  const milestones = [
    { name: 'Opened', entry: item.activity[0] },
    { name: 'Acknowledged', entry: item.activity.find(entry => entry.title === 'Incident acknowledged') },
    { name: 'Resolved', entry: item.activity.find(entry => entry.title === 'Incident resolved') }
  ];
  const current = milestones.findLastIndex(({ entry }) => entry);

  return '<ol class="response-progress" aria-label="Response milestones">' + milestones.map(({ name, entry }, index) =>
    '<li class="' + (entry ? 'reached' : 'pending') + '"' + (index === current ? ' aria-current="step"' : '') +
    '><span>' + name + '</span>' +
    (entry ? '<time datetime="' + escapeHtml(entry.at) + '" title="' + timeLabel(entry.at) + '">' + clock.format(new Date(entry.at)) +
      '<span class="visually-hidden"> UTC</span></time>' : '<span class="visually-hidden"> pending</span>') + '</li>'
  ).join('') + '</ol>';
}

function ownerForm(item) {
  if (item.status === 'resolved') {
    return '<div class="owner-readonly"><span class="control-label">Owner</span><strong>' + ownerName(item) + '</strong></div>';
  }

  const options = Object.entries(responders).map(([id, person]) => {
    const label = person.name + (id === 'avery-morgan' ? ' (you)' : ' · ' + person.team);
    return '<option value="' + id + '"' + (id === item.owner ? ' selected' : '') + '>' + label + '</option>';
  }).join('');

  return '<form id="owner-form" class="owner-form"><label for="assignee" class="control-label">Owner</label>' +
    '<div class="owner-controls"><select id="assignee" name="assignee"><option value="">Unassigned</option>' + options +
    '</select><button class="button primary" id="assign-button" type="submit" disabled>' +
    (item.owner ? 'Update owner' : 'Assign') + '</button></div></form>';
}

function stateAction(item) {
  if (item.status === 'new') return '<button class="button" type="button" id="state-button" data-ack>Acknowledge</button>';
  if (item.status === 'acknowledged' && item.owner) {
    return '<button class="button" type="button" id="state-button" data-resolve>Resolve incident</button>';
  }
  if (item.status === 'acknowledged') return '<p class="status-requirement">Assign an owner to resolve.</p>';
  return '';
}

function noteForm(body) {
  return '<form id="note-form" class="note-form"><label for="handoff-note" class="control-label">Add a handoff note</label>' +
    '<textarea id="handoff-note" name="note" maxlength="400" rows="2" placeholder="What changed? What should the next responder check?" required>' +
    escapeHtml(body) + '</textarea><div class="note-actions"><span class="note-limit" id="note-limit">' + body.length + ' / 400</span>' +
    '<button type="submit" class="button" id="save-note"' + (body.trim().length ? '' : ' disabled') + '>Save note</button></div></form>';
}

function responseHistory(item, body) {
  return '<section class="history" aria-labelledby="history-title"><div class="history-header"><h3 id="history-title">Response history</h3>' +
    '<span class="history-count">' + item.activity.length + ' events</span></div>' + noteForm(body) +
    '<ol class="timeline" aria-label="Activity, most recent first">' + [...item.activity].reverse().map(historyEntry).join('') +
    '</ol></section>';
}

function renderCase(item, body) {
  return '<div class="case-header"><button class="button compact back-button" data-close>Back to queue</button>' +
    '<div class="case-line"><span class="detail-id">' + item.id + '</span><div class="detail-status">' +
    badgePriority(item, true) + badgeStatus(item) + '</div></div>' +
    '<h2 id="detail-title" tabindex="-1">' + item.title + '</h2><div class="detail-context"><span>' +
    item.service + '</span><span>' + item.region + '</span></div></div>' +
    '<div class="case-work"><section class="case-impact"><h3 class="subheading">Customer impact</h3><p class="impact">' + item.impact +
    '</p></section><section class="case-actions" aria-label="Ownership and status"><div class="response-actions">' +
    ownerForm(item) + stateAction(item) + '</div><p class="feedback" id="feedback" ' + (feedback ? '' : 'hidden') + '>' +
    escapeHtml(feedback) + '</p></section></div>' + responseProgress(item) + responseHistory(item, body);
}

function renderDetail(id) {
  const item = incident(id);
  if (!item) {
    if (incidentDialog?.open) incidentDialog.close();
    detail.innerHTML = '<div class="empty detail-empty"><strong>Select an incident</strong><p>Its impact, owner, and response history will appear here.</p></div>';
    detail.removeAttribute('data-id');
    return;
  }

  detail.dataset.id = id;
  const body = drafts.get(id) || '';
  if (workstation) {
    detail.innerHTML = renderCase(item, body);
    return;
  }

  const opened = item.activity[0].at;
  detail.innerHTML =
    '<div class="detail-top"><span class="detail-id"><i aria-hidden="true"></i>' + item.id + '</span>' +
    '<button class="close-button" data-close aria-label="Close incident"></button></div>' +
    '<div class="detail-hero"><div class="detail-status">' + badgePriority(item, true) + badgeStatus(item) + '</div>' +
    '<h2 id="detail-title" tabindex="-1">' + item.title + '</h2><div class="detail-context"><span>' + item.service +
    '</span><span>' + item.region + '</span><span>Opened <time datetime="' +
    opened + '">' + clock.format(new Date(opened)) + ' UTC</time></span></div></div>' +
    '<div class="detail-body"><section class="response" aria-label="Incident impact and ownership">' +
    '<h3 class="subheading">Customer impact</h3><p class="impact">' + item.impact + '</p>' +
    '<div class="response-actions">' + ownerForm(item) + stateAction(item) + '</div>' +
    '<p class="feedback" id="feedback" ' + (feedback ? '' : 'hidden') + '>' + escapeHtml(feedback) + '</p></section>' +
    responseHistory(item, body) + '</div>';

  if (incidentDialog && !incidentDialog.open) incidentDialog.showModal();
}

function refresh(focus = '') {
  const current = renderQueue();
  const mobileDetail = workstation && narrow.matches && Boolean(selected);
  document.body.classList.toggle('showing-detail', mobileDetail);
  renderDetail(current);
  if (focus) document.getElementById(focus)?.focus({ preventScroll: true });
}

function returnFocus(id) {
  const row = queueList.querySelector('[data-open="' + id + '"]');
  if (row) row.focus();
  else search.focus();
}

function openIncident(id) {
  if (selected === id) {
    document.querySelector('#detail-title')?.focus();
    return;
  }
  if (selected && history.state?.relaySelection) history.replaceState({ relaySelection: true }, '', '#' + id);
  else history.pushState({ relaySelection: true }, '', '#' + id);
  selected = id;
  lastOpened = id;
  feedback = '';
  refresh('detail-title');
  if (workstation) window.scrollTo(0, 0);
  if (incidentDialog) incidentDialog.scrollTop = 0;
}

function syncRoute() {
  const previous = selected;
  selected = routeIncident();
  feedback = '';
  if (selected && incident(selected).status === 'resolved') view = 'resolved';
  refresh(selected ? 'detail-title' : '');
  if (!selected && (previous || lastOpened)) returnFocus(previous || lastOpened);
}

function closeIncident() {
  if (history.state?.relaySelection) {
    history.back();
    return;
  }
  history.replaceState(null, '', location.pathname + location.search);
  syncRoute();
}

function updateView(name, focus = '') {
  view = name;
  if (selected) {
    history.replaceState(null, '', location.pathname + location.search);
    selected = '';
  }
  feedback = '';
  refresh(focus);
}

function saveChange(id, fields, entry, message, focus) {
  if (storageAvailable) changes = readChanges();
  const previous = changes[id] || {};
  changes[id] = {
    ...previous,
    ...fields,
    activity: [...(Array.isArray(previous.activity) ? previous.activity : []), { ...entry, by: operator, at: new Date().toISOString() }]
  };
  try {
    localStorage.setItem(storageKey, JSON.stringify(changes));
  } catch {
    storageAvailable = false;
  }

  // Keep the current case open when an assignment removes it from the unassigned queue.
  if (!selected) {
    selected = id;
    history.pushState({ relaySelection: true }, '', '#' + id);
  }
  feedback = storageAvailable ? message : message + ' Changes will last for this visit.';
  announcement.textContent = feedback;
  refresh(focus);
}

views.addEventListener('click', event => {
  const button = event.target.closest('[data-view]');
  if (button) updateView(button.dataset.view);
});

queueList.addEventListener('click', event => {
  const button = event.target.closest('[data-open]');
  if (button) openIncident(button.dataset.open);
  if (event.target.closest('[data-reset]')) {
    search.value = '';
    priority.value = '';
    updateView('all', 'search');
  }
});

search.addEventListener('input', () => updateView(view));
priority.addEventListener('change', () => updateView(view));

detail.addEventListener('click', event => {
  const item = incident(detail.dataset.id);
  if (!item) return;
  if (event.target.closest('[data-close]')) closeIncident();

  if (event.target.closest('[data-ack]') && item.status === 'new') {
    saveChange(item.id, { status: 'acknowledged' }, { type: 'status', title: 'Incident acknowledged', text: '' },
      'Incident acknowledged.', item.owner ? 'state-button' : 'assignee');
  }

  if (event.target.closest('[data-resolve]') && item.status === 'acknowledged' && item.owner) {
    pendingResolve = item.id;
    document.querySelector('#confirm-copy').textContent = item.id + ' will move to the Resolved queue. Its response history will be available there.';
    confirmDialog.returnValue = '';
    confirmDialog.showModal();
  }
});

detail.addEventListener('change', event => {
  if (event.target.id !== 'assignee') return;
  const item = incident(detail.dataset.id);
  document.querySelector('#assign-button').disabled = event.target.value === item.owner;
});

detail.addEventListener('input', event => {
  if (event.target.id !== 'handoff-note') return;
  const body = event.target.value;
  drafts.set(detail.dataset.id, body);
  document.querySelector('#note-limit').textContent = body.length + ' / 400';
  document.querySelector('#save-note').disabled = !body.trim().length;
});

detail.addEventListener('submit', event => {
  event.preventDefault();
  const item = incident(detail.dataset.id);
  if (!item) return;

  if (event.target.id === 'owner-form' && item.status !== 'resolved') {
    const owner = event.target.elements.assignee.value;
    if (owner === item.owner || (owner && !responders[owner])) return;
    const message = owner ? 'Assigned to ' + responders[owner].name : 'Owner removed';
    saveChange(item.id, { owner }, { type: 'owner', title: message, text: '' }, message + '.', 'assignee');
  }

  if (event.target.id === 'note-form') {
    const body = event.target.elements.note.value.trim();
    if (!body || body.length > 400) return;
    drafts.delete(item.id);
    saveChange(item.id, {}, { type: 'note', title: 'Handoff note', text: body }, 'Handoff note saved.', 'handoff-note');
  }
});

confirmDialog.addEventListener('close', () => {
  const item = incident(pendingResolve);
  pendingResolve = '';
  if (confirmDialog.returnValue !== 'resolve' || item?.status !== 'acknowledged' || !item.owner) return;
  saveChange(item.id, { status: 'resolved' }, { type: 'status', title: 'Incident resolved', text: '' },
    'Incident resolved. Find it in the Resolved queue.', 'detail-title');
});

incidentDialog?.addEventListener('cancel', event => {
  event.preventDefault();
  closeIncident();
});

window.addEventListener('popstate', syncRoute);
window.addEventListener('storage', event => {
  if (event.key !== storageKey) return;
  changes = readChanges();
  refresh(document.activeElement?.id);
});
narrow.addEventListener('change', () => refresh());

refresh(selected ? 'detail-title' : '');
