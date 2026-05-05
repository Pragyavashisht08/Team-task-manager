/* End-to-end RBAC smoke test against a live API.
 *
 * Verifies project-scoped roles: anyone can sign up, anyone can create a project
 * and become its admin, the same user can be admin on one project and a regular
 * member on another, and per-project ownership is enforced on every action.
 *
 * Usage:
 *   1. Start the server:   npm run dev   (or `npm start`)
 *   2. In another shell:   node server/rbac.test.js
 *
 * Optional env:
 *   API_URL  default http://localhost:5000/api
 */

const API = process.env.API_URL || 'http://localhost:5000/api';

const stamp = Date.now();
const aliceEmail   = `alice_${stamp}@taskflow.test`;
const bobEmail     = `bob_${stamp}@taskflow.test`;
const carolEmail   = `carol_${stamp}@taskflow.test`;
const password     = 'Password123';

let pass = 0;
let fail = 0;

const log = (...a) => console.log(...a);
const okMark = '\x1b[32m✓\x1b[0m';
const xMark = '\x1b[31m✗\x1b[0m';

function assert(cond, label) {
    if (cond) { pass++; log(`  ${okMark} ${label}`); }
    else { fail++; log(`  ${xMark} ${label}`); }
}

async function call(method, path, { token, body } = {}) {
    const res = await fetch(`${API}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    return { status: res.status, data };
}

(async () => {
    log(`\n→ API: ${API}\n`);

    const h = await call('GET', '/health');
    assert(h.status === 200 && h.data?.status === 'ok', 'GET /health responds');
    if (h.data?.db !== 'connected') {
        log(`\n  ⚠ DB is "${h.data?.db}". The rest of the test needs a live MongoDB connection.\n`);
        process.exit(1);
    }

    log('\n[Auth — single role for everyone]');
    const aSignup = await call('POST', '/auth/signup', {
        body: { name: 'Alice', email: aliceEmail, password },
    });
    assert(aSignup.status === 201 && aSignup.data?.token, 'Alice signs up → 201');
    assert(aSignup.data?.role === undefined, 'Signup response no longer has a global role');
    const aliceToken = aSignup.data.token;
    const aliceId = aSignup.data._id;

    const bSignup = await call('POST', '/auth/signup', {
        body: { name: 'Bob', email: bobEmail, password },
    });
    assert(bSignup.status === 201, 'Bob signs up → 201');
    const bobToken = bSignup.data.token;
    const bobId = bSignup.data._id;

    const cSignup = await call('POST', '/auth/signup', {
        body: { name: 'Carol', email: carolEmail, password },
    });
    assert(cSignup.status === 201, 'Carol signs up → 201');
    const carolToken = cSignup.data.token;
    const carolId = cSignup.data._id;

    const dup = await call('POST', '/auth/signup', { body: { name: 'x', email: aliceEmail, password } });
    assert(dup.status === 400, 'Duplicate signup → 400');

    const badLogin = await call('POST', '/auth/login', { body: { email: aliceEmail, password: 'wrong' } });
    assert(badLogin.status === 401, 'Login wrong password → 401');

    log('\n[Project creation — open to any signed-up user]');
    const aliceProject = await call('POST', '/projects', {
        token: aliceToken,
        body: { title: `Alice's Project ${stamp}`, description: 'alice owns' },
    });
    assert(aliceProject.status === 201, 'Alice creates a project → 201');
    const aProjectId = aliceProject.data._id;

    const bobProject = await call('POST', '/projects', {
        token: bobToken,
        body: { title: `Bob's Project ${stamp}`, description: 'bob owns' },
    });
    assert(bobProject.status === 201, 'Bob creates a project → 201');
    const bProjectId = bobProject.data._id;

    const noAuth = await call('POST', '/projects', { body: { title: 'no' } });
    assert(noAuth.status === 401, 'Anonymous create project → 401');

    log('\n[Project-scoped roles — Alice is admin of A, member of B]');
    const aliceInBob = await call('POST', `/projects/${bProjectId}/members`, {
        token: bobToken, body: { email: aliceEmail },
    });
    assert(aliceInBob.status === 200, "Bob (B's admin) adds Alice as member → 200");

    const bobInAlice = await call('POST', `/projects/${aProjectId}/members`, {
        token: aliceToken, body: { email: bobEmail },
    });
    assert(bobInAlice.status === 200, "Alice (A's admin) adds Bob as member → 200");

    // Cross check: Alice cannot manage members on Bob's project
    const aliceTriesAddOnBob = await call('POST', `/projects/${bProjectId}/members`, {
        token: aliceToken, body: { email: carolEmail },
    });
    assert(aliceTriesAddOnBob.status === 403, "Alice adding member to Bob's project → 403 (she's just a member there)");

    // But Alice can manage members on her own project
    const aliceAddsCarolToOwn = await call('POST', `/projects/${aProjectId}/members`, {
        token: aliceToken, body: { email: carolEmail },
    });
    assert(aliceAddsCarolToOwn.status === 200, "Alice adds Carol to her own project → 200 (she's admin here)");

    log('\n[Project visibility]');
    const aliceList = await call('GET', '/projects', { token: aliceToken });
    const aliceSees = (aliceList.data || []).map(p => p._id);
    assert(aliceSees.includes(aProjectId), 'Alice sees her own project');
    assert(aliceSees.includes(bProjectId), 'Alice sees Bob\'s project (she\'s a member)');

    const bobList = await call('GET', '/projects', { token: bobToken });
    const bobSees = (bobList.data || []).map(p => p._id);
    assert(bobSees.includes(aProjectId), 'Bob sees Alice\'s project (he\'s a member)');
    assert(bobSees.includes(bProjectId), 'Bob sees his own project');

    const carolList = await call('GET', '/projects', { token: carolToken });
    const carolSees = (carolList.data || []).map(p => p._id);
    assert(carolSees.includes(aProjectId), 'Carol sees Alice\'s project (she\'s a member)');
    assert(!carolSees.includes(bProjectId), "Carol doesn't see Bob's project");

    log('\n[Task creation — only the project admin, multi-assignee]');
    const aliceTaskOnOwn = await call('POST', '/tasks', {
        token: aliceToken,
        body: { title: 'A-task', project: aProjectId, assignedTo: [bobId, carolId], priority: 'High' },
    });
    assert(aliceTaskOnOwn.status === 201, 'Alice creates task with two assignees → 201');
    assert(
        Array.isArray(aliceTaskOnOwn.data?.assignedTo) && aliceTaskOnOwn.data.assignedTo.length === 2,
        'Response has both assignees in array form'
    );
    const taskOnA = aliceTaskOnOwn.data._id;

    const aliceTaskOnBob = await call('POST', '/tasks', {
        token: aliceToken,
        body: { title: 'should-fail', project: bProjectId, assignedTo: [aliceId] },
    });
    assert(aliceTaskOnBob.status === 403, "Alice creating task on Bob's project → 403 (she's just a member)");

    const aliceAssignsOutsider = await call('POST', '/tasks', {
        token: aliceToken,
        body: { title: 'bad-assign', project: aProjectId, assignedTo: [bobId, '000000000000000000000000'] },
    });
    assert(aliceAssignsOutsider.status === 400, 'Mixing a non-member into the assignee list → 400');

    const bobTaskOnOwn = await call('POST', '/tasks', {
        token: bobToken,
        body: { title: 'B-task', project: bProjectId, assignedTo: [aliceId], priority: 'Medium' },
    });
    assert(bobTaskOnOwn.status === 201, 'Bob creates task on his own project (single assignee in array) → 201');

    log('\n[Status updates — any assignee or project admin]');
    // Task is assigned to BOTH Bob and Carol; either should be able to change its status.
    const bobUpdatesOwnAssigned = await call('PUT', `/tasks/${taskOnA}`, {
        token: bobToken, body: { status: 'In Progress' },
    });
    assert(bobUpdatesOwnAssigned.status === 200, 'Bob (one of two assignees) updates status → 200');

    const carolUpdatesOwnAssigned = await call('PUT', `/tasks/${taskOnA}`, {
        token: carolToken, body: { status: 'Review' },
    });
    assert(carolUpdatesOwnAssigned.status === 200, 'Carol (other assignee) updates status → 200');

    const aliceUpdatesAsOwner = await call('PUT', `/tasks/${taskOnA}`, {
        token: aliceToken, body: { status: 'Completed' },
    });
    assert(aliceUpdatesAsOwner.status === 200, 'Alice (project admin) updates status → 200');

    // Now strip Carol from the assignee list and check she's locked out.
    const aliceTrimsAssignees = await call('PUT', `/tasks/${taskOnA}`, {
        token: aliceToken, body: { assignedTo: [bobId] },
    });
    assert(
        aliceTrimsAssignees.status === 200 && aliceTrimsAssignees.data?.assignedTo?.length === 1,
        'Admin reassigns to single user → 200'
    );

    const carolBlockedAfterRemoval = await call('PUT', `/tasks/${taskOnA}`, {
        token: carolToken, body: { status: 'Todo' },
    });
    assert(carolBlockedAfterRemoval.status === 403, 'Carol (no longer assignee) cannot change status → 403');

    const badStatus = await call('PUT', `/tasks/${taskOnA}`, {
        token: aliceToken, body: { status: 'Done' },
    });
    assert(badStatus.status === 400, 'Invalid status enum → 400');

    log('\n[Dashboard /tasks/my reflects array membership]');
    const bobMy = await call('GET', '/tasks/my', { token: bobToken });
    assert(
        bobMy.status === 200 && bobMy.data.some(t => t._id === taskOnA),
        'Bob sees the task in /tasks/my (he is an assignee)'
    );
    const aliceMy = await call('GET', '/tasks/my', { token: aliceToken });
    assert(
        aliceMy.status === 200 && !aliceMy.data.some(t => t._id === taskOnA),
        'Alice does NOT see the task in /tasks/my (she is admin, not assignee)'
    );

    log('\n[Member-only field guard]');
    const bobTriesEditTitle = await call('PUT', `/tasks/${taskOnA}`, {
        token: bobToken, body: { title: 'hijack' },
    });
    assert(
        bobTriesEditTitle.status === 200 && bobTriesEditTitle.data?.title === 'A-task',
        'Bob cannot edit title (admin-only field ignored)'
    );

    log('\n[Comments — any project member can discuss]');
    const carolComment = await call('POST', `/tasks/${taskOnA}/comments`, {
        token: carolToken, body: { body: 'Can someone bump this to In Progress?' },
    });
    assert(
        carolComment.status === 201 && carolComment.data?.comments?.length === 1,
        'Carol (project member) posts a comment → 201'
    );
    const commentId = carolComment.data.comments[0]._id;

    const emptyComment = await call('POST', `/tasks/${taskOnA}/comments`, {
        token: bobToken, body: { body: '   ' },
    });
    assert(emptyComment.status === 400, 'Empty comment rejected → 400');

    const bobComment = await call('POST', `/tasks/${taskOnA}/comments`, {
        token: bobToken, body: { body: 'On it.' },
    });
    assert(
        bobComment.status === 201 && bobComment.data.comments.length === 2,
        'Bob (assignee) posts a follow-up → 201'
    );

    // Outsider has no project access → 403 from /tasks/:id (they can't even see)
    // For comments specifically, we need a 4th user not in either project. Skip — coverage is on the access gate already covered above.

    const carolDeletesOwn = await call('DELETE', `/tasks/${taskOnA}/comments/${commentId}`, { token: carolToken });
    assert(carolDeletesOwn.status === 200, 'Carol deletes her own comment → 200');

    const bobDeletesOthers = await call('DELETE', `/tasks/${taskOnA}/comments/${bobComment.data.comments[1]._id}`, { token: aliceToken });
    assert(bobDeletesOthers.status === 200, "Project admin deletes someone else's comment → 200");

    log('\n[Destructive — only project admin]');
    const bobDeletesTask = await call('DELETE', `/tasks/${taskOnA}`, { token: bobToken });
    assert(bobDeletesTask.status === 403, 'Bob deletes task on Alice\'s project → 403');

    const carolDeletesProject = await call('DELETE', `/projects/${aProjectId}`, { token: carolToken });
    assert(carolDeletesProject.status === 403, "Carol deletes Alice's project → 403");

    const aliceDeletesTask = await call('DELETE', `/tasks/${taskOnA}`, { token: aliceToken });
    assert(aliceDeletesTask.status === 200, 'Alice deletes her own task → 200');

    const aliceDeletesProject = await call('DELETE', `/projects/${aProjectId}`, { token: aliceToken });
    assert(aliceDeletesProject.status === 200, "Alice deletes her own project → 200");

    const bobDeletesProject = await call('DELETE', `/projects/${bProjectId}`, { token: bobToken });
    assert(bobDeletesProject.status === 200, "Bob deletes his own project → 200");

    log(`\n──────────────  ${pass} passed, ${fail} failed  ──────────────\n`);
    process.exit(fail === 0 ? 0 : 1);
})().catch((err) => {
    console.error('Test runner crashed:', err);
    process.exit(1);
});
