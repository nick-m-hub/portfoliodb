export async function POST(request) {
  // CR-17: malformed JSON must return 400, not throw an unhandled 500
  let email;
  try {
    ({ email } = await request.json());
  } catch {
    return Response.json({ error: 'Valid email required.' }, { status: 400 });
  }

  if (!email || typeof email !== 'string' || !email.includes('@') || email.length > 254) {
    return Response.json({ error: 'Valid email required.' }, { status: 400 });
  }

  const apiKey = process.env.MAILERLITE_API_KEY;
  const groupId = process.env.MAILERLITE_GROUP_ID;

  if (!apiKey || !groupId) {
    console.error('Missing MAILERLITE_API_KEY or MAILERLITE_GROUP_ID env vars');
    return Response.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  const res = await fetch('https://connect.mailerlite.com/api/subscribers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ email, groups: [groupId] }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('MailerLite API error:', res.status, body);
    return Response.json({ error: 'Subscription failed. Please try again.' }, { status: 502 });
  }

  return Response.json({ success: true });
}
