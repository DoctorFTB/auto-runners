import axios from 'axios';

import { getConfig } from '../../config';
import { Logger } from '../../logger';

import { getToken } from './iam-gen';

const {
  yandex: { instanceId },
} = getConfig();

const actions = {
  start: 'post',
  stop: 'post',
  get: 'get',
} as const;

type InstanceStatus =
  | 'PROVISIONING' // Instance is waiting for resources to be allocated.
  | 'RUNNING' // Instance is running normally.
  | 'STOPPING' // Instance is being stopped.
  | 'STOPPED' // Instance stopped.
  | 'STARTING' // Instance is being started.
  | 'RESTARTING' // Instance is being restarted.
  | 'UPDATING' // Instance is being updated.
  | 'ERROR' // Instance encountered a problem and cannot operate.
  | 'CRASHED' // Instance crashed and will be restarted automatically.
  | 'DELETING'; // Instance is being deleted.

export async function startInstance() {
  Logger.info('startInstance running');

  return await sendInstanceAction('start');
}

export async function stopInstance() {
  Logger.info('stopInstance running');

  return await sendInstanceAction('stop');
}

export async function getInstanceStatus(): Promise<InstanceStatus> {
  Logger.info('getInstanceStatus running');

  return (await sendInstanceAction('get'))?.status ?? 'ERROR';
}

async function sendInstanceAction(action: keyof typeof actions) {
  const token = await getToken();

  const additional = action === 'get' ? '' : `:${action}`;
  const data = action === 'get' ? [] : [undefined];

  try {
    return (
      await axios[actions[action]](
        `https://compute.api.cloud.yandex.net/compute/v1/instances/${instanceId}${additional}`,
        ...data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
    ).data;
  } catch (e: any) {
    Logger.error(`Got error on request ${action} instance`, JSON.stringify(e.response.data));
    return null;
  }
}
