/**
 * =============================================================================
 * BACKEND & DATABASE COMPREHENSIVE TEST SUITE
 * =============================================================================
 */

const http = require('http');
const app = require('./server');

let server;
const TEST_PORT = process.env.PORT || 5000;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (token) {
      options.headers['Authorization'] = 'Bearer ' + token;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Backend & Database Verification Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health Check
    console.log('1. Testing System Health API:');
    const health = await request('GET', '/api/health');
    assert(health.status === 200, 'Health endpoint returns 200 OK');
    assert(health.data.status === 'ok', 'Health status is "ok"');
    assert(health.data.database, `Database engine active: ${health.data.database}`);

    // 2. User Registration (Auth)
    console.log('\n2. Testing User Registration & Authentication:');
    const testEmail = `test_parent_${Date.now()}@example.com`;
    const signup = await request('POST', '/api/auth/signup', {
      email: testEmail,
      password: 'SecurePassword123!',
      parentName: 'Priya Sharma',
      childName: 'Aarav Sharma',
      childDob: { day: 10, month: 6, year: 2023 }
    });
    assert(signup.status === 201, 'Signup creates user and returns 201 Created');
    assert(signup.data.token, 'Signup issues valid JWT token');
    assert(signup.data.user.email === testEmail, 'User profile matches registered email');

    const token = signup.data.token;

    // 3. User Login
    console.log('\n3. Testing User Login:');
    const login = await request('POST', '/api/auth/login', {
      email: testEmail,
      password: 'SecurePassword123!'
    });
    assert(login.status === 200, 'Login validates credentials and returns 200 OK');
    assert(login.data.token, 'Login returns JWT session token');

    // 4. Authenticated Profile /me
    console.log('\n4. Testing Authenticated /api/auth/me:');
    const me = await request('GET', '/api/auth/me', null, token);
    assert(me.status === 200, 'Fetches authenticated user profile');
    assert(me.data.user.parentName === 'Priya Sharma', 'User parent name matches database record');

    // 5. Ready2Learn Milestone & Progress Sync
    console.log('\n5. Testing Ready2Learn Progress Cloud Sync:');
    const sync = await request('POST', '/api/ready2learn/sync', {
      childName: 'Aarav Sharma',
      childDob: { day: 10, month: 6, year: 2023 },
      unlockedBands: ['a30', 'a36'],
      progress: {
        'a36_d1': { '0': 'achieved', '1': 'emerging' },
        'chk_a36_d1_0': true,
        'win_a36_d1': 'Spoke a full sentence clearly today!'
      }
    }, token);
    assert(sync.status === 200, 'Progress sync succeeds with 200 OK');
    assert(sync.data.user.profile.progress['a36_d1']['0'] === 'achieved', 'Milestone state stored in database');

    // 6. Dev Test Suite Unlock All Stages
    console.log('\n6. Testing Dev Test Suite Unlock All Stages:');
    const devUnlock = await request('POST', '/api/ready2learn/dev/unlock-all', { email: testEmail });
    assert(devUnlock.status === 200, 'Dev unlock all endpoint succeeds');
    assert(devUnlock.data.unlockedBands.length === 6, 'All 6 developmental stages unlocked for Dev Test QA');

    // 7. Store / Checkout & Simulated Payment
    console.log('\n7. Testing Store Order Creation & Payment Verification:');
    const order = await request('POST', '/api/store/create-order', {
      amount: 9900,
      bandId: 'a42',
      customerEmail: testEmail
    });
    assert(order.status === 200, 'Store order created successfully');
    assert(order.data.orderId, 'Order ID generated');

    const verify = await request('POST', '/api/store/verify-payment', {
      orderId: order.data.orderId,
      paymentId: 'pay_test_' + Date.now(),
      signature: 'test_signature',
      bandId: 'a42',
      email: testEmail
    });
    assert(verify.status === 200, 'Payment verified and stage unlocked');
    assert(verify.data.verified === true, 'Verification status is true');

    // 8. Consultation Waitlist Submission
    console.log('\n8. Testing Consultation Waitlist:');
    const waitlist = await request('POST', '/api/appointments/waitlist', {
      parentName: 'Priya Sharma',
      email: testEmail,
      phone: '+91 98765 43210',
      childName: 'Aarav',
      childAge: '3 years',
      concerns: 'Speech milestone evaluation'
    });
    assert(waitlist.status === 201, 'Waitlist entry recorded in SQLite DB');
    assert(waitlist.data.entry.id, 'Waitlist entry assigned unique ID');

    // 9. Contact Message Submission
    console.log('\n9. Testing Contact Form Inquiries:');
    const contact = await request('POST', '/api/contact', {
      name: 'Priya Sharma',
      email: testEmail,
      subject: 'Consultation Inquiry',
      message: 'Looking for developmental pediatric guidance.'
    });
    assert(contact.status === 201, 'Contact message saved');

    // 10. Admin Analytics & Stats
    console.log('\n10. Testing Admin Statistics:');
    const stats = await request('GET', '/api/admin/stats');
    assert(stats.status === 200, 'Admin statistics fetched successfully');
    assert(stats.data.totalUsers >= 1, 'Admin stats counts registered users');
    assert(stats.data.totalWaitlist >= 1, 'Admin stats counts waitlist inquiries');

    console.log(`\n========================================================`);
    console.log(`🎉 TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution exception:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Start test instance
const httpApp = require('./server');
runTests();
