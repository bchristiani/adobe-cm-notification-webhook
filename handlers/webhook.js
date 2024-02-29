const {toTimeString, diffInMinutes} = require("../utils/date");
const notifyTeams = require("../utils/teams");
const {
  getExecution,
  getStepStateExecution,
  getStepStates,
  getPipelineExecutionUrl,
  REL_SELF,
  REL_EXECUTION
} = require("../utils/cloud-manager");

module.exports = (req, res) => {
  console.log('Handling incoming event')
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
  const EXECUTION = 'https://ns.adobe.com/experience/cloudmanager/pipeline-execution'
  const EXECUTION_STEP = 'https://ns.adobe.com/experience/cloudmanager/execution-step-state'

  const event = req.body.event
  const eventType = event['@type']
  const eventObjType = event['xdmEventEnvelope:objectType']
  const executionUrl = event['activitystreams:object']['@id']

  if (STARTED === eventType && EXECUTION === eventObjType) {
    getExecution(executionUrl).then(execution => {
      const createdDate = new Date(execution.createdAt)
      const status = `**Status:** ${execution.status} | **Trigger:** ${execution.trigger} | **Created At:** ${toTimeString(createdDate)}`
      const title = "Pipeline - started"
      console.log(title)
      notifyTeams(title, status, execution.pipeline.name, execution.program.name, getStepStates(execution), getPipelineExecutionUrl(execution, REL_SELF))
    })
  } else if (ENDED === eventType && EXECUTION === eventObjType) {
    getExecution(executionUrl).then(execution => {
      const createdDate = new Date(execution.createdAt)
      const finishedDate = new Date(execution.finishedAt)
      const status = `**Status:** ${execution.status} | **Trigger:** ${execution.trigger} | **Created At:** ${toTimeString(createdDate)} | **Finished At:** ${toTimeString(finishedDate)} | **Duration:** ${diffInMinutes(finishedDate, createdDate)} minutes`
      const title = "Pipeline - ended"
      console.log(title)
      notifyTeams(title, status, execution.pipeline.name, execution.program.name, getStepStates(execution), getPipelineExecutionUrl(execution, REL_SELF))
    })
  } else if (STARTED === eventType && EXECUTION_STEP === eventObjType) {
    getStepStateExecution(executionUrl).then(execution => {
      const startedDate = new Date(execution.startedAt)
      const status = `**Status:** ${execution.status} | **Started At:** ${toTimeString(startedDate)}`
      const title = `Execution Step > ${execution.action} - started`
      console.log(title)
      notifyTeams(title, status, execution.pipeline.name, execution.program.name, getStepStates(execution.execution), getPipelineExecutionUrl(execution, REL_EXECUTION))
    })
  } else if (ENDED === eventType && EXECUTION_STEP === eventObjType) {
    getStepStateExecution(executionUrl).then(execution => {
      const startedDate = new Date(execution.startedAt)
      const finishedDate = new Date(execution.finishedAt)
      const status = `**Status:** ${execution.status} | **Started At:** ${toTimeString(startedDate)} | **Finished At:** ${toTimeString(finishedDate)}`
      const title = `Execution Step > ${execution.action} - ended`
      console.log(title)
      notifyTeams(title, status, execution.pipeline.name, execution.program.name, getStepStates(execution.execution), getPipelineExecutionUrl(execution, REL_EXECUTION))
    })
  } else if (WAITING === eventType && EXECUTION_STEP === eventObjType) {
    getStepStateExecution(executionUrl).then(execution => {
      const startedDate = new Date(execution.startedAt)
      const status = `**Status:** ${execution.status} | **Started At:** ${toTimeString(startedDate)}`
      const title = `Execution Step > ${execution.action} - waiting`
      console.log(title)
      notifyTeams(title, status, execution.pipeline.name, execution.program.name, getStepStates(execution.execution), getPipelineExecutionUrl(execution, REL_EXECUTION))
    })
  } else {
    console.warn('Received unexpected event');
  }
}
