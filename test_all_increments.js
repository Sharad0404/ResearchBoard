const http = require('http');
const fs = require('fs');
const path = require('path');

// Clean DB before test
const dbPath = path.join(__dirname, 'data', 'app.db');
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

// Start server
const app = require('./server'); // Note: server.js starts listening on PORT 3000

// Helper to make HTTP requests with cookie jar
function createClient() {
  let cookie = '';
  return {
    request(options, data) {
      return new Promise((resolve, reject) => {
        const reqOptions = {
          hostname: 'localhost',
          port: 3000,
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...(cookie ? { Cookie: cookie } : {}),
            ...(options.headers || {}),
          },
        };

        const req = http.request(reqOptions, (res) => {
          if (res.headers['set-cookie']) {
            cookie = res.headers['set-cookie'][0].split(';')[0];
          }
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            try {
              const json = body ? JSON.parse(body) : {};
              resolve({ status: res.statusCode, headers: res.headers, body: json });
            } catch (e) {
              resolve({ status: res.statusCode, headers: res.headers, body });
            }
          });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
      });
    },
  };
}

async function run() {
  console.log('--- Starting Increments 1-4 End-to-End Verification ---');

  // Allow server a moment to start
  await new Promise((r) => setTimeout(r, 600));

  const faculty = createClient();
  const student1 = createClient();
  const student2 = createClient();
  const admin = createClient();

  // 1. Register Faculty
  console.log('1. Registering faculty...');
  const regFac = await faculty.request(
    { path: '/api/auth/register', method: 'POST' },
    { name: 'Dr. Jane Smith', email: 'jane@univ.edu', password: 'password123', role: 'faculty', department: 'CS' }
  );
  if (regFac.status !== 201) throw new Error(`Faculty register failed: ${JSON.stringify(regFac.body)}`);
  console.log('✓ Faculty registered successfully');

  // 2. Faculty posts opportunity
  console.log('2. Faculty posting opportunity (1 seat)...');
  const postOp1 = await faculty.request(
    { path: '/api/opportunities', method: 'POST' },
    {
      title: 'Graph Neural Networks in Bioinformatics',
      description: 'Developing geometric deep learning models for molecular interaction graphs.',
      domain_tags: 'Deep Learning, Bioinformatics',
      required_skills: 'Python, PyTorch',
      seats_total: 1,
    }
  );
  if (postOp1.status !== 201) throw new Error(`Post opportunity failed: ${JSON.stringify(postOp1.body)}`);
  const op1Id = postOp1.body.opportunity.id;
  console.log(`✓ Opportunity 1 created with ID: ${op1Id}`);

  // 3. Register Student 1
  console.log('3. Registering Student 1...');
  const regStu1 = await student1.request(
    { path: '/api/auth/register', method: 'POST' },
    { name: 'Alice Walker', email: 'alice@univ.edu', password: 'password123', role: 'student', department: 'CS' }
  );
  if (regStu1.status !== 201) throw new Error(`Student 1 register failed: ${JSON.stringify(regStu1.body)}`);
  console.log('✓ Student 1 registered');

  // 4. Student 1 applies to Opportunity 1
  console.log('4. Student 1 applying to Opportunity 1...');
  const apply1 = await student1.request(
    { path: '/api/applications', method: 'POST' },
    { opportunity_id: op1Id, message: 'I have 2 years of PyTorch experience.' }
  );
  if (apply1.status !== 201) throw new Error(`Apply failed: ${JSON.stringify(apply1.body)}`);
  const app1Id = apply1.body.application.id;
  console.log(`✓ Student 1 applied (Application ID: ${app1Id})`);

  // 5. Faculty views applicants for Opportunity 1
  console.log('5. Faculty fetching applicants for Opportunity 1...');
  const listApps = await faculty.request(
    { path: `/api/applications/for-opportunity/${op1Id}`, method: 'GET' }
  );
  if (listApps.status !== 200 || listApps.body.applications.length !== 1) {
    throw new Error(`Failed to list applicants: ${JSON.stringify(listApps.body)}`);
  }
  console.log(`✓ Faculty retrieved applicant roster: ${listApps.body.applications[0].student_name}`);

  // 6. Faculty accepts Student 1 application
  console.log('6. Faculty accepting Student 1 application (Increment 3)...');
  const acceptRes = await faculty.request(
    { path: `/api/applications/${app1Id}/accept`, method: 'PATCH' }
  );
  if (acceptRes.status !== 200) throw new Error(`Accept failed: ${JSON.stringify(acceptRes.body)}`);
  console.log('✓ Application accepted');

  // Check opportunity auto-closed because seats_filled (1) == seats_total (1)
  const checkOp1 = await faculty.request({ path: '/api/opportunities/mine', method: 'GET' });
  const updatedOp1 = checkOp1.body.opportunities.find((o) => o.id === op1Id);
  if (updatedOp1.status !== 'Closed') {
    throw new Error(`Opportunity should be Closed, got: ${updatedOp1.status}`);
  }
  console.log('✓ Opportunity auto-closed upon full acceptance');

  // 7. Student 2 registers and attempts to apply to closed opportunity
  console.log('7. Student 2 registering and verifying closed opportunity rejection...');
  const regStu2 = await student2.request(
    { path: '/api/auth/register', method: 'POST' },
    { name: 'Bob Davis', email: 'bob@univ.edu', password: 'password123', role: 'student', department: 'Bio' }
  );
  if (regStu2.status !== 201) throw new Error(`Student 2 register failed`);

  const applyClosed = await student2.request(
    { path: '/api/applications', method: 'POST' },
    { opportunity_id: op1Id, message: 'I want in' }
  );
  if (applyClosed.status !== 400) {
    throw new Error(`Expected 400 applying to closed op, got: ${applyClosed.status}`);
  }
  console.log('✓ Correctly rejected application to closed opportunity');

  // 8. Faculty posts opportunity 2 (2 seats)
  console.log('8. Faculty posting Opportunity 2 (2 seats)...');
  const postOp2 = await faculty.request(
    { path: '/api/opportunities', method: 'POST' },
    {
      title: 'Quantum Computing Simulators',
      description: 'Quantum circuit optimization using Qiskit.',
      domain_tags: 'Quantum, Physics',
      required_skills: 'Python, Qiskit',
      seats_total: 2,
    }
  );
  const op2Id = postOp2.body.opportunity.id;

  // Student 2 applies to Opportunity 2
  const apply2 = await student2.request(
    { path: '/api/applications', method: 'POST' },
    { opportunity_id: op2Id, message: 'Physics major interested in quantum.' }
  );
  const app2Id = apply2.body.application.id;
  console.log(`✓ Student 2 applied to Opportunity 2 (App ID: ${app2Id})`);

  // Faculty rejects Student 2 application (Increment 3 reject & seat recovery)
  console.log('9. Faculty rejecting Student 2 application...');
  const rejectRes = await faculty.request(
    { path: `/api/applications/${app2Id}/reject`, method: 'PATCH' }
  );
  if (rejectRes.status !== 200) throw new Error(`Reject failed: ${JSON.stringify(rejectRes.body)}`);
  console.log('✓ Application rejected');

  // Verify seat freed up
  const checkOp2 = await faculty.request({ path: '/api/opportunities/mine', method: 'GET' });
  const updatedOp2 = checkOp2.body.opportunities.find((o) => o.id === op2Id);
  if (updatedOp2.seats_filled !== 0) {
    throw new Error(`Seats filled should be 0 after rejection, got: ${updatedOp2.seats_filled}`);
  }
  console.log('✓ Seat count successfully recovered after rejection');

  // 10. Increment 4: Admin Registration & Oversight
  console.log('10. Registering Department Admin (Increment 4)...');
  const regAdmin = await admin.request(
    { path: '/api/auth/register', method: 'POST' },
    { name: 'Admin Sarah', email: 'admin@univ.edu', password: 'password123', role: 'admin', department: 'Academic Affairs' }
  );
  if (regAdmin.status !== 201) throw new Error(`Admin register failed: ${JSON.stringify(regAdmin.body)}`);
  console.log('✓ Admin registered');

  // 11. Admin fetches stats
  console.log('11. Admin querying /api/admin/stats...');
  const statsRes = await admin.request({ path: '/api/admin/stats', method: 'GET' });
  if (statsRes.status !== 200) throw new Error(`Admin stats failed: ${JSON.stringify(statsRes.body)}`);
  const stats = statsRes.body.stats;
  console.log('   Stats retrieved:', stats);
  if (stats.faculty_count !== 1 || stats.student_count !== 2 || stats.opportunity_count !== 2) {
    throw new Error('Stats values mismatch!');
  }
  if (stats.accepted_applications !== 1 || stats.rejected_applications !== 1) {
    throw new Error('Application status counts mismatch!');
  }
  console.log('✓ Admin stats verified');

  // 12. Admin lists all opportunities
  console.log('12. Admin querying /api/admin/opportunities...');
  const adminOps = await admin.request({ path: '/api/admin/opportunities', method: 'GET' });
  if (adminOps.status !== 200 || adminOps.body.opportunities.length !== 2) {
    throw new Error(`Admin opportunities list failed: ${JSON.stringify(adminOps.body)}`);
  }
  console.log(`✓ Admin retrieved ${adminOps.body.opportunities.length} opportunities with application breakdowns`);

  // 13. Admin drill-down into opportunity applications
  console.log('13. Admin drilling into applications for Opportunity 1...');
  const adminDrill = await admin.request({ path: `/api/admin/opportunities/${op1Id}/applications`, method: 'GET' });
  if (adminDrill.status !== 200 || adminDrill.body.applications.length !== 1) {
    throw new Error('Admin drill-down failed');
  }
  console.log(`✓ Admin successfully retrieved applicant breakdown: ${adminDrill.body.applications[0].student_name} (${adminDrill.body.applications[0].status})`);

  // 14. Admin lists user directory
  console.log('14. Admin querying /api/admin/users...');
  const adminUsers = await admin.request({ path: '/api/admin/users', method: 'GET' });
  if (adminUsers.status !== 200 || adminUsers.body.users.length !== 4) {
    throw new Error(`Admin users failed, found: ${adminUsers.body.users?.length}`);
  }
  console.log(`✓ Admin retrieved user directory (${adminUsers.body.users.length} total users)`);

  // 15. Security authorization check: Student cannot access admin routes
  console.log('15. Checking security role guard (Student accessing Admin route)...');
  const forbidden = await student1.request({ path: '/api/admin/stats', method: 'GET' });
  if (forbidden.status !== 403) {
    throw new Error(`Expected 403 Forbidden, got: ${forbidden.status}`);
  }
  console.log('✓ Security check passed: 403 Forbidden for non-admin');

  console.log('\n======================================================');
  console.log('🎉 ALL 15 VERIFICATION CHECKS PASSED FOR INCREMENTS 1-4!');
  console.log('======================================================\n');
  process.exit(0);
}

run().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
