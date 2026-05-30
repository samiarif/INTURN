import { describe, it, expect, vi, beforeEach } from 'vitest';

// ===========================================================================
// dispatchNotificationsFor — fan-out + S3-C channel-preference tests.
//
// The dispatcher routes each event type to:
//   • an in-app notification insert (when recipient.notifyInApp !== false), and
//   • a transactional email via sendEmail (when recipient.notifyEmail !== false).
// These two channels are INDEPENDENT (P9 / migration 0014). We assert, per
// handled event type, that the right recipient(s) get the right channel(s),
// that each toggle suppresses only its own channel, and that an email failure
// is swallowed (best-effort) without breaking the in-app write.
//
// Mocking model: every db.select(...) chain is a thenable that resolves to the
// next entry in a FIFO `selectQueue` (so `await ...where()` AND
// `await ...where().limit(1)` both consume one queued row-set). db.insert(...)
// records the table + values into `inserts`.
// ===========================================================================
const mocks = vi.hoisted(() => {
  const selectQueue: unknown[][] = [];
  const inserts: Array<{ table: string; values: Record<string, unknown> }> = [];
  let insertTable = 'unknown';

  function makeSelectChain() {
    const result = () => Promise.resolve(selectQueue.shift() ?? []);
    const chain: Record<string, unknown> = {
      // Thenable: awaiting the chain at any point resolves the next row-set.
      then: (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) =>
        result().then(onF, onR),
    };
    for (const m of ['from', 'where', 'innerJoin', 'leftJoin', 'orderBy', 'limit']) {
      chain[m] = vi.fn(() => chain);
    }
    return chain;
  }

  const db = {
    // schema mock tags each table object with a `__name` so the insert mock can
    // report which table was written to.
    select: vi.fn(() => makeSelectChain()),
    insert: vi.fn((table: { __name?: string }) => {
      insertTable = table?.__name ?? 'unknown';
      return {
        values: (vals: Record<string, unknown>) => {
          inserts.push({ table: insertTable, values: vals });
          return Promise.resolve([{ id: 'notif-x' }]);
        },
      };
    }),
  };

  return { db, selectQueue, inserts };
});

vi.mock('@/db', () => ({ db: mocks.db }));
vi.mock('@/db/schema', () => ({
  notifications: { __name: 'notifications' },
  users: { __name: 'users' },
  applications: { __name: 'applications' },
  internships: { __name: 'internships' },
  projects: { __name: 'projects' },
  profiles: { __name: 'profiles', userId: {}, preferredLanguage: {} },
  workspaces: { __name: 'workspaces' },
}));
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => 'eq'),
  inArray: vi.fn(() => 'inArray'),
}));

const sendEmail = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/email', () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));
vi.mock('@/lib/email/templates/application-received', () => ({
  applicationReceivedTemplate: vi.fn(() => ({ subject: 's', text: 't', html: '<p>h</p>' })),
}));
vi.mock('@/lib/email/templates/application-status', () => ({
  applicationStatusTemplate: vi.fn(() => ({ subject: 's', text: 't', html: '<p>h</p>' })),
}));
vi.mock('@/lib/email/templates/check-in-reminder', () => ({
  checkInReminderTemplate: vi.fn(() => ({ subject: 's', text: 't', html: '<p>h</p>' })),
}));

import { dispatchNotificationsFor } from '../dispatcher';

// ---- in-app insert assertions limited to the notifications table ----------
function notifInserts() {
  return mocks.inserts.filter((i) => i.table === 'notifications');
}

const supervisor = {
  id: 'sup1',
  email: 'sup@co.com',
  firstName: 'Sam',
  lastName: 'B',
  notifyInApp: true,
  notifyEmail: true,
};

// onApplicationCreated joins app+internship+project+applicant, then selects the
// supervisors via inArray, then (per email) a profiles lookup for locale.
function queueApplicationCreated(supOverrides: Partial<typeof supervisor> = {}) {
  mocks.selectQueue.push([
    {
      app: { id: 'app1' },
      internship: { id: 'int1', title: 'Brand audit' },
      project: { id: 'proj1', supervisorIds: ['sup1'] },
      applicant: { id: 'intern1', firstName: 'Lina', lastName: 'K' },
    },
  ]);
  mocks.selectQueue.push([{ ...supervisor, ...supOverrides }]); // supervisors (inArray)
  mocks.selectQueue.push([{ pref: 'en' }]); // localeFor (only consumed if email sent)
}

