import {
  catchError,
  delay,
  exhaustMap,
  filter,
  from,
  interval,
  map,
  mergeMap,
  of,
  switchMap,
  tap,
  toArray,
} from 'rxjs';

import { getConfig } from '../config';

import { Logger } from '../logger';
import { getInstanceStatus, startInstance, stopInstance } from '../utils/yandex/yandex-api';

import { getJobStatusByData } from './gitlab-api';
import { currentJobs, triggerNewHook, triggerResetJob } from './storage';

const STATUS_FOR_START = new Set<string>(['created', 'pending', 'running']);
const STATUS_FOR_STOP = new Set<string>(['canceled', 'failed', 'skipped', 'success', 'manual', 'error']);

const { fetching, stopInstanceAfter } = getConfig();

export function setupHandlers() {
  if (fetching.gitlab) {
    interval(fetching.gitlab)
      .pipe(
        exhaustMap(() =>
          from(Object.values(currentJobs.value)).pipe(
            mergeMap((job) => getJobStatusByData(job).then((status) => ({ ...job, status }))),
            toArray()
          )
        ),
        map((jobs) => jobs.filter(({ status }) => STATUS_FOR_STOP.has(status))),
        filter((jobs) => jobs.length > 0),
        catchError((err, source$) => {
          Logger.error('Got error on fetch jobs', err.message);
          return source$;
        })
      )
      .subscribe((jobs) => {
        jobs.forEach((job) => {
          delete currentJobs.value[job.jobId];
        });

        currentJobs.next(currentJobs.value);
      });
  }

  currentJobs
    .pipe(
      map((value) => Object.keys(value).length),
      tap((size) => {
        Logger.info('Active jobs: ' + size);
      }),
      map((size) => (size ? 'RUNNING' : 'STOPPED')),
      switchMap((wanted) => getInstanceStatus().then((status) => ({ wanted, status }))),
      filter(({ wanted, status }) => ['RUNNING', 'STOPPED'].includes(status) && wanted !== status),
      switchMap(({ wanted }) => (wanted === 'STOPPED' ? of(false).pipe(delay(stopInstanceAfter)) : of(true))),
      switchMap((isStarting) => (isStarting ? startInstance() : stopInstance())),
      catchError((err, source$) => {
        Logger.error('Got error on handle current jobs', err.message);
        console.error(err.message, err.stack);

        if (err.message === 'Invalid PEM formatted message.') {
          throw err;
        }

        return source$;
      })
    )
    .subscribe();

  triggerNewHook
    .pipe(
      tap(({ hook }) => {
        let log = `Got webhook '${hook.build_status}' (${hook.build_id}) `;
        log += `for ${hook.project_name} (${hook.ref}) by ${hook.user.username}`;

        Logger.info(log);
      })
    )
    .subscribe(({ hook: { build_status, build_id, project_id }, instanceUrl }) => {
      if (STATUS_FOR_START.has(build_status)) {
        currentJobs.value[build_id] = {
          instanceUrl,
          projectId: project_id,
          jobId: build_id,
        };
      } else if (STATUS_FOR_STOP.has(build_status)) {
        delete currentJobs.value[build_id];
      } else {
        Logger.warn('Unhandled job status: ' + build_status);

        return;
      }

      currentJobs.next(currentJobs.value);
    });

  triggerResetJob.subscribe((id) => {
    delete currentJobs.value[id];
    currentJobs.next(currentJobs.value);
  });
}
