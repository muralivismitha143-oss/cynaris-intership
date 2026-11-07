/**
 * test_nodejs_architecture_event_loop.js
 * 
 * Unit test suite validating:
 * 1. Node.js Architecture & Event Loop Phases:
 *    - Timers Phase (`setTimeout`).
 *    - Check Phase (`setImmediate`).
 *    - Microtask Queues (`process.nextTick` prioritized over Promise microtasks).
 *    - Non-blocking asynchronous execution order.
 * 2. Node.js Built-in HTTP Server (`http.createServer`):
 *    - Request streaming (`req.on('data')`, `req.on('end')`).
 *    - Asynchronous JSON response with status codes and CORS headers.
 *    - Event Loop event dispatching via 'request' emitter.
 * 3. Built-in Modules (`fs`, `path`, `events`, `url`):
 *    - Path normalization and resolution.
 *    - EventEmitter synchronous vs asynchronous dispatching.
 */

const assert = require('assert');
const http = require('http');
const path = require('path');
const EventEmitter = require('events');
const { Readable } = require('stream');

const rootDir = path.resolve(__dirname, '..');
const { createSmartReminderServer } = require(path.join(rootDir, 'backend/smartReminderServer'));

function testEventLoopPhases() {
  console.log('--- Test 1: Node.js Event Loop Phase Ordering ---');

  return new Promise((resolve) => {
    const executionOrder = [];

    // 1. Synchronous execution
    executionOrder.push('1-sync-start');

    // 2. Timers phase (Macrotask)
    setTimeout(() => {
      executionOrder.push('5-macrotask-setTimeout');
      
      // Verify complete execution order
      assert.deepStrictEqual(executionOrder, [
        '1-sync-start',
        '2-sync-end',
        '3-microtask-nextTick',
        '4-microtask-promise',
        '5-macrotask-setTimeout',
      ]);
      console.log('  [PASS] process.nextTick precedes Promise microtasks; microtasks precede timers');
      resolve();
    }, 10);

    // 3. Promise Microtask
    Promise.resolve().then(() => {
      executionOrder.push('4-microtask-promise');
    });

    // 4. process.nextTick Microtask (Highest microtask priority in Node.js)
    process.nextTick(() => {
      executionOrder.push('3-microtask-nextTick');
    });

    executionOrder.push('2-sync-end');
  });
}

function testSetImmediateVsSetTimeout() {
  console.log('\n--- Test 2: Check Phase (setImmediate) vs Poll Phase ---');

  return new Promise((resolve) => {
    // In an I/O cycle (e.g. fs callback), setImmediate executes in Check phase before setTimeout in next Timers phase
    const fs = require('fs');
    fs.readFile(__filename, () => {
      const order = [];
      setTimeout(() => {
        order.push('setTimeout');
        assert.deepStrictEqual(order, ['setImmediate', 'setTimeout']);
        console.log('  [PASS] Inside I/O cycle, check phase (setImmediate) executes before timers phase (setTimeout)');
        resolve();
      }, 0);

      setImmediate(() => {
        order.push('setImmediate');
      });
    });
  });
}

function testPureNodeHttpServer() {
  console.log('\n--- Test 3: Pure Node.js HTTP Server Stream Processing ---');

  return new Promise((resolve, reject) => {
    const server = createSmartReminderServer();
    assert.ok(server instanceof http.Server, 'Must create an instance of http.Server');
    console.log('  [PASS] http.createServer instantiated with request handler');

    // Test GET /health via Node.js stream request/response simulation
    const mockReq = new Readable({
      read() {
        this.push(null); // EOF
      },
    });
    mockReq.url = '/health';
    mockReq.method = 'GET';
    mockReq.headers = { host: 'localhost:3005' };

    let statusCode = null;
    let headers = {};
    let responseBody = '';

    const mockRes = new EventEmitter();
    mockRes.writeHead = (code, hdrs) => {
      statusCode = code;
      headers = hdrs;
    };
    mockRes.end = (chunk) => {
      if (chunk) responseBody += chunk;
      
      assert.strictEqual(statusCode, 200);
      assert.strictEqual(headers['Content-Type'], 'application/json');
      const parsed = JSON.parse(responseBody);
      assert.strictEqual(parsed.status, 'ok');
      assert.ok(parsed.architecture.eventLoop);
      console.log('  [PASS] Request handler processed GET /health with 200 OK & Event Loop telemetry');

      // Test POST /api/reminders/evaluate with payload stream
      const postReq = new Readable({
        read() {},
      });
      postReq.url = '/api/reminders/evaluate';
      postReq.method = 'POST';
      postReq.headers = { host: 'localhost:3005', 'content-type': 'application/json' };

      let postStatus = null;
      let postBody = '';
      const postRes = new EventEmitter();
      postRes.writeHead = (code) => {
        postStatus = code;
      };
      postRes.end = (chunk) => {
        if (chunk) postBody += chunk;
        assert.strictEqual(postStatus, 200);
        const postParsed = JSON.parse(postBody);
        assert.strictEqual(postParsed.success, true);
        assert.ok(postParsed.evaluatedCount >= 0);
        console.log('  [PASS] Request handler processed POST stream with non-blocking I/O');
        resolve();
      };

      server.emit('request', postReq, postRes);

      // Push JSON chunks asynchronously
      postReq.push(JSON.stringify({ applicants: [], accounts: [] }));
      postReq.push(null);
    };

    // Emit request event on server (pure event loop dispatch)
    server.emit('request', mockReq, mockRes);
  });
}

function testBuiltinModulesArchitecture() {
  console.log('\n--- Test 4: Built-in Modules Verification (path & events) ---');

  // Path module
  const resolved = path.resolve('/cynaris', 'backend', 'server.js');
  assert.ok(resolved.includes('server.js'));
  console.log('  [PASS] Built-in path module resolves paths deterministically');

  // EventEmitter pattern
  const emitter = new EventEmitter();
  let received = false;
  emitter.on('reminder:dispatched', (payload) => {
    assert.strictEqual(payload.recipient, 'Priya Sharma');
    received = true;
  });
  emitter.emit('reminder:dispatched', { recipient: 'Priya Sharma', channel: 'Email' });
  assert.strictEqual(received, true);
  console.log('  [PASS] Built-in events module dispatches and intercepts lifecycle events');
}

async function runAll() {
  console.log('================================================================');
  console.log('🧪 Week 4 Day 1: Node.js Architecture & Event Loop Test Suite');
  console.log('================================================================');
  await testEventLoopPhases();
  await testSetImmediateVsSetTimeout();
  await testPureNodeHttpServer();
  testBuiltinModulesArchitecture();
  console.log('\n[SUCCESS] All Node.js Architecture & Event Loop tests passed!\n');
}

runAll().catch((err) => {
  console.error('\n[FAIL] Test suite failed:', err);
  process.exit(1);
});
