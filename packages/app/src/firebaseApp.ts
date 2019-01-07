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

import {
  FirebaseApp,
  FirebaseOptions,
  FirebaseAppConfig
} from '@firebase/app-types';
import { AppHook } from '@firebase/app-types/private';
import { deepCopy, ErrorFactory, FirebaseError } from '@firebase/util';

const apps: { [name: string]: FirebaseApp } = {};
const appHooks: { [name: string]: AppHook } = {};
const DEFAULT_ENTRY_NAME = '[DEFAULT]';

export const SDK_VERSION: string = '${JSCORE_VERSION}';

export function initializeApp(
  options: FirebaseOptions,
  config?: FirebaseAppConfig
): FirebaseApp;
export function initializeApp(
  options: FirebaseOptions,
  name?: string
): FirebaseApp;
export function initializeApp(options: FirebaseOptions, rawConfig = {}) {
  if (typeof rawConfig !== 'object' || rawConfig === null) {
    const name = rawConfig;
    rawConfig = { name };
  }

  const config = rawConfig as FirebaseAppConfig;

  if (config.name === undefined) {
    config.name = DEFAULT_ENTRY_NAME;
  }

  const { name } = config;

  if (typeof name !== 'string' || !name) {
    throw error(AppError.BadAppName, { name: name + '' });
  }

  if (apps[name]) {
    throw error(AppError.DuplicateApp, { name: name });
  }

  const app = new FirebaseAppImpl(options, config!);

  apps[name] = app;
  callAppHooks(app, AppEvent.Create);

  return app;
}

export function getAppInstance(name?: string): FirebaseApp | null {
  name = name || DEFAULT_ENTRY_NAME;
  if (!apps[name]) {
    throw error(AppError.NoApp, { name: name });
  }
  return apps[name];
}

export function getApps(): FirebaseApp[] {
  return Object.keys(apps).map(name => apps[name]);
}

export function deleteApp(app: FirebaseApp): Promise<void> {
  return new Promise(resolve => {
    if (app.isDeleted) {
      throw error(AppError.AppDeleted, { name: app.name });
    }
    resolve();
  })
    .then(() => {
      /** Each finrebase service should register a event handler with firebase app.
       *  The event handler should clean up the service when its associated app is being deleted.
       */
      callAppHooks(app, AppEvent.Delete);
      delete apps[app.name];
    })
    .then((): void => {
      app.isDeleted = true;
    });
}

/**
 * @internal
 */
export function registerAppHook(name, callback: AppHook): void {
  appHooks[name] = callback;

  // Run the **new** app hook on all existing apps
  getApps().forEach(app => {
    callAppHooks(app, AppEvent.Create);
  });
}

function callAppHooks(app: FirebaseApp, eventName: AppEvent) {
  Object.keys(appHooks).forEach(name => {
    appHooks[name](eventName, app);
  });
}

class FirebaseAppImpl implements FirebaseApp {
  private options_: FirebaseOptions;
  private name_: string;
  private isDeleted_ = false;

  private automaticDataCollectionEnabled_: boolean;

  constructor(options: FirebaseOptions, config: FirebaseAppConfig) {
    this.name_ = config.name!;
    this.automaticDataCollectionEnabled_ =
      config.automaticDataCollectionEnabled || false;
    this.options_ = deepCopy<FirebaseOptions>(options);
  }

  get automaticDataCollectionEnabled(): boolean {
    this.checkDestroyed_();
    return this.automaticDataCollectionEnabled_;
  }

  set automaticDataCollectionEnabled(val) {
    this.checkDestroyed_();
    this.automaticDataCollectionEnabled_ = val;
  }

  get name(): string {
    this.checkDestroyed_();
    return this.name_;
  }

  get options(): FirebaseOptions {
    this.checkDestroyed_();
    return this.options_;
  }

  get isDeleted(): boolean {
    return this.isDeleted_;
  }

  /**
   * @internal
   */
  set isDeleted(val: boolean) {
    this.isDeleted = val;
  }

  /**
   * This function will throw an Error if the App has already been deleted -
   * use before performing API actions on the App.
   */
  private checkDestroyed_(): void {
    if (this.isDeleted_) {
      throw error(AppError.AppDeleted, { name: this.name_ });
    }
  }
}

enum AppEvent {
  Create = 'create',
  Delete = 'delete'
}

enum AppError {
  NoApp = 'no-app',
  BadAppName = 'bad-app-name',
  DuplicateApp = 'duplicate-app',
  AppDeleted = 'app-deleted'
}

const errors: { [key in AppError]: string } = {
  [AppError.NoApp]:
    "No Firebase App '{$name}' has been created - " +
    'call Firebase App.initializeApp()',
  [AppError.BadAppName]: "Illegal App name: '{$name}",
  [AppError.DuplicateApp]: "Firebase App named '{$name}' already exists",
  [AppError.AppDeleted]: "Firebase App named '{$name}' already deleted"
};

const appErrors = new ErrorFactory<AppError>('app', 'Firebase', errors);
function error(code: AppError, args?: { [name: string]: any }): FirebaseError {
  return appErrors.create(code, args);
}
