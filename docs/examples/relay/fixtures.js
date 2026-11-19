const responders = {
  'avery-morgan': { name: 'Avery Morgan', team: 'Incident response' },
  'maya-chen': { name: 'Maya Chen', team: 'Payments' },
  'omar-reyes': { name: 'Omar Reyes', team: 'Platform' },
  'nell-patel': { name: 'Nell Patel', team: 'Data systems' },
  'jules-park': { name: 'Jules Park', team: 'Network' }
};

const priorities = { P1: 'Critical', P2: 'High', P3: 'Moderate' };
const statuses = { new: 'New', acknowledged: 'Acknowledged', resolved: 'Resolved' };
const operator = responders['avery-morgan'].name;
const snapshot = new Date('2026-11-18T09:42:00Z');

function event(time, type, title, text = '', by = 'Relay monitor') {
  return { at: '2026-11-18T' + time + ':00Z', type, title, text, by };
}

const incidents = [
  {
    id: 'INC-2847', priority: 'P1', status: 'new', owner: '', service: 'Payments gateway', region: 'US East',
    title: 'Checkout authorization failures',
    impact: 'About 38% of card payments in US East are failing at checkout. Customers see a retry message. No duplicate charges have been detected.',
    activity: [
      event('09:37', 'signal', 'Incident opened', 'Payment authorization errors crossed the 5% threshold in US East.'),
      event('09:39', 'signal', 'Failure rate reached 38%', 'Both card processors report timeouts from the US East gateway.'),
      event('09:41', 'note', 'Handoff note', 'Initial checks show the failures begin before the processor response. Compare gateway deploys against 09:37 UTC.', 'Maya Chen')
    ]
  },
  {
    id: 'INC-2844', priority: 'P1', status: 'acknowledged', owner: 'jules-park', service: 'Edge routing', region: 'EU West',
    title: 'Intermittent edge routing timeouts',
    impact: 'Around 14% of requests to EU West are timing out. Health checks from Frankfurt and Paris are affected.',
    activity: [
      event('09:14', 'signal', 'Incident opened', 'Three edge locations sustained elevated request timeouts.'),
      event('09:16', 'owner', 'Assigned to Jules Park', '', operator),
      event('09:17', 'status', 'Incident acknowledged', '', 'Jules Park'),
      event('09:33', 'note', 'Handoff note', 'Traffic shifted away from Frankfurt. Paris retries are declining. Continue to watch error rates for ten minutes.', 'Jules Park')
    ]
  },
  {
    id: 'INC-2846', priority: 'P2', status: 'new', owner: '', service: 'Notifications', region: 'Global',
    title: 'Password reset emails delayed',
    impact: 'Password reset emails are taking up to 12 minutes to arrive. Reset links are valid for 30 minutes after creation.',
    activity: [
      event('09:28', 'signal', 'Incident opened', 'The oldest queued transactional email passed eight minutes.'),
      event('09:34', 'signal', 'Backlog reached 1,260 messages', 'Other transactional email queues remain within their normal range.')
    ]
  },
  {
    id: 'INC-2843', priority: 'P2', status: 'acknowledged', owner: 'nell-patel', service: 'Report exports', region: 'US West',
    title: 'Scheduled report exports stuck',
    impact: 'CSV exports scheduled after 08:00 UTC are queued and have not started. Users can still create manual exports.',
    activity: [
      event('08:54', 'signal', 'Incident opened', 'The scheduler did not claim any of the last 20 queued exports.'),
      event('08:57', 'owner', 'Assigned to Nell Patel', '', operator),
      event('09:00', 'status', 'Incident acknowledged', '', 'Nell Patel'),
      event('09:20', 'note', 'Handoff note', 'Workers are healthy. Check the scheduler lease renewal logic before restarting workers.', 'Nell Patel')
    ]
  },
  {
    id: 'INC-2845', priority: 'P3', status: 'new', owner: '', service: 'Media cache', region: 'APAC',
    title: 'Thumbnail cache misses',
    impact: 'Some thumbnail requests in APAC take an extra 300 ms. Full-resolution downloads are unaffected.',
    activity: [
      event('09:22', 'signal', 'Incident opened', 'The thumbnail cache hit rate dropped at Sydney and Singapore.'),
      event('09:32', 'note', 'Handoff note', 'Original images are available. Focus on the resize cache path.', 'Omar Reyes')
    ]
  },
  {
    id: 'INC-2841', priority: 'P3', status: 'acknowledged', owner: 'omar-reyes', service: 'Developer portal', region: 'Global',
    title: 'Delayed API usage counters',
    impact: 'The developer portal is showing API usage from 25 minutes ago. Rate limiting still uses current request counts.',
    activity: [
      event('08:31', 'signal', 'Incident opened', 'Usage aggregation fell behind by more than 20 minutes.'),
      event('08:37', 'owner', 'Assigned to Omar Reyes', '', operator),
      event('08:39', 'status', 'Incident acknowledged', '', 'Omar Reyes'),
      event('09:12', 'note', 'Handoff note', 'The delayed partition is replaying. Compare portal totals at 09:45 UTC.', 'Omar Reyes')
    ]
  },
  {
    id: 'INC-2842', priority: 'P2', status: 'resolved', owner: 'maya-chen', service: 'Billing', region: 'US East',
    title: 'Invoice PDFs returned blank',
    impact: 'Invoice downloads generated from 08:21 to 08:48 UTC were blank. Affected PDFs have been regenerated.',
    activity: [
      event('08:44', 'signal', 'Incident opened', 'Support reproduced blank invoices from two accounts.'),
      event('08:45', 'owner', 'Assigned to Maya Chen', '', operator),
      event('08:46', 'status', 'Incident acknowledged', '', 'Maya Chen'),
      event('09:05', 'note', 'Handoff note', 'Rolled back the template update. Verified a new and a regenerated invoice.', 'Maya Chen'),
      event('09:07', 'status', 'Incident resolved', '', 'Maya Chen')
    ]
  },
  {
    id: 'INC-2840', priority: 'P3', status: 'resolved', owner: 'jules-park', service: 'Public status site', region: 'Global',
    title: 'Status subscription form errors',
    impact: 'New subscribers could not register during a seven-minute window. Existing subscriptions delivered normally.',
    activity: [
      event('08:06', 'signal', 'Incident opened', 'The subscription endpoint returned errors on form submit.'),
      event('08:08', 'owner', 'Assigned to Jules Park', '', operator),
      event('08:09', 'status', 'Incident acknowledged', '', 'Jules Park'),
      event('08:18', 'note', 'Handoff note', 'Updated the expected form token and verified a fresh subscription end to end.', 'Jules Park'),
      event('08:20', 'status', 'Incident resolved', '', 'Jules Park')
    ]
  }
];
