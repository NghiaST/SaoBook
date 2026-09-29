import 'dotenv/config'

const apiKey = process.env.RESEND_API_KEY
const from = process.env.RESEND_EMAIL_FROM
const to = process.env.RESEND_TEST_TO ?? "example@gmail.com"

if (!apiKey) {
  throw new Error('Missing RESEND_API_KEY in env')
}

if (!from) {
  throw new Error('Missing RESEND_EMAIL_FROM in env')
}

if (!to) {
  throw new Error('Missing RESEND_TEST_TO in env')
}

async function main() {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject: 'SaoBook Resend API test',
      html: '<p>This is a direct Resend API test from SaoBook.</p>',
    }),
  })

  const responseText = await response.text()
  let responseBody: unknown = responseText

  try {
    responseBody = JSON.parse(responseText)
  } catch {
    // Keep non-JSON provider responses readable.
  }

  if (!response.ok) {
    throw new Error(`Resend rejected the request (${response.status}): ${JSON.stringify(responseBody)}`)
  }

  console.log('Resend test passed:', responseBody)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})