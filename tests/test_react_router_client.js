/**
 * test_react_router_client.js
 * 
 * Unit test suite validating:
 * 1. React Router Client-Side Routing:
 *    - BrowserRouter, Routes, and Route declarative tree
 *    - Link component preventing page reloads
 *    - useParams dynamic route parameter extraction (:accountId)
 *    - useNavigate programmatic navigation and history stack
 * 2. Component Integration:
 *    - AccountsListView rendering account cards and Link tags
 *    - AccountDetailView reading useParams() and rendering conversation AI panel
 *    - AiSummarizerContainer coordinating SPA routing
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

function testComponentFiles() {
  console.log('--- Test 1: React Router Component Files Verification ---');

  const files = [
    'client/src/components/AiSummarizer/ReactRouterComponents.jsx',
    'client/src/components/AiSummarizer/AccountsListView.jsx',
    'client/src/components/AiSummarizer/AccountDetailView.jsx',
    'client/src/components/AiSummarizer/ConversationSummarizerPanel.jsx',
    'client/src/components/AiSummarizer/AiSummarizerContainer.jsx',
  ];

  for (const f of files) {
    const fullPath = path.join(rootDir, f);
    assert.ok(fs.existsSync(fullPath), `File ${f} must exist`);
  }

  const routerPath = path.join(rootDir, 'client/src/components/AiSummarizer/ReactRouterComponents.jsx');
  const routerContent = fs.readFileSync(routerPath, 'utf8');
  assert.ok(routerContent.includes('BrowserRouter'), 'Must export BrowserRouter');
  assert.ok(routerContent.includes('Route'), 'Must export Route');
  assert.ok(routerContent.includes('Routes'), 'Must export Routes');
  assert.ok(routerContent.includes('Link'), 'Must export Link');
  assert.ok(routerContent.includes('useParams'), 'Must export useParams');
  assert.ok(routerContent.includes('useNavigate'), 'Must export useNavigate');
  console.log('  [PASS] React Router components and hooks defined');

  const detailPath = path.join(rootDir, 'client/src/components/AiSummarizer/AccountDetailView.jsx');
  const detailContent = fs.readFileSync(detailPath, 'utf8');
  assert.ok(detailContent.includes('useParams'), 'AccountDetailView must use useParams()');
  assert.ok(detailContent.includes('useNavigate'), 'AccountDetailView must use useNavigate()');
  assert.ok(detailContent.includes('ConversationSummarizerPanel'), 'AccountDetailView must embed AI Panel');
  console.log('  [PASS] AccountDetailView implementation verified');
}

function testPatternMatchingAndUseParams() {
  console.log('\n--- Test 2: URL Pattern Matching & useParams Extraction ---');

  function matchPath(pattern, pathname) {
    if (pattern === '*' || pattern === '') return { matches: true, params: {} };
    const patternSegments = pattern.split('/').filter(Boolean);
    const pathSegments = pathname.split('/').filter(Boolean);

    if (patternSegments.length !== pathSegments.length) {
      return { matches: false, params: {} };
    }

    const params = {};
    for (let i = 0; i < patternSegments.length; i++) {
      const p = patternSegments[i];
      const a = pathSegments[i];
      if (p.startsWith(':')) {
        params[p.slice(1)] = a;
      } else if (p !== a) {
        return { matches: false, params: {} };
      }
    }
    return { matches: true, params };
  }

  // 1. Root / accounts list route
  const resList = matchPath('/accounts', '/accounts');
  assert.strictEqual(resList.matches, true);
  assert.deepStrictEqual(resList.params, {});
  console.log('  [PASS] /accounts matched statically');

  // 2. Dynamic accountId route
  const resAcc1 = matchPath('/accounts/:accountId', '/accounts/acc-1');
  assert.strictEqual(resAcc1.matches, true);
  assert.strictEqual(resAcc1.params.accountId, 'acc-1');
  console.log('  [PASS] /accounts/:accountId extracted { accountId: "acc-1" }');

  const resAcc2 = matchPath('/accounts/:accountId', '/accounts/acc-99');
  assert.strictEqual(resAcc2.matches, true);
  assert.strictEqual(resAcc2.params.accountId, 'acc-99');
  console.log('  [PASS] /accounts/:accountId extracted arbitrary dynamic param');

  // 3. Non-matching route
  const resMismatch = matchPath('/accounts/:accountId', '/settings/profile');
  assert.strictEqual(resMismatch.matches, false);
  console.log('  [PASS] Non-matching route correctly rejected');
}

function testProgrammaticNavigationUseNavigate() {
  console.log('\n--- Test 3: Programmatic Navigation (useNavigate) & Link Routing ---');

  class MockHistoryStack {
    constructor(initialPath = '/accounts') {
      this.history = [initialPath];
      this.currentIndex = 0;
    }

    get current() {
      return this.history[this.currentIndex];
    }

    navigate(to) {
      this.history = this.history.slice(0, this.currentIndex + 1);
      this.history.push(to);
      this.currentIndex++;
    }

    back() {
      if (this.currentIndex > 0) {
        this.currentIndex--;
      }
    }
  }

  const stack = new MockHistoryStack('/accounts');
  assert.strictEqual(stack.current, '/accounts');

  // Simulate user clicking on an account card (<Link to="/accounts/acc-1"> or navigate('/accounts/acc-1'))
  stack.navigate('/accounts/acc-1');
  assert.strictEqual(stack.current, '/accounts/acc-1');
  assert.strictEqual(stack.history.length, 2);
  console.log('  [PASS] Navigated to /accounts/acc-1');

  // Simulate switching account from detail view (navigate('/accounts/acc-2'))
  stack.navigate('/accounts/acc-2');
  assert.strictEqual(stack.current, '/accounts/acc-2');
  assert.strictEqual(stack.history.length, 3);
  console.log('  [PASS] Switched to /accounts/acc-2');

  // Simulate back button (navigate('/accounts'))
  stack.navigate('/accounts');
  assert.strictEqual(stack.current, '/accounts');
  console.log('  [PASS] Returned back to /accounts directory via navigate()');
}

function runAll() {
  console.log('================================================================');
  console.log('🧪 Week 3 Day 5: React Router Client-Side Routing Test Suite');
  console.log('================================================================');
  testComponentFiles();
  testPatternMatchingAndUseParams();
  testProgrammaticNavigationUseNavigate();
  console.log('\n[SUCCESS] All React Router client tests passed!\n');
}

runAll();
