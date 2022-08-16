import { IWebhookHandlerData, WebhookGitlabBody } from './interfaces';
import { getStatusInstance, startInstance, stopInstance } from './yandex/yc-api';
import { Logger } from './logger';
import { getPipelineStatusById } from './gitlab/gitlab-api';

const { timeoutTime, resendAfter, refretchInterval } = (() => {
  const timeoutTime = process.env.STOP_INSTANCE_AFTER;
  const resendAfter = process.env.RESEND_START_INSTANCE_AFTER;
  const refretchInterval = process.env.GITLAB_REFETCH_INTERVAL;

  if (!timeoutTime || isNaN(+timeoutTime)) throw new Error('STOP_INSTANCE_AFTER variable not configured or its not number');
  if (!resendAfter || isNaN(+resendAfter)) throw new Error('RESEND_START_INSTANCE_AFTER variable not configured or its not number');
  if (!refretchInterval || isNaN(+refretchInterval)) throw new Error('GITLAB_REFETCH_INTERVAL variable not configured or its not number');

  return {
    timeoutTime: +timeoutTime,
    resendAfter: +resendAfter,
    refretchInterval: +refretchInterval,
  };
})();

export async function webhookHandler(): Promise<IWebhookHandlerData> {
  let stopInstanceTimeoutId: ReturnType<typeof setTimeout>;

  let instanceStarted: boolean = await getStatusInstance() === 'RUNNING';
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

  if (refretchInterval > 0) {
    setInterval(() => {
      if (instanceStarted) {
        const keys = Object.entries(currentPipelines);
        if (keys.length) {
          Logger.log(`Fetching ${keys.length} pipelines by api request..`);
          for (let [id, path] of keys) {
            getPipelineStatusById(path, id).then((status) => {
              Logger.log(`Fetch pipeline ${id} status by api request, status: ${status}`);
              if (['canceled', 'failed', 'skipped', 'success', 'manual'].includes(status)) {
                onStopActions(id);
              }
            });
          }
        }
      }
    }, refretchInterval);
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
          startInstance(data.object_attributes.id).then(() => {
            previousInstanceStarted = Date.now();
            instanceStarted = true;
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
