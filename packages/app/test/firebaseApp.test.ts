/**
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { FirebaseApp } from '@firebase/app-types';
import {
  getApps,
  initializeApp,
  getAppInstance,
  deleteApp,
  registerAppHook,
  removeAppHook
} from '../src/firebaseApp';
import { assert } from 'chai';

describe('Firebase App Class', () => {
  beforeEach(async () => {
    const apps = getApps();

    for (const app of apps) {
      await deleteApp(app); // delete all app instances before test
    }
  });

  it('No initial apps.', () => {
    assert.equal(getApps().length, 0);
  });

  it('Can initialize DEFAULT App.', () => {
    const app = initializeApp({});
    const apps = getApps();
    assert.equal(apps.length, 1);
    assert.strictEqual(app, apps[0]);
    assert.equal(app.name, '[DEFAULT]');
    assert.strictEqual(getAppInstance(), app);
    assert.strictEqual(getAppInstance('[DEFAULT]'), app);
  });

  it('Can get options of App.', () => {
    const options = { test: 'option' };
    const app = initializeApp(options);
    assert.deepEqual(app.options, options);
  });

  it('Can delete App.', async () => {
    const app = initializeApp({});

    assert.equal(getApps().length, 1);

    await deleteApp(app);
    assert.equal(getApps().length, 0);
  });

  it('Register App Hook', async () => {
    let events = ['create', 'delete'];
    let hookEvents = 0;
    let app: FirebaseApp;

    registerAppHook('test', (event: string, app: FirebaseApp) => {
      assert.equal(event, events[hookEvents]);
      hookEvents += 1;
    });

    app = initializeApp({});
    // Ensure the hook is called synchronously
    assert.equal(hookEvents, 1);
    await deleteApp(app);
    assert.equal(hookEvents, 2);

    // clean up the apphooks
    removeAppHook('test');
  });

  it('Can create named App.', () => {
    let app = initializeApp({}, 'my-app');
    assert.equal(app.name, 'my-app');
    assert.strictEqual(getAppInstance('my-app'), app);
  });

  it('Can create named App and DEFAULT app.', () => {
    initializeApp({}, 'my-app');
    assert.equal(getApps().length, 1);
    initializeApp({});
    assert.equal(getApps().length, 2);
  });

  it('Duplicate DEFAULT initialize is an error.', () => {
    initializeApp({});
    assert.throws(() => {
      initializeApp({});
    }, /\[DEFAULT\].*exists/i);
  });

  it('Duplicate named App initialize is an error.', () => {
    initializeApp({}, 'abc');
    assert.throws(() => {
      initializeApp({}, 'abc');
    }, /'abc'.*exists/i);
  });

  it('automaticDataCollectionEnabled is `false` by default', () => {
    let app = initializeApp({}, 'my-app');
    assert.equal(app.automaticDataCollectionEnabled, false);
  });

  it('automaticDataCollectionEnabled can be set via the config object', () => {
    let app = initializeApp({}, { automaticDataCollectionEnabled: true });
    assert.equal(app.automaticDataCollectionEnabled, true);
  });

  it('Modifying options object does not change options.', () => {
    let options = { opt: 'original', nested: { opt: 123 } };
    initializeApp(options);
    options.opt = 'changed';
    options.nested.opt = 456;
    assert.deepEqual(getAppInstance().options, {
      opt: 'original',
      nested: { opt: 123 }
    });
  });

  it('Error to use app after it is deleted.', () => {
    let app = initializeApp({});
    return deleteApp(app).then(() => {
      assert.throws(() => {
        console.log(app.name);
      }, /already.*deleted/);
    });
  });

  it('OK to create same-name app after it is deleted.', () => {
    let app = initializeApp({}, 'app-name');
    return deleteApp(app).then(() => {
      let app2 = initializeApp({}, 'app-name');
      assert.ok(app !== app2, 'Expect new instance.');
      // But original app id still orphaned.
      assert.throws(() => {
        console.log(app.name);
      }, /already.*deleted/);
    });
  });

  it('OK to use Object.prototype member names as app name.', () => {
    let app = initializeApp({}, 'toString');
    assert.equal(getApps().length, 1);
    assert.equal(app.name, 'toString');
    assert.strictEqual(getAppInstance('toString'), app);
  });

  it('Error to get uninitialized app using Object.prototype member name.', () => {
    assert.throws(() => {
      getAppInstance('toString');
    }, /'toString'.*created/i);
  });
});

describe('Check for bad app names', () => {
  let tests = ['', 123, false, null];
  for (const data of tests) {
    it("where name == '" + data + "'", () => {
      assert.throws(() => {
        initializeApp({}, data as string);
      }, /Illegal app name/i);
    });
  }
});

describe('Check for bad app names, passed as an object', () => {
  let tests = ['', 123, false, null];
  for (const name of tests) {
    it("where name == '" + name + "'", () => {
      assert.throws(() => {
        initializeApp({}, { name: name as string });
      }, /Illegal app name/i);
    });
  }
});
