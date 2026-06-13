import crypto from "node:crypto";

const subscriptions = new Map();

function studySubscriptions(studyId) {
  if (!subscriptions.has(studyId)) subscriptions.set(studyId, new Map());
  return subscriptions.get(studyId);
}

function writeEvent(response, event, payload) {
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function presenceForStudy(studyId) {
  const connected = subscriptions.get(studyId) || new Map();
  const users = new Map();

  for (const subscription of connected.values()) {
    users.set(subscription.user.id, subscription.user);
  }

  return [...users.values()];
}

export function publishStudyEvent(studyId, event, payload) {
  const connected = subscriptions.get(studyId);
  if (!connected) return;

  for (const subscription of connected.values()) {
    writeEvent(subscription.response, event, payload);
  }
}

function publishPresence(studyId) {
  publishStudyEvent(studyId, "presence", {
    studyId,
    users: presenceForStudy(studyId),
  });
}

export function subscribeToStudy({ studyId, user, response }) {
  const id = crypto.randomUUID();
  const connected = studySubscriptions(studyId);
  connected.set(id, { response, user });
  writeEvent(response, "connected", { studyId, userId: user.id });
  publishPresence(studyId);

  const heartbeat = setInterval(() => {
    response.write(": heartbeat\n\n");
  }, 20_000);

  return () => {
    clearInterval(heartbeat);
    connected.delete(id);
    if (!connected.size) subscriptions.delete(studyId);
    else publishPresence(studyId);
  };
}
