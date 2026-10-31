const PAYNALA_LOOKUP_URL = 'https://api.paynala.com/functions/v1/lookup-payment';
const PAYNALA_API_KEY_DEFAULT = 'f5d929362e75b0caba644a9237150ae1c4cbb9efaefe5471e8fe66d4ca2d9dd7';

function getApiKey(): string {
  return ((import.meta as any).env?.VITE_PAYNALA_API_KEY as string | undefined) || PAYNALA_API_KEY_DEFAULT;
}

export interface LookupPaymentResult {
  success: boolean;
  data: unknown;
  message?: string;
  error?: string;
}

export async function lookupPayment(idNumber: string): Promise<LookupPaymentResult> {
  const response = await fetch(PAYNALA_LOOKUP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getApiKey(),
    },
    body: JSON.stringify({ id_number: idNumber }),
  });
  return response.json();
}
