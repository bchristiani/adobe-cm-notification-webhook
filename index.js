const express = require("express");
const bodyParser = require("body-parser");
const { URL } = require('url')
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

require("dotenv").config();

const app = express();

let authSession = {} // { 'access_token': '', 'expiration': '' }

const REL_PROGRAM = 'http://ns.adobe.com/adobecloud/rel/program'
const REL_PIPELINE = 'http://ns.adobe.com/adobecloud/rel/pipeline'
const REL_EXECUTION = 'http://ns.adobe.com/adobecloud/rel/execution'
const REL_SELF = 'self'

async function getPipelineExecution (executionUrl) {
  if (isAuthSessionInvalid(authSession)) {
    authSession = await getAuthSession()
  }

  const execution = await makeApiCall(executionUrl, 'GET', authSession.access_token)

  const programLink = getLink(execution, REL_PROGRAM)
  const programUrl = new URL(programLink, executionUrl)
  execution.program = await makeApiCall(programUrl, 'GET', authSession.access_token)

  const pipelineLink = getLink(execution, REL_PIPELINE)
  const pipelineUrl = new URL(pipelineLink, executionUrl)
  execution.pipeline = await makeApiCall(pipelineUrl, 'GET', authSession.access_token)

  return execution
}

async function getStepStateExecution (stepStateUrl) {
  if (isAuthSessionInvalid(authSession)) {
    authSession = await getAuthSession()
  }

  const stepStateExecution = await makeApiCall(stepStateUrl, 'GET', authSession.access_token)

  const programLink = getLink(stepStateExecution, REL_PROGRAM)
  const programUrl = new URL(programLink, stepStateUrl)
  stepStateExecution.program = await makeApiCall(programUrl, 'GET', authSession.access_token)

  const pipelineLink = getLink(stepStateExecution, REL_PIPELINE)
  const pipelineUrl = new URL(pipelineLink, stepStateUrl)
  stepStateExecution.pipeline = await makeApiCall(pipelineUrl, 'GET', authSession.access_token)

  const executionLink = getLink(stepStateExecution, REL_EXECUTION)
  const executionUrl = new URL(executionLink, stepStateUrl)
  stepStateExecution.execution = await makeApiCall(executionUrl, 'GET', authSession.access_token)

  return stepStateExecution
}

async function getAuthSession() {
  const authObj = await auth()
  if (!authObj || !authObj.access_token || !authObj.expires_in) {
    console.error('Could not obtain access token')
    return {}
  } else {
    console.log('Obtained access token')
    const expirationInSeconds = (new Date().getTime() / 1000) + authObj.expires_in
    return { "access_token": authObj.access_token, "expiration": expirationInSeconds }
  }
}

async function makeApiCall (url, method, accessToken) {
  const response = await fetch(url, {
    'method': method,
    'headers': {
      'x-gw-ims-org-id': process.env.ORGANIZATION_ID,
      'x-api-key': process.env.CLIENT_ID,
      'Authorization': `Bearer ${accessToken}`
    }
  })
  return response.json()
}

