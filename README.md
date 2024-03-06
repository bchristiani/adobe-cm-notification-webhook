# Microsoft Teams Notifications for Adobe Cloud Manager Pipeline
This webhook allows you to send Adobe Cloud Manager CI/CD Pipeline Notifications to Microsoft Teams. You can use it to post and monitor the status of your Cloud Manager deployment pipeline without having to log in to Cloud Manager. It's a simple [Node.js][Node-url] application built on [Express][Express-url]. The webhook script can be deployed and run using [Glitch](https://glitch.com), for example.


## Sample Notifications in Action
The different types of notifications and how they appear in Microsoft Teams are presented below. Each notification lists the execution steps of the pipeline and its current status, so that the overall progress of the deployment can be read from the latest message. In addition, each message has a button that allows anyone with Cloud Manager access to access the details of the pipeline execution in Cloud Manager.

### Pipeline Started Notification

![Pipeline Started][screenshot-pipeline-started]

### Execution Step Started Notification

![Execution Step Started][screenshot-step-started]

### Execution Step Ended Notification

![Execution Step Ended][screenshot-step-ended]

### Pipeline Ended Notification

![Pipeline Ended][screenshot-pipeline-ended]


## Getting Started

Below you will find instructions for local setup and integration between Cloud Manager and Microsoft Teams.

### Prerequisites

Before you can start, you must first set up a project in the [Adobe Developer Console][Adobe-Developer-Console-url]. First, follow the instructions on the [Create an API Integration](https://developer.adobe.com/experience-cloud/cloud-manager/guides/getting-started/create-api-integration/) section to create an API integration. The Event Integration will be added in a later step.

### Configuration Variables

Populate the file `.env` in the root of the project with the following content:

  ```
  PORT=4000
  ORGANIZATION_ID=  
  CLIENT_ID=
  CLIENT_SECRET=
  TEAMS_WEBHOOK=
  CM_PIPELINE_EXECUTION_BASE_URL=
  ```
1. `PORT` -- this is the port on which the webhook will listen.
2. `ORGANIZATION_ID` -- this can be found in the Credentials details section of the Adobe Developer Console.
3. `CLIENT_ID` -- this can be found in the Credentials details section of the Adobe Developer Console.
4. `CLIENT_SECRET` -- this can be found in the Credentials details section of the Adobe Developer Console.
5. `TEAMS_WEBHOOK` -- this is the incoming webhook URL for Microsoft Teams. Documentation to create a webhook URL for Microsoft Teams can be found [here](https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook).
6. `CM_PIPELINE_EXECUTION_BASE_URL` -- this is the basic URL to the details of the pipeline execution in Cloud Manager, e.g. `https://experience.adobe.com/#/@myprogram/cloud-manager/pipelineexecution.html`. Replace `myprogram` in the URL with the proper program name.

### Node.js Installation
Install [Node.js][Node-url] (>=16) and npm, the Node Package Manager, in order to run the webhook locally.

### Running the Webhook Script

1. Install NPM packages
   ```sh
   npm install
   ```
2. Run the webhook on port 4000
   ```sh
   node index.js
   ```
3. In order to use the webhook with Adobe I/O, it must be accessible to the public internet. To do this, a *tunnel* must be opened. The tool [ngrok](https://ngrok.com/) can be used for this. Once it is installed, open up a tunnel by running 
   ```sh
   ngrok http 4000
   ```
4. Once running ngrok will show you the forwarding address
5. Open the [Adobe Developer Console][Adobe-Developer-Console-url] and open the Project you created in the Prerequisites section. Click `Add to Project` and select `Event`. Select `Cloud Manager Events` and click `Next`. Select the events you want to subscribe to. Click the `Next` button. For receiving events select the `Webhook` option. The Webhook URL will be the ngrok forwarding address (step 4) appended with `/webhook`, e.g. `https://1a-2b-3c.ngrok.io/webhook`
6. Once a pipeline execution is triggered in Cloud Manager, the subscribed Cloud Manager Events are sent to the webhook which then posts a message to your Microsoft Teams channel.


<!-- LICENSE -->
## License

Distributed under the MIT License. See [LICENSE](LICENSE.txt) for more information.



<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[screenshot-pipeline-started]: images/pipeline_started.png
[screenshot-pipeline-ended]: images/pipeline_ended.png
[screenshot-step-started]: images/step_started.png
[screenshot-step-ended]: images/step_ended.png
[Node-url]: https://nodejs.org/en
[Express-url]: https://expressjs.com/
[Adobe-Developer-Console-url]: https://developer.adobe.com/console/projects
