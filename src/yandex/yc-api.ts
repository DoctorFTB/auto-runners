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

export async function startInstance(pipelineId: number | string): Promise<boolean> {
  Logger.log('startInstance running, pipeline id: ' + pipelineId);
  const res = (await sendInstanceAction('start')).done;
  Logger.log(`startInstance finished, already started: ${res}`);
  return res;
}

export async function stopInstance(pipelineId: number | string): Promise<boolean> {
  Logger.log('stopInstance running, pipeline id: ' + pipelineId);
  const res = (await sendInstanceAction('stop')).done;
  Logger.log(`stopInstance finished, already stopped: ${res}`);
  return res;
}

export async function getStatusInstance(): Promise<InstanceStatus> {
  Logger.log('getStatus running');
  const res = (await sendInstanceAction('get')).status;
  Logger.log(`getStatus finished, status: ${res}`);
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
    Logger.error(`Got error on request ${action} instance`, JSON.stringify(e.response));
    throw new Error(e.response);
  }
}
