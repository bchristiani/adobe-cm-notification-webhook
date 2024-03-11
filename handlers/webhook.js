const {toTimeString, diffInMinutes} = require("../utils/date");
const notifyTeams = require("../utils/teams");
const {
  getExecution,
  getStepStateExecution,
  getStepStates,
  getCloudManagerExecutionDetailsLink,
  REL_SELF,
  REL_EXECUTION
} = require("../utils/cloud-manager");

function sendNotification(title, status, pipelineName, programName, stepStates, cmExecutionDetailsLink) {
  console.log(`${title} for Pipeline [${pipelineName}] and Program [${programName}]`)
  notifyTeams(title, status, pipelineName, programName, stepStates, cmExecutionDetailsLink)
}

module.exports = (req, res) => {
  if (process.env.CLIENT_ID !== req.body.recipient_client_id) {
    console.warn(`Unexpected client id ${req.body.recipient_client_id}`)
    res.status(400)
    res.end()
    return
  }
  res.set('Content-Type', 'text/plain')
  res.send('pong')

  const STARTED = 'https://ns.adobe.com/experience/cloudmanager/event/started'
  const ENDED = 'https://ns.adobe.com/experience/cloudmanager/event/ended'
  const WAITING = 'https://ns.adobe.com/experience/cloudmanager/event/waiting'
  const PIPELINE_EXECUTION = 'https://ns.adobe.com/experience/cloudmanager/pipeline-execution'
  const STEP_STATE_EXECUTION = 'https://ns.adobe.com/experience/cloudmanager/execution-step-state'

  const event = req.body.event
  const eventType = event['@type']
  const eventObjType = event['xdmEventEnvelope:objectType']
  const executionUrl = event['activitystreams:object']['@id']

  if (STARTED === eventType && PIPELINE_EXECUTION === eventObjType) {
    getExecution(executionUrl).then(execution => {
      const createdDate = new Date(execution.createdAt)
      const status = `**Status:** ${execution.status} - **Trigger:** ${execution.trigger} - **Created:** ${toTimeString(createdDate)}`
      const title = "Pipeline Execution Started"
      sendNotification(title, status, execution.pipeline.name, execution.program.name, getStepStates(execution), getCloudManagerExecutionDetailsLink(execution, REL_SELF))
    })
  } else if (ENDED === eventType && PIPELINE_EXECUTION === eventObjType) {
    getExecution(executionUrl).then(execution => {
      const createdDate = new Date(execution.createdAt)
      const finishedDate = new Date(execution.finishedAt)
      const status = `**Status:** ${execution.status} - **Trigger:** ${execution.trigger} - **Created:** ${toTimeString(createdDate)} - **Finished:** ${toTimeString(finishedDate)} - **Duration:** ${diffInMinutes(finishedDate, createdDate)} minutes`
      const title = "Pipeline Execution Ended"
      sendNotification(title, status, execution.pipeline.name, execution.program.name, getStepStates(execution), getCloudManagerExecutionDetailsLink(execution, REL_SELF))
    })
  } else if (STARTED === eventType && STEP_STATE_EXECUTION === eventObjType) {
    getStepStateExecution(executionUrl).then(execution => {
      const startedDate = new Date(execution.startedAt)
      const status = `**Status:** ${execution.status} - **Started:** ${toTimeString(startedDate)}`
      const title = `[${execution.action}] Execution Step Started`
      sendNotification(title, status, execution.pipeline.name, execution.program.name, getStepStates(execution.execution), getCloudManagerExecutionDetailsLink(execution, REL_EXECUTION))
    })
  } else if (ENDED === eventType && STEP_STATE_EXECUTION === eventObjType) {
    getStepStateExecution(executionUrl).then(execution => {
      const startedDate = new Date(execution.startedAt)
      const finishedDate = new Date(execution.finishedAt)
      const status = `**Status:** ${execution.status} - **Started:** ${toTimeString(startedDate)} - **Finished:** ${toTimeString(finishedDate)}`
      const title = `[${execution.action}] Execution Step Ended`
      sendNotification(title, status, execution.pipeline.name, execution.program.name, getStepStates(execution.execution), getCloudManagerExecutionDetailsLink(execution, REL_EXECUTION))
    })
  } else if (WAITING === eventType && STEP_STATE_EXECUTION === eventObjType) {
    getStepStateExecution(executionUrl).then(execution => {
      const startedDate = new Date(execution.startedAt)
      const status = `**Status:** ${execution.status} - **Started:** ${toTimeString(startedDate)}`
      const title = `[${execution.action}] Execution Step Waiting`
      sendNotification(title, status, execution.pipeline.name, execution.program.name, getStepStates(execution.execution), getCloudManagerExecutionDetailsLink(execution, REL_EXECUTION))
    })
  } else {
    console.warn('Received unexpected event');
  }
}
