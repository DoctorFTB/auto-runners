# auto-runners

## Description

Auto start/stop yandex cloud virtual machines based on gitlab pipeline webhooks

## Setup
1. Install deps via `yarn` or `npm i`
2. Configure .env file
3. Start via `yarn start` or `npm start`

## How it's work

1. Someone pushes commits to a branch
2. Service got a webhook
   1. If status created or running
      1. Check if we need send start event to virtual machine by:
         1. If instance stopped (controlled by code)
         2. If it's new pipeline (send because we can, maybe it doesn't need but bugs or etc.)
         3. Previous start time < current date - $RESEND_START_INSTANCE_AFTER
   2. If status success
      1. Check if all pipelines finished 

### Create service account

1. Go to your Cloud Folder dashboard
2. From the menu on the left, select `Service accounts`
3. In the upper right corner, click on the button `Create service account`
4. Fill in the fields Name, Description
5. Add `compute.operator` role
6. Open created service account
7. In the upper right corner, click on the button `Create new key`, choose `Create authorized key`
8. Add description, if needed. Click `Create`
9. Save the Public and Private keys

### Config:

* PORT -> App port
* GITLAB_WEBHOOK_SECRET -> Value from `Secret token` on GitLab Webhook config
* GITLAB_DOMAIN -> gitlab domain, needs for custom gitlab urls
* GITLAB_TOKEN -> gitlab token for calling api
* GITLAB_REFETCH_INTERVAL -> every what time (in ms) send refetch pipelines. In some cases gitlab doesn't send webhook events
* TELEGRAM_CHAT_ID -> Set telegram chat id if you need logs into telegram (require TELEGRAM_TOKEN)
* TELEGRAM_TOKEN -> Set telegram bot token if you need logs into telegram (require TELEGRAM_CHAT_ID)
* STOP_INSTANCE_AFTER -> After what time (in ms) need stop instance
* RESEND_START_INSTANCE_AFTER -> After what time (in ms) resend start instance if instance already started by code (for preemptible instances)
* YANDEX_INSTANCE_ID -> ID of Virtual machine instance
* YANDEX_SERVICE_IDENTITY -> ID of Service account
* YANDEX_KEY_IDENTITY -> ID of Service account authorized key
* YANDEX_KEY_PEM_PATH -> Path to private key of authorized key
* YANDEX_KEY_PEM -> Private key as string (used as priority between pem path)
* YANDEX_REFRESH_TIME -> Max IAM token lifetime before refresh (max 12 hours)

### Configure GitLab Webhooks

1. Go to `Settings` -> `Webhooks`
2. Set url, path: `/webhook`
3. Secret token same as `GITLAB_WEBHOOK_SECRET` in config
4. Select `Pipeline events` in `Trigger`
5. Configure `SSL verification` if needed
6. Click `Add webhook`
