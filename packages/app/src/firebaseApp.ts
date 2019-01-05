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
  FirebaseNamespace,
  FirebaseAppConfig
} from '@firebase/app-types';
import {
  _FirebaseApp,
  _FirebaseNamespace,
  FirebaseService,
  FirebaseServiceFactory,
  FirebaseServiceNamespace,
  AppHook
} from '@firebase/app-types/private';
import {
  createSubscribe,
  deepCopy,
  deepExtend,
  ErrorFactory,
  FirebaseError,
  Observer,
  patchProperty,
  Subscribe
} from '@firebase/util';

const apps: { [name: string]: FirebaseApp } = {};
const DEFAULT_ENTRY_NAME = '[DEFAULT]';

export const SDK_VERSION: string = '${JSCORE_VERSION}';

export function initializeApp(): FirebaseApp {}

export function getAppInstance(name?: string): FirebaseApp | null {
  name = name || DEFAULT_ENTRY_NAME;
  if (!apps[name]) {
    error(AppError.NoApp, { name: name });
  }
  return apps[name];
}

export function getApps(): FirebaseApp[] {
  return apps;
}

export function deleteApp(app: FirebaseApp): Promise<void> {}

class FirebaseAppImpl implements FirebaseApp {}

enum AppError {
  NoApp = 'no-app',
  BadAppName = 'bad-app-name',
  DuplicateApp = 'duplicate-app',
  AppDeleted = 'app-deleted',
  InvalidAppArgument = 'invalid-app-argument',

  DuplicateService = 'duplicate-service',
  SaNotSupported = 'sa-not-supported'
}

const errors: { [key in AppError]: string } = {
  [AppError.NoApp]:
    "No Firebase App '{$name}' has been created - " +
    'call Firebase App.initializeApp()',
  [AppError.BadAppName]: "Illegal App name: '{$name}",
  [AppError.DuplicateApp]: "Firebase App named '{$name}' already exists",
  [AppError.AppDeleted]: "Firebase App named '{$name}' already deleted",
  [AppError.DuplicateService]:
    "Firebase service named '{$name}' already registered",
  [AppError.SaNotSupported]:
    'Initializing the Firebase SDK with a service ' +
    'account is only allowed in a Node.js environment. On client ' +
    'devices, you should instead initialize the SDK with an api key and ' +
    'auth domain',
  [AppError.InvalidAppArgument]:
    'firebase.{$name}() takes either no argument or a ' +
    'Firebase App instance.'
};

const appErrors = new ErrorFactory<AppError>('app', 'Firebase', errors);
function error(code: AppError, args?: { [name: string]: any }): never {
  throw appErrors.create(code, args);
}
