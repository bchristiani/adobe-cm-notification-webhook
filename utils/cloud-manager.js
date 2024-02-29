const {URL} = require('url')
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

let authSession = {} // { 'access_token': '', 'expiration': '' }

const REL_PROGRAM = 'http://ns.adobe.com/adobecloud/rel/program'
const REL_PIPELINE = 'http://ns.adobe.com/adobecloud/rel/pipeline'
const REL_EXECUTION = 'http://ns.adobe.com/adobecloud/rel/execution'
const REL_SELF = 'self'

function isAuthSessionInvalid(obj) {
  return JSON.stringify(obj) === "{}" || (new Date().getTime() / 1000) > obj.expiration
}

async function getAuthSession() {
  const accessTokenResponse = await getAccessToken()
  if (!accessTokenResponse || !accessTokenResponse.access_token || !accessTokenResponse.expires_in) {
    console.error('Could not obtain access token')
    return {}
  } else {
    console.log('Obtained access token')
    const expirationInSeconds = (new Date().getTime() / 1000) + accessTokenResponse.expires_in
    return {"access_token": accessTokenResponse.access_token, "expiration": expirationInSeconds}
  }
}

async function getAccessToken() {
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

async function makeApiCall(url, method) {
  if (isAuthSessionInvalid(authSession)) {
    authSession = await getAuthSession()
  }
  const response = await fetch(url, {
    'method': method,
    'headers': {
      'x-gw-ims-org-id': process.env.ORGANIZATION_ID,
      'x-api-key': process.env.CLIENT_ID,
      'Authorization': `Bearer ${authSession.access_token}`
    }
  })
  return response.json()
}

function getLink(obj, linkType) {
  return obj['_links'][linkType].href
}

function getStepStates(obj) {
  const steps = []
  obj["_embedded"].stepStates.forEach(function (step) {
    steps.push({'name': `- ${step.action}:`, 'value': step.status})
  });
  return steps
}

function getPipelineExecutionUrl(obj, linkType) {
  const pipelineExecutionPath = getLink(obj, linkType).replace("/api", "")
  return process.env.CM_PIPELINE_EXECUTION_BASE_URL + pipelineExecutionPath
}

async function getExecution(executionUrl) {
  const execution = await makeApiCall(executionUrl, 'GET')

  const programLink = getLink(execution, REL_PROGRAM)
  const programUrl = new URL(programLink, executionUrl)
  execution.program = await makeApiCall(programUrl, 'GET')

  const pipelineLink = getLink(execution, REL_PIPELINE)
  const pipelineUrl = new URL(pipelineLink, executionUrl)
  execution.pipeline = await makeApiCall(pipelineUrl, 'GET')

  return execution
}

async function getStepStateExecution(stepStateExecutionUrl) {
  const stepStateExecution = await getExecution(stepStateExecutionUrl)

  const pipelineExecutionLink = getLink(stepStateExecution, REL_EXECUTION)
  const pipelineExecutionUrl = new URL(pipelineExecutionLink, stepStateExecutionUrl)
  stepStateExecution.execution = await makeApiCall(pipelineExecutionUrl, 'GET')

  return stepStateExecution
}

module.exports.REL_SELF = REL_SELF;
module.exports.REL_EXECUTION = REL_EXECUTION;
module.exports.getExecution = getExecution;
module.exports.getStepStateExecution = getStepStateExecution;
module.exports.getStepStates = getStepStates;
module.exports.getPipelineExecutionUrl = getPipelineExecutionUrl;