async function auth () {
  console.log('Obtaining access token')
  const response = await fetch('https://ims-na1.adobelogin.com/ims/token/v3', {
    'method': 'POST',
    'headers': {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    'body': new URLSearchParams({
      'grant_type': 'client_credentials',
      'client_id': process.env.CLIENT_ID,
      'client_secret': process.env.CLIENT_SECRET,
      'scope': 'openid,AdobeID,read_organizations,additional_info.projectedProductContext,read_pc.dma_aem_ams'
    })
  })

  return response.ok && response.json()
}

function isAuthSessionInvalid(obj) {
  return JSON.stringify(obj) === "{}" || (new Date().getTime() / 1000) > obj.expiration
}

function getLink (obj, linkType) {
  return obj['_links'][linkType].href
}

function getStepStates(obj) {
  const steps = []
  obj["_embedded"].stepStates.forEach(function(step) {
    steps.push({'name': `- ${step.action}:`, 'value': step.status})
  });
  return steps
}

function getCloudManagerPipelineExecutionUrl(obj, linkType) {
  const pipelineExecutionPath = getLink(obj, linkType).replace("/api", "")
  return process.env.CM_PIPELINE_EXECUTION_BASE_URL + pipelineExecutionPath
}

function toTimeString(date) {
  return date.toLocaleTimeString('en-GB', { timeZone: 'UTC', timeZoneName: 'short' })
}

function diffInMinutes(endDate, startDate) {
  let diff = (endDate.getTime() - startDate.getTime()) / 1000
  diff /= 60
  return Math.abs(Math.round(diff))
}

function notifyTeams (title, status, pipeline, program, steps, pipelineUrl) {
  fetch(process.env.TEAMS_WEBHOOK, {
    'method': 'POST',
    'headers': { 'Content-Type': 'application/json' },
    'body': JSON.stringify({
      '@context': 'https://schema.org/extensions',
      '@type': 'MessageCard',
      'title': title,
      'summary': title,
      'sections': [
        {
          'activityTitle': status
        },
        {
          'facts': [
            {
              'name': 'Pipeline:',
              'value': pipeline
            },
            {
              'name': 'Program:',
              'value': program
            }
          ]
        },
        {
          'activityTitle': '**Summary Steps:**',
          'facts': steps,
        },
        {
          'activityTitle': 'View pipeline in Cloud Manager (requires cloud manager access)'
        }
      ],
      'potentialAction': [
        {
          '@type':'OpenUri',
          'name': 'Pipeline Details',
          'targets': [
            {
              'os': 'default',
              'uri': pipelineUrl
            }
          ]
        }
      ]
    })
  })
}

app.use(bodyParser.json());

app.get('/webhook', (req, res) => {
  if (req.query['challenge']) {
    res.set('Content-Type', 'text/plain')
    res.send(req.query['challenge'])
  } else {
    console.log('No challenge')
    res.status(400)
    res.end()
  }
})

app.post('/webhook', (req, res) => {
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
    getPipelineExecution(executionUrl).then(execution => {
      const createdDate = new Date(execution.createdAt)
      const status = `**Status:** ${execution.status} | **Trigger:** ${execution.trigger} | **Created At:** ${toTimeString(createdDate)}`
      const title = "Pipeline - started"
      console.log(title)
      notifyTeams(title, status, execution.pipeline.name, execution.program.name, getStepStates(execution), getCloudManagerPipelineExecutionUrl(execution, REL_SELF))
    })
  }

  if (ENDED === eventType && EXECUTION === eventObjType) {
    getPipelineExecution(executionUrl).then(execution => {
      const createdDate = new Date(execution.createdAt)
      const finishedDate = new Date(execution.finishedAt)
      const status = `**Status:** ${execution.status} | **Trigger:** ${execution.trigger} | **Created At:** ${toTimeString(createdDate)} | **Finished At:** ${toTimeString(finishedDate)} | **Duration:** ${diffInMinutes(finishedDate, createdDate)} minutes`
      const title = "Pipeline - ended"
      console.log(title)
      notifyTeams(title, status, execution.pipeline.name, execution.program.name, getStepStates(execution), getCloudManagerPipelineExecutionUrl(execution, REL_SELF))
    })
  }

  if (STARTED === eventType && EXECUTION_STEP === eventObjType) {
    getStepStateExecution(executionUrl).then(execution => {
      const startedDate = new Date(execution.startedAt)
      const status = `**Status:** ${execution.status} | **Started At:** ${toTimeString(startedDate)}`
      const title = `Execution Step > ${execution.action} - started`
      console.log(title)
      notifyTeams(title, status, execution.pipeline.name, execution.program.name, getStepStates(execution.execution), getCloudManagerPipelineExecutionUrl(execution, REL_EXECUTION))
    })
  }

  if (ENDED === eventType && EXECUTION_STEP === eventObjType) {
    getStepStateExecution(executionUrl).then(execution => {
      const startedDate = new Date(execution.startedAt)
      const finishedDate = new Date(execution.finishedAt)
      const status = `**Status:** ${execution.status} | **Started At:** ${toTimeString(startedDate)} | **Finished At:** ${toTimeString(finishedDate)}`
      const title = `Execution Step > ${execution.action} - ended`
      console.log(title)
      notifyTeams(title, status, execution.pipeline.name, execution.program.name, getStepStates(execution.execution), getCloudManagerPipelineExecutionUrl(execution, REL_EXECUTION))
    })
  }

  if (WAITING === eventType && EXECUTION_STEP === eventObjType) {
    getStepStateExecution(executionUrl).then(execution => {
      const startedDate = new Date(execution.startedAt)
      const status = `**Status:** ${execution.status} | **Started At:** ${toTimeString(startedDate)}`
      const title = `Execution Step > ${execution.action} - waiting`
      console.log(title)
      notifyTeams(title, status, execution.pipeline.name, execution.program.name, getStepStates(execution.execution), getCloudManagerPipelineExecutionUrl(execution, REL_EXECUTION))
    })
  }
})

const listener = app.listen(process.env.PORT, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
  if (!process.env.ORGANIZATION_ID || !process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.TEAMS_WEBHOOK || !process.env.CM_PIPELINE_EXECUTION_BASE_URL) {
    listener.close(function() { console.error('App has been stopped: environment variables are missing or incomplete'); });
  }
});



