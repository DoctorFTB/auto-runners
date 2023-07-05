import { IWebhookHandlerData, WebhookGitlabBody } from './interfaces';
import { isInstanceRunning, startInstance, stopInstance } from './yandex/yc-api';
import { Logger } from './logger';
import { getPipelineStatusById } from './gitlab/gitlab-api';

const { timeoutTime, resendAfter, gitlabRefetchInterval, instanceStatusRefetchInterval } = (() => {
  const timeoutTime = process.env.STOP_INSTANCE_AFTER;
  const resendAfter = process.env.RESEND_START_INSTANCE_AFTER;
  const gitlabRefetchInterval = process.env.GITLAB_REFETCH_INTERVAL;
  const instanceStatusRefetchInterval = process.env.INSTANCE_STATUS_REFETCH_INTERVAL;

  if (!timeoutTime || isNaN(+timeoutTime)) throw new Error('STOP_INSTANCE_AFTER variable not configured or its not number');
  if (!resendAfter || isNaN(+resendAfter)) throw new Error('RESEND_START_INSTANCE_AFTER variable not configured or its not number');
  if (!gitlabRefetchInterval || isNaN(+gitlabRefetchInterval)) throw new Error('GITLAB_REFETCH_INTERVAL variable not configured or its not number');
  if (!instanceStatusRefetchInterval || isNaN(+instanceStatusRefetchInterval)) throw new Error('INSTANCE_STATUS_REFETCH_INTERVAL variable not configured or its not number');

  return {
    timeoutTime: +timeoutTime,
    resendAfter: +resendAfter,
    gitlabRefetchInterval: +gitlabRefetchInterval,
    instanceStatusRefetchInterval: +instanceStatusRefetchInterval,
  };
})();

export async function webhookHandler(): Promise<IWebhookHandlerData> {
  let stopInstanceTimeoutId: ReturnType<typeof setTimeout>;

  let instanceStarted: boolean = await isInstanceRunning();
  let previousInstanceStarted = 0;

  const currentPipelines: Record<string, string> = {};

  function stopInstanceTimeout(id: number | string) {
    clearTimeout(stopInstanceTimeoutId);

    stopInstanceTimeoutId = setTimeout(() => {
      stopInstance(id).then(() => instanceStarted = false);
    }, timeoutTime);
  }

  function onStopActions(id: number | string) {
    delete currentPipelines[id];

    const size = Object.keys(currentPipelines).length;
    Logger.log('Active pipelines: ' + size);

    if (!size) {
      stopInstanceTimeout(id);
    }
  }

  function resetStatus() {
    stopInstanceTimeout(-1);

    Object.keys(currentPipelines).forEach((key) => {
      delete currentPipelines[key];
    });
  }

  if (gitlabRefetchInterval > 0) {
    setInterval(async () => {
      try {
        if (instanceStarted) {
          const entries = Object.entries(currentPipelines);

          if (entries.length) {
            Logger.log(`Fetching ${entries.length} pipelines by api request..`);

            for (let [id, path] of entries) {
              getPipelineStatusById(path, id).then((status) => {
                Logger.log(`Fetch pipeline ${id} status by api request, status: ${status}`);

                if (['canceled', 'failed', 'skipped', 'success', 'manual'].includes(status)) {
                  onStopActions(id);
                }
              });
            }
          }
        }
      } catch (e: any) {
        Logger.error('Got error in gitlab refetch interval', e.message);
      }
    }, gitlabRefetchInterval);
  }

  if (instanceStatusRefetchInterval > 0) {
    setInterval(async () => {
      try {
        instanceStarted = await isInstanceRunning();
      } catch (e: any) {
        Logger.error('Got error in instance status refetch interval', e.message);
      }
    }, instanceStatusRefetchInterval);
  }

  function onNewWebhook(data: WebhookGitlabBody) {
    let log = `Got webhook '${data.object_attributes.status}' (${data.object_attributes.id}) `;
    log += `for ${data.project.path_with_namespace} (${data.object_attributes.ref}) by ${data.user.username}. `;
    log += `Instance started: ${instanceStarted}`;
    Logger.log(log);

    switch (data.object_attributes.status) {
      case 'created':
      case 'pending':
      case 'running':
        // I'm using same code because status is 'running' after rerun pipeline (I think it's GitLab bug :sad:)
        // But if runners offline, we only get created status

        clearTimeout(stopInstanceTimeoutId);

        currentPipelines[data.object_attributes.id] = data.project.path_with_namespace;

        const startInstanceByTime = previousInstanceStarted < Date.now() - resendAfter;
        if (!instanceStarted || startInstanceByTime) {
          startInstance(data.object_attributes.id).then((res) => {
            previousInstanceStarted = Date.now();
            instanceStarted = res;
          });
        }

        break;
      case 'canceled':
      case 'failed':
      case 'skipped':
      case 'success':
      case 'manual':
        // In all cases we don't need active machine
        onStopActions(data.object_attributes.id);
        break;
      default:
        Logger.warn('Unhandled pipeline status: ' + data.object_attributes.status)
    }
  }

  return {
    onNewWebhook,
    currentPipelines,
    resetStatus,
  };
}
