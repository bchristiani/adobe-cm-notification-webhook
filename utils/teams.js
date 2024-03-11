const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

module.exports = function notifyTeams (title, status, pipeline, program, steps, cmExecutionDetailsLink) {
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
          'activityTitle': '**Execution Steps:**',
          'facts': steps,
        },
      ],
      'potentialAction': [
        {
          '@type':'OpenUri',
          'name': 'View Details in Cloud Manager',
          'targets': [
            {
              'os': 'default',
              'uri': cmExecutionDetailsLink
            }
          ]
        }
      ]
    })
  })
}
