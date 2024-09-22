import { getToken } from './iam-gen';
import axios from 'axios';
import { Logger } from '../logger';
import { sleep } from '../utils';

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
  Logger.info('startInstance running, pipeline id: ' + pipelineId);

  if (await isInstanceRunning()) {
    Logger.info('startInstance not stopped, pipeline id: ' + pipelineId);
    return true;
  }

  let res = (await sendInstanceAction('start'))?.done ?? 'error';
  Logger.info('startInstance finished, already started: ' + res);

  if (res === 'error') {
    await sleep(1_500);

    res = (await sendInstanceAction('start'))?.done ?? 'error';
  }

  return res !== 'error';
}

export async function stopInstance(pipelineId: number | string) {
  Logger.info('stopInstance running, pipeline id: ' + pipelineId);

  if (!(await isInstanceRunning())) {
    Logger.info('stopInstance not running, pipeline id: ' + pipelineId);
    return;
  }

  const res = (await sendInstanceAction('stop'))?.done ?? 'error';
  Logger.info('stopInstance finished, already stopped: ' + res);
}

export async function isInstanceRunning() {
  const status = await getInstanceStatus();

  return ['PROVISIONING', 'STARTING', 'RUNNING'].includes(status);
}

async function getInstanceStatus(): Promise<InstanceStatus> {
  Logger.info('getInstanceStatus running');

  const res = (await sendInstanceAction('get'))?.status ?? 'error';
  Logger.info(`getInstanceStatus finished, status: ${res}`);

  return res;
}

async function sendInstanceAction(action: keyof typeof actions, retryCount = 0): Promise<any> {
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
    const message = e.response.data?.message?.toString() || '';
    const regexp = /(Start|Stop) operation '[a-z0-9]+' is in process|The instance "[a-z0-9]+" has an invalid state "([A-Z]+)" for this operation/;
    const nextRetry = regexp.test(message);

    if (nextRetry && retryCount < 5) {
      const match = message.match(regexp)![1] as string;

      if (
        (['Start', 'PROVISIONING', 'STARTING', 'RUNNING'].includes(match) && action === 'start')
        || (['Stop', 'STOPPING', 'STOPPED'].includes(match) && action === 'stop')
      ) {
        return { done: true };
      }

      await new Promise<void>((resolve) => setTimeout(resolve, 5_000));
      return await sendInstanceAction(action, retryCount + 1);
    }

    Logger.error(`Got error on request ${action} instance`, JSON.stringify(e.response.data));
    return null;
  }
}