// onApplicationStatusChanged joins app+internship+applicant (the applicant row
// carries the notify_* toggles), then a profiles lookup for locale.
const applicant = {
  id: 'intern1',
  email: 'lina@x.com',
  firstName: 'Lina',
  lastName: 'K',
  notifyInApp: true,
  notifyEmail: true,
};
function queueStatusChanged(appOverrides: Partial<typeof applicant> = {}) {
  mocks.selectQueue.push([
    {
      app: { id: 'app1' },
      internship: { id: 'int1', title: 'Brand audit' },
      applicant: { ...applicant, ...appOverrides },
    },
  ]);
  mocks.selectQueue.push([{ pref: 'fr' }]); // localeFor
}

beforeEach(() => {
  vi.clearAllMocks();
  sendEmail.mockResolvedValue(undefined);
  mocks.selectQueue.length = 0;
  mocks.inserts.length = 0;
});

describe('application.created', () => {
  it('inserts an in-app notification to the supervisor AND sends an email (both prefs on)', async () => {
    queueApplicationCreated();

    await dispatchNotificationsFor({
      type: 'application.created',
      actorId: 'intern1',
      targetType: 'application',
      targetId: 'app1',
      metadata: null,
    });

    const notifs = notifInserts();
    expect(notifs).toHaveLength(1);
    expect(notifs[0].values).toMatchObject({ recipientId: 'sup1', type: 'application.received' });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0]).toMatchObject({ to: 'sup@co.com' });
  });

  it('notifyEmail=false skips the email but still writes the in-app notification', async () => {
    queueApplicationCreated({ notifyEmail: false });

    await dispatchNotificationsFor({
      type: 'application.created',
      actorId: 'intern1',
      targetType: 'application',
      targetId: 'app1',
      metadata: null,
    });

    expect(notifInserts()).toHaveLength(1);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('notifyInApp=false skips the in-app notification but still sends the email', async () => {
    queueApplicationCreated({ notifyInApp: false });

    await dispatchNotificationsFor({
      type: 'application.created',
      actorId: 'intern1',
      targetType: 'application',
      targetId: 'app1',
      metadata: null,
    });

    expect(notifInserts()).toHaveLength(0);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the project has no supervisors', async () => {
    mocks.selectQueue.push([
      {
        app: { id: 'app1' },
        internship: { id: 'int1', title: 'Brand audit' },
        project: { id: 'proj1', supervisorIds: [] },
        applicant: { id: 'intern1', firstName: 'Lina', lastName: 'K' },
      },
    ]);

    await dispatchNotificationsFor({
      type: 'application.created',
      actorId: 'intern1',
      targetType: 'application',
      targetId: 'app1',
      metadata: null,
    });

    expect(notifInserts()).toHaveLength(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('swallows a sendEmail failure and still keeps the in-app notification', async () => {
    queueApplicationCreated();
    sendEmail.mockRejectedValueOnce(new Error('resend 500'));

    // Must not throw — dispatcher is best-effort.
    await expect(
      dispatchNotificationsFor({
        type: 'application.created',
        actorId: 'intern1',
        targetType: 'application',
        targetId: 'app1',
        metadata: null,
      }),
    ).resolves.toBeUndefined();

    // In-app insert happened before the failing email, so it survives.
    expect(notifInserts()).toHaveLength(1);
  });
});

describe('application.status.changed (canonical event)', () => {
  // Regression guard for the silent-notification bug: the service emits the dotted
  // canonical 'application.status.changed' (modules/events/types.ts). The dispatcher
  // previously matched only camel/snake forms, so every non-accept transition fired
  // ZERO notifications. Feed the EXACT string the service emits.
  it('in-app + email to the applicant for a notifiable status (canonical string)', async () => {
    queueStatusChanged();

    await dispatchNotificationsFor({
      type: 'application.status.changed',
      actorId: 'sup1',
      targetType: 'application',
      targetId: 'app1',
      metadata: { from: 'reviewed', to: 'shortlisted' },
    });

    const notifs = notifInserts();
    expect(notifs).toHaveLength(1);
    expect(notifs[0].values).toMatchObject({ recipientId: 'intern1', type: 'application.status' });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0]).toMatchObject({ to: 'lina@x.com' });
  });

  it('ignores a status that is not in the notifiable allow-list (e.g. "new")', async () => {
    // No rows need queueing — it bails before the row fetch.
    await dispatchNotificationsFor({
      type: 'application.status.changed',
      actorId: 'sup1',
      targetType: 'application',
      targetId: 'app1',
      metadata: { to: 'new' },
    });

    expect(notifInserts()).toHaveLength(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('does NOT notify on to=accepted here (accept is owned by application.accepted)', async () => {
    // Critical de-dupe half: the accepted status-change must early-return so the
    // separate application.accepted event is the single source of the notification.
    await dispatchNotificationsFor({
      type: 'application.status.changed',
      actorId: 'sup1',
      targetType: 'application',
      targetId: 'app1',
      metadata: { from: 'shortlisted', to: 'accepted' },
    });

    expect(notifInserts()).toHaveLength(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('notifyEmail=false suppresses only the email', async () => {
    queueStatusChanged({ notifyEmail: false });

    await dispatchNotificationsFor({
      type: 'application.status.changed',
      actorId: 'sup1',
      targetType: 'application',
      targetId: 'app1',
      metadata: { to: 'shortlisted' },
    });

    expect(notifInserts()).toHaveLength(1);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('notifyInApp=false suppresses only the in-app notification', async () => {
    queueStatusChanged({ notifyInApp: false });

    await dispatchNotificationsFor({
      type: 'application.status.changed',
      actorId: 'sup1',
      targetType: 'application',
      targetId: 'app1',
      metadata: { to: 'rejected' },
    });

    expect(notifInserts()).toHaveLength(0);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});

describe('application.accepted (owns the accept notification)', () => {
  it('writes one in-app row with to=accepted', async () => {
    queueStatusChanged();

    await dispatchNotificationsFor({
      type: 'application.accepted',
      actorId: 'sup1',
      targetType: 'application',
      targetId: 'app1',
      metadata: { workspaceId: 'ws1' },
    });

    const notifs = notifInserts();
    expect(notifs).toHaveLength(1);
    expect(notifs[0].values).toMatchObject({
      recipientId: 'intern1',
      type: 'application.status',
      metadata: expect.objectContaining({ to: 'accepted' }),
    });
  });

  it('de-dupes: the TWO events accept emits produce EXACTLY ONE notification', async () => {
    // acceptApplication records BOTH application.status.changed(to:accepted) AND
    // application.accepted. The first early-returns (accept owned here); only the
    // second writes. Net = one notification, one email — not two.
    queueStatusChanged(); // consumed by the application.accepted path only

    await dispatchNotificationsFor({
      type: 'application.status.changed',
      actorId: 'sup1',
      targetType: 'application',
      targetId: 'app1',
      metadata: { from: 'shortlisted', to: 'accepted' },
    });
    await dispatchNotificationsFor({
      type: 'application.accepted',
      actorId: 'sup1',
      targetType: 'application',
      targetId: 'app1',
      metadata: { workspaceId: 'ws1' },
    });

    expect(notifInserts()).toHaveLength(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});

describe('checkin.due', () => {
  function queueCheckin(internOverrides: Record<string, unknown> = {}) {
    mocks.selectQueue.push([
      {
        workspace: { id: 'ws1' },
        internship: { id: 'int1', title: 'Brand audit' },
        intern: {
          id: 'intern1',
          email: 'lina@x.com',
          firstName: 'Lina',
          notifyInApp: true,
          notifyEmail: true,
          ...internOverrides,
        },
      },
    ]);
    mocks.selectQueue.push([{ pref: 'en' }]); // localeFor
  }

  it('in-app + email reminder to the intern', async () => {
    queueCheckin();

    await dispatchNotificationsFor({
      type: 'checkin.due',
      actorId: null,
      targetType: 'workspace',
      targetId: 'ws1',
      metadata: null,
    });

    const notifs = notifInserts();
    expect(notifs).toHaveLength(1);
    expect(notifs[0].values).toMatchObject({ recipientId: 'intern1', type: 'checkin.due' });
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('notifyInApp=false suppresses only the in-app reminder', async () => {
    queueCheckin({ notifyInApp: false });

    await dispatchNotificationsFor({
      type: 'checkin.due',
      actorId: null,
      targetType: 'workspace',
      targetId: 'ws1',
      metadata: null,
    });

    expect(notifInserts()).toHaveLength(0);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});

describe('unhandled + malformed events', () => {
  it('ignores an unknown event type without writing anything', async () => {
    await dispatchNotificationsFor({
      type: 'some.unhandled.event',
      actorId: null,
      targetType: null,
      targetId: 'x',
      metadata: null,
    });

    expect(notifInserts()).toHaveLength(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('bails when targetId is missing', async () => {
    await dispatchNotificationsFor({
      type: 'application.created',
      actorId: 'intern1',
      targetType: 'application',
      targetId: null,
      metadata: null,
    });

    expect(notifInserts()).toHaveLength(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
