import { BehaviorSubject, Subject } from 'rxjs';

import { JobWebhookGitlabBody, JobStorageValue } from '../interfaces';

export const currentJobs = new BehaviorSubject<Record<string, JobStorageValue>>({});
export const triggerNewHook = new Subject<{ hook: JobWebhookGitlabBody; instanceUrl: string }>();
export const triggerResetJob = new Subject<string>();
