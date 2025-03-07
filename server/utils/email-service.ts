import sgMail from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error('SENDGRID_API_KEY environment variable is required');
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

function formatNumber(num: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(num);
}

function getCurrentDate(): string {
  return new Date().toLocaleDateString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

function sanitizeSubmissionData(submission: any) {
  return {
    firstName: String(submission.firstName || '').replace(/[<>]/g, ''),
    lastName: String(submission.lastName || '').replace(/[<>]/g, ''),
    email: String(submission.email || ''),
    address: String(submission.address || '').replace(/[<>]/g, ''),
    buildingSize: Number(submission.buildingSize || 0),
    heatingSystem: String(submission.heatingSystem || '').replace(/[<>]/g, ''),
    currentConsumption: Number(submission.currentConsumption || 0),
    projectedConsumption: Number(submission.projectedConsumption || 0),
    co2Savings: Number(submission.co2Savings || 0),
    carbonCredits: Number(submission.carbonCredits || 0),
    financialValue: Number(submission.financialValue || 0)
  };
}

export async function sendReportEmail(submission: any) {
  try {
    const data = sanitizeSubmissionData(submission);

    // Calculate consumption difference and percentage
    const consumptionDiff = data.currentConsumption - data.projectedConsumption;
    const reductionPercentage = ((consumptionDiff / data.currentConsumption) * 100).toFixed(1);

    const emailParts = [
      `Herr ${data.lastName}, ${data.firstName},\n`,
      'CARBON_CREDIT_CALCULATION_REPORT',
      '-----------------------------------',
      `DATE_ASSESSED: ${getCurrentDate()}\n`,
      'BUILDING_DATA',
      '-----------------------------------',
      'BUILDING_TYPE: Single-family house',
      `LOCATION: ${data.address}`,
      `AREA_SQM: ${data.buildingSize}`,
      `HEATING_SYSTEM: ${data.heatingSystem}\n`,
      'EMISSIONS_DATA',
      '-----------------------------------',
      `CURRENT_ENERGY_CONSUMPTION_KWH: ${formatNumber(data.currentConsumption)}`,
      `FUTURE_ENERGY_CONSUMPTION_KWH: ${formatNumber(data.projectedConsumption)}`,
      `ENERGY_REDUCTION: ${formatNumber(consumptionDiff)} kWh/year (${reductionPercentage}%)\n`,
      'CARBON_CREDITS (10-YEAR PROJECTION)',
      '-----------------------------------',
      `ANNUAL_REDUCTION_KG: ${formatNumber(data.co2Savings * 1000)}`,
      `ANNUAL_CARBON_CREDITS_TONS: ${formatNumber(data.co2Savings)}`,
      'CREDITING_PERIOD_YEARS: 10',
      `LIFETIME_CARBON_CREDITS_TONS: ${formatNumber(data.co2Savings * 10)}\n`,
      'FINANCIAL_VALUE',
      '-----------------------------------',
      'CARBON_PRICE_EUR_PER_TON: 50',
      `ANNUAL_VALUE_EUR: ${formatNumber(data.financialValue)}`,
      `LIFETIME_VALUE_EUR: ${formatNumber(data.financialValue * 10)}\n`,
      'METHOD_NOTES',
      '-----------------------------------',
      'CALCULATION_METHOD: Direct CO2 emission values',
      'CONFIDENCE_LEVEL: High',
      'EMISSION_FACTOR_CURRENT: 0.202 kg CO₂/kWh (Natural gas)',
      'EMISSION_FACTOR_FUTURE: 0.343 kg CO₂/kWh (Electricity mix)\n',
      'Mit freundlichen Grüssen',
      'Philippe M Masindet\n',
      'Philippe Maitey Masindet',
      'CTO Radical Zero GmbH\n',
      'pmm@radical-zero.com',
      'Tel: +491746813185\n',
      'Radical Zero GmbH',
      'Local Carbon Offset Supply',
      'Co/Q:ARC',
      'Danziger Straße 145',
      '10407 Berlin\n',
      'Amtsgericht Charlottenburg (HRB 255861 B)'
    ];

    const plainText = emailParts.join('\n');
    const htmlContent = emailParts
      .map(line => line.trim())
      .map(line => `<div style="font-family: monospace; white-space: pre;">${line}</div>`)
      .join('');

    const msg = {
      to: data.email,
      from: 'pmm@sands-neptune.de',
      subject: 'Your Carbon Credit Calculation Report',
      text: plainText,
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: monospace; white-space: pre-wrap;">
  ${htmlContent}
</body>
</html>`
    };

    await sgMail.send(msg);
    console.log('Email sent successfully to:', data.email);
    return true;
  } catch (error: any) {
    console.error('Error sending email:', error);

    if (error?.response?.body) {
      const errorMessage = error.response.body.errors?.[0]?.message || 'Unknown SendGrid error';
      throw new Error(`Failed to send email: ${errorMessage}`);
    }

    throw new Error('Failed to send email: Service temporarily unavailable');
  }
}