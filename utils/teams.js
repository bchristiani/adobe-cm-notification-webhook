const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

module.exports = function notifyTeams (title, status, pipeline, program, steps, pipelineUrl) {
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
