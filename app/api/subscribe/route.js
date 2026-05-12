export async function POST(request) {
  const { email } = await request.json();

  if (!email || !email.includes('@')) {
    return Response.json({ error: 'Valid email required.' }, { status: 400 });
  }

  const formId = process.env.NEXT_PUBLIC_KIT_FORM_ID;
  const apiKey = process.env.KIT_API_KEY;

  if (!formId || !apiKey) {
    console.error('Missing KIT_FORM_ID or KIT_API_KEY env vars');
    return Response.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  const res = await fetch(`https://api.kit.com/v4/forms/${formId}/subscribers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ email_address: email }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('Kit API error:', res.status, body);
    return Response.json({ error: 'Subscription failed. Please try again.' }, { status: 502 });
  }

  return Response.json({ success: true });
}
