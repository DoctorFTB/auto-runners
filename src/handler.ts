import { IWebhookHandlerData, WebhookGitlabBody } from './interfaces';
import { getStatusInstance, startInstance, stopInstance } from './yandex/yc-api';
import { Logger } from './logger';

const { timeoutTime, resendAfter } = (() => {
  const timeoutTime = process.env.STOP_INSTANCE_AFTER;
  const resendAfter = process.env.RESEND_START_INSTANCE_AFTER;

  if (!timeoutTime || isNaN(+timeoutTime)) throw new Error('STOP_INSTANCE_AFTER variable not configured or its not number');
  if (!resendAfter || isNaN(+resendAfter)) throw new Error('RESEND_START_INSTANCE_AFTER variable not configured or its not number');

  return {
    timeoutTime: +timeoutTime,
    resendAfter: +resendAfter,
  };
})();

export async function webhookHandler(): Promise<IWebhookHandlerData> {
  let stopInstanceTimeoutId: ReturnType<typeof setTimeout>;

  let instanceStarted: boolean = await getStatusInstance() === 'RUNNING';
  let previousInstanceStarted = 0;

  const currentPipelines: Record<string, true> = {};

  function stopInstanceTimeout(id: number) {
    clearTimeout(stopInstanceTimeoutId);
    stopInstanceTimeoutId = setTimeout(() => {
      stopInstance(id).then(() => instanceStarted = false);
    }, timeoutTime);
  }

  function onNewWebhook(data: WebhookGitlabBody) {
    let log = `Got webhook '${data.object_attributes.status}' (${data.object_attributes.id}) `
    log += `for ${data.project.path_with_namespace} by ${data.user.username}. `;
    log += `Instance started: ${instanceStarted}`;
    Logger.log(log);

    switch (data.object_attributes.status) {
      case 'created':
      case 'pending':
      case 'running':
        // I'm using same code because status is 'running' after rerun pipeline (I think it's GitLab bug :sad:)
        // But if runners offline, we go only created status
        // But if runners offline, we only get created status
        if (
          !instanceStarted ||
          !currentPipelines[data.object_attributes.id] ||
          previousInstanceStarted < Date.now() - resendAfter
        ) {
          currentPipelines[data.object_attributes.id] = true;
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
        // In all cases we don't need active machine
        delete currentPipelines[data.object_attributes.id];

        const size = Object.keys(currentPipelines).length;
        Logger.log('Active pipelines: ' + size);

        if (!size) {
          stopInstanceTimeout(data.object_attributes.id);
        }
        break;
      default:
        Logger.warn('Unhandled pipeline status: ' + data.object_attributes.status)
    }
  }

  return {
    onNewWebhook,
    currentPipelines,
    stopInstanceTimeout,
  };
}
