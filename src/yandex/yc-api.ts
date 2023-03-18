import { getToken } from './iam-gen';
import axios from 'axios';
import { Logger } from '../logger';

const instanceId = (() => {
  const instanceId = process.env.YANDEX_INSTANCE_ID;

  if (!instanceId) throw new Error('YANDEX_INSTANCE_ID variable not configured');

  return instanceId;
})();

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

export async function startInstance(pipelineId: number | string) {
  Logger.log('startInstance running, pipeline id: ' + pipelineId);

  if (await isInstanceRunning()) {
    Logger.log('startInstance not stopped, pipeline id: ' + pipelineId);
    return;
  }

  const res = (await sendInstanceAction('start'))?.done || 'error';
  Logger.log('startInstance finished, already started: ' + res);
}

export async function stopInstance(pipelineId: number | string) {
  Logger.log('stopInstance running, pipeline id: ' + pipelineId);

  if (!(await isInstanceRunning())) {
    Logger.log('stopInstance not running, pipeline id: ' + pipelineId);
    return;
  }

  const res = (await sendInstanceAction('stop'))?.done || 'error';
  Logger.log('stopInstance finished, already stopped: ' + res);
}

export async function isInstanceRunning() {
  const status = await getInstanceStatus();

  return ['PROVISIONING', 'STARTING', 'RUNNING'].includes(status);
}

async function getInstanceStatus(): Promise<InstanceStatus> {
  Logger.log('getInstanceStatus running');

  const res = (await sendInstanceAction('get'))?.status || 'error';
  Logger.log(`getInstanceStatus finished, status: ${res}`);

  return res;
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
        },
      )
    ).data;
  } catch (e: any) {
    Logger.error(`Got error on request ${action} instance`, JSON.stringify(e.response.data));
    return null;
  }
}
