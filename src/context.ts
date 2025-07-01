/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { AsyncLocalStorage } from 'node:async_hooks'
import { RequestContext } from './types.js'

export const requestContextStorage = new AsyncLocalStorage<RequestContext>()
