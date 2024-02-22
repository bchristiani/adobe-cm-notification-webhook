const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

require('dotenv').config()

async function makeApiCall () {
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

async function generateAccessToken () {
  const accessToken = await makeApiCall()
  if (!accessToken) {
    throw new Error('Could not generate access token')
  } else {
    console.log(JSON.stringify(accessToken))
  }
}

generateAccessToken().then(() => console.log('')).catch(err => console.error(err))